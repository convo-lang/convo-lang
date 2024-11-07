import asyncio
import io
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Tuple, Union

from age import Age
from convo.db import escape_sql_identifier
from databases import Database
from fastapi import HTTPException
from openai import AsyncOpenAI
from psycopg import sql
from unstructured.chunking.title import chunk_by_title
from unstructured.documents.elements import Element
from unstructured.partition.auto import partition

from . import types
from .embed import encode_text
from .graph_embedding import graph_embed_docs
from .s3_loader import load_s3

max_sql_len = 65536
doc_prefix_path = os.getenv("DOCUMENT_PREFIX_PATH")

logger = logging.getLogger(__name__)


def load_documents(
    request: types.DocumentEmbeddingRequest,
) -> Tuple[bool, List[Element]]:
    """
    Load documents and extract text chunks

    Load a document from a file-path, url or s3 bucket.
    First extracts unstructured partitions, and then
    chunk using unstructured title-level chunking.
    The document type can be passed with the request,
    but if not provided will use unstructured's automatic
    detection.
    """
    if request.contentType is not None:
        kwargs = dict(content_type=request.contentType)
    else:
        kwargs = dict()

    location = request.location

    if location == "inline":
        content = str.encode(request.inlineContent)
        elements = partition(file=io.BytesIO(content), **kwargs)
    elif location.startswith("s3://"):
        elements = load_s3(location, **kwargs)
    elif location.startswith("https://") or location.startswith("http://"):
        elements = partition(url=location, **kwargs)
    else:
        document_path = (
            location
            if doc_prefix_path is None
            else str(Path(doc_prefix_path) / Path(location.lstrip("/")))
        )
        elements = partition(filename=document_path, **kwargs)

    chunks = chunk_by_title(
        elements, new_after_n_chars=request.chunk_size, overlap=request.chunk_overlap
    )

    return chunks


def get_content_category(
    request: types.DocumentEmbeddingRequest,
    chunks: List[Element],
) -> Tuple[str, str, str]:
    """
    Extract document type information

    Extracts the document file-extension, mime-type
    (if provided during loading) and broader
    category (derived from the extension).
    """
    if request.location == "inline":
        content_type = "inline"
    else:
        content_type = Path(request.location).suffix

    mime_type = chunks[0].metadata.filetype
    mime_type = "unknown" if mime_type is None else mime_type

    if content_type == "inline":
        content_category = "inline"
    elif content_type in {".csv", ".xlsx", ".xls"}:
        content_category = "tabular"
    elif content_type == ".html":
        content_category = "website"
    elif content_type in {".eml", ".msg"}:
        content_category = "email"
    elif content_type in {".txt", ".text", ".log"}:
        content_category = "plain-text"
    elif content_type in {".md", ".odt", ".pdf", ".rst", ".rtf", ".doc", ".docx"}:
        content_category = "document"
    elif content_type in {".ppt", ".pptx"}:
        content_category = "presentation"
    else:
        content_category = "unknown"

    return content_type, mime_type, content_category


async def insert_vectors(
    db: Database,
    request: types.DocumentEmbeddingRequest,
    colNameSql,
    colNames,
    cols,
    embeded_chunks: List[types.EmbededChunk],
) -> int:
    embeddings_table = request.embeddingsTable

    inserted = 0
    total_inserted = 0
    head = (
        f"INSERT INTO {escape_sql_identifier(embeddings_table)} "
        f"({escape_sql_identifier(request.textCol)},"
        f"{escape_sql_identifier(request.embeddingCol)}{colNameSql}) VALUES "
    )

    sql_chucks = [head]
    sql_len = len(head)

    for index in embeded_chunks:
        chunk = (
            sql.SQL("({text},{vector}")
            .format(text=index.text, vector=json.dumps(index.vec))
            .as_string(None)
        )

        if len(colNames) and cols:
            colData = []
            for colName in colNames:
                colData.append(
                    sql.SQL("{value}")
                    .format(
                        value=cols[colName],
                    )
                    .as_string(None)
                )
            chunk = chunk + "," + (",".join(colData))

        chunk = chunk + "),"

        chunk_len = len(chunk)

        if chunk_len + sql_len >= max_sql_len:
            logger.debug("Inserting %s embeddings into %s", inserted, embeddings_table)
            query = "".join(sql_chucks)[:-1]
            if request.dryRun:
                logger.debug("execute_statement - %s", query)
            else:
                await db.execute(query)
            inserted = 0
            sql_chucks = [head]
            sql_len = len(head)

        sql_len = sql_len + chunk_len
        sql_chucks.append(chunk)

        inserted = inserted + 1
        total_inserted = total_inserted + 1

    if inserted > 0:
        logger.debug("Inserting %s embeddings into %s", inserted, embeddings_table)
        query = "".join(sql_chucks)[:-1]
        if request.dryRun:
            logger.debug("execute_statement - %s", query)
        else:
            await db.execute(query)

    logger.info("Inserted %s embeddings into %s", total_inserted, embeddings_table)

    return total_inserted


