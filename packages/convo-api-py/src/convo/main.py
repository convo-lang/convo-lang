import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime

age_enabled=os.getenv("RUN_GRAPH_EMBED").lower() == "true"

if age_enabled:
    import age

from convo.embeddings.types import GraphRagConfig
from databases import Database
from fastapi import FastAPI
from openai import AsyncOpenAI

from . import rest_api
from .db import get_db_url

log_file_path = f"./embedding_api_{datetime.now().strftime('%Y_%m_%d_%H_%M_%S')}.log"
logger = logging.getLogger(__name__)
logging.basicConfig(filename=log_file_path, level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db_url = get_db_url()
    app.state.db = Database(db_url)
    if age_enabled:
        app.state.ag = age.Age()
    app.state.open_ai_client = AsyncOpenAI()
    app.state.graph_rag_config = GraphRagConfig()
    app.state.RUN_GRAPH_EMBED = age_enabled

    await app.state.db.connect()

    try:
        graph_name = os.getenv("GRAPH_DB")
        assert graph_name is not None, "'GRAPH_DB' environment variable was not set"
        logger.info("Creating graph '%s' (if it does not exist)", graph_name)
        query = f"SELECT * FROM ag_catalog.create_graph('{graph_name}');"
        await app.state.db.execute(query)
    except Exception as e:
        logger.info("Faild to create graph '%s' - reason: %s", graph_name, e)

    graph_db_name = os.getenv("GRAPH_DB")
    if age_enabled:
        app.state.ag.connect(dsn=db_url, graph=graph_db_name)

    yield

    await app.state.db.disconnect()
    if age_enabled:
        app.state.ag.close()
    app.state.open_ai_client.close()


app = FastAPI(lifespan=lifespan)

app.include_router(rest_api.document_handler)
