from pathlib import Path

from tinydb import TinyDB


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "db.json"

DATA_DIR.mkdir(exist_ok=True)

db = TinyDB(DB_PATH)
suppliers_table = db.table("suppliers")
