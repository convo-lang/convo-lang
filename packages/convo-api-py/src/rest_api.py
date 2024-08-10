from iyio_common import start_rest_server
from typing import Dict
from convo_ingestion.embed_documents import generate_document_embeddings
from convo_ingestion.types import DocumentEmbeddingRequest
from convo_ingestion.embed import encode_text
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
        print('Data type',type(data))
        return encode_text(data)

def start_rest_api():
    start_rest_server(serverPort,request_handler)

if __name__ == '__main__':
    start_rest_api()
