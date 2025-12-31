import uuid
from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
from fastapi_users.db import SQLAlchemyBaseUserTableUUID, SQLAlchemyUserDatabase
from fastapi import Depends
from pathlib import Path
from ..config import settings

BASE_DIR = Path(__file__).resolve().parents[2]  # goes to api/
DB_PATH = BASE_DIR / "test.db"

DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH.as_posix()}"
SQLALCHEMY_DATABASE_URL = f'postgresql://{settings.DATABASE_USERNAME}:{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOSTNAME}:{settings.DATABASE_PORT}/{settings.DATABASE_NAME}'


engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
