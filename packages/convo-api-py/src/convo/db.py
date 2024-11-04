import os

from databases import Database
from sqlalchemy import create_engine

DB_URL = (
    f"postgresql://{os.getenv('PGUSER')}:{os.getenv('PGPASSWORD')}@"
    f"{os.getenv('PGHOST')}:{os.getenv('PGPORT')}/{os.getenv('PGDATABASE')}"
)

engine = create_engine(DB_URL)
database = Database(DB_URL)


def escape_sql_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'