async def clear_matching(
    db: Database, request: types.DocumentEmbeddingRequest, cols: Dict[str, Any]
) -> None:
    clear_sql = f"DELETE FROM {escape_sql_identifier(request.embeddingsTable)} where"
    cf = True

    for cc in request.clearMatching:
        if cf:
            cf = False
        else:
            clear_sql += " AND"
        if cols[cc] is None:
            clear_sql += f" {escape_sql_identifier(cc)} is NULL"
        else:
            inner = sql.SQL("{value}").format(value=cols[cc]).as_string(None)
            clear_sql += f" {escape_sql_identifier(cc)} = {inner}"
        cf = False

    if not cf:
        if request.dryRun:
            logger.debug("execute_statement - %s", clear_sql)
        else:
            await db.execute(clear_sql)


async def generate_document_embeddings(
    db: Database,
    graph_db: Age,
    open_ai_client: AsyncOpenAI,
    request: types.DocumentEmbeddingRequest,
    graph_rag_config: types.GraphRagConfig,
    run_graph_embded: bool,
) -> Union[int, HTTPException]:
    logger.debug("Proccessing %s", request)

    logger.info("generate_document_embeddings from %s", request.location)
    chunks = load_documents(request)

    if len(chunks) == 0:
        msg = "No embedding documents found for {request.location}"
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    content_type, mime_type, content_category = get_content_category(request, chunks)

    logger.info(
        "Content category: %s, mime-type: %s, content type: %s",
        content_category,
        mime_type,
        content_type,
    )

    if not content_category and request.contentCategoryCol:
        msg = "Unable to determine content category."
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    if not content_type and request.contentTypeCol:
        msg = "Unable to determine content type."
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    if (
        request.contentCategoryFilter
        and content_category in request.contentCategoryFilter
    ):
        msg = "content_category filtered out - {content_category}"
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    logger.info("Generating embeddings from %s", request.location)

    cols = request.cols.copy() if request.cols else dict()

    if request.contentCategoryCol:
        cols[request.contentCategoryCol] = content_category

    if request.contentTypeCol:
        cols[request.contentTypeCol] = content_type

    async def embed_chunk(chunk: Element):
        vec = await encode_text(open_ai_client, chunk.text)
        return types.EmbededChunk(vec=vec, text=chunk.text)

    embed_chunk_tasks = [embed_chunk(chunk) for chunk in chunks]
    embedded_chunks = await asyncio.gather(*embed_chunk_tasks)

    if request.cols and request.clearMatching:
        await clear_matching(db, request, cols)

    col_names_escaped = list()
    col_names = list()

    if cols:
        for colName in cols:
            col_names.append(colName)
            col_names_escaped.append(escape_sql_identifier(colName))

    col_name_sql = ""

    if len(col_names_escaped):
        col_name_sql = "," + (",".join(col_names_escaped))

    total_inserted = await insert_vectors(
        db, request, col_name_sql, col_names, cols, embedded_chunks
    )

    if run_graph_embded:
        logging.info("Running graph embedding for %s", request.location)
        _ = await graph_embed_docs(
            graph_db,
            chunks,
            request.location,
            cols,
            request.clearMatching,
            graph_rag_config,
        )
    else:
        logging.info("Skipping graph embedding for %s", request.location)

    return total_inserted
