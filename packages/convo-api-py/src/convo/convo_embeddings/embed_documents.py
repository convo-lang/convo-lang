import asyncio
import logging
import os
from typing import Any, Dict, List, Optional, Tuple, Union

import magic
from convo.db import db_insert_vector, text_blob
from fastapi import HTTPException
from iyio_common import escape_sql_identifier, exec_sql, parse_s3_path
from langchain.schema.document import Document
from langchain_community.document_loaders import (
    DirectoryLoader,
    UnstructuredHTMLLoader,
    UnstructuredMarkdownLoader,
    UnstructuredPDFLoader,
    UnstructuredURLLoader,
)
from langchain_community.document_loaders.base import BaseLoader
from langchain_unstructured import UnstructuredLoader
from openai import AsyncOpenAI
from psycopg import sql

from . import types
from .convo_text_splitter import ConvoTextSplitter
from .embed import encode_text
from .graph_embedding import graph_embed_docs
from .s3_loader import S3FileLoaderEx

max_sql_len = 65536

logger = logging.getLogger(__name__)


def get_text_chunks_langchain(text: str) -> List[Document]:
    text_splitter = ConvoTextSplitter(chunk_size=300, chunk_overlap=20)
    docs = [Document(page_content=x) for x in text_splitter.split_text(text)]
    return docs


def get_doc_loader(
    request: types.DocumentEmbeddingRequest, document_path: str, mode: str
) -> Tuple[Optional[List[Document]], Optional[BaseLoader]]:
    content_type = request.contentType

    if document_path == "inline":
        direct_docs = get_text_chunks_langchain(request.inlineContent)
        file_loader = None
    elif document_path.startswith("s3://"):
        s3Path = parse_s3_path(document_path)
        file_loader = S3FileLoaderEx(s3Path["bucket"], s3Path["key"])
        file_loader.mode = mode
        direct_docs = None
    elif document_path.startswith("https://") or document_path.startswith("http://"):
        file_loader = UnstructuredURLLoader([document_path], mode=mode)
        direct_docs = None
    elif document_path.endswith("/*"):
        file_loader = DirectoryLoader(
            document_path,
            show_progress=True,
            loader_cls=UnstructuredLoader,
            loader_kwargs={"mode": mode},
        )
        direct_docs = None
    elif content_type and content_type.endswith("/pdf"):
        file_loader = UnstructuredPDFLoader(document_path, mode=mode)
        direct_docs = None
    elif content_type and content_type.endswith("/html"):
        file_loader = UnstructuredHTMLLoader(document_path, mode=mode)
        direct_docs = None
    elif content_type and content_type.endswith("/markdown"):
        file_loader = UnstructuredMarkdownLoader(document_path, mode=mode)
        direct_docs = None
    else:
        file_loader = UnstructuredLoader(document_path, mode=mode)
        direct_docs = None

    return direct_docs, file_loader


def get_content_category(
    request: types.DocumentEmbeddingRequest,
    document_path: str,
    docs,
    is_direct_docs: bool,
) -> Tuple[Optional[str], Optional[str]]:
    content_type = request.contentType
    mime_path = document_path
    firstDoc = docs[0]

    if is_direct_docs:
        content_type = request.contentType
    elif firstDoc and firstDoc.metadata and ("content_type" in firstDoc.metadata):
        content_type = firstDoc.metadata["content_type"]
    else:
        if firstDoc and firstDoc.metadata and ("source" in firstDoc.metadata):
            logger.info("first doc filename %s", firstDoc)
            mime_path = firstDoc.metadata["source"]

        if mime_path:
            mime = magic.Magic(mime=True)
            type = mime.from_file(mime_path)
            if type:
                content_type = type
                logger.info("content type set to %s", type)

    if content_type == "application/pdf":
        content_category = "document"
    elif content_type is not None:
        content_category = content_type.split("/")[0]
    else:
        content_category = None

    if content_category:
        content_category = content_category.lower()

    return content_type, content_category


