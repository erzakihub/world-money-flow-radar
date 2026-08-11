from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import tempfile
import os

db_filename = "quant_intelligence.db"
# Always use /tmp in serverless / lambda / read-only or fallback to temp directory
db_path = os.path.join(tempfile.gettempdir(), db_filename)
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{db_path}")

is_sqlite = DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    DATABASE_URL, connect_args=connect_args
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

_db_initialized = False

def get_db():
    global _db_initialized
    if not _db_initialized:
        try:
            Base.metadata.create_all(bind=engine)
            db_temp = SessionLocal()
            try:
                from .data_sources.mock_generator import generate_mock_data as generate_macro_data
                generate_macro_data(db_temp)
                from .services.seed_generator import generate_mock_data as generate_quant_data
                generate_quant_data(db_temp)
            except Exception as e:
                print("Seeder note:", e)
            finally:
                db_temp.close()
        except Exception as e:
            print("DB init note:", e)
        _db_initialized = True

    try:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    except Exception:
        yield None
