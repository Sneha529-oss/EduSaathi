import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.session import Base


def get_utc_now():
    return datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # student, parent, teacher, principal
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=get_utc_now)

    # Relationships with explicit foreign_keys
    student_profile = relationship("Student", back_populates="user", uselist=False, foreign_keys="Student.user_id")
    parent_profile = relationship("Parent", back_populates="user", uselist=False, foreign_keys="Parent.user_id")
    teacher_profile = relationship("Teacher", back_populates="user", uselist=False, foreign_keys="Teacher.user_id")
    support_requests = relationship("SupportRequest", back_populates="user", foreign_keys="SupportRequest.user_id")


class SchoolClass(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True, index=True)
    class_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g., "10-A", "TY-CSE-A"
    name = Column(String(100), nullable=False)
    grade = Column(String(50), nullable=False)
    section = Column(String(20), nullable=False)
    department = Column(String(100), default="General")

    students = relationship("Student", back_populates="school_class")
    attendance_records = relationship("Attendance", back_populates="school_class")


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    student_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "STU001"
    full_name = Column(String(255), nullable=False)
    roll_no = Column(String(50), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    parent_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    contact_number = Column(String(50), default="+91 9876543210")

    user = relationship("User", back_populates="student_profile", foreign_keys=[user_id])
    parent_user = relationship("User", foreign_keys=[parent_user_id])
    school_class = relationship("SchoolClass", back_populates="students")
    attendance_records = relationship("Attendance", back_populates="student")
    academic_records = relationship("AcademicRecord", back_populates="student")


class Parent(Base):
    __tablename__ = "parents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    phone_number = Column(String(50), default="+91 9876501234")
    occupation = Column(String(100), default="Professional")

    user = relationship("User", back_populates="parent_profile", foreign_keys=[user_id])
    child = relationship("Student", foreign_keys=[student_id])


class Teacher(Base):
    __tablename__ = "teachers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    employee_code = Column(String(50), unique=True, index=True, nullable=False)  # e.g. "T001"
    department = Column(String(100), nullable=False)
    subject_specialization = Column(String(100), nullable=False)
    assigned_class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)

    user = relationship("User", back_populates="teacher_profile", foreign_keys=[user_id])
    assigned_class = relationship("SchoolClass")


class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)
    date = Column(String(50), nullable=False)  # YYYY-MM-DD
    status = Column(String(20), nullable=False)  # Present, Absent, Late
    subject = Column(String(100), default="Overall")
    marked_by_teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    reason = Column(String(255), default="")
    created_at = Column(DateTime, default=get_utc_now)

    student = relationship("Student", back_populates="attendance_records")
    school_class = relationship("SchoolClass", back_populates="attendance_records")


class AcademicRecord(Base):
    __tablename__ = "academic_records"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    subject = Column(String(100), nullable=False)
    assessment_name = Column(String(100), nullable=False)  # Unit Test 1, Midterm, Final Exam
    marks_obtained = Column(Float, nullable=False)
    max_marks = Column(Float, default=100.0)
    grade = Column(String(10), nullable=False)  # A+, A, B, C, etc.
    term = Column(String(50), default="Term 1 (2025-26)")
    comments = Column(String(255), default="Good progress")
    updated_by_teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    student = relationship("Student", back_populates="academic_records")


class SupportRequest(Base):
    __tablename__ = "support_requests"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String(50), nullable=False)
    request_type = Column(String(50), nullable=False)  # teacher_call, management_support
    target_teacher_id = Column(Integer, ForeignKey("teachers.id"), nullable=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="Pending")  # Pending, In Progress, Resolved
    resolution_notes = Column(Text, default="")
    created_at = Column(DateTime, default=get_utc_now)

    user = relationship("User", back_populates="support_requests", foreign_keys=[user_id])


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    role = Column(String(50), default="student")
    language = Column(String(10), default="en")
    created_at = Column(DateTime, default=get_utc_now)
    updated_at = Column(DateTime, default=get_utc_now, onupdate=get_utc_now)

    messages = relationship("ConversationMessage", back_populates="session", cascade="all, delete-orphan")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), ForeignKey("conversation_sessions.session_id"), nullable=False)
    sender = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    tool_calls_json = Column(Text, nullable=True)
    tool_results_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=get_utc_now)

    session = relationship("ConversationSession", back_populates="messages")
