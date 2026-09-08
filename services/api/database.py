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