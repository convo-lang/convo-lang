import logging
import os

from convo.convo_embeddings.convert_document import convert_document
from convo.convo_embeddings.embed import encode_text
from convo.convo_embeddings.embed_documents import generate_document_embeddings
from convo.convo_embeddings.types import (
    DocumentConversionRequest,
    DocumentEmbeddingRequest,
    GraphDBConfig,
    GraphRagConfig,
)
from fastapi import APIRouter
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)
document_handler = APIRouter()


@document_handler.post("/embeddings/text")
async def post_embed_text(data):
    open_ai_client = AsyncOpenAI()
    return await encode_text(open_ai_client, data)


@document_handler.get("/embeddings/text")
async def get_embed_text(data):
    open_ai_client = AsyncOpenAI()
    return await encode_text(open_ai_client, [data["text"] if "text" in data else ""])


@document_handler.post("/embeddings/document")
async def embed_documents(request: DocumentEmbeddingRequest):
    open_ai_client = AsyncOpenAI()
    graph_rag_config = GraphRagConfig()
    graph_db_config = GraphDBConfig()
    run_graph_embed = os.getenv("RUN_GRAPH_EMBED").lower() == "true"
    return await generate_document_embeddings(
        open_ai_client,
        request,
        graph_db_config,
        graph_rag_config,
        run_graph_embed,
    )


@document_handler.post("/document-conversion")
async def document_conversion(request: DocumentConversionRequest):
    return convert_document(request)
