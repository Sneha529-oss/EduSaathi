import datetime
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.entities import User, Student, Parent, Teacher, SupportRequest
from app.auth.jwt import get_current_user
from app.auth.service import AuthorizationService

router = APIRouter(prefix="/support")


class TeacherCallRequest(BaseModel):
    description: str
    target_teacher_id: Optional[int] = None
    student_id: Optional[int] = None


class ManagementSupportRequest(BaseModel):
    description: str
    student_id: Optional[int] = None


@router.post("/teacher-call")
async def request_teacher_call(
    req: TeacherCallRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Parent endpoint: Request a formal call or meeting with student's teacher."""
    if user.role != "parent" and user.role != "student":
        # Allow parent (or student) to request
        pass

    parent_prof = db.query(Parent).filter(Parent.user_id == user.id).first()
    student_id = req.student_id or (parent_prof.student_id if parent_prof else None)
    
    # Assign first available teacher if not specified
    teacher = db.query(Teacher).first()
    teacher_id = req.target_teacher_id or (teacher.id if teacher else None)

    req_code = f"CALL-{uuid.uuid4().hex[:6].upper()}"

    ticket = SupportRequest(
        request_id=req_code,
        user_id=user.id,
        role=user.role,
        request_type="teacher_call",
        target_teacher_id=teacher_id,
        student_id=student_id,
        description=req.description.strip(),
        status="Pending",
        created_at=datetime.datetime.utcnow()
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    teacher_name = teacher.full_name if teacher else "Class Teacher"

    return {
        "success": True,
        "request_id": ticket.request_id,
        "message": f"Your call request has been successfully submitted to {teacher_name}. The teacher will reach out within 24 school hours.",
        "ticket": {
            "id": ticket.id,
            "request_id": ticket.request_id,
            "type": "Teacher Call",
            "teacher_name": teacher_name,
            "status": ticket.status,
            "created_at": ticket.created_at.strftime("%Y-%m-%d %H:%M")
        }
    }


@router.post("/management")
async def request_management_support(
    req: ManagementSupportRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit an escalation ticket to School Leadership / Principal."""
    req_code = f"MGMT-{uuid.uuid4().hex[:6].upper()}"

    parent_prof = db.query(Parent).filter(Parent.user_id == user.id).first()
    student_id = req.student_id or (parent_prof.student_id if parent_prof else None)

    ticket = SupportRequest(
        request_id=req_code,
        user_id=user.id,
        role=user.role,
        request_type="management_support",
        target_teacher_id=None,
        student_id=student_id,
        description=req.description.strip(),
        status="Pending",
        created_at=datetime.datetime.utcnow()
    )
    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return {
        "success": True,
        "request_id": ticket.request_id,
        "message": "Your escalation request has been logged with School Management (Ref: " + ticket.request_id + "). Our administrative office will review it.",
        "ticket": {
            "id": ticket.id,
            "request_id": ticket.request_id,
            "type": "School Management Support",
            "status": ticket.status,
            "created_at": ticket.created_at.strftime("%Y-%m-%d %H:%M")
        }
    }


@router.get("/my-requests")
async def get_my_support_requests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve support tickets submitted by current user."""
    tickets = db.query(SupportRequest).filter(SupportRequest.user_id == user.id).order_by(SupportRequest.created_at.desc()).all()
    
    return {
        "success": True,
        "count": len(tickets),
        "requests": [
            {
                "id": t.id,
                "request_id": t.request_id,
                "request_type": "Teacher Call" if t.request_type == "teacher_call" else "Management Escalation",
                "description": t.description,
                "status": t.status,
                "created_at": t.created_at.strftime("%Y-%m-%d %H:%M")
            } for t in tickets
        ]
    }


@router.get("/all")
async def get_all_support_requests(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Principal / Teacher view: View all active institutional support tickets."""
    if user.role not in ["principal", "teacher"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Only School Management and Teachers can review all support tickets."
        )

    tickets = db.query(SupportRequest).order_by(SupportRequest.created_at.desc()).all()
    
    return {
        "success": True,
        "count": len(tickets),
        "requests": [
            {
                "id": t.id,
                "request_id": t.request_id,
                "user_name": t.user.full_name if t.user else "Unknown",
                "role": t.role,
                "request_type": "Teacher Call" if t.request_type == "teacher_call" else "Management Escalation",
                "description": t.description,
                "status": t.status,
                "created_at": t.created_at.strftime("%Y-%m-%d %H:%M")
            } for t in tickets
        ]
    }
