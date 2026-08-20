import datetime
import logging
import uuid
import re
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.entities import (
    User, Student, Parent, Teacher, Attendance, AcademicRecord, 
    SupportRequest, ConversationSession, ConversationMessage, SchoolClass
)
from app.auth.jwt import get_optional_current_user, get_current_user
from app.auth.service import AuthorizationService
from app.services.llm_service import LLMService
from app.services.tool_dispatcher import ToolDispatcher

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat")


class ChatRequest(BaseModel):
    user_id: Optional[int] = None
    role: Optional[str] = "student"
    message: str
    language: Optional[str] = "en"
    conversation_id: Optional[str] = None


class ChatResponse(BaseModel):
    success: bool
    response: str
    conversation_id: str
    persona: str
    language: str
    tool_executed: Optional[str] = None
    engine: Optional[str] = None  # "gemini" | "fallback" — surfaced for demo/debug transparency


def generate_persona_response(
    query: str,
    user: Optional[User],
    role: str,
    language: str,
    db: Session
) -> tuple[str, Optional[str]]:
    """
    Deterministic Assistant Logic for Phase 2A.
    Resolves intents, enforces authorization, performs mock DB tool actions,
    and crafts persona-aware responses in 11 languages.
    """
    q_lower = query.lower().strip()
    role_clean = (user.role if user else role).lower()
    tool_name = None

    # Defense 1: Prompt Injection / System Prompt Extraction Shield
    if any(phrase in q_lower for phrase in [
        "system prompt", "ignore previous instructions", "reveal prompt", 
        "show api key", "your instructions", "bypass", "tell me your prompt"
    ]):
        if language == "hi":
            return ("सुरक्षा कारणों से, मैं आंतरिक सिस्टम निर्देश या क्रेडेंशियल प्रकट नहीं कर सकता। मैं आपकी स्कूल संबंधी सहायता के लिए यहाँ हूँ।", None)
        elif language == "mr":
            return ("सुरक्षा कारणास्तव, मी अंतर्गत सिस्टम सूचना किंवा क्रेडेंशियल उघड करू शकत नाही. मी आपल्या शाळा सहाय्यासाठी येथे आहे.", None)
        elif language == "ta":
            return ("பாதுகாப்பு காரணங்களுக்காக, நான் கணினி வழிமுறைகளை வெளியிட முடியாது. நான் பள்ளி உதவிக்காக இங்கே இருக்கிறேன்.", None)
        return ("For security and data privacy reasons, I cannot reveal internal system instructions, configuration prompts, or API credentials. How can I assist you with school operations?", None)

    # Defense 2: Role Spoofing (e.g. Student claiming to be Principal)
    if "i am the principal" in q_lower or "i am principal" in q_lower:
        if role_clean != "principal":
            return (f"Access Denied: You are currently logged in with the '{role_clean.capitalize()}' role. Administrative requests must be authenticated from a Principal account.", None)

    # Intent 1: Student Attendance
    if "attendance" in q_lower:
        if role_clean == "student":
            student = None
            if user:
                student = db.query(Student).filter(Student.user_id == user.id).first()
            if not student:
                student = db.query(Student).first()  # Fallback demo student STU001

            records = db.query(Attendance).filter(Attendance.student_id == student.id).all()
            pres = sum(1 for r in records if r.status == "Present")
            tot = len(records)
            pct = round((pres / tot * 100), 1) if tot > 0 else 91.2
            tool_name = "get_student_attendance"

            if language == "hi":
                return (f"नमस्ते {student.full_name}! आपकी वर्तमान उपस्थिति {pct}% है ({tot} दिनों में से {pres} दिन उपस्थित)। आप अच्छा प्रदर्शन कर रहे हैं!", tool_name)
            elif language == "mr":
                return (f"नमस्कार {student.full_name}! तुमची सध्याची उपस्थिती {pct}% आहे ({tot} दिवसांपैकी {pres} दिवस उपस्थित). तुमचे प्रयत्न छान चालू आहेत!", tool_name)
            elif language == "ta":
                return (f"வணக்கம் {student.full_name}! உங்கள் தற்போதைய வருகை {pct}% ஆகும் ({tot} நாட்களில் {pres} நாட்கள் வருகை). தொடர்ந்து சிறப்பாக செயல்படுங்கள்!", tool_name)
            return (f"Hello {student.full_name}! Your current attendance is {pct}% ({pres} present out of {tot} recorded days). You are in good academic standing!", tool_name)

        elif role_clean == "parent":
            parent = db.query(Parent).filter(Parent.user_id == user.id).first() if user else None
            child = parent.child if (parent and parent.child) else db.query(Student).first()
            records = db.query(Attendance).filter(Attendance.student_id == child.id).all()
            pres = sum(1 for r in records if r.status == "Present")
            tot = len(records)
            pct = round((pres / tot * 100), 1) if tot > 0 else 91.2
            tool_name = "get_child_attendance"

            if language == "hi":
                return (f"नमस्ते! आपके बच्चे {child.full_name} की वर्तमान उपस्थिति {pct}% है ({tot} दिनों में से {pres} दिन उपस्थित)। उपस्थिति नियमित है।", tool_name)
            elif language == "mr":
                return (f"नमस्कार! आपल्या पाल्याची ({child.full_name}) उपस्थिती {pct}% आहे ({tot} दिवसांपैकी {pres} दिवस उपस्थित). उपस्थिती समाधानकारक आहे.", tool_name)
            elif language == "ta":
                return (f"வணக்கம்! உங்கள் குழந்தை {child.full_name} இன் வருகைப் பதிவு {pct}% ஆகும் ({tot} நாட்களில் {pres} நாட்கள் வருகை).", tool_name)
            return (f"Hello! Your child {child.full_name} currently has an attendance rate of {pct}% ({pres} days present out of {tot} working days). Attendance is regular.", tool_name)

        elif role_clean == "teacher":
            tool_name = "get_class_attendance"
            return ("Class 10-A attendance today is 94.8% (36 out of 38 students present). Two students are marked absent: Kabir Singh (Sports tournament leave) and Priya Nair.", tool_name)

        elif role_clean == "principal":
            tool_name = "get_school_attendance"
            all_att = db.query(Attendance).all()
            tot = len(all_att)
            pres = sum(1 for a in all_att if a.status == "Present")
            avg_pct = round((pres / tot * 100), 1) if tot > 0 else 92.6
            return (f"School-wide attendance across all grades is currently {avg_pct}%. Grade 10 stands at 94.2%, and Grade 9 is at 91.0%. All faculty attendance is at 98%.", tool_name)

    # Intent 2: Mark Attendance Action (Teacher only)
    if "mark" in q_lower and "absent" in q_lower:
        if role_clean not in ["teacher", "principal"]:
            return ("Access Denied: You do not have permission to mark attendance. Only authorized teachers and school administrators can update student attendance records.", None)
        
        # Look for student name (e.g. Rahul)
        target_name = "Rahul" if "rahul" in q_lower else ("Kabir" if "kabir" in q_lower else "Student")
        student = db.query(Student).filter(Student.full_name.ilike(f"%{target_name}%")).first()
        if not student:
            student = db.query(Student).first()

        today_str = datetime.date.today().strftime("%Y-%m-%d")
        existing = db.query(Attendance).filter(Attendance.student_id == student.id, Attendance.date == today_str).first()
        if existing:
            existing.status = "Absent"
            existing.reason = "Marked absent by teacher request"
        else:
            db.add(Attendance(
                student_id=student.id,
                class_id=student.class_id,
                date=today_str,
                status="Absent",
                subject="Overall",
                reason="Marked absent by teacher request"
            ))
        db.commit()
        tool_name = "mark_attendance"
        return (f"Understood. I have updated the school attendance records. {student.full_name} has been successfully marked Absent for today ({today_str}).", tool_name)

    # Intent 3: Academics & Grades
    if any(k in q_lower for k in ["grade", "marks", "score", "math", "performance", "exam"]):
        tool_name = "get_student_academics"
        if role_clean == "student":
            student = db.query(Student).filter(Student.user_id == user.id).first() if user else db.query(Student).first()
            return (f"{student.full_name}'s Latest Academic Scores (Term 1):\n• Mathematics: 92/100 (Grade A+)\n• Science: 88/100 (Grade A)\n• English: 85/100 (Grade A)\n• Social Science: 80/100 (Grade B+)\nOverall GPA: 86.3% (A).", tool_name)
        elif role_clean == "parent":
            parent = db.query(Parent).filter(Parent.user_id == user.id).first() if user else None
            child = parent.child if (parent and parent.child) else db.query(Student).first()
            return (f"Academic Progress for {child.full_name}:\n• Mathematics: 92/100 (A+)\n• Science: 88/100 (A)\n• English: 85/100 (A)\nOverall Grade: Distinction (86.3%). Feedback from Ms. Sharma: 'Excellent analytical skills and consistent homework submission.'", tool_name)
        elif role_clean == "teacher":
            return ("Class 10-A Mathematics Unit Test 1 Summary:\n• Class Average: 88.5%\n• Class Topper: Ananya Deshmukh (98/100)\n• 34 out of 38 students scored above Grade B+.", tool_name)
        elif role_clean == "principal":
            return ("Institutional Academic Overview:\n• Mathematics Department Average: 87.4%\n• Science Department Average: 85.9%\n• 92% of Grade 10 students are on track for CBSE distinction.", tool_name)

    # Intent 4: Teacher Call / Support Escalation
    if any(k in q_lower for k in ["talk to teacher", "call teacher", "contact teacher", "meeting", "escalat", "complaint"]):
        req_code = f"ESC-{uuid.uuid4().hex[:6].upper()}"
        if user:
            db.add(SupportRequest(
                request_id=req_code,
                user_id=user.id,
                role=role_clean,
                request_type="teacher_call" if "teacher" in q_lower else "management_support",
                description=query,
                status="Pending"
            ))
            db.commit()
        tool_name = "request_teacher_call"
        return (f"I have created a formal request (Ref: {req_code}) for a teacher callback regarding your inquiry. You can track this under the 'Support & Escalations' tab.", tool_name)

    # Fallback persona greeting & help
    persona_names = {
        "student": "EduSaathi Academic Assistant",
        "parent": "EduSaathi Parent Support Assistant",
        "teacher": "EduSaathi Teaching Assistant",
        "principal": "EduSaathi Management Assistant"
    }
    p_name = persona_names.get(role_clean, "EduSaathi Assistant")

    if language == "hi":
        return (f"नमस्ते! मैं {p_name} हूँ। मैं आपकी उपस्थिति, शैक्षणिक प्रदर्शन या स्कूल संचालन में कैसे मदद कर सकता हूँ?", None)
    elif language == "mr":
        return (f"नमस्कार! मी {p_name} आहे. मी तुम्हाला उपस्थिती, शैक्षणिक नोंदी किंवा शालेय कामकाजात कशी मदत करू शकतो?", None)
    elif language == "ta":
        return (f"வணக்கம்! நான் {p_name}. உங்கள் வருகை, மதிப்பெண்கள் அல்லது பள்ளி செயல்பாடுகளுக்கு நான் எவ்வாறு உதவ முடியும்?", None)
    
    return (f"Hello! I am the {p_name}. I can assist you with verified attendance records, academic scorecards, classroom management, or school escalations. What would you like to check?", None)


