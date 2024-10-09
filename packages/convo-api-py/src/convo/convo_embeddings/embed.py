# from sentence_transformers import SentenceTransformer

# modelPath='../ai-models/all-mpnet-base-v2'

# model = SentenceTransformer(modelPath)

# def encode_text(sentences):

#     return model.encode(sentences).tolist()

from typing import List, Union

from openai import OpenAI

client = OpenAI()


def encode_text(value: Union[List[str], str]):
    isList = type(value) is list

    response = client.embeddings.create(
        input=value if isList else [value], model="text-embedding-3-small"
    )

    if not isList:
        return response.data[0].embedding

    all = []
    for em in response.data:
        all.append(em.embedding)

    return all
