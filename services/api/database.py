import os
import uuid
from datetime import datetime
from typing import Optional
from tinydb import TinyDB, Query
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

load_dotenv()

# 1. CONFIGURACIÓN DE SUPABASE (SQLModel)
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("La variable DATABASE_URL no está configurada en el .env")


engine = create_engine(DATABASE_URL, echo=True)

def get_db():
    with Session(engine) as session:
        yield session

# 2. CONFIGURACIÓN DE TINYDB (Auth Existente)
DB_FILE = os.path.join(os.path.dirname(__file__),'data', 'suppliers_db.json')
def get_tinydb() -> TinyDB:
    os.makedirs(os.path.dirname(DB_FILE), exist_ok=True)
    return TinyDB(DB_FILE)

# --- Funciones de Usuarios y Tokens ---

def get_user_by_email(email:str):
    db = get_tinydb()
    users_table = db.table('users')
    userQuery = Query()
    result = users_table.search(userQuery.email == email)
    if result:
        return result[0]
    return None

def get_user_by_id(user_id:str):
    db = get_tinydb()
    user_table = db.table('users')
    userQuery = Query()
    result = user_table.search(userQuery.id == user_id)
    if result:
        return result[0]
    return None
def create_user_in_db(user_data:dict, profile_data:dict):
    db = get_tinydb()
    users_table = db.table('users')
    profiles_table = db.table('profiles')

    user_id = str(uuid.uuid4())
    user_data['id'] = user_id

    profile_data['id']= str(uuid.uuid4())
    profile_data['user_id'] = user_id

    users_table.insert(user_data)
    profiles_table.insert(profile_data)
    return user_data, profile_data


def save_reset_token(email: str, token_hash: str, expires_at: float):
    db = get_tinydb()
    tokens_table = db.table('reset_tokens')
    tokens_table.insert({
        'email': email,
        'token_hash': token_hash,
        'expires_at': expires_at,
        'used': False
    })


def get_reset_token(token_hash: str):
    db = get_tinydb()
    tokens_table = db.table('reset_tokens')
    tokenQuery = Query()
    result = tokens_table.search(tokenQuery.token_hash == token_hash)
    if result:
        return result[0]
    return None
def mark_token_used(token_hash: str):
    db = get_tinydb()
    tokens_table = db.table('reset_tokens')
    tokenQuery = Query()
    tokens_table.update({'used': True}, tokenQuery.token_hash == token_hash)


# --- Operaciones de Candidatos (Scoring / Tracker) ---

def get_all_candidates_from_db(status: Optional[str] = None, stage: Optional[str] = None):
    db = get_tinydb()
    table = db.table('candidates')
    records = table.all()
    if status and status != 'ALL':
        records = [r for r in records if r.get('status') == status]
    if stage and stage != 'ALL':
        records = [r for r in records if r.get('stage') == stage]
    return records

def get_candidate_from_db(candidate_id: int):
    db = get_tinydb()
    table = db.table('candidates')
    Q = Query()
    res = table.search(Q.id == candidate_id)
    return res[0] if res else None

def create_candidate_in_db(data: dict):
    db = get_tinydb()
    table = db.table('candidates')
    records = table.all()
    max_id = max([r.get('id', 0) for r in records], default=0)
    data['id'] = max_id + 1
    data['created_at'] = datetime.utcnow().isoformat()
    data['updated_at'] = data['created_at']
    table.insert(data)
    return data

def update_candidate_in_db(candidate_id: int, data: dict):
    db = get_tinydb()
    table = db.table('candidates')
    Q = Query()
    data['updated_at'] = datetime.utcnow().isoformat()
    table.update(data, Q.id == candidate_id)
    return get_candidate_from_db(candidate_id)

def get_candidate_notes_from_db(candidate_id: int):
    db = get_tinydb()
    table = db.table('candidate_notes')
    Q = Query()
    return table.search(Q.candidate_id == candidate_id)

def create_candidate_note_in_db(candidate_id: int, data: dict):
    db = get_tinydb()
    table = db.table('candidate_notes')
    records = table.all()
    max_id = max([r.get('id', 0) for r in records], default=0)
    data['id'] = max_id + 1
    data['candidate_id'] = candidate_id
    data['created_at'] = datetime.utcnow().isoformat()
    table.insert(data)
    return data

def delete_candidate_note_from_db(note_id: int):
    db = get_tinydb()
    table = db.table('candidate_notes')
    Q = Query()
    removed = table.remove(Q.id == note_id)
    return len(removed) > 0

