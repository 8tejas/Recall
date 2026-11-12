import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

# Format URL for async or sync if needed
database_url = settings.DATABASE_URL.strip()
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
}

if database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    # Optimizations for Supabase Connection Pooler (Supavisor) & cloud deployment:
    # - Lean pool size (5 + 5 overflow) to stay well within Supabase connection limits
    # - pool_recycle (300s / 5m) drops and renews idle connections before cloud NAT/firewalls drop them
    # - pool_pre_ping verifies the connection is still alive before each checkout
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 5,
        "pool_recycle": 300,
    })

engine = create_engine(
    database_url,
    connect_args=connect_args,
    **engine_kwargs
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