async def insert_vectors(
    cols: Dict[str, Any],
    all_docs: List[types.EmbededDocument],
) -> int:
    async def insert_vec(doc: types.EmbededDocument):
        values = dict(
            text=doc.text,
            embedding=doc.vec,
            **cols,
        )
        return await db_insert_vector(values)

    tasks = [insert_vec(doc) for doc in all_docs]
    ids = await asyncio.gather(*tasks)
    logger.info("Inserted %s embeddings", len(ids))
    return ids


def clean_document_path(document_path: str) -> str:
    doc_prefix = os.getenv("DOCUMENT_PREFIX_PATH")

    is_inline = document_path == "inline"
    is_s3 = document_path.startswith("s3://")
    is_url = document_path.startswith("https://") or document_path.startswith("http://")

    if not (is_inline or is_s3 or is_url) and doc_prefix:
        if not document_path.startswith("/"):
            document_path = "/" + document_path
        document_path = doc_prefix + document_path

    return document_path


def load_documents(
    request: types.DocumentEmbeddingRequest, document_path: str
) -> Tuple[bool, List[Document]]:
    direct_docs, file_loader = get_doc_loader(request, document_path, "single")
    docs = direct_docs if direct_docs else file_loader.load()

    text_splitter = ConvoTextSplitter(
        chunk_size=request.chunk_size, chunk_overlap=request.chunk_overlap
    )
    docs = text_splitter.split_documents(docs)
    is_direct_docs = direct_docs is not None

    return is_direct_docs, docs


async def generate_document_embeddings(  # Noqa: C901
    open_ai_client: AsyncOpenAI,
    request: types.DocumentEmbeddingRequest,
    graph_db_config: types.GraphDBConfig,
    graph_rag_config: types.GraphRagConfig,
    run_graph_embded: bool,
) -> Union[int, HTTPException]:
    logger.debug("Proccessing %s", request)

    document_path = clean_document_path(request.location)
    logger.info("generate_document_embeddings from %s", document_path)
    is_direct_docs, docs = load_documents(request, document_path)

    if len(docs) == 0:
        msg = "No embedding documents found for {document_path}"
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    content_type, content_category = get_content_category(
        request, document_path, docs, is_direct_docs
    )

    logger.info(
        "Content category: %s, content type: %s", content_category, content_type
    )

    if not content_category and request.contentCategoryCol:
        msg = "Unable to determine content category."
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    if not content_type and request.contentTypeCol:
        msg = "Unable to determine content type."
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    if request.contentCategoryFilter and not (
        content_category in request.contentCategoryFilter
    ):
        msg = "content_category filtered out - {content_category}"
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    logger.info("Generating embeddings from %s", document_path)

    cols = request.cols.copy() if request.cols else dict()
    expected_cols = set(text_blob.columns)
    cols = {k: v for k, v in cols.items() if k in expected_cols}
    cols["contentType"] = content_type
    cols["filePath"] = request.location

    async def embed_docs(doc: Document):
        vec = await encode_text(open_ai_client, doc.page_content)
        return types.EmbededDocument(vec=vec, text=doc.page_content)

    all_docs_tasks = [embed_docs(doc) for doc in docs]
    all_docs = await asyncio.gather(*all_docs_tasks)

    if request.cols and request.clearMatching:
        clearSql = f"DELETE FROM {escape_sql_identifier(request.embeddingsTable)} where"
        cf = True
        for cc in request.clearMatching:
            if cf:
                cf = False
            else:
                clearSql += " AND"
            if cols[cc] is None:
                clearSql += f" {escape_sql_identifier(cc)} is NULL"
            else:
                inner = sql.SQL("{value}").format(value=cols[cc]).as_string(None)
                clearSql += f" {escape_sql_identifier(cc)} = {inner}"
            cf = False

        if not cf:
            logger.debug("Clear matching query: %s", clearSql)
            exec_sql(clearSql, request.dryRun)

    inserted_ids = await insert_vectors(cols, all_docs)

    if run_graph_embded:
        logging.info("Running graph embedding for %s", request.location)
        _ = await graph_embed_docs(
            docs, request.location, graph_db_config, graph_rag_config
        )
    else:
        logging.info("Skipping graph embedding for %s", request.location)

    return len(inserted_ids)
