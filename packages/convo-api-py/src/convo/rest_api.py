import logging

from convo.embeddings.convert_document import convert_document
from convo.embeddings.embed import encode_text
from convo.embeddings.embed_documents import generate_document_embeddings
from convo.embeddings.types import (
    DocumentConversionRequest,
    DocumentEmbeddingRequest,
    GraphRagConfig,
)
from fastapi import APIRouter, Request
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)
document_handler = APIRouter()


@document_handler.post("/api/embeddings/text")
async def post_embed_text(data):
    open_ai_client = AsyncOpenAI()
    return await encode_text(open_ai_client, data)


@document_handler.get("/api/embeddings/text")
async def get_embed_text(data):
    open_ai_client = AsyncOpenAI()
    return await encode_text(open_ai_client, [data["text"] if "text" in data else ""])


@document_handler.post("/api/embeddings/document")
async def embed_documents(doc_request: DocumentEmbeddingRequest, request: Request):
    open_ai_client = AsyncOpenAI()
    graph_rag_config = GraphRagConfig()

    return await generate_document_embeddings(
        request.app.state.db,
        request.app.state.ag,
        open_ai_client,
        doc_request,
        graph_rag_config,
        request.app.state.RUN_GRAPH_EMBED,
    )


@document_handler.post("/api/document-conversion")
async def document_conversion(request: DocumentConversionRequest):
    return convert_document(request)
