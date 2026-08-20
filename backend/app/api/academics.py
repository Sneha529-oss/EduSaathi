import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.entities import User, Student, Parent, Teacher, AcademicRecord, SchoolClass
from app.auth.jwt import get_current_user
from app.auth.service import AuthorizationService

router = APIRouter(prefix="/academics")


class EnterGradeRequest(BaseModel):
    student_id: int
    subject: str
    assessment_name: str
    marks_obtained: float
    max_marks: Optional[float] = 100.0
    grade: Optional[str] = None
    term: Optional[str] = "Term 1 (2025-26)"
    comments: Optional[str] = ""


def calculate_grade(marks: float, max_marks: float) -> str:
    pct = (marks / max_marks) * 100 if max_marks > 0 else 0
    if pct >= 90:
        return "A+"
    elif pct >= 80:
        return "A"
    elif pct >= 70:
        return "B+"
    elif pct >= 60:
        return "B"
    elif pct >= 50:
        return "C"
    else:
        return "D"


@router.get("/me")
async def get_my_academics(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Student endpoint: Retrieve personal academic record and grades."""
    AuthorizationService.authorize(user, "view_own_academics", db=db)

    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student record not found."
        )

    records = db.query(AcademicRecord).filter(AcademicRecord.student_id == student.id).all()
    
    total_obtained = sum(r.marks_obtained for r in records)
    total_max = sum(r.max_marks for r in records)
    gpa_percentage = round((total_obtained / total_max * 100), 1) if total_max > 0 else 0.0

    return {
        "success": True,
        "student_id": student.id,
        "student_name": student.full_name,
        "roll_no": student.roll_no,
        "class_code": student.school_class.class_code if student.school_class else "10-A",
        "overall_percentage": gpa_percentage,
        "overall_grade": calculate_grade(total_obtained, total_max) if total_max > 0 else "N/A",
        "grades": [
            {
                "id": r.id,
                "subject": r.subject,
                "assessment_name": r.assessment_name,
                "marks_obtained": r.marks_obtained,
                "max_marks": r.max_marks,
                "grade": r.grade,
                "term": r.term,
                "comments": r.comments
            } for r in records
        ]
    }


@router.get("/student/{student_id}")
async def get_student_academics(
    student_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Parent / Teacher / Principal endpoint: Retrieve specific student's grades."""
    if user.role == "parent":
        AuthorizationService.authorize(user, "view_child_academics", resource=student_id, db=db)
    elif user.role in ["teacher", "principal"]:
        pass  # Authorized
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You cannot view this student's grades."
        )

    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student ID {student_id} not found."
        )

    records = db.query(AcademicRecord).filter(AcademicRecord.student_id == student.id).all()
    total_obtained = sum(r.marks_obtained for r in records)
    total_max = sum(r.max_marks for r in records)
    gpa_percentage = round((total_obtained / total_max * 100), 1) if total_max > 0 else 0.0

    return {
        "success": True,
        "student_id": student.id,
        "student_name": student.full_name,
        "roll_no": student.roll_no,
        "class_code": student.school_class.class_code if student.school_class else "10-A",
        "overall_percentage": gpa_percentage,
        "overall_grade": calculate_grade(total_obtained, total_max) if total_max > 0 else "N/A",
        "grades": [
            {
                "id": r.id,
                "subject": r.subject,
                "assessment_name": r.assessment_name,
                "marks_obtained": r.marks_obtained,
                "max_marks": r.max_marks,
                "grade": r.grade,
                "term": r.term,
                "comments": r.comments
            } for r in records
        ]
    }


@router.get("/class/{class_id}")
async def get_class_academics(
    class_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Teacher / Principal endpoint: Retrieve class-wide grade overview."""
    if user.role not in ["teacher", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only faculty and administration can view class academics."
        )

    school_class = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
    if not school_class:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class ID {class_id} not found."
        )

    students = db.query(Student).filter(Student.class_id == class_id).all()
    results = []

    for s in students:
        s_grades = db.query(AcademicRecord).filter(AcademicRecord.student_id == s.id).all()
        tot_o = sum(g.marks_obtained for g in s_grades)
        tot_m = sum(g.max_marks for g in s_grades)
        avg = round((tot_o / tot_m * 100), 1) if tot_m > 0 else 0.0

        results.append({
            "student_id": s.id,
            "student_code": s.student_code,
            "full_name": s.full_name,
            "roll_no": s.roll_no,
            "average_percentage": avg,
            "overall_grade": calculate_grade(tot_o, tot_m) if tot_m > 0 else "N/A",
            "subject_records": [
                {
                    "subject": g.subject,
                    "assessment": g.assessment_name,
                    "marks": g.marks_obtained,
                    "max_marks": g.max_marks,
                    "grade": g.grade
                } for g in s_grades
            ]
        })

    return {
        "success": True,
        "class_id": school_class.id,
        "class_code": school_class.class_code,
        "class_name": school_class.name,
        "students": results
    }


@router.post("/grades")
async def enter_grade(
    req: EnterGradeRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Teacher endpoint: Enter or update student marks and assessment grades."""
    AuthorizationService.authorize(user, "enter_grades", db=db)

    student = db.query(Student).filter(Student.id == req.student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student ID {req.student_id} not found."
        )

    teacher_prof = db.query(Teacher).filter(Teacher.user_id == user.id).first()
    teacher_id = teacher_prof.id if teacher_prof else None

    computed_grade = req.grade or calculate_grade(req.marks_obtained, req.max_marks or 100.0)

    # Check if record already exists for this assessment and subject
    record = db.query(AcademicRecord).filter(
        AcademicRecord.student_id == student.id,
        AcademicRecord.subject == req.subject.strip(),
        AcademicRecord.assessment_name == req.assessment_name.strip()
    ).first()

    if record:
        record.marks_obtained = req.marks_obtained
        record.max_marks = req.max_marks or 100.0
        record.grade = computed_grade
        record.comments = req.comments or record.comments
        record.updated_by_teacher_id = teacher_id
    else:
        record = AcademicRecord(
            student_id=student.id,
            subject=req.subject.strip(),
            assessment_name=req.assessment_name.strip(),
            marks_obtained=req.marks_obtained,
            max_marks=req.max_marks or 100.0,
            grade=computed_grade,
            term=req.term or "Term 1 (2025-26)",
            comments=req.comments or "",
            updated_by_teacher_id=teacher_id
        )
        db.add(record)

    db.commit()

    return {
        "success": True,
        "request_id": f"GRD-{record.id}",
        "message": f"Successfully updated grade for {student.full_name} in {req.subject}: {req.marks_obtained}/{req.max_marks} ({computed_grade}).",
        "record_id": record.id,
        "student_name": student.full_name,
        "subject": req.subject,
        "marks_obtained": req.marks_obtained,
        "grade": computed_grade
    }
