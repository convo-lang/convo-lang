import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

import psycopg2
from fastapi import FastAPI

from . import db, rest_api

log_file_path = f"./embedding_api_{datetime.now().strftime('%Y_%m_%d_%H_%M_%S')}.log"
logger = logging.getLogger(__name__)
logging.basicConfig(filename=log_file_path, level=logging.INFO)


# Temp connection until db conncection is refactored
# Try and create graph, rollback if it already exists
def create_graph(graph_name: str):
    conn = psycopg2.connect(
        database=os.getenv("PGDATABASE"),
        host=os.getenv("PGHOST"),
        user=os.getenv("PGUSER"),
        password=os.getenv("PGPASSWORD"),
        port=os.getenv("PGPORT"),
    )
    sql = f"SELECT * FROM ag_catalog.create_graph('{graph_name}');"

    with conn.cursor() as curs:
        curs.execute(sql)

    conn.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.database.connect()

    try:
        graph_name = os.getenv("GRAPH_DB")
        assert graph_name is not None, "'GRAPH_DB' environment variable was not set"
        logger.info("Creating graph '%s' (if it does not exist)", graph_name)
        create_graph(graph_name)
    except Exception as e:
        logger.info("Faild to create graph '%s' - reason: %s", graph_name, e)

    yield

    await db.database.disconnect()


app = FastAPI(lifespan=lifespan)

app.include_router(rest_api.document_handler)
