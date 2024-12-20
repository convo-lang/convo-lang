import logging

from convo.embeddings.convert_document import convert_document
from convo.embeddings.embed import encode_text
from convo.embeddings.embed_documents import generate_document_embeddings
from convo.embeddings.types import (
    DocumentConversionRequest,
    DocumentEmbeddingRequest,
)
from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)
document_handler = APIRouter()


@document_handler.post("/api/embeddings/text")
async def post_embed_text(data, request: Request):
    return await encode_text(request.app.state.open_ai_client, data)


@document_handler.post("/api/embeddings/document")
async def embed_documents(doc_request: DocumentEmbeddingRequest, request: Request):
    return await generate_document_embeddings(
        request.app.state.db,
        request.app.state.ag if request.app.state.RUN_GRAPH_EMBED else None,
        request.app.state.open_ai_client,
        doc_request,
        request.app.state.graph_rag_config,
        request.app.state.RUN_GRAPH_EMBED,
    )


@document_handler.post("/api/document-conversion")
async def document_conversion(request: DocumentConversionRequest):
    return convert_document(request)
