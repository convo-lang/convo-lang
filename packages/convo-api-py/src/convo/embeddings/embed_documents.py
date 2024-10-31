import asyncio
import io
import json
import logging
import os
from typing import List, Optional, Tuple, Union

from fastapi import HTTPException
from iyio_common import escape_sql_identifier, exec_sql
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

logger = logging.getLogger(__name__)


def load_documents(
    request: types.DocumentEmbeddingRequest, document_path: str
) -> Tuple[bool, List[Element]]:
    if request.contentType is not None:
        kwargs = dict(content_type=request.contentType)
    else:
        kwargs = dict

    if document_path == "inline":
        content = str.encode(request.inlineContent)
        elements = partition(file=io.BytesIO(content), **kwargs)
    elif document_path.startswith("s3://"):
        elements = load_s3(document_path, **kwargs)
    elif document_path.startswith("https://") or document_path.startswith("http://"):
        elements = partition(url=document_path, **kwargs)
    else:
        elements = partition(filename=document_path, **kwargs)

    chunks = chunk_by_title(
        elements, new_after_n_chars=request.chunk_size, overlap=request.chunk_overlap
    )
    return chunks


def get_content_category(
    request: types.DocumentEmbeddingRequest,
    chunks: List[Element],
) -> Tuple[Optional[str], Optional[str]]:
    content_type = request.contentType

    if content_type is None:
        content_type = chunks[0].metadata.filetype

    if content_type == "application/pdf":
        content_category = "document"
    elif content_type is not None:
        content_category = content_type.split("/")[0].lower()
    else:
        content_category = None

    return content_type, content_category


def insert_vectors(
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
            exec_sql("".join(sql_chucks)[:-1], request.dryRun)
            inserted = 0
            sql_chucks = [head]
            sql_len = len(head)

        sql_len = sql_len + chunk_len
        sql_chucks.append(chunk)

        inserted = inserted + 1
        total_inserted = total_inserted + 1

    if inserted > 0:
        logger.debug("Inserting %s embeddings into %s", inserted, embeddings_table)
        exec_sql("".join(sql_chucks)[:-1], request.dryRun)

    logger.info("Inserted %s embeddings into %s", total_inserted, embeddings_table)

    return total_inserted


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
    chunks = load_documents(request, document_path)

    if len(chunks) == 0:
        msg = "No embedding documents found for {document_path}"
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    content_type, content_category = get_content_category(request, chunks)

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

    if (
        request.contentCategoryFilter
        and content_category in request.contentCategoryFilter
    ):
        msg = "content_category filtered out - {content_category}"
        logger.info(msg)
        return HTTPException(status_code=400, detail=msg)

    logger.info("Generating embeddings from %s", document_path)

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

    col_names_escaped = list()
    col_names = list()

    if cols:
        for colName in cols:
            col_names.append(colName)
            col_names_escaped.append(escape_sql_identifier(colName))

    col_name_sql = ""

    if len(col_names_escaped):
        col_name_sql = "," + (",".join(col_names_escaped))

    total_inserted = insert_vectors(
        request, col_name_sql, col_names, cols, embedded_chunks
    )

    if run_graph_embded:
        logging.info("Running graph embedding for %s", request.location)
        _ = await graph_embed_docs(
            chunks, request.location, graph_db_config, graph_rag_config
        )
    else:
        logging.info("Skipping graph embedding for %s", request.location)

    return total_inserted
