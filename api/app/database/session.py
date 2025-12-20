import uuid
from collections.abc import AsyncGenerator

from sqlalchemy import create_engine
from sqlalchemy import Column, String, Interger, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclaritiveBase, relationship
import datetime

DATABASE_URL = "sqlite+aiosqlite:///./test.db"