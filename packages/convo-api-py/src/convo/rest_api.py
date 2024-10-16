import logging
import os
from datetime import datetime
from typing import Any, Optional

from convo.convo_embeddings.convert_document import convert_document
from convo.convo_embeddings.embed import encode_text
from convo.convo_embeddings.embed_documents import generate_document_embeddings
from convo.convo_embeddings.types import (
    DocumentConversionRequest,
    DocumentEmbeddingRequest,
    GraphDBConfig,
    GraphRagConfig,
)
from iyio_common import getEnvVar, start_rest_server
from openai import OpenAI

logger = logging.getLogger(__name__)

serverPort = int(os.getenv("REST_PORT") or os.getenv("PORT") or "8080")


def request_handler(
    path,
    data: Any,
    method,
    open_ai_client: Optional[OpenAI] = None,
):
    """
    Handles a http request. Data is either the request body or
    query params for a GET request
    """

    logging.info("Recived request to %s", path)

    open_ai_client = OpenAI() if open_ai_client is None else open_ai_client

    match method + ":" + path:
        case "POST:/embeddings/text":
            return encode_text(open_ai_client, data)

        case "GET:/embeddings/text":
            return encode_text(open_ai_client, [data["text"] if "text" in data else ""])

        case "POST:/embeddings/document":
            graph_rag_config = GraphRagConfig()
            graph_db_config = GraphDBConfig(
                host=getEnvVar("POSTGRES_HOST"),
                port=getEnvVar("POSTGRES_PORT"),
                dbname=getEnvVar("POSTGRES_DB"),
                user=getEnvVar("POSTGRES_USER"),
                password=getEnvVar("POSTGRES_PASSWORD"),
                graph=getEnvVar("POSTGRES_GRAPH"),
            )
            return generate_document_embeddings(
                open_ai_client,
                DocumentEmbeddingRequest(**data),
                graph_db_config,
                graph_rag_config,
            )

        case "POST:/document-conversion":
            return convert_document(DocumentConversionRequest(**data))


def start_rest_api():
    start_rest_server(serverPort, request_handler)


if __name__ == "__main__":
    log_file = f"embedding_api_{datetime.now().strftime('%Y_%m_%d_%H_%M_%S')}.log"
    logging.basicConfig(filename=log_file, level=logging.INFO)
    logging.getLogger().addHandler(logging.StreamHandler())
    start_rest_api()
