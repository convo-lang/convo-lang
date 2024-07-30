from langchain_community.document_loaders import S3FileLoader, TextLoader , UnstructuredURLLoader, UnstructuredFileLoader, UnstructuredHTMLLoader, UnstructuredPDFLoader, UnstructuredMarkdownLoader, DirectoryLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain.schema.document import Document
from psycopg import sql, connect
from typing import Any, Dict
from .s3_loader import S3FileLoaderEx
from .types import DocumentEmbeddingRequest
from .embed import encode_text
from iyio_common import exec_sql, escape_sql_identifier, parse_s3_path
import json
import magic


embeddings_table='VectorIndex'
max_sql_len=65536

def get_text_chunks_langchain(text:str):
    text_splitter = CharacterTextSplitter(chunk_size=300, chunk_overlap=20)
    docs = [Document(page_content=x) for x in text_splitter.split_text(text)]
    return docs

def generate_document_embeddings(request:DocumentEmbeddingRequest)->int:

    print('generate_document_embeddings',request)

    file_loader=None

    mode='single'

    document_path=request.location
    content_type=request.contentType
    mime_path = document_path
    direct_docs = None

    if document_path == 'inline':
        direct_docs=get_text_chunks_langchain(request.inlineContent)
    if document_path.startswith('s3://'):
        s3Path=parse_s3_path(document_path)
        file_loader=S3FileLoaderEx(
            s3Path['bucket'],
            s3Path['key'],
        )
        file_loader.mode=mode
    elif document_path.startswith('https://') or document_path.startswith('http://'):
        file_loader=UnstructuredURLLoader([document_path], mode=mode)
    elif document_path.endswith('/*'):
        file_loader=DirectoryLoader(
            document_path,
            show_progress=True,
            loader_cls=UnstructuredFileLoader,
            loader_kwargs={
                "mode":mode
            }
        )
    elif content_type and content_type.endswith('/pdf'):
        file_loader=UnstructuredPDFLoader(document_path, mode=mode)
    elif content_type and content_type.endswith('/html'):
        file_loader=UnstructuredHTMLLoader(document_path, mode=mode)
    elif content_type and content_type.endswith('/markdown'):
        file_loader=UnstructuredMarkdownLoader(document_path, mode=mode)
    else:
        file_loader=UnstructuredFileLoader(document_path, mode=mode)


    docs=direct_docs if direct_docs else file_loader.load()

    text_splitter=CharacterTextSplitter(chunk_size=300, chunk_overlap=20)
    docs=text_splitter.split_documents(docs)

    if len(docs) == 0:
        print(f'No embedding documents found for {document_path} ')
        return 0

    firstDoc=docs[0]
    if direct_docs:
        content_type=request.contentType
    elif firstDoc and firstDoc.metadata and firstDoc.metadata['content_type']:
        content_type=firstDoc.metadata['content_type']
    else:
        if firstDoc and firstDoc.metadata and firstDoc.metadata['filename']:
            print('first doc filename',firstDoc)
            mime_path=firstDoc.metadata['filename']

        if mime_path:
            mime = magic.Magic(mime=True)
            type=mime.from_file(mime_path)
            if type:
                content_type=type
                print('content type set to ',type)

    content_category:str|None=None

    match content_type:
        case "application/pdf":
            content_category='document'
        case _:
            if content_type:
                content_category=content_type.split('/')[0]

    if content_category:
        content_category=content_category.lower()

    print('Content category',content_category)

    if not content_category and request.contentCategoryCol:
        print('Unable to determine content category.')
        return 0

    if not content_type and request.contentTypeCol:
        print('Unable to determine content type.')
        return 0

    if request.contentCategoryFilter and  not (content_category in request.contentCategoryFilter):
        print(f'content_category filtered out - {content_category}')
        return 0

    first=True
    all=[]
    print('Generating embeddings')

    cols=request.cols.copy()

    if request.contentCategoryCol:
        cols[request.contentCategoryCol]=content_category

    if request.contentTypeCol:
        cols[request.contentTypeCol]=content_type

    for doc in docs:
        vec=encode_text(doc.page_content)
        all.append({
            **cols,
            "vector":vec,
            "text":doc.page_content
        })
        if first:
            first=False
            #print(all[0])


    colNamesEscaped=[]
    colNames=[]
    if cols:
        for colName in cols:
            colNames.append(colName)
            colNamesEscaped.append(escape_sql_identifier(colName))

    colNameSql=''
    if len(colNamesEscaped):
        colNameSql=','+(','.join(colNamesEscaped))

    inserted=0
    total_inserted=0
    head=f'INSERT INTO {escape_sql_identifier(embeddings_table)} ("text","vector"{colNameSql}) VALUES '

    sql_chucks=[head]
    sql_len=len(head)

    for index in all:

        chunk=sql.SQL("({text},{vector}").format(
            text=index["text"],
            vector=json.dumps(index["vector"])
        ).as_string(None)


        if len(colNames) and cols:
            colData=[]
            for colName in colNames:
                colData.append(sql.SQL("{value}").format(
                    value=cols[colName],
                ).as_string(None))
            chunk=chunk+','+(','.join(colData))


        chunk=chunk+'),'

        chunk_len=len(chunk)

        if chunk_len + sql_len >= max_sql_len:
            print(f'Inserting {inserted} embeddings into {embeddings_table}')
            exec_sql(''.join(sql_chucks)[:-1],request.dryRun)
            inserted=0
            sql_chucks=[head]
            sql_len=len(head)

        sql_len=sql_len+chunk_len
        sql_chucks.append(chunk)

        inserted=inserted+1
        total_inserted=total_inserted+1

    if inserted > 0:
        print(f'Inserting {inserted} embeddings into {embeddings_table}')
        exec_sql(''.join(sql_chucks)[:-1],request.dryRun)

    print(f'Inserted {total_inserted} embeddings into {embeddings_table}')

    return total_inserted



