import datetime
from sqlalchemy.orm import Session
from app.database.session import Base, engine, SessionLocal
from app.auth.jwt import hash_password
from app.models.entities import (
    User, SchoolClass, Student, Parent, Teacher, 
    Attendance, AcademicRecord, SupportRequest
)


def seed_database(db: Session = None):
    """Seed SQLite database with realistic school demo data."""
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # Check if already seeded
        if db.query(User).first():
            print("[INFO] Database already contains records. Skipping seed.")
            return

        print("[INFO] Seeding EduSaathi database with realistic mock school data...")

        # 1. Create Classes
        class_10a = SchoolClass(class_code="10-A", name="Grade 10 - Section A", grade="10", section="A", department="Secondary")
        class_10b = SchoolClass(class_code="10-B", name="Grade 10 - Section B", grade="10", section="B", department="Secondary")
        class_ty_cse = SchoolClass(class_code="TY-CSE-A", name="Third Year Computer Science & Engineering - A", grade="TY", section="A", department="Computer Science")
        db.add_all([class_10a, class_10b, class_ty_cse])
        db.flush()

        # 2. Create Principal User
        principal_user = User(
            email="principal@edusaathi.demo",
            hashed_password=hash_password("principal123"),
            full_name="Dr. Vikram Rao",
            role="principal"
        )
        db.add(principal_user)
        db.flush()

        # 3. Create Teacher Users
        teacher1_user = User(
            email="teacher@edusaathi.demo",
            hashed_password=hash_password("teacher123"),
            full_name="Ms. Anjali Sharma",
            role="teacher"
        )
        teacher2_user = User(
            email="rajesh.verma@edusaathi.demo",
            hashed_password=hash_password("teacher123"),
            full_name="Prof. Rajesh Verma",
            role="teacher"
        )
        db.add_all([teacher1_user, teacher2_user])
        db.flush()

        teacher1_profile = Teacher(
            user_id=teacher1_user.id,
            full_name="Ms. Anjali Sharma",
            employee_code="T001",
            department="Mathematics",
            subject_specialization="Mathematics & Statistics",
            assigned_class_id=class_10a.id
        )
        teacher2_profile = Teacher(
            user_id=teacher2_user.id,
            full_name="Prof. Rajesh Verma",
            employee_code="T002",
            department="Computer Science",
            subject_specialization="Data Structures & Algorithms",
            assigned_class_id=class_ty_cse.id
        )
        db.add_all([teacher1_profile, teacher2_profile])
        db.flush()

        # 4. Create Parent Users
        parent1_user = User(
            email="parent@edusaathi.demo",
            hashed_password=hash_password("parent123"),
            full_name="Sanjay Sharma",
            role="parent"
        )
        parent2_user = User(
            email="meera.deshmukh@edusaathi.demo",
            hashed_password=hash_password("parent123"),
            full_name="Meera Deshmukh",
            role="parent"
        )
        db.add_all([parent1_user, parent2_user])
        db.flush()

        # 5. Create Student Users
        student1_user = User(
            email="student@edusaathi.demo",
            hashed_password=hash_password("student123"),
            full_name="Rahul Sharma",
            role="student"
        )
        student2_user = User(
            email="ananya@edusaathi.demo",
            hashed_password=hash_password("student123"),
            full_name="Ananya Deshmukh",
            role="student"
        )
        student3_user = User(
            email="kabir@edusaathi.demo",
            hashed_password=hash_password("student123"),
            full_name="Kabir Singh",
            role="student"
        )
        student4_user = User(
            email="priya@edusaathi.demo",
            hashed_password=hash_password("student123"),
            full_name="Priya Nair",
            role="student"
        )
        db.add_all([student1_user, student2_user, student3_user, student4_user])
        db.flush()

        # 6. Create Student Profiles
        student1 = Student(
            user_id=student1_user.id,
            student_code="STU001",
            full_name="Rahul Sharma",
            roll_no="10A01",
            class_id=class_10a.id,
            parent_user_id=parent1_user.id,
            contact_number="+91 9820112233"
        )
        student2 = Student(
            user_id=student2_user.id,
            student_code="STU002",
            full_name="Ananya Deshmukh",
            roll_no="10A02",
            class_id=class_10a.id,
            parent_user_id=parent2_user.id,
            contact_number="+91 9820445566"
        )
        student3 = Student(
            user_id=student3_user.id,
            student_code="STU003",
            full_name="Kabir Singh",
            roll_no="10A03",
            class_id=class_10a.id,
            parent_user_id=None,
            contact_number="+91 9820778899"
        )
        student4 = Student(
            user_id=student4_user.id,
            student_code="STU004",
            full_name="Priya Nair",
            roll_no="10A04",
            class_id=class_10a.id,
            parent_user_id=None,
            contact_number="+91 9820990011"
        )
        db.add_all([student1, student2, student3, student4])
        db.flush()

        # 7. Create Parent Profiles
        parent1_profile = Parent(
            user_id=parent1_user.id,
            full_name="Sanjay Sharma",
            student_id=student1.id,
            phone_number="+91 9820112233",
            occupation="Civil Engineer"
        )
        parent2_profile = Parent(
            user_id=parent2_user.id,
            full_name="Meera Deshmukh",
            student_id=student2.id,
            phone_number="+91 9820445566",
            occupation="Chartered Accountant"
        )
        db.add_all([parent1_profile, parent2_profile])

        # 8. Create Attendance Records
        today = datetime.date.today()
        for i in range(15):
            past_date = (today - datetime.timedelta(days=i)).strftime("%Y-%m-%d")
            # Rahul: High attendance ~93%
            db.add(Attendance(
                student_id=student1.id,
                class_id=class_10a.id,
                date=past_date,
                status="Present" if i != 3 else "Absent",
                subject="Overall",
                marked_by_teacher_id=teacher1_profile.id,
                reason="Medical leave" if i == 3 else ""
            ))
            # Ananya: 100% attendance
            db.add(Attendance(
                student_id=student2.id,
                class_id=class_10a.id,
                date=past_date,
                status="Present",
                subject="Overall",
                marked_by_teacher_id=teacher1_profile.id
            ))
            # Kabir: ~80% attendance
            db.add(Attendance(
                student_id=student3.id,
                class_id=class_10a.id,
                date=past_date,
                status="Absent" if i in [2, 7, 11] else "Present",
                subject="Overall",
                marked_by_teacher_id=teacher1_profile.id,
                reason="Sports Tournament" if i == 2 else ""
            ))
            # Priya: ~87% attendance
            db.add(Attendance(
                student_id=student4.id,
                class_id=class_10a.id,
                date=past_date,
                status="Absent" if i in [4, 9] else "Present",
                subject="Overall",
                marked_by_teacher_id=teacher1_profile.id
            ))

        # 9. Create Academic Records (Grades)
        academic_data = [
            # Rahul
            (student1.id, "Mathematics", "Unit Test 1", 92.0, 100.0, "A+", "Term 1 (2025-26)", "Excellent analytical skills"),
            (student1.id, "Science", "Unit Test 1", 88.0, 100.0, "A", "Term 1 (2025-26)", "Strong grasp of Physics"),
            (student1.id, "English", "Unit Test 1", 85.0, 100.0, "A", "Term 1 (2025-26)", "Good comprehension"),
            (student1.id, "Social Science", "Unit Test 1", 80.0, 100.0, "B+", "Term 1 (2025-26)", "Consistent performance"),
            # Ananya
            (student2.id, "Mathematics", "Unit Test 1", 98.0, 100.0, "A+", "Term 1 (2025-26)", "Class topper in Math"),
            (student2.id, "Science", "Unit Test 1", 95.0, 100.0, "A+", "Term 1 (2025-26)", "Outstanding lab results"),
            # Kabir
            (student3.id, "Mathematics", "Unit Test 1", 76.0, 100.0, "B", "Term 1 (2025-26)", "Needs practice with algebra"),
            # Priya
            (student4.id, "Mathematics", "Unit Test 1", 89.0, 100.0, "A", "Term 1 (2025-26)", "Very good progress")
        ]

        for s_id, subj, assess, marks, max_m, gr, term, comm in academic_data:
            db.add(AcademicRecord(
                student_id=s_id,
                subject=subj,
                assessment_name=assess,
                marks_obtained=marks,
                max_marks=max_m,
                grade=gr,
                term=term,
                comments=comm,
                updated_by_teacher_id=teacher1_profile.id
            ))

        # 10. Create Support Requests
        db.add(SupportRequest(
            request_id="REQ-1001",
            user_id=parent1_user.id,
            role="parent",
            request_type="teacher_call",
            target_teacher_id=teacher1_profile.id,
            student_id=student1.id,
            description="Discuss Rahul's progress in Unit Test 2 preparation and Math syllabus.",
            status="In Progress",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=1)
        ))
        db.add(SupportRequest(
            request_id="REQ-1002",
            user_id=parent2_user.id,
            role="parent",
            request_type="management_support",
            target_teacher_id=None,
            student_id=student2.id,
            description="Inquiry regarding Olympiad coaching schedule and science laboratory timings.",
            status="Pending",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(hours=6)
        ))

        db.commit()
        print("[INFO] Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise e
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_database()
