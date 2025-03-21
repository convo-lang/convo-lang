import asyncio
import os
from typing import List

from iyio_common import SqsEventRecord, run_sqs

from .embeddings.embed_documents import generate_document_embeddings
from .embeddings.types import DocumentEmbeddingRequest

queueUrl = os.getenv("CONNECTED_QUEUE_URL")

if not queueUrl:
    print("CONNECTED_QUEUE_URL env var required")
    raise


def onMessage(messages: List[SqsEventRecord]):
    print("New messages", messages)

    for msg in messages:
        if not msg.body["Records"]:
            print("Records not found in event body")
            continue

        for record in msg.body["Records"]:
            s3 = record["s3"]
            if not s3:
                print("S3 event data not found")
                continue

            key = s3["object"]["key"]
            bucket = s3["bucket"]["name"]

            if not key:
                print("S3 object key not found")
                continue

            if not bucket:
                print("S3 bucket not found")
                continue

            asyncio.run(
                generate_document_embeddings(
                    DocumentEmbeddingRequest(
                        dryRun=False,
                        contentCategoryFilter=["document"],
                        location=f"s3://{bucket}/{key}",
                        contentCategoryCol="contentCategory",
                        contentTypeCol="contentType",
                        cols={"sourceId": key},
                    )
                )
            )


scaleTo0 = os.getenv("TASK_INFO_MIN_INSTANCE_COUNT") == "0"

if __name__ == "__main__":
    # receive first message from queue then exit
    run_sqs(queueUrl, onMessage, exitOnFailure=scaleTo0, exitOnTimeout=scaleTo0)
