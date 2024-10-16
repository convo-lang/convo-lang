import json
import logging
from typing import Optional, Tuple

import magic
from iyio_common import (
    escape_sql_identifier,
    exec_sql,
    getEnvVar,
    parse_s3_path,
)
from langchain.schema.document import Document
from langchain_community.document_loaders import (
    DirectoryLoader,
    UnstructuredFileLoader,
    UnstructuredHTMLLoader,
    UnstructuredMarkdownLoader,
    UnstructuredPDFLoader,
    UnstructuredURLLoader,
)
from openai import Client
from psycopg import sql

from .convo_text_splitter import ConvoTextSplitter
from .embed import encode_text
from .graph_embedding import graph_embed_docs
from .s3_loader import S3FileLoaderEx
from .types import DocumentEmbeddingRequest, GraphDBConfig, GraphRagConfig

max_sql_len = 65536

logger = logging.getLogger(__name__)


def get_text_chunks_langchain(text: str):
    text_splitter = ConvoTextSplitter(chunk_size=300, chunk_overlap=20)
    docs = [Document(page_content=x) for x in text_splitter.split_text(text)]
    return docs


def get_doc_loader(
    request: DocumentEmbeddingRequest, document_path: str, mode: str
) -> Tuple:
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
            loader_cls=UnstructuredFileLoader,
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
        file_loader = UnstructuredFileLoader(document_path, mode=mode)
        direct_docs = None

    return direct_docs, file_loader


def get_content_category(
    request: DocumentEmbeddingRequest, document_path: str, docs, direct_docs
) -> Tuple[Optional[str], Optional[str]]:
    content_type = request.contentType
    mime_path = document_path
    firstDoc = docs[0]

    if direct_docs:
        content_type = request.contentType
    elif firstDoc and firstDoc.metadata and ("content_type" in firstDoc.metadata):
        content_type = firstDoc.metadata["content_type"]
    else:
        if firstDoc and firstDoc.metadata and ("filename" in firstDoc.metadata):
            logger.info("first doc filename %s", firstDoc)
            mime_path = firstDoc.metadata["filename"]

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


def insert_vectors(
    request: DocumentEmbeddingRequest,
    colNameSql,
    colNames,
    cols,
    all_docs,
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

    for index in all_docs:
        chunk = (
            sql.SQL("({text},{vector}")
            .format(text=index["text"], vector=json.dumps(index["vector"]))
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
            logger.info("Inserting %s embeddings into %s", inserted, embeddings_table)
            exec_sql("".join(sql_chucks)[:-1], request.dryRun)
            inserted = 0
            sql_chucks = [head]
            sql_len = len(head)

        sql_len = sql_len + chunk_len
        sql_chucks.append(chunk)

        inserted = inserted + 1
        total_inserted = total_inserted + 1

    if inserted > 0:
        logger.info("Inserting %s embeddings into %s", inserted, embeddings_table)
        exec_sql("".join(sql_chucks)[:-1], request.dryRun)

    logger.info("Inserted %s embeddings into %s", total_inserted, embeddings_table)

    return total_inserted


def generate_document_embeddings(  # Noqa: C901
    open_ai_client: Client,
    request: DocumentEmbeddingRequest,
    graph_db_config: GraphDBConfig,
    graph_rag_config: GraphRagConfig,
    chunk_size: int = 300,
    chunk_overlap: int = 20,
    embed_graph: bool = False,
) -> int:
    logger.info("generate_document_embeddings %s", request)

    document_path = request.location
    docPrefix = getEnvVar("DOCUMENT_PREFIX_PATH")

    if document_path != "inline" and docPrefix:
        if not document_path.startswith("/"):
            document_path = "/" + document_path
        document_path = docPrefix + document_path

    embeddings_table = request.embeddingsTable

    direct_docs, file_loader = get_doc_loader(request, document_path, "single")
    docs = direct_docs if direct_docs else file_loader.load()

    text_splitter = ConvoTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    )
    docs = text_splitter.split_documents(docs)

    if len(docs) == 0:
        logger.info("No embedding documents found for %s", document_path)
        return 0

    content_type, content_category = get_content_category(
        request, document_path, docs, direct_docs
    )

    logger.info("Content category %s", content_category)

    if not content_category and request.contentCategoryCol:
        logger.info("Unable to determine content category.")
        return 0

    if not content_type and request.contentTypeCol:
        logger.info("Unable to determine content type.")
        return 0

    if request.contentCategoryFilter and not (
        content_category in request.contentCategoryFilter
    ):
        logger.info("content_category filtered out - %s", content_category)
        return 0

    all_docs = list()
    logger.info("Generating embeddings")

    cols = request.cols.copy() if request.cols else dict()

    if request.contentCategoryCol:
        cols[request.contentCategoryCol] = content_category

    if request.contentTypeCol:
        cols[request.contentTypeCol] = content_type

    for doc in docs:
        vec = encode_text(open_ai_client, doc.page_content)
        all_docs.append({**cols, "vector": vec, "text": doc.page_content})

    if request.cols and request.clearMatching:
        clearSql = f"DELETE FROM {escape_sql_identifier(embeddings_table)} where"
        cf = True
        for cc in request.clearMatching:
            if cf:
                cf = False
            else:
                clearSql += " AND"
            if cols[cc] is None:
                clearSql += f" {escape_sql_identifier(cc)} is NULL"
            else:
                clearSql += f' {escape_sql_identifier(cc)} = {sql.SQL("{cols[cc]}").as_string(None)}'
            cf = False

        if not cf:
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

    total_inserted = insert_vectors(request, col_name_sql, col_names, cols, all_docs)

    if embed_graph:
        _ = graph_embed_docs(docs, graph_db_config, graph_rag_config)

    return total_inserted
