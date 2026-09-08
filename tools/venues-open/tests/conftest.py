"""Testler paket disindaki modulleri (db.py, catmap.py, ...) dogrudan import eder."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
