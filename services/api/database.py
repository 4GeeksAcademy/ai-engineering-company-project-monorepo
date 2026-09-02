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
incidents_table = db.table("incidents")

# Internal-only table: maps historical seed dedup keys to the TinyDB
# doc_id of the incident they created. Never exposed via the API.
incident_seed_keys_table = db.table("incident_seed_keys")


def document_to_dict(document):
    return {
        "id": document.doc_id,
        **dict(document),
    }
