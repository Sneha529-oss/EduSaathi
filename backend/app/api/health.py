import time
from fastapi import APIRouter
from app.config import get_settings

router = APIRouter()
START_TIME = time.time()


@router.get("/health")
async def health_check():
    """Health check endpoint to verify backend status and system readiness."""
    settings = get_settings()
    uptime_seconds = round(time.time() - START_TIME, 2)
    return {
        "status": "healthy",
        "product": settings.APP_NAME,
        "tagline": settings.APP_TAGLINE,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "uptime_seconds": uptime_seconds,
        "ai_ready": bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "mock_or_dev_key"),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }


@router.get("/info")
async def system_info():
    """Returns general metadata about EduSaathi and supported personas."""
    settings = get_settings()
    return {
        "product": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "competition": "Bharat Academix AI & Machine Learning Competition 2026",
        "personas": [
            {
                "role": "student",
                "name": "EduSaathi Academic Assistant",
                "description": "Friendly, student-focused academic support and attendance tracking"
            },
            {
                "role": "parent",
                "name": "EduSaathi Parent Support Assistant",
                "description": "Caring, patient, child progress tracking and teacher call requests"
            },
            {
                "role": "teacher",
                "name": "EduSaathi Teaching Assistant",
                "description": "Professional, verified attendance marking and classroom analytics"
            },
            {
                "role": "principal",
                "name": "EduSaathi Management Assistant",
                "description": "Executive, school-wide metrics and leadership support"
            }
        ],
        "supported_languages": [
            {"code": "en", "name": "English"},
            {"code": "hi", "name": "Hindi (हिंदी)"},
            {"code": "ta", "name": "Tamil (தமிழ்)"},
            {"code": "te", "name": "Telugu (తెలుగు)"},
            {"code": "mr", "name": "Marathi (मराठी)"},
            {"code": "bn", "name": "Bengali (বাংলা)"},
            {"code": "gu", "name": "Gujarati (ગુજરાતી)"},
            {"code": "pa", "name": "Punjabi (ਪੰਜਾਬੀ)"},
            {"code": "kn", "name": "Kannada (ಕನ್ನಡ)"},
            {"code": "ml", "name": "Malayalam (മലയാളം)"},
            {"code": "ur", "name": "Urdu (اردو)"}
        ]
    }
