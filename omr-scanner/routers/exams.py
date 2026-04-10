from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.models import AnswerKey, Exam, OmrResult, ScanJob, Score
from schemas.schemas import AnswerKeyItemIn, ExamCreate, ExamOut

router = APIRouter(prefix="/exams", tags=["exams"])


@router.post("", response_model=ExamOut, status_code=201)
def create_exam(data: ExamCreate, db: Session = Depends(get_db)):
    exam = Exam(**data.model_dump())
    db.add(exam)
    db.commit()
    db.refresh(exam)
    return exam


@router.get("", response_model=List[ExamOut])
def list_exams(db: Session = Depends(get_db)):
    return db.query(Exam).order_by(Exam.created_at.desc()).all()


@router.post("/{exam_id}/answer-key", status_code=200)
def upsert_answer_key(
    exam_id: str,
    items: List[AnswerKeyItemIn],
    db: Session = Depends(get_db),
):
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    for item in items:
        existing = (
            db.query(AnswerKey)
            .filter(
                AnswerKey.exam_id == exam_id,
                AnswerKey.question_number == item.question_number,
            )
            .first()
        )
        if existing:
            existing.correct_answer = item.correct_answer
            existing.points         = item.points
        else:
            db.add(AnswerKey(exam_id=exam_id, **item.model_dump()))

    db.commit()
    return {"message": "Answer key saved", "count": len(items)}


@router.get("/{exam_id}/results")
def exam_results(exam_id: str, db: Session = Depends(get_db)):
    """List all scan jobs for an exam with aggregated scores."""
    exam = db.query(Exam).filter(Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    rows = []
    for job in (
        db.query(ScanJob)
        .filter(ScanJob.exam_id == exam_id)
        .order_by(ScanJob.scanned_at.desc())
        .all()
    ):
        sc            = job.score
        flagged_count = sum(1 for r in job.omr_results if r.is_flagged)
        rows.append({
            "job_id":       str(job.id),
            "student_code": job.student.student_code if job.student else None,
            "status":       job.status.value,
            "raw_score":    sc.raw_score    if sc else None,
            "max_score":    sc.max_score    if sc else None,
            "percentage":   sc.percentage   if sc else None,
            "flagged_count": flagged_count,
            "is_finalized": sc.is_finalized if sc else False,
            "scanned_at":   job.scanned_at.isoformat() if job.scanned_at else None,
        })
    return rows
