from fastapi import APIRouter
from .health import router as health_router
from .auth import router as auth_router
from .attendance import router as attendance_router
from .academics import router as academics_router
from .support import router as support_router
from .security import router as security_router
from .chat import router as chat_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router, tags=["Health & System"])
api_router.include_router(auth_router, tags=["Authentication"])
api_router.include_router(chat_router, tags=["AI Assistant Chat"])
api_router.include_router(attendance_router, tags=["Attendance Management"])
api_router.include_router(academics_router, tags=["Academics & Grades"])
api_router.include_router(support_router, tags=["Support & Escalations"])
api_router.include_router(security_router, tags=["Security & Permissions"])

__all__ = ["api_router"]
