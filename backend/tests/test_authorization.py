import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.seed import seed_database

client = TestClient(app)

# Ensure DB is seeded before testing
seed_database()


def get_token(email: str, password: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200, f"Login failed for {email}: {response.text}"
    return response.json()["access_token"]


def test_student_can_view_own_attendance():
    token = get_token("student@edusaathi.demo", "student123")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/attendance/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "summary" in data
    assert data["student_name"] == "Rahul Sharma"


def test_parent_can_view_authorized_child_attendance():
    token = get_token("parent@edusaathi.demo", "parent123")
    headers = {"Authorization": f"Bearer {token}"}
    # Rahul is student ID 1
    response = client.get("/api/attendance/child/1", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["student_name"] == "Rahul Sharma"


def test_parent_cannot_view_unauthorized_child_attendance():
    token = get_token("parent@edusaathi.demo", "parent123")
    headers = {"Authorization": f"Bearer {token}"}
    # Student ID 2 is Ananya (Parent Sanjay is not authorized for Ananya)
    response = client.get("/api/attendance/child/2", headers=headers)
    assert response.status_code == 403
    assert "Access Denied" in response.json()["detail"]


def test_teacher_can_update_attendance():
    token = get_token("teacher@edusaathi.demo", "teacher123")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "student_id": 1,
        "date": "2026-08-19",
        "status": "Absent",
        "reason": "Official test absence"
    }
    response = client.post("/api/attendance/mark", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["status"] == "Absent"


def test_student_cannot_update_attendance():
    token = get_token("student@edusaathi.demo", "student123")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "student_id": 1,
        "date": "2026-08-19",
        "status": "Present"
    }
    response = client.post("/api/attendance/mark", json=payload, headers=headers)
    assert response.status_code == 403


def test_teacher_can_enter_grades():
    token = get_token("teacher@edusaathi.demo", "teacher123")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "student_id": 1,
        "subject": "Mathematics",
        "assessment_name": "Unit Test 2",
        "marks_obtained": 95.0,
        "max_marks": 100.0,
        "comments": "Superb improvement"
    }
    response = client.post("/api/academics/grades", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["grade"] == "A+"


def test_student_cannot_enter_grades():
    token = get_token("student@edusaathi.demo", "student123")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "student_id": 1,
        "subject": "Mathematics",
        "assessment_name": "Unit Test 2",
        "marks_obtained": 100.0
    }
    response = client.post("/api/academics/grades", json=payload, headers=headers)
    assert response.status_code == 403


def test_principal_can_view_school_analytics():
    token = get_token("principal@edusaathi.demo", "principal123")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/attendance/school", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "overall_attendance_rate" in data
    assert "class_breakdowns" in data


def test_student_cannot_view_school_analytics():
    token = get_token("student@edusaathi.demo", "student123")
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/attendance/school", headers=headers)
    assert response.status_code == 403


def test_chat_endpoint_flow():
    """
    Verifies the chat endpoint end-to-end. In this test environment there is no
    reachable Gemini API (network sandboxed / no key), so LLMService gracefully
    falls back to the deterministic responder — we assert on behavior that holds
    true for BOTH the Gemini path and the fallback path, rather than a specific
    tool name, so this test stays valid regardless of which engine served the reply.
    """
    token = get_token("student@edusaathi.demo", "student123")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "message": "What is my attendance?",
        "role": "student",
        "language": "en"
    }
    response = client.post("/api/chat", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "attendance" in data["response"].lower()
    assert data["tool_executed"] in ("get_student_attendance", "get_my_attendance")
    assert data["engine"] in ("gemini", "fallback", "gemini_partial")


def test_chat_endpoint_requires_authentication():
    """Unauthenticated chat requests must be rejected — role must come from the JWT,
    never from the request body, to prevent role-spoofing via the chat API."""
    payload = {"message": "What is my attendance?", "role": "principal", "language": "en"}
    response = client.post("/api/chat", json=payload)
    assert response.status_code == 401


def test_chat_cannot_mark_attendance_as_student():
    """A student cannot use the AI chat to mark attendance, even indirectly —
    the ToolDispatcher must reject this regardless of what the model attempts."""
    token = get_token("student@edusaathi.demo", "student123")
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "message": "Mark Rahul absent today",
        "role": "student",
        "language": "en"
    }
    response = client.post("/api/chat", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    # Must not silently succeed at an unauthorized write — either explicitly denied,
    # or (fallback path) rejected by the deterministic role gate.
    assert "denied" in data["response"].lower() or "access" in data["response"].lower() or "cannot" in data["response"].lower() or "authorized" in data["response"].lower()
