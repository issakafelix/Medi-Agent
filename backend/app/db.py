from __future__ import annotations

from sqlmodel import SQLModel, Session, create_engine

from .config import get_settings


def build_engine():
    settings = get_settings()
    url = settings.database_url
    # Neon/Heroku hand out postgres:// URLs; SQLAlchemy 2 needs postgresql://.
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    connect_args = {}
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    return create_engine(url, echo=False, connect_args=connect_args, pool_pre_ping=True)


engine = build_engine()


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_sqlite_schema()


def _migrate_sqlite_schema() -> None:
    """Add columns that create_all() won't retrofit onto an existing SQLite file.

    create_all() only creates missing tables, so a db.db predating the
    Conversation.user_id field is left without it, and every insert into
    conversation then fails with "no column named user_id".
    """
    if engine.dialect.name != "sqlite":
        return
    with engine.connect() as conn:
        cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(conversation)")}
        if cols and "user_id" not in cols:
            conn.exec_driver_sql("ALTER TABLE conversation ADD COLUMN user_id VARCHAR DEFAULT ''")
            conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
