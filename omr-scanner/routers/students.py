from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models.models import Student
from schemas.schemas import StudentCreate, StudentOut

router = APIRouter(prefix="/students", tags=["students"])


@router.post("", response_model=StudentOut, status_code=201)
def create_or_upsert_student(data: StudentCreate, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.student_code == data.student_code).first()
    if student:
        student.full_name   = data.full_name
        student.class_group = data.class_group
    else:
        student = Student(**data.model_dump())
        db.add(student)
    db.commit()
    db.refresh(student)
    return student
