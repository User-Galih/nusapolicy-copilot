import os
import sys
from pathlib import Path

# Tambahkan path apps/api ke python environment
ROOT_DIR = Path(__file__).resolve().parent.parent
API_DIR = ROOT_DIR / "apps" / "api"
sys.path.insert(0, str(API_DIR))

from app.main import app

# Vercel Serverless Function entry point
handler = app
