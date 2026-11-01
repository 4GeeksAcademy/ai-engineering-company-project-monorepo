
from pathlib import Path

from tinydb import TinyDB

BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BASE_DIR / "auth" / "auth.json"


def get_db():
    DB_FILE.parent.mkdir(parents=True, exist_ok=True)
    return TinyDB(DB_FILE)