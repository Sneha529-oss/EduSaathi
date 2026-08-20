from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.entities import User
from app.auth.jwt import get_current_user, get_optional_current_user
from app.auth.service import AuthorizationService

router = APIRouter(prefix="/security")


class SecurityTestActionRequest(BaseModel):
    action: str
    target_resource: Optional[str] = None


@router.get("/matrix")
async def get_permission_matrix():
    """Returns the deterministic application-level permission matrix and active security layers."""
    return {
        "success": True,
        "permission_matrix": [
            {
                "action": "View Own Attendance",
                "key": "view_own_attendance",
                "student": True,
                "parent": False,
                "teacher": False,
                "principal": False,
                "description": "Student can view personal attendance records."
            },
            {
                "action": "View Child Attendance",
                "key": "view_child_attendance",
                "student": False,
                "parent": True,
                "teacher": False,
                "principal": True,
                "description": "Parent can view only their verified child's records. Principal has global access."
            },
            {
                "action": "View Class Attendance",
                "key": "view_class_attendance",
                "student": False,
                "parent": False,
                "teacher": True,
                "principal": True,
                "description": "Teachers can inspect full rosters for assigned classes."
            },
            {
                "action": "Mark Attendance",
                "key": "mark_attendance",
                "student": False,
                "parent": False,
                "teacher": True,
                "principal": True,
                "description": "Authorized teachers/principals can mark student attendance."
            },
            {
                "action": "View Academic Records",
                "key": "view_own_academics",
                "student": True,
                "parent": True,
                "teacher": True,
                "principal": True,
                "description": "Role-bounded access to grades and exam scorecards."
            },
            {
                "action": "Enter / Update Grades",
                "key": "enter_grades",
                "student": False,
                "parent": False,
                "teacher": True,
                "principal": True,
                "description": "Only faculty and administration can mutate grades."
            },
            {
                "action": "View School-Wide Analytics",
                "key": "view_school_analytics",
                "student": False,
                "parent": False,
                "teacher": False,
                "principal": True,
                "description": "Executive metrics restricted exclusively to School Leadership."
            },
            {
                "action": "Request Teacher Support",
                "key": "request_teacher_call",
                "student": True,
                "parent": True,
                "teacher": False,
                "principal": False,
                "description": "Parents & students can submit verified teacher call tickets."
            },
            {
                "action": "Request Management Escalation",
                "key": "request_support",
                "student": True,
                "parent": True,
                "teacher": True,
                "principal": True,
                "description": "All roles can log formal management inquiries."
            }
        ],
        "active_security_defenses": [
            {
                "defense": "Deterministic Backend Authorization",
                "status": "Active & Enforcing",
                "description": "All permissions evaluated in Python via authorize_action(). The AI LLM cannot grant access."
            },
            {
                "defense": "Resource Boundary Validation",
                "status": "Active & Enforcing",
                "description": "Parents can only query their own linked student ID (e.g. P001 -> STU001). Foreign lookups 403 Forbidden."
            },
            {
                "defense": "Strict Tool Allowlisting",
                "status": "Active & Enforcing",
                "description": "AI can only invoke registered, pre-approved tool signatures. No arbitrary SQL/Code execution."
            },
            {
                "defense": "Prompt Injection & Role Spoofing Shield",
                "status": "Active & Enforcing",
                "description": "Natural-language claims like 'I am actually the Principal' are ignored. Session JWT is authoritative."
            },
            {
                "defense": "Zero System-Prompt Exposure",
                "status": "Active & Enforcing",
                "description": "System architecture, internal prompts, and API keys are isolated on backend."
            }
        ]
    }


@router.post("/test-action")
async def test_security_action(
    req: SecurityTestActionRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Live Security Test Endpoint.
    Executes real backend authorization verification against authenticated role.
    Returns HTTP 200 with result payload if permitted, or raises HTTP 403 if unauthorized.
    """
    action_clean = req.action.strip()

    try:
        AuthorizationService.authorize(user, action_clean, resource=req.target_resource, db=db)
        return {
            "authorized": True,
            "status_code": 200,
            "user_id": user.id,
            "role": user.role,
            "action": action_clean,
            "message": f"SUCCESS: Role '{user.role}' is authorized to perform '{action_clean}'."
        }
    except HTTPException as e:
        return {
            "authorized": False,
            "status_code": e.status_code,
            "user_id": user.id,
            "role": user.role,
            "action": action_clean,
            "detail": e.detail,
            "message": f"ACCESS DENIED ({e.status_code}): {e.detail}"
        }
