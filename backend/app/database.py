from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

import tempfile

default_db = "sqlite:///./quant_intelligence.db"
if os.getenv("VERCEL") or os.getenv("VERCEL_ENV"):
    tmp_db = os.path.join(tempfile.gettempdir(), "quant_intelligence.db")
    default_db = f"sqlite:///{tmp_db}"

DATABASE_URL = os.getenv("DATABASE_URL", default_db)

# For SQLite, connect_args is needed, but not for PostgreSQL
is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
