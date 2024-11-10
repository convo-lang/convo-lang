import os


def get_db_url() -> str:
    return (
        f"postgresql://{os.getenv('PGUSER')}:{os.getenv('PGPASSWORD')}@"
        f"{os.getenv('PGHOST')}:{os.getenv('PGPORT')}/{os.getenv('PGDATABASE')}"
    )


def escape_sql_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'
