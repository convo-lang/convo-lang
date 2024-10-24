import os
from typing import Dict

from databases import Database
from pgvector.sqlalchemy import VECTOR
from sqlalchemy import (
    VARCHAR,
    Column,
    Integer,
    MetaData,
    Table,
    Text,
    create_engine,
)

DB_URL = (
    f"postgresql://{os.getenv('PGUSER')}:{os.getenv('PGPASSWORD')}@"
    f"{os.getenv('PGHOST')}:{os.getenv('PGPORT')}/{os.getenv('PGDATABASE')}"
)

engine = create_engine(DB_URL)
metadata = MetaData()

text_blob = Table(
    "TextBlob",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("text", Text),
    Column("embedding", VECTOR),
    Column("noteId", Integer, nullable=True),
    Column("researchId", Integer, nullable=True),
    Column("userId", Integer, nullable=True),
    Column("workflowId", Integer, nullable=True),
    Column("filePath", VARCHAR(2048), nullable=True),
    Column("contentType", VARCHAR(255), nullable=True),
    Column("index", Integer, nullable=True),
    Column("pageIndex", Integer, nullable=True),
    Column("type", VARCHAR(255), nullable=True),
)

database = Database(DB_URL)


async def db_insert_vector(payload: Dict):
    query = text_blob.insert().values(**payload)
    return await database.execute(query=query)
