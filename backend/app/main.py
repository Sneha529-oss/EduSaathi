from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.api import api_router
from app.database.seed import seed_database

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    print(f"[INFO] {settings.APP_NAME} Backend v{settings.APP_VERSION} initialized [{settings.APP_ENV}]")
    # Ensure the SQLite schema exists and demo data is present on first run.
    # seed_database() is idempotent — it checks for existing rows and no-ops
    # if the DB is already populated, so this is safe to call on every startup
    # (including `--reload` restarts) without duplicating data.
    try:
        seed_database()
    except Exception as exc:
        print(f"[WARN] Database auto-seed check failed (app will still start): {exc}")
    yield
    # Shutdown actions
    print(f"[INFO] {settings.APP_NAME} Backend shutting down...")


app = FastAPI(
    title=f"{settings.APP_NAME} Backend",
    description="The Operating System Your School Needs — Human-Like AI School Assistant API",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Configure CORS for Frontend connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router)


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} — {settings.APP_TAGLINE}",
        "docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True
    )
