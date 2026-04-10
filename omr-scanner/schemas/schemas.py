from datetime import date
from typing import List, Optional

from pydantic import BaseModel, field_validator


class ExamCreate(BaseModel):
    title: str
    total_questions: int
    exam_date: date


class ExamOut(BaseModel):
    id: str
    title: str
    total_questions: int
    exam_date: date

    model_config = {"from_attributes": True}


class AnswerKeyItemIn(BaseModel):
    question_number: int
    correct_answer: str
    points: float = 1.0

    @field_validator("correct_answer")
    @classmethod
    def uppercase_answer(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in ("A", "B", "C", "D", "E"):
            raise ValueError("correct_answer must be A–E")
        return v


class StudentCreate(BaseModel):
    student_code: str
    full_name: str
    class_group: str


class StudentOut(BaseModel):
    id: str
    student_code: str
    full_name: str
    class_group: str

    model_config = {"from_attributes": True}


class OverrideIn(BaseModel):
    override_answer: str

    @field_validator("override_answer")
    @classmethod
    def valid_answer(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in ("A", "B", "C", "D", "E"):
            raise ValueError("override_answer must be A–E")
        return v
