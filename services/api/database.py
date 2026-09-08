import os
from tinydb import TinyDB
from tinydb import Query
import uuid

DB_FILE = os.path.join(os.path.dirname(__file__), "data", "suppliers_db.json")

def get_db() -> TinyDB:
    # Ensure data directory exists
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    return TinyDB(DB_FILE)

def get_user_by_email(email:str):
    db = get_db()
    users_table=db.table('users')
    userQuery = Query()

    result = users_table.search(userQuery.email == email)
    if result:
        return result[0]
    return None

def get_user_by_id(user_id: str):
    db = get_db()
    users_table = db.table('users')
    userQuery = Query()
    result = users_table.search(userQuery.id == user_id)
    if result:
        return result[0]
    return None

def create_user_in_db(user_data: dict, profile_data: dict):
    db = get_db()
    users_table = db.table('users')
    profiles_table = db.table('profiles')

    user_id = str(uuid.uuid4())
    user_data['id'] = user_id

    profile_data['id'] = str(uuid.uuid4())
    profile_data['user_id'] = user_id

    users_table.insert(user_data)
    profiles_table.insert(profile_data)

    return user_data, profile_data

# --- Token Management ---

def save_reset_token(email: str, token_hash: str, expires_at: float):
    db = get_db()
    tokens_table = db.table('reset_tokens')
    tokens_table.insert({
        'email': email,
        'token_hash': token_hash,
        'expires_at': expires_at,
        'used': False
    })

def get_reset_token(token_hash: str):
    db = get_db()
    tokens_table = db.table('reset_tokens')
    tokenQuery = Query()
    result = tokens_table.search(tokenQuery.token_hash == token_hash)
    if result:
        return result[0]
    return None

def mark_token_used(token_hash: str):
    db = get_db()
    tokens_table = db.table('reset_tokens')
    tokenQuery = Query()
    tokens_table.update({'used': True}, tokenQuery.token_hash == token_hash)

# --- CANDIDATES ---
def get_all_candidates_from_db(status: str = None, stage: str = None) -> list:
    db = get_db()
    table = db.table('candidates')
    candidates = table.all()
    if status and status != "ALL":
        candidates = [c for c in candidates if c.get("status") == status]
    if stage and stage != "ALL":
        candidates = [c for c in candidates if c.get("stage") == stage]
    
    notes_table = db.table('candidate_notes')
    for c in candidates:
        c['notes'] = notes_table.search(Query().candidate_id == c['id'])
        
    candidates.sort(key=lambda x: x.get("score_ia") or 0, reverse=True)
    return candidates

def get_candidate_from_db(candidate_id: int) -> dict:
    db = get_db()
    table = db.table('candidates')
    candidate = table.get(doc_id=candidate_id)
    if candidate:
        notes_table = db.table('candidate_notes')
        candidate['notes'] = notes_table.search(Query().candidate_id == candidate_id)
    return candidate

def create_candidate_in_db(candidate_data: dict) -> dict:
    from datetime import datetime
    db = get_db()
    table = db.table('candidates')
    now = datetime.utcnow().isoformat()
    candidate_data["applied_at"] = now
    candidate_data["created_at"] = now
    candidate_data["updated_at"] = now
    candidate_data["id"] = table.insert(candidate_data)
    table.update({"id": candidate_data["id"]}, doc_ids=[candidate_data["id"]])
    candidate_data["notes"] = []
    return candidate_data

def update_candidate_in_db(candidate_id: int, candidate_data: dict) -> dict:
    from datetime import datetime
    db = get_db()
    table = db.table('candidates')
    now = datetime.utcnow().isoformat()
    candidate_data["updated_at"] = now
    update_data = {k: v for k, v in candidate_data.items() if v is not None}
    table.update(update_data, doc_ids=[candidate_id])
    return get_candidate_from_db(candidate_id)

def create_candidate_note_in_db(candidate_id: int, note_data: dict) -> dict:
    from datetime import datetime
    db = get_db()
    table = db.table('candidate_notes')
    now = datetime.utcnow().isoformat()
    note_data["candidate_id"] = candidate_id
    note_data["created_at"] = now
    note_data["updated_at"] = now
    note_id = table.insert(note_data)
    note_data["id"] = note_id
    table.update({"id": note_id}, doc_ids=[note_id])
    return note_data

def get_candidate_notes_from_db(candidate_id: int) -> list:
    db = get_db()
    table = db.table('candidate_notes')
    return table.search(Query().candidate_id == candidate_id)

def delete_candidate_note_from_db(note_id: int) -> bool:
    db = get_db()
    table = db.table('candidate_notes')
    return bool(table.remove(doc_ids=[note_id]))