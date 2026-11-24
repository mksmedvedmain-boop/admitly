"""
Подключение к БД. Для локальной разработки — SQLite (не требует установки сервера).
Для продакшена достаточно заменить SQLALCHEMY_DATABASE_URL на строку PostgreSQL —
остальной код (models.py, main.py) трогать не нужно, т.к. вся работа идёт через ORM.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

import os

# По умолчанию SQLite-файл рядом с кодом (имя unimatch.db оставлено, чтобы не потерять
# существующие данные). В проде задайте DATABASE_URL, например postgresql://user:password@host/admitly.
SQLALCHEMY_DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./unimatch.db")

engine = create_engine(
    # The default driver behind postgresql:// varies by SQLAlchemy release.
    # requirements.txt installs psycopg 3, not psycopg2.
    "postgresql+psycopg://" + SQLALCHEMY_DATABASE_URL.split("://", 1)[1]
    if SQLALCHEMY_DATABASE_URL.startswith(("postgresql://", "postgres://"))
    else SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {},  # только для SQLite
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency для FastAPI: открывает сессию на время запроса и закрывает её после."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
