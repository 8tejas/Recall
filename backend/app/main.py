import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.core.database import Base, engine
import backend.app.models  # Ensure all SQLAlchemy models are registered
from backend.app.api.routes import auth, subjects, topics, exercises, revision, assessments

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recall")

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Recall: Syllabus-driven Academic Learning & High-Fidelity Memorization Platform",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all during development or use settings.CORS_ORIGINS
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(auth.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(topics.router, prefix="/api")
app.include_router(exercises.router)
app.include_router(revision.router)
app.include_router(assessments.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": "connected"
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."}
    )
