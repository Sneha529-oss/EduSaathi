from typing import Any, Optional
from fastapi import HTTPException, status
from app.models.entities import User, Student, Parent, Teacher


class AuthorizationService:
    """
    Centralized Deterministic Authorization Engine for EduSaathi.
    Validates permissions before any protected action or data access.
    Zero trust in LLM/prompt claims.
    """

    PERMISSION_MATRIX = {
        "student": {
            "view_own_attendance": True,
            "view_own_academics": True,
            "ask_academic_questions": True,
            "request_support": True,
            "view_child_attendance": False,
            "view_class_attendance": False,
            "view_school_attendance": False,
            "mark_attendance": False,
            "enter_grades": False,
            "view_school_analytics": False,
        },
        "parent": {
            "view_own_attendance": False,
            "view_own_academics": False,
            "ask_academic_questions": True,
            "request_support": True,
            "view_child_attendance": True,
            "view_child_academics": True,
            "request_teacher_call": True,
            "view_class_attendance": False,
            "view_school_attendance": False,
            "mark_attendance": False,
            "enter_grades": False,
            "view_school_analytics": False,
        },
        "teacher": {
            "view_own_attendance": False,
            "view_own_academics": False,
            "ask_academic_questions": True,
            "request_support": True,
            "view_child_attendance": False,
            "view_class_attendance": True,
            "view_class_academics": True,
            "mark_attendance": True,
            "enter_grades": True,
            "view_school_attendance": False,
            "view_school_analytics": False,
        },
        "principal": {
            "view_own_attendance": False,
            "view_own_academics": False,
            "ask_academic_questions": True,
            "request_support": True,
            "view_child_attendance": True,
            "view_class_attendance": True,
            "view_school_attendance": True,
            "mark_attendance": True,
            "enter_grades": True,
            "view_school_analytics": True,
            "manage_school": True,
        }
    }

    @classmethod
    def can_perform(cls, role: str, action: str) -> bool:
        """Checks if a role has general permission for an action."""
        role_perms = cls.PERMISSION_MATRIX.get(role.lower(), {})
        return role_perms.get(action, False)

    @classmethod
    def authorize(
        cls,
        user: User,
        action: str,
        resource: Optional[Any] = None,
        db: Optional[Any] = None
    ) -> bool:
        """
        Validates whether the authenticated user has permission to execute an action on a specific resource.
        Raises HTTPException(403) if unauthorized.
        """
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User session is invalid or inactive."
            )

        role = user.role.lower()

        # 1. Check general role permission
        if not cls.can_perform(role, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Role '{user.role}' is not authorized to perform action '{action}'."
            )

        # 2. Resource-level ownership & boundary checks
        if action == "view_child_attendance" or action == "view_child_academics":
            if role == "principal":
                return True
            if role == "parent":
                if resource is not None and db is not None:
                    # Resource should be student_id (int)
                    parent_rec = db.query(Parent).filter(Parent.user_id == user.id).first()
                    if not parent_rec or parent_rec.student_id != int(resource):
                        raise HTTPException(
                            status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access Denied: You are only authorized to view your own child's records."
                        )
                return True
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: Only authorized parents or leadership can view child records."
            )

        if action == "mark_attendance" or action == "enter_grades":
            if role in ["teacher", "principal"]:
                return True
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: Only teachers or principals can modify records. Role '{user.role}' is unauthorized."
            )

        if action == "view_school_analytics" or action == "view_school_attendance":
            if role == "principal":
                return True
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: School-wide analytics are restricted to Principal and School Management."
            )

        return True
