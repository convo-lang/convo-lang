import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from iyio_common import exec_sql

from . import rest_api

log_file_path = f"./embedding_api_{datetime.now().strftime('%Y_%m_%d_%H_%M_%S')}.log"
logger = logging.getLogger(__name__)
logging.basicConfig(filename=log_file_path, level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    graph_name = os.getenv("GRAPH_DB")
    try:
        logger.info("Creating graph '%s' (if it does not exist)", graph_name)
        exec_sql(f"SELECT * FROM ag_catalog.create_graph('{graph_name}');", False)
    except Exception as e:
        logger.info("Faild to create graph '%s' - reason: %s", graph_name, e)

    yield


app = FastAPI(lifespan=lifespan)

app.include_router(rest_api.document_handler)
