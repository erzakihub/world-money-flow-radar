import sys
import os

# Add backend path so backend app imports resolve seamlessly on Vercel Serverless
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app
