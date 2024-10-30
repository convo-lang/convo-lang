import asyncio

from convo.embeddings.embed_documents import generate_document_embeddings
from convo.embeddings.types import (
    DocumentEmbeddingRequest,
    GraphDBConfig,
    GraphRagConfig,
)
from dotenv import load_dotenv
from iyio_common import getEnvVar
from openai import OpenAI

load_dotenv("/home/liirn/Projects/convo-studio/.env.local")
load_dotenv("/home/liirn/Projects/convo-studio/.env")
load_dotenv("/home/liirn/Projects/convo-studio/secrets/.env-db")
load_dotenv("/home/liirn/Projects/convo-studio/secrets/.env-openai")

graph_rag_config = GraphRagConfig()
graph_db_config = GraphDBConfig(
    host=getEnvVar("PGHOST"),
    port=getEnvVar("PGPORT"),
    dbname=getEnvVar("PGDATABASE"),
    user=getEnvVar("PGUSER"),
    password=getEnvVar("PGPASSWORD"),
    graph=getEnvVar("PGGRAPH"),
)
# generate_document_embeddings('/Users/scott/docs/convo-lang-mgr/Documents/Convo-2024-01-24-(1).pdf','application/pdf',docTemplate)

# generate_document_embeddings('s3://liirnspace-bucksmediabucket70ce2cea-11rljmkq8tolk/bn3Pk99FQrKYNduH8zj4Rw8FeFjurMSkeA4Xp1nhCbXg','application/pdf',docTemplate)

# generate_document_embeddings('https://liirnspace-bucksmediabucket70ce2cea-11rljmkq8tolk.s3.amazonaws.com/bn3Pk99FQrKYNduH8zj4Rw8FeFjurMSkeA4Xp1nhCbXg','application/pdf',docTemplate)

# generate_document_embeddings('https://en.wikipedia.org/wiki/Magna_Lykseth-Skogman','text/html',docTemplate)

# s3Key = "bn3Pk99FQrKYNduH8zj4Rw8FeFjurMSkeA4Xp1nhCbXg"
# generate_document_embeddings(DocumentEmbeddingRequest(
#     dryRun=True,
#     #location='/Users/scott/docs/convo-lang-mgr/Documents/Convo-2024-01-24-(1).pdf',
#     contentCategoryFilter=['document'],
#     location='s3://liirnspace-bucksmediabucket70ce2cea-11rljmkq8tolk/bn3Pk99FQrKYNduH8zj4Rw8FeFjurMSkeA4Xp1nhCbXg',
#     contentCategoryCol='contentCategory',
#     contentTypeCol='contentType',
#     cols={
#         "sourceTitle":"Dumpling",
#         "sourceId":f"{s3Key}"
#     },

# ))
# https://liirnspace-bucksmediabucket70ce2cea-11rljmkq8tolk.s3.amazonaws.com/aGBfKn60TaCreg-EwLI46AIe23r9QdStqEUyYqGpyA0w

print(graph_db_config)
print(graph_rag_config)

asyncio.run(
    generate_document_embeddings(
        OpenAI(),
        DocumentEmbeddingRequest(
            dryRun=True,
            location="inline",
            inlineContent=(
                "The speaker asserts that regardless of experience, there is always potential to "
                "learn from others in the same field, as different individuals may have access to "
                "unique knowledge and teaching. They relate this to their own experience in "
                "woodworking, where they began with significant initial knowledge from family "
                "teachings but were not taken seriously early in their apprenticeship. Despite "
                "this, they were fortunate to find mentors among other tradesmen who supported "
                "and further educated them, boosting their confidence and enhancing their skills."
            ),
            contentType="text/markdown",
            cols={"sourceId": "abc-stuff"},
            graphEmbed=True,
        ),
        graph_db_config,
        graph_rag_config,
    )
)
