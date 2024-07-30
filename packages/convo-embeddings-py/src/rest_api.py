from iyio_common import start_rest_server
from typing import Dict
from convo_embeddings.embed_documents import generate_document_embeddings
from convo_embeddings.types import DocumentEmbeddingRequest
from convo_embeddings.embed import encode_text
import os


serverPort=int(os.getenv('REST_PORT') or os.getenv('PORT') or '8080')


def request_handler(path,data:Dict[str,str],method):
    """ Handles an http request. data is either the request body or query params for a GET request """

    if data and ('document-location' in data) and ('content-type' in data) and ('source-id' in data):
        return generate_document_embeddings(DocumentEmbeddingRequest(
            location=data['document-location'],
            contentType=data['content-type'],
            contentCategoryCol='contentCategory',
            contentTypeCol='contentType',
            cols={
                "sourceId":data['source-id']
            }
        ))
    elif data and ('content' in data) and ('content-type' in data) and ('source-id' in data):
        return generate_document_embeddings(DocumentEmbeddingRequest(
            location="inline",
            inlineContent=data['content'],
            contentType=data['content-type'],
            cols={
                "sourceId":data['source-id']
            }
        ))
    elif method == "GET":
        return encode_text([data['text'] if 'text' in data else ""])
    else:
        return encode_text(data)

start_rest_server(serverPort,request_handler)
