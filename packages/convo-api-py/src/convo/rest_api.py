import os
from typing import Any

from convo.convo_embeddings.convert_document import convert_document
from convo.convo_embeddings.embed import encode_text
from convo.convo_embeddings.embed_documents import generate_document_embeddings
from convo.convo_embeddings.types import (
    DocumentConversionRequest,
    DocumentEmbeddingRequest,
)
from iyio_common import start_rest_server

serverPort = int(os.getenv("REST_PORT") or os.getenv("PORT") or "8080")


def request_handler(path, data: Any, method):
    """Handles an http request. data is either the request body or query params for a GET request"""

    print(path)

    match method + ":" + path:
        case "POST:/embeddings/text":
            return encode_text(data)

        case "GET:/embeddings/text":
            return encode_text([data["text"] if "text" in data else ""])

        case "POST:/embeddings/document":
            return generate_document_embeddings(DocumentEmbeddingRequest(**data))

        case "POST:/document-conversion":
            return convert_document(DocumentConversionRequest(**data))


def start_rest_api():
    start_rest_server(serverPort, request_handler)


if __name__ == "__main__":
    start_rest_api()
