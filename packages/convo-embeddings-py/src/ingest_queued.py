from typing import Any, List
from iyio_common import run_sqs, SqsEventRecord, getEnvVar
from convo_embeddings.embed_documents import generate_document_embeddings
from convo_embeddings.types import DocumentEmbeddingRequest


queueUrl=getEnvVar('CONNECTED_QUEUE_URL')
if not queueUrl:
    print('CONNECTED_QUEUE_URL env var required')
    raise


def onMessage(messages:List[SqsEventRecord]):
    print('New messages',messages)

    for msg in messages:
        if not msg.body['Records']:
            print('Records not found in event body')
            continue

        for record in msg.body['Records']:
            s3=record['s3']
            if not s3:
                print('S3 event data not found')
                continue

            key=s3['object']['key']
            bucket=s3['bucket']['name']

            if not key:
                print('S3 object key not found')
                continue

            if not bucket:
                print('S3 bucket not found')
                continue

            generate_document_embeddings(DocumentEmbeddingRequest(
                dryRun=False,
                contentCategoryFilter=['document'],
                location=f's3://{bucket}/{key}',
                contentCategoryCol='contentCategory',
                contentTypeCol='contentType',
                cols={
                    "sourceId":key
                },

            ))


scaleTo0=getEnvVar('TASK_INFO_MIN_INSTANCE_COUNT')=='0'

# receive first message from queue then exit
run_sqs(queueUrl,onMessage,exitOnFailure=scaleTo0,exitOnTimeout=scaleTo0)
