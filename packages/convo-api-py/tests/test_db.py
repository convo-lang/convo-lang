import asyncio

import convo
import convo.embeddings
import convo.embeddings.embed_documents
import convo.embeddings.types
import pytest
from openai.types.create_embedding_response import (
    CreateEmbeddingResponse,
    Usage,
)
from openai.types.embedding import Embedding


@pytest.fixture
def mock_db():
    class MockDB:
        def __init__(self):
            self.queries = list()

        async def execute(self, query, values=None):
            self.queries.append((query, values))

        async def execute_many(self, *, query, values):
            self.queries.extend((query, values))

    return MockDB()


@pytest.fixture
def mock_open_ai():
    class Embeddings:
        async def create(self, *, input, model):
            assert isinstance(input, list)
            embedding = Embedding(
                embedding=[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
                index=0,
                object="embedding",
            )
            return CreateEmbeddingResponse(
                data=[embedding],
                model=model,
                object="list",
                usage=Usage(prompt_tokens=0, total_tokens=0),
            )

    class MockOpenAI:
        def __init__(self):
            self.embeddings = Embeddings()

    return MockOpenAI()


def test_document_embedding(mock_db, mock_open_ai):
    request = convo.embeddings.types.DocumentEmbeddingRequest(
        location="inline", inlineContent="Foo Bar Baz"
    )
    asyncio.run(
        convo.embeddings.embed_documents.generate_document_embeddings(
            mock_db, None, mock_open_ai, request, None, False
        )
    )
    assert len(mock_db.queries) == 1
    assert mock_db.queries[0][0] == (
        'INSERT INTO "TextBlob" ("text", "embedding") '
        "VALUES (:text, :embedding) RETURNING id"
    )
    assert mock_db.queries[0][1] == {
        "embedding": "[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]",
        "text": "Foo Bar Baz",
    }


def test_document_embedding_dry_run(mock_db, mock_open_ai):
    request = convo.embeddings.types.DocumentEmbeddingRequest(
        location="inline",
        inlineContent="Foo Bar Baz",
        dryRun=True,
    )
    asyncio.run(
        convo.embeddings.embed_documents.generate_document_embeddings(
            mock_db, None, mock_open_ai, request, None, False
        )
    )
    assert len(mock_db.queries) == 0


def test_document_embedding_w_delete(mock_db, mock_open_ai):
    request = convo.embeddings.types.DocumentEmbeddingRequest(
        location="inline",
        inlineContent="Foo Bar Baz",
        cols=dict(foo=10),
        clearMatching=["foo"],
    )
    asyncio.run(
        convo.embeddings.embed_documents.generate_document_embeddings(
            mock_db, None, mock_open_ai, request, None, False
        )
    )
    assert len(mock_db.queries) == 2
    assert mock_db.queries[0][0] == 'DELETE FROM "TextBlob" where "foo" = 10'
    assert mock_db.queries[1][0] == (
        'INSERT INTO "TextBlob" ("text", "embedding", "foo") '
        "VALUES (:text, :embedding, :foo) RETURNING id"
    )
    assert mock_db.queries[1][1] == {
        "embedding": "[0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]",
        "foo": "10",
        "text": "Foo Bar Baz",
    }
