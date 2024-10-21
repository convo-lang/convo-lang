# from sentence_transformers import SentenceTransformer

# modelPath='../ai-models/all-mpnet-base-v2'

# model = SentenceTransformer(modelPath)

# def encode_text(sentences):

#     return model.encode(sentences).tolist()

from typing import List, Union

from openai import OpenAI


def encode_text(open_ai_client: OpenAI, value: Union[List[str], str]):
    isList = isinstance(value, list)

    response = open_ai_client.embeddings.create(
        input=value if isList else [value], model="text-embedding-3-small"
    )

    if not isList:
        return response.data[0].embedding

    all = [em.embedding for em in response.data]

    return all
