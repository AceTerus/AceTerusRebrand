"""
Celery task: process_omr_scan
Runs the full OMR pipeline for one scan job, persists results,
and emits Socket.IO events via Redis pubsub.
"""

import logging
import uuid

import socketio
from celery import Celery

from config import CELERY_BACKEND, CELERY_BROKER, CELERY_SOCKETIO_CHANNEL

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Celery app
# ---------------------------------------------------------------------------
celery_app = Celery("omr_tasks")
celery_app.conf.update(
    broker_url                 = CELERY_BROKER,
    result_backend             = CELERY_BACKEND,
    task_default_queue         = "omr_scans",
    worker_prefetch_multiplier = 1,
    task_serializer            = "json",
    result_serializer          = "json",
    accept_content             = ["json"],
    task_acks_late             = True,
)

# ---------------------------------------------------------------------------
# Socket.IO write-only Redis manager (sync — safe for Celery workers)
# ---------------------------------------------------------------------------
_sio_mgr = socketio.RedisManager(CELERY_SOCKETIO_CHANNEL, write_only=True)


def _emit(event: str, data: dict) -> None:
    try:
        _sio_mgr.emit(event, data)
    except Exception as exc:
        logger.warning("Socket.IO emit failed: %s", exc)


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------
@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=10,
    acks_late=True,
    name="tasks.omr_task.process_omr_scan",
)
def process_omr_scan(self, job_id: str, image_path: str, exam_id: str):
    """
    Process a single OMR scan job.

    Steps:
      1. Mark job as *processing*
      2. Run preprocessing → OCR → bubble detection → grading
      3. Persist OmrResult rows and Score
      4. Mark job as *done* and emit ``scan_complete`` via Socket.IO

    On any exception: mark job as *failed*, retry up to 3 times,
    emit ``scan_failed`` on final failure.
    """
    # Import here to avoid import-time DB connection in worker startup
    from database import SessionLocal
    from models.models import AnswerKey, JobStatus, OmrResult, Score, ScanJob, Student
    from processing.pipeline import run_pipeline

    db = SessionLocal()
    try:
        # --- 1. Mark processing ---
        job = db.query(ScanJob).filter(ScanJob.id == uuid.UUID(job_id)).first()
        if job is None:
            raise ValueError(f"ScanJob {job_id} not found")

        job.status = JobStatus.processing
        db.commit()

        # --- 2. Load answer keys ---
        answer_keys = (
            db.query(AnswerKey)
            .filter(AnswerKey.exam_id == uuid.UUID(exam_id))
            .all()
        )
        if not answer_keys:
            raise ValueError(f"No answer key for exam {exam_id}")

        # --- 3. Run pipeline ---
        result = run_pipeline(image_path, answer_keys)

        # --- 4. Resolve student ---
        if result["student_code"]:
            student = (
                db.query(Student)
                .filter(Student.student_code == result["student_code"])
                .first()
            )
            if student:
                job.student_id = student.id

        # --- 5. Persist OMR results ---
        flagged_count = 0
        for q in result["grade_result"]["questions"]:
            omr = OmrResult(
                scan_job_id     = uuid.UUID(job_id),
                question_number = q["question_number"],
                detected_answer = q["detected_answer"],
                is_correct      = q["is_correct"],
                confidence      = q["confidence"],
                is_flagged      = q["flagged"],
            )
            db.add(omr)
            if q["flagged"]:
                flagged_count += 1

        # --- 6. Persist score ---
        gr = result["grade_result"]
        score = Score(
            scan_job_id  = uuid.UUID(job_id),
            raw_score    = gr["raw_score"],
            max_score    = gr["max_score"],
            percentage   = gr["percentage"],
            is_finalized = False,
        )
        db.add(score)

        # --- 7. Mark done ---
        job.status             = JobStatus.done
        job.overall_confidence = result["overall_confidence"]
        db.commit()

        # --- 8. Notify ---
        _emit("scan_complete", {
            "job_id":        job_id,
            "status":        "done",
            "score":         gr["raw_score"],
            "max_score":     gr["max_score"],
            "percentage":    gr["percentage"],
            "flagged_count": flagged_count,
        })

        return {"status": "done", "job_id": job_id}

    except Exception as exc:
        logger.exception("Error processing scan job %s: %s", job_id, exc)

        # Persist failure
        try:
            job = db.query(ScanJob).filter(ScanJob.id == uuid.UUID(job_id)).first()
            if job:
                job.status        = JobStatus.failed   # type: ignore[assignment]
                job.error_message = str(exc)
                db.commit()
        except Exception:
            db.rollback()

        # Emit on final failure
        if self.request.retries >= self.max_retries:
            _emit("scan_failed", {"job_id": job_id, "error": str(exc)})

        raise self.retry(exc=exc)

    finally:
        db.close()
