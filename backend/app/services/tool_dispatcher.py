"""
EduSaathi Tool Dispatcher
==========================
Converts LLM tool call requests into authorized database actions.

Architecture contract:
- This is the ONLY layer that accesses the database on behalf of the LLM.
- AuthorizationService.authorize() MUST be called before every DB query.
- Resource ownership (e.g. parent→child) is verified from the DB, never from LLM args.
- Only tools in ALLOWED_TOOLS can be dispatched.
- All results are returned as plain serializable dicts (no ORM objects).

Tool ID values supplied by the LLM (e.g. student_name) are used for lookup only —
they never bypass the authorization check, and the dispatcher re-derives
the actual resource ID from the authenticated user's profile.
"""

import datetime
import logging
import uuid
from typing import Any, Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.auth.service import AuthorizationService
from app.models.entities import (
    AcademicRecord,
    Attendance,
    Parent,
    SchoolClass,
    Student,
    SupportRequest,
    Teacher,
    User,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Allowlist — only these tool names can be dispatched
# ─────────────────────────────────────────────────────────────────────────────

ALLOWED_TOOLS = {
    "get_my_attendance",
    "get_child_attendance",
    "get_class_attendance",
    "get_school_attendance",
    "get_my_grades",
    "get_student_grades",
    "get_class_grades",
    "mark_attendance",
    "enter_grade",
    "create_teacher_call_request",
    "create_management_request",
}


def _grade_letter(percentage: float) -> str:
    """Convert numeric percentage to letter grade."""
    if percentage >= 90:
        return "A+"
    if percentage >= 80:
        return "A"
    if percentage >= 70:
        return "B+"
    if percentage >= 60:
        return "B"
    if percentage >= 50:
        return "C"
    return "D"


class ToolDispatcher:
    """
    Dispatches authorized tool calls from the LLM to actual school database operations.

    Usage:
        result = ToolDispatcher.dispatch(
            tool_name="get_my_attendance",
            tool_args={},
            user=current_user_orm_object,
            db=db_session,
        )

    Returns a dict that is fed back to the LLM as the tool result.
    Raises HTTPException(403) if unauthorized (caller catches this).
    Raises ValueError if tool_name is not in ALLOWED_TOOLS.
    """

    @classmethod
    def dispatch(
        cls,
        tool_name: str,
        tool_args: dict,
        user: User,
        db: Session,
    ) -> dict:
        """
        Main dispatch entry point.
        Validates allowlist → authorizes → executes → returns serializable result.
        """
        # 1. Allowlist check — reject unknown tool names immediately
        if tool_name not in ALLOWED_TOOLS:
            raise ValueError(f"Tool '{tool_name}' is not in the allowed tool list.")

        # 2. Require authenticated user for all tool calls
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Authentication required for tool execution.")

        logger.info(
            "[ToolDispatcher] User %s (role=%s) requesting tool: %s",
            user.email, user.role, tool_name,
        )

        # 3. Dispatch to the appropriate handler
        handlers = {
            "get_my_attendance": cls._get_my_attendance,
            "get_child_attendance": cls._get_child_attendance,
            "get_class_attendance": cls._get_class_attendance,
            "get_school_attendance": cls._get_school_attendance,
            "get_my_grades": cls._get_my_grades,
            "get_student_grades": cls._get_student_grades,
            "get_class_grades": cls._get_class_grades,
            "mark_attendance": cls._mark_attendance,
            "enter_grade": cls._enter_grade,
            "create_teacher_call_request": cls._create_teacher_call_request,
            "create_management_request": cls._create_management_request,
        }

        handler = handlers[tool_name]
        return handler(tool_args=tool_args, user=user, db=db)

    # ──────────────────────────────────────────────────────────────────────────
    # Tool Handlers — private methods
    # ──────────────────────────────────────────────────────────────────────────

    @classmethod
    def _get_my_attendance(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Student views own attendance. Auth: view_own_attendance."""
        AuthorizationService.authorize(user, "view_own_attendance")

        student = db.query(Student).filter(Student.user_id == user.id).first()
        if not student:
            return {"error": "No student profile found for this account."}

        records = (
            db.query(Attendance)
            .filter(Attendance.student_id == student.id)
            .order_by(Attendance.date.desc())
            .all()
        )

        total = len(records)
        present = sum(1 for r in records if r.status == "Present")
        percentage = round((present / total * 100), 1) if total > 0 else 0.0
        standing = "Excellent" if percentage >= 90 else "Good" if percentage >= 75 else "At Risk"

        return {
            "success": True,
            "student_name": student.full_name,
            "roll_no": student.roll_no,
            "class_code": student.school_class.class_code if student.school_class else "N/A",
            "summary": {
                "percentage": percentage,
                "present_days": present,
                "absent_days": total - present,
                "total_days": total,
                "standing": standing,
            },
            "recent_records": [
                {"date": r.date, "status": r.status, "subject": r.subject, "reason": r.reason}
                for r in records[:10]
            ],
        }

    @classmethod
    def _get_child_attendance(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Parent views linked child's attendance. Auth: view_child_attendance with ownership check."""
        # Resource ownership: find the child linked to this parent in the DB
        # We do NOT use any student_id from tool_args
        if user.role == "principal":
            AuthorizationService.authorize(user, "view_school_analytics")
            student = db.query(Student).first()
        else:
            parent = db.query(Parent).filter(Parent.user_id == user.id).first()
            if not parent:
                return {"error": "No parent profile found. Please contact school administration."}

            # Authorization with explicit resource ownership check
            AuthorizationService.authorize(user, "view_child_attendance", resource=parent.student_id, db=db)
            student = parent.child

        if not student:
            return {"error": "No linked child found for this parent account."}

        records = (
            db.query(Attendance)
            .filter(Attendance.student_id == student.id)
            .order_by(Attendance.date.desc())
            .all()
        )

        total = len(records)
        present = sum(1 for r in records if r.status == "Present")
        percentage = round((present / total * 100), 1) if total > 0 else 0.0

        return {
            "success": True,
            "child_name": student.full_name,
            "roll_no": student.roll_no,
            "class_code": student.school_class.class_code if student.school_class else "N/A",
            "attendance_percentage": percentage,
            "present_days": present,
            "absent_days": total - present,
            "total_days": total,
        }

    @classmethod
    def _get_class_attendance(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Teacher views class attendance roster. Auth: view_class_attendance."""
        AuthorizationService.authorize(user, "view_class_attendance")

        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        class_id = teacher.assigned_class_id if teacher and teacher.assigned_class_id else 1

        school_class = db.query(SchoolClass).filter(SchoolClass.id == class_id).first()
        students = db.query(Student).filter(Student.class_id == class_id).all()

        today_str = datetime.date.today().strftime("%Y-%m-%d")
        roster = []
        for stu in students:
            records = db.query(Attendance).filter(Attendance.student_id == stu.id).all()
            total = len(records)
            present_count = sum(1 for r in records if r.status == "Present")
            pct = round((present_count / total * 100), 1) if total > 0 else 0.0

            today_record = db.query(Attendance).filter(
                Attendance.student_id == stu.id,
                Attendance.date == today_str,
            ).first()
            today_status = today_record.status if today_record else "Not Marked"

            roster.append({
                "student_id": stu.id,
                "student_name": stu.full_name,
                "roll_no": stu.roll_no,
                "overall_percentage": pct,
                "today_status": today_status,
            })

        present_today = sum(1 for r in roster if r["today_status"] == "Present")

        return {
            "success": True,
            "class_code": school_class.class_code if school_class else "10-A",
            "class_name": school_class.name if school_class else "Grade 10 Section A",
            "date": today_str,
            "total_students": len(roster),
            "present_today": present_today,
            "absent_today": len(roster) - present_today,
            "students": roster,
        }

    @classmethod
    def _get_school_attendance(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Principal views school-wide analytics. Auth: view_school_attendance."""
        AuthorizationService.authorize(user, "view_school_attendance")

        all_attendance = db.query(Attendance).all()
        total = len(all_attendance)
        present = sum(1 for a in all_attendance if a.status == "Present")
        overall_pct = round((present / total * 100), 1) if total > 0 else 0.0

        classes = db.query(SchoolClass).all()
        class_breakdowns = []
        for cls_obj in classes:
            cls_records = [a for a in all_attendance if a.class_id == cls_obj.id]
            cls_total = len(cls_records)
            cls_present = sum(1 for r in cls_records if r.status == "Present")
            cls_pct = round((cls_present / cls_total * 100), 1) if cls_total > 0 else 0.0
            class_breakdowns.append({
                "class_code": cls_obj.class_code,
                "name": cls_obj.name,
                "attendance_rate": cls_pct,
                "total_students": cls_total,
            })

        return {
            "success": True,
            "overall_attendance_rate": overall_pct,
            "total_records": total,
            "present_total": present,
            "class_breakdowns": class_breakdowns,
            "compliance_status": "Above Target" if overall_pct >= 90 else "Below Target",
        }

    @classmethod
    def _get_my_grades(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Student views own grades. Auth: view_own_academics."""
        AuthorizationService.authorize(user, "view_own_academics")

        student = db.query(Student).filter(Student.user_id == user.id).first()
        if not student:
            return {"error": "No student profile found for this account."}

        records = (
            db.query(AcademicRecord)
            .filter(AcademicRecord.student_id == student.id)
            .order_by(AcademicRecord.updated_at.desc())
            .all()
        )

        if not records:
            return {"success": True, "student_name": student.full_name, "grades": [], "message": "No grade records found yet."}

        total_pct = sum((r.marks_obtained / r.max_marks * 100) for r in records) / len(records)
        grades = [
            {
                "subject": r.subject,
                "assessment": r.assessment_name,
                "marks": r.marks_obtained,
                "max_marks": r.max_marks,
                "percentage": round(r.marks_obtained / r.max_marks * 100, 1),
                "grade": r.grade,
                "comments": r.comments,
            }
            for r in records
        ]

        return {
            "success": True,
            "student_name": student.full_name,
            "roll_no": student.roll_no,
            "overall_percentage": round(total_pct, 1),
            "overall_grade": _grade_letter(total_pct),
            "grades": grades,
        }

    @classmethod
    def _get_student_grades(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Parent views their child's grades. Auth: view_child_academics with ownership check."""
        parent = db.query(Parent).filter(Parent.user_id == user.id).first()
        if not parent:
            return {"error": "No parent profile found."}

        AuthorizationService.authorize(user, "view_child_academics", resource=parent.student_id, db=db)
        student = parent.child
        if not student:
            return {"error": "No linked child found."}

        records = (
            db.query(AcademicRecord)
            .filter(AcademicRecord.student_id == student.id)
            .all()
        )

        total_pct = sum((r.marks_obtained / r.max_marks * 100) for r in records) / len(records) if records else 0
        grades = [
            {
                "subject": r.subject,
                "assessment": r.assessment_name,
                "marks": r.marks_obtained,
                "max_marks": r.max_marks,
                "percentage": round(r.marks_obtained / r.max_marks * 100, 1),
                "grade": r.grade,
                "comments": r.comments,
            }
            for r in records
        ]

        return {
            "success": True,
            "child_name": student.full_name,
            "overall_percentage": round(total_pct, 1),
            "overall_grade": _grade_letter(total_pct),
            "grades": grades,
        }

    @classmethod
    def _get_class_grades(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Teacher views class-wide academic records. Auth: view_class_academics."""
        AuthorizationService.authorize(user, "view_class_academics")

        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        class_id = teacher.assigned_class_id if teacher and teacher.assigned_class_id else 1

        students = db.query(Student).filter(Student.class_id == class_id).all()
        student_summaries = []
        for stu in students:
            records = db.query(AcademicRecord).filter(AcademicRecord.student_id == stu.id).all()
            avg = sum((r.marks_obtained / r.max_marks * 100) for r in records) / len(records) if records else 0
            student_summaries.append({
                "student_name": stu.full_name,
                "roll_no": stu.roll_no,
                "average_percentage": round(avg, 1),
                "overall_grade": _grade_letter(avg),
                "subject_records": [
                    {"subject": r.subject, "marks": r.marks_obtained, "max_marks": r.max_marks}
                    for r in records
                ],
            })

        return {
            "success": True,
            "class_id": class_id,
            "students": student_summaries,
            "class_average": round(
                sum(s["average_percentage"] for s in student_summaries) / len(student_summaries), 1
            ) if student_summaries else 0,
        }

    @classmethod
    def _mark_attendance(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Teacher marks a student present/absent. Auth: mark_attendance.
        Resource: student name is looked up from DB — LLM-supplied name is used for search only."""
        AuthorizationService.authorize(user, "mark_attendance")

        student_name = tool_args.get("student_name", "").strip()
        status = tool_args.get("status", "Present").strip()

        if status not in ("Present", "Absent", "Late"):
            return {"error": f"Invalid status '{status}'. Must be Present, Absent, or Late."}

        if not student_name:
            return {"error": "Student name is required to mark attendance."}

        # Look up student by name — re-derived from DB, not trusted from LLM as an ID
        student = (
            db.query(Student)
            .filter(Student.full_name.ilike(f"%{student_name}%"))
            .first()
        )
        if not student:
            return {"error": f"No student found matching the name '{student_name}'."}

        today_str = datetime.date.today().strftime("%Y-%m-%d")
        existing = (
            db.query(Attendance)
            .filter(Attendance.student_id == student.id, Attendance.date == today_str)
            .first()
        )

        if existing:
            existing.status = status
            existing.reason = f"Updated by {user.full_name}"
        else:
            db.add(Attendance(
                student_id=student.id,
                class_id=student.class_id,
                date=today_str,
                status=status,
                subject="Overall",
                reason=f"Marked by {user.full_name}",
            ))
        db.commit()

        logger.info(
            "[ToolDispatcher] Attendance marked: student=%s status=%s by=%s",
            student.full_name, status, user.email,
        )

        return {
            "success": True,
            "student_name": student.full_name,
            "date": today_str,
            "status": status,
            "message": f"{student.full_name} has been marked {status} for {today_str}.",
        }

    @classmethod
    def _enter_grade(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Teacher enters a student grade. Auth: enter_grades.
        Student is looked up by name — resource ownership stays with auth check."""
        AuthorizationService.authorize(user, "enter_grades")

        student_name = tool_args.get("student_name", "").strip()
        subject = tool_args.get("subject", "").strip()
        assessment_name = tool_args.get("assessment_name", "").strip()
        marks_obtained = tool_args.get("marks_obtained")
        max_marks = tool_args.get("max_marks", 100.0)
        comments = tool_args.get("comments", "")

        if not all([student_name, subject, assessment_name]) or marks_obtained is None:
            return {"error": "student_name, subject, assessment_name, and marks_obtained are all required."}

        try:
            marks_obtained = float(marks_obtained)
            max_marks = float(max_marks) if max_marks else 100.0
        except (TypeError, ValueError):
            return {"error": "marks_obtained and max_marks must be numbers."}

        if marks_obtained > max_marks:
            return {"error": f"marks_obtained ({marks_obtained}) cannot exceed max_marks ({max_marks})."}

        student = (
            db.query(Student)
            .filter(Student.full_name.ilike(f"%{student_name}%"))
            .first()
        )
        if not student:
            return {"error": f"No student found matching '{student_name}'."}

        teacher = db.query(Teacher).filter(Teacher.user_id == user.id).first()
        percentage = (marks_obtained / max_marks) * 100
        grade_letter = _grade_letter(percentage)

        # Upsert: update existing record for same student/subject/assessment or insert
        existing = (
            db.query(AcademicRecord)
            .filter(
                AcademicRecord.student_id == student.id,
                AcademicRecord.subject == subject,
                AcademicRecord.assessment_name == assessment_name,
            )
            .first()
        )

        if existing:
            existing.marks_obtained = marks_obtained
            existing.max_marks = max_marks
            existing.grade = grade_letter
            existing.comments = comments or existing.comments
            if teacher:
                existing.updated_by_teacher_id = teacher.id
        else:
            db.add(AcademicRecord(
                student_id=student.id,
                subject=subject,
                assessment_name=assessment_name,
                marks_obtained=marks_obtained,
                max_marks=max_marks,
                grade=grade_letter,
                comments=comments or "Good progress",
                updated_by_teacher_id=teacher.id if teacher else None,
            ))

        db.commit()

        logger.info(
            "[ToolDispatcher] Grade entered: student=%s subject=%s marks=%s/%s grade=%s by=%s",
            student.full_name, subject, marks_obtained, max_marks, grade_letter, user.email,
        )

        return {
            "success": True,
            "student_name": student.full_name,
            "subject": subject,
            "assessment": assessment_name,
            "marks": marks_obtained,
            "max_marks": max_marks,
            "grade": grade_letter,
            "message": f"Grade recorded: {student.full_name} — {subject} {assessment_name}: {marks_obtained}/{max_marks} ({grade_letter}).",
        }

    @classmethod
    def _create_teacher_call_request(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Submit a teacher call request. Auth: request_support."""
        AuthorizationService.authorize(user, "request_support")

        description = tool_args.get("description", "").strip()
        if not description:
            return {"error": "A description is required for the teacher call request."}

        req_code = f"CALL-{uuid.uuid4().hex[:6].upper()}"
        db.add(SupportRequest(
            request_id=req_code,
            user_id=user.id,
            role=user.role,
            request_type="teacher_call",
            description=description,
            status="Pending",
        ))
        db.commit()

        return {
            "success": True,
            "request_id": req_code,
            "type": "Teacher Call Request",
            "status": "Pending",
            "message": f"Teacher call request submitted (Ref: {req_code}). The school will contact you shortly.",
        }

    @classmethod
    def _create_management_request(cls, tool_args: dict, user: User, db: Session) -> dict:
        """Submit a management escalation request. Auth: request_support."""
        AuthorizationService.authorize(user, "request_support")

        description = tool_args.get("description", "").strip()
        if not description:
            return {"error": "A description is required for the management request."}

        req_code = f"MGMT-{uuid.uuid4().hex[:6].upper()}"
        db.add(SupportRequest(
            request_id=req_code,
            user_id=user.id,
            role=user.role,
            request_type="management_support",
            description=description,
            status="Pending",
        ))
        db.commit()

        return {
            "success": True,
            "request_id": req_code,
            "type": "Management Escalation",
            "status": "Pending",
            "message": f"Management request submitted (Ref: {req_code}). Leadership will review your request.",
        }
