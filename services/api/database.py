import os

from dotenv import load_dotenv
from sqlmodel import Session, create_engine

load_dotenv(
    os.path.join(
        os.path.dirname(__file__),
        ".env",
    )
)

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está configurada.")

engine = create_engine(
    DATABASE_URL,
    echo=True,
)


def get_db():
    with Session(engine) as session:
        yield session