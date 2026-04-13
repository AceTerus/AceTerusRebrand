import enum
import uuid

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Enum, Float,
    ForeignKey, Integer, String, Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


# Store UUIDs as strings for SQLite + PostgreSQL portability
def _uuid():
    return str(uuid.uuid4())


class JobStatus(str, enum.Enum):
    pending    = "pending"
    processing = "processing"
    done       = "done"
    failed     = "failed"


class Exam(Base):
    __tablename__ = "exams"

    id              = Column(String(36), primary_key=True, default=_uuid)
    title           = Column(String, nullable=False)
    total_questions = Column(Integer, nullable=False)
    exam_date       = Column(Date, nullable=False)
    created_at      = Column(DateTime, server_default=func.now())

    answer_keys = relationship("AnswerKey", back_populates="exam", cascade="all, delete-orphan")
    scan_jobs   = relationship("ScanJob",   back_populates="exam")


class AnswerKey(Base):
    __tablename__ = "answer_keys"

    id              = Column(String(36), primary_key=True, default=_uuid)
    exam_id         = Column(String(36), ForeignKey("exams.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    correct_answer  = Column(String(1), nullable=False)
    points          = Column(Float, default=1.0)

    exam = relationship("Exam", back_populates="answer_keys")


class Student(Base):
    __tablename__ = "students"

    id           = Column(String(36), primary_key=True, default=_uuid)
    student_code = Column(String, unique=True, nullable=False)
    full_name    = Column(String, nullable=False)
    class_group  = Column(String, nullable=False)

    scan_jobs = relationship("ScanJob", back_populates="student")


class ScanJob(Base):
    __tablename__ = "scan_jobs"

    id                 = Column(String(36), primary_key=True, default=_uuid)
    exam_id            = Column(String(36), ForeignKey("exams.id"), nullable=False)
    student_id         = Column(String(36), ForeignKey("students.id"), nullable=True)
    image_url          = Column(String, nullable=False)
    status             = Column(Enum(JobStatus, native_enum=False), nullable=False, default=JobStatus.pending)
    overall_confidence = Column(Float, nullable=True)
    error_message      = Column(Text, nullable=True)
    is_fallback        = Column(Boolean, default=False)
    scanned_at         = Column(DateTime, server_default=func.now())

    exam        = relationship("Exam",    back_populates="scan_jobs")
    student     = relationship("Student", back_populates="scan_jobs")
    omr_results = relationship("OmrResult", back_populates="scan_job", cascade="all, delete-orphan")
    score       = relationship("Score", back_populates="scan_job", uselist=False, cascade="all, delete-orphan")


class OmrResult(Base):
    __tablename__ = "omr_results"

    id              = Column(String(36), primary_key=True, default=_uuid)
    scan_job_id     = Column(String(36), ForeignKey("scan_jobs.id"), nullable=False)
    question_number = Column(Integer, nullable=False)
    detected_answer = Column(String(1), nullable=True)
    is_correct      = Column(Boolean, nullable=False)
    confidence      = Column(Float, nullable=False)
    is_flagged      = Column(Boolean, default=False)
    is_overridden   = Column(Boolean, default=False)
    override_answer = Column(String(1), nullable=True)

    scan_job = relationship("ScanJob", back_populates="omr_results")


class Score(Base):
    __tablename__ = "scores"

    id           = Column(String(36), primary_key=True, default=_uuid)
    scan_job_id  = Column(String(36), ForeignKey("scan_jobs.id"), nullable=False)
    raw_score    = Column(Float, nullable=False)
    max_score    = Column(Float, nullable=False)
    percentage   = Column(Float, nullable=False)
    is_finalized = Column(Boolean, default=False)

    scan_job = relationship("ScanJob", back_populates="score")
