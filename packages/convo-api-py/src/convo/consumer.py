from quixstreams import Application
import os
import asyncio
from iyio_common import SqsEventRecord
from .convo_embeddings.embed_documents import generate_document_embeddings
from .convo_embeddings.types import DocumentEmbeddingRequest


def process_embedding(message: SqsEventRecord):
    
    if not message.body["Records"]:
        print("Records not found in event body")
        return

    for record in message.body["Records"]:
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

# Create an Application - the main configuration entry point
app = Application(
    broker_address=os.getenv("RUN_GRAPH_EMBED"),
    consumer_group="doc-embedding",
    auto_offset_reset="earliest", 
    auto_create_topics=False,
)

# Define a topic with chat messages in JSON format
embedding_topic = app.topic(name=os.getenv("EMBEDDING_TOPIC"), value_deserializer="json")
sdf = app.dataframe(topic=embedding_topic)
sdf = sdf.update(process_embedding)

# # Print the output result
# sdf = sdf.update(lambda row: print(f"Output: {row}"))

# # Run the streaming application
# if __name__ == "__main__":
#     app.run()
