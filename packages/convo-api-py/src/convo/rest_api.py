import logging

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
from openai import OpenAI

logger = logging.getLogger(__name__)
document_handler = APIRouter()


@document_handler.post("/embeddings/text")
async def post_embed_text(data):
    open_ai_client = OpenAI()
    return encode_text(open_ai_client, data)


@document_handler.get("/embeddings/text")
async def get_embed_text(data):
    open_ai_client = OpenAI()
    return encode_text(open_ai_client, [data["text"] if "text" in data else ""])


@document_handler.post("/embeddings/document")
async def embed_documents(request: DocumentEmbeddingRequest):
    open_ai_client = OpenAI()
    graph_rag_config = GraphRagConfig()
    graph_db_config = GraphDBConfig()
    return generate_document_embeddings(
        open_ai_client,
        request,
        graph_db_config,
        graph_rag_config,
    )


@document_handler.post("/document-conversion")
async def document_conversion(request: DocumentConversionRequest):
    return convert_document(request)