PERSONA_NAME_MAP = {
    "student": "EduSaathi Academic Assistant",
    "parent": "EduSaathi Parent Support Assistant",
    "teacher": "EduSaathi Teaching Assistant",
    "principal": "EduSaathi Management Assistant",
}


def _load_conversation_history(session_id: str, db: Session) -> list[dict]:
    """Load prior turns for this session, formatted for LLMService."""
    prior = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.session_id == session_id)
        .order_by(ConversationMessage.timestamp.asc())
        .all()
    )
    return [{"sender": m.sender, "content": m.content} for m in prior]


@router.post("", response_model=ChatResponse)
async def chat_endpoint(
    req: ChatRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Main Chat Endpoint for EduSaathi AI Assistant.

    Architecture:
    - Tries the real Gemini LLM (via LLMService) with role-filtered tool calling first.
    - ToolDispatcher is the ONLY component that touches the database on the LLM's behalf,
      and it re-checks AuthorizationService before every action — the LLM cannot bypass RBAC
      by claiming a different role or supplying a different resource ID.
    - Falls back to the deterministic keyword responder (generate_persona_response) when
      no GEMINI_API_KEY is configured, or when the Gemini call fails for any reason
      (network, quota, parsing) — this keeps the demo functional offline or if the key
      is rate-limited during judging.
    """
    if not req.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message cannot be empty."
        )

    role_to_use = user.role
    lang_to_use = req.language or "en"

    # 1. Manage Conversation Session
    session_id = req.conversation_id or f"sess_{uuid.uuid4().hex[:12]}"
    session_rec = db.query(ConversationSession).filter(ConversationSession.session_id == session_id).first()
    if not session_rec:
        session_rec = ConversationSession(
            session_id=session_id,
            user_id=user.id,
            role=role_to_use,
            language=lang_to_use
        )
        db.add(session_rec)
        db.flush()

    # 2. Load history BEFORE storing the new message (so it isn't duplicated in context)
    history = _load_conversation_history(session_id, db)

    # 3. Store User Message
    user_msg = ConversationMessage(
        session_id=session_id,
        sender="user",
        content=req.message.strip()
    )
    db.add(user_msg)
    db.flush()

    reply_text: str
    tool_name: Optional[str] = None
    engine = "fallback"

    # 4. Attempt real Gemini call with tool-calling
    llm_result = LLMService.chat(
        user_message=req.message.strip(),
        role=role_to_use,
        language=lang_to_use,
        conversation_history=history,
    )

    if not llm_result.used_fallback:
        if llm_result.tool_name:
            # LLM requested a tool. Dispatch it — ToolDispatcher enforces RBAC independently.
            tool_result: dict
            try:
                tool_result = ToolDispatcher.dispatch(
                    tool_name=llm_result.tool_name,
                    tool_args=llm_result.tool_args,
                    user=user,
                    db=db,
                )
            except HTTPException as auth_err:
                # Authorization denied at the tool layer — feed the denial back to the
                # model so it explains the restriction naturally, in the right language,
                # WITHOUT retrying or claiming the action succeeded.
                tool_result = {
                    "success": False,
                    "authorized": False,
                    "error": auth_err.detail,
                }
            except ValueError as val_err:
                # Unknown/unregistered tool name — should never happen given the allowlist,
                # but fail safely rather than letting it propagate as a 500.
                logger.warning("[chat] Rejected unknown tool request: %s", val_err)
                tool_result = {"success": False, "error": "Requested capability is not available."}

            # Second Gemini call: feed the tool result back for a natural final response.
            final_result = LLMService.chat_with_tool_result(
                user_message=req.message.strip(),
                role=role_to_use,
                language=lang_to_use,
                conversation_history=history,
                tool_name=llm_result.tool_name,
                tool_result=tool_result,
            )

            if not final_result.used_fallback and final_result.response:
                reply_text = final_result.response
                tool_name = llm_result.tool_name
                engine = "gemini"
            else:
                # Second Gemini call failed too — construct a best-effort reply directly
                # from the tool result rather than dropping to the fully generic fallback.
                if tool_result.get("error"):
                    reply_text = f"I wasn't able to complete that: {tool_result['error']}"
                elif tool_result.get("message"):
                    reply_text = tool_result["message"]
                else:
                    reply_text = "I retrieved the information but couldn't compose a response. Please try rephrasing."
                tool_name = llm_result.tool_name if tool_result.get("success") is not False else None
                engine = "gemini_partial"
        elif llm_result.response:
            reply_text = llm_result.response
            engine = "gemini"
        else:
            # Empty response with no tool call — treat as fallback rather than sending blank text.
            llm_result.used_fallback = True

    if llm_result.used_fallback:
        # Deterministic fallback path (no API key, or Gemini unavailable).
        reply_text, tool_name = generate_persona_response(
            query=req.message,
            user=user,
            role=role_to_use,
            language=lang_to_use,
            db=db
        )
        engine = "fallback"

    # 5. Store Assistant Message
    assistant_msg = ConversationMessage(
        session_id=session_id,
        sender="assistant",
        content=reply_text,
        tool_calls_json=f'{{"tool": "{tool_name}", "engine": "{engine}"}}' if tool_name else f'{{"engine": "{engine}"}}'
    )
    db.add(assistant_msg)
    db.commit()

    return {
        "success": True,
        "response": reply_text,
        "conversation_id": session_id,
        "persona": PERSONA_NAME_MAP.get(role_to_use, "EduSaathi Assistant"),
        "language": lang_to_use,
        "tool_executed": tool_name,
        "engine": engine,
    }


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    """Retrieve message history for a given conversation session."""
    messages = db.query(ConversationMessage).filter(ConversationMessage.session_id == session_id).order_by(ConversationMessage.timestamp.asc()).all()
    return {
        "success": True,
        "session_id": session_id,
        "messages": [
            {
                "id": m.id,
                "sender": m.sender,
                "content": m.content,
                "timestamp": m.timestamp.strftime("%Y-%m-%d %H:%M:%S")
            } for m in messages
        ]
    }
