from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.entities import User, Student, Parent, Teacher, SchoolClass
from app.auth.jwt import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth")


class LoginRequest(BaseModel):
    email: str
    password: str


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str
    role: str  # student, parent, teacher, principal
    class_code: Optional[str] = "10-A"
    roll_no: Optional[str] = "10A99"
    student_code: Optional[str] = "STU099"
    phone_number: Optional[str] = "+91 9800000000"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email and password, returning JWT token and profile."""
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated."
        )

    token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    
    # Enrich user profile
    profile_data = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }

    if user.role == "student" and user.student_profile:
        profile_data["student_id"] = user.student_profile.id
        profile_data["student_code"] = user.student_profile.student_code
        profile_data["roll_no"] = user.student_profile.roll_no
        profile_data["class_id"] = user.student_profile.class_id
        if user.student_profile.school_class:
            profile_data["class_code"] = user.student_profile.school_class.class_code
    elif user.role == "parent" and user.parent_profile:
        profile_data["parent_id"] = user.parent_profile.id
        profile_data["child_student_id"] = user.parent_profile.student_id
        if user.parent_profile.child:
            profile_data["child_name"] = user.parent_profile.child.full_name
            profile_data["child_code"] = user.parent_profile.child.student_code
    elif user.role == "teacher" and user.teacher_profile:
        profile_data["teacher_id"] = user.teacher_profile.id
        profile_data["employee_code"] = user.teacher_profile.employee_code
        profile_data["department"] = user.teacher_profile.department
        profile_data["assigned_class_id"] = user.teacher_profile.assigned_class_id
        if user.teacher_profile.assigned_class:
            profile_data["assigned_class_code"] = user.teacher_profile.assigned_class.class_code

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": profile_data
    }


@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new demo user with automatic profile linkage."""
    email_clean = req.email.lower().strip()
    existing = db.query(User).filter(User.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists."
        )

    role_clean = req.role.lower().strip()
    if role_clean not in ["student", "parent", "teacher", "principal"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role must be one of: student, parent, teacher, principal"
        )

    new_user = User(
        email=email_clean,
        hashed_password=hash_password(req.password),
        full_name=req.full_name.strip(),
        role=role_clean
    )
    db.add(new_user)
    db.flush()

    # Link profile
    school_class = db.query(SchoolClass).filter(SchoolClass.class_code == req.class_code).first()
    if not school_class:
        school_class = db.query(SchoolClass).first()

    if role_clean == "student":
        student_prof = Student(
            user_id=new_user.id,
            student_code=req.student_code or f"STU{new_user.id:03d}",
            full_name=new_user.full_name,
            roll_no=req.roll_no or f"10A{new_user.id:02d}",
            class_id=school_class.id if school_class else 1,
            contact_number=req.phone_number
        )
        db.add(student_prof)
    elif role_clean == "teacher":
        teacher_prof = Teacher(
            user_id=new_user.id,
            full_name=new_user.full_name,
            employee_code=f"T{new_user.id:03d}",
            department="Academics",
            subject_specialization="General Education",
            assigned_class_id=school_class.id if school_class else 1
        )
        db.add(teacher_prof)
    elif role_clean == "parent":
        first_stu = db.query(Student).first()
        parent_prof = Parent(
            user_id=new_user.id,
            full_name=new_user.full_name,
            student_id=first_stu.id if first_stu else 1,
            phone_number=req.phone_number
        )
        db.add(parent_prof)

    db.commit()
    db.refresh(new_user)

    token = create_access_token(data={"sub": new_user.email, "role": new_user.role, "id": new_user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": new_user.id,
            "email": new_user.email,
            "full_name": new_user.full_name,
            "role": new_user.role
        }
    }


@router.get("/me")
async def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch profile of currently authenticated user."""
    profile_data = {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }

    if user.role == "student" and user.student_profile:
        profile_data["student_id"] = user.student_profile.id
        profile_data["student_code"] = user.student_profile.student_code
        profile_data["roll_no"] = user.student_profile.roll_no
        profile_data["class_id"] = user.student_profile.class_id
        if user.student_profile.school_class:
            profile_data["class_code"] = user.student_profile.school_class.class_code
    elif user.role == "parent" and user.parent_profile:
        profile_data["parent_id"] = user.parent_profile.id
        profile_data["child_student_id"] = user.parent_profile.student_id
        if user.parent_profile.child:
            profile_data["child_name"] = user.parent_profile.child.full_name
            profile_data["child_code"] = user.parent_profile.child.student_code
    elif user.role == "teacher" and user.teacher_profile:
        profile_data["teacher_id"] = user.teacher_profile.id
        profile_data["employee_code"] = user.teacher_profile.employee_code
        profile_data["department"] = user.teacher_profile.department
        profile_data["assigned_class_id"] = user.teacher_profile.assigned_class_id
        if user.teacher_profile.assigned_class:
            profile_data["assigned_class_code"] = user.teacher_profile.assigned_class.class_code

    return profile_data
