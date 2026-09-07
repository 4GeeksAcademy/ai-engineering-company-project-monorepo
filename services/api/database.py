import os
from tinydb import TinyDB

DB_FILE = os.path.join(os.path.dirname(__file__), "data", "suppliers_db.json")

def get_db() -> TinyDB:
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    return TinyDB(DB_FILE)
