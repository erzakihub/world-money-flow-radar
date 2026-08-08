import sys
import os
import importlib.util

# Ensure we import from api/app/main.py, not backend/app/main.py
api_dir = os.path.dirname(os.path.abspath(__file__))
app_main_path = os.path.join(api_dir, "app", "main.py")

# First, load the database module so relative imports inside app work
database_path = os.path.join(api_dir, "app", "database.py")

# Insert api/ at the FRONT of sys.path so 'app' resolves to api/app/
if api_dir not in sys.path:
    sys.path.insert(0, api_dir)

# Remove any paths that might cause 'app' to resolve to backend/app/
backend_dir = os.path.join(os.path.dirname(api_dir), "backend")
sys.path = [p for p in sys.path if not p.startswith(backend_dir)]

from app.main import app
