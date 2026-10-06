import os
from tinydb import TinyDB
from sqlmodel import create_engine, Session, SQLModel

# TinyDB initialization
db = TinyDB('data/auth.json')

# SQLModel initialization
DATABASE_URL = os.environ.get("DATABASE_URL")
engine = create_engine(DATABASE_URL)

def get_db():
    with Session(engine) as session:
        yield session

def create_db_and_tables():
