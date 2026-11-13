import logging
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.database import Base, engine
import backend.app.models  # Ensure all SQLAlchemy models are registered
from backend.app.api.routes import auth, subjects, topics, exercises, revision, assessments, mcq, topic_qa, flow_diagram

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("recall")

# Create database tables automatically
Base.metadata.create_all(bind=engine)

# Ensure personal_notes column exists across SQLite and PostgreSQL databases
try:
    from sqlalchemy import text
    with engine.connect() as conn:
        if engine.dialect.name == "sqlite":
            res = conn.execute(text("PRAGMA table_info(topics)"))
            cols = [r[1] for r in res.fetchall()]
            if "personal_notes" not in cols:
                conn.execute(text("ALTER TABLE topics ADD COLUMN personal_notes TEXT DEFAULT ''"))
                conn.commit()
                logger.info("Migrated SQLite: added topics.personal_notes")
        else:
            conn.execute(text("ALTER TABLE topics ADD COLUMN IF NOT EXISTS personal_notes TEXT DEFAULT ''"))
            conn.commit()
except Exception as e:
    logger.warning(f"Database column verification note: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Recall: Syllabus-driven Academic Learning & High-Fidelity Memorization Platform",
    version="1.0.0",
)

# CORS configuration — allow local origins, all Render domains, and configured origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_origin_regex=r"^https://.*\.onrender\.com$",
)

# Register API routes
app.include_router(auth.router, prefix="/api")
app.include_router(subjects.router, prefix="/api")
app.include_router(topics.router, prefix="/api")
app.include_router(exercises.router)
app.include_router(revision.router)
app.include_router(assessments.router, prefix="/api")
app.include_router(mcq.router, prefix="/api")
app.include_router(topic_qa.router, prefix="/api")
app.include_router(flow_diagram.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "database": "connected"
    }

# --- Serve React SPA (production) ---
# In production the frontend is built into frontend/dist and served by FastAPI.
# In development Vite handles this, so this only activates when the dist folder exists.
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

if FRONTEND_DIST.exists():
    # Serve static assets (JS, CSS, icons, etc.)
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

    # Serve other public files (icons, manifest, etc.)
    @app.get("/icons/{path:path}")
    async def serve_icons(path: str):
        file = FRONTEND_DIST / "icons" / path
        if file.exists():
            return FileResponse(str(file))
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    @app.get("/manifest.json")
    async def serve_manifest():
        f = FRONTEND_DIST / "manifest.json"
        if f.exists():
            return FileResponse(str(f), media_type="application/manifest+json")
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    @app.get("/favicon.svg")
    async def serve_favicon():
        f = FRONTEND_DIST / "favicon.svg"
        if f.exists():
            return FileResponse(str(f), media_type="image/svg+xml")
        return JSONResponse(status_code=404, content={"detail": "Not found"})

    # Catch-all: return index.html for client-side routing (SPA fallback)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return JSONResponse(status_code=404, content={"detail": "Frontend not built"})

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."}
    )
