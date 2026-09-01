from pathlib import Path

from tinydb import TinyDB


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "suppliers.json"

DATA_DIR.mkdir(parents=True, exist_ok=True)

db = TinyDB(DB_PATH)
suppliers_table = db.table("suppliers")
users_table = db.table("users")
profiles_table = db.table("profiles")
reset_tokens_table = db.table("reset_tokens")


def document_to_dict(document):
    return {
        "id": document.doc_id,
        **dict(document),
    }
