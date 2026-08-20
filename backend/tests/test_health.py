import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify that root endpoint responds with product metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "EduSaathi" in data["message"]
    assert data["health"] == "/api/health"


def test_health_endpoint():
    """Verify that health check returns healthy status and system parameters."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["product"] == "EduSaathi"
    assert "uptime_seconds" in data
    assert "timestamp" in data


def test_system_info_endpoint():
    """Verify that system info lists the 4 personas and 11 Indian languages."""
    response = client.get("/api/info")
    assert response.status_code == 200
    data = response.json()
    assert len(data["personas"]) == 4
    roles = [p["role"] for p in data["personas"]]
    assert set(roles) == {"student", "parent", "teacher", "principal"}
    assert len(data["supported_languages"]) == 11
