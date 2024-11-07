from typing import List, Union

from openai import AsyncOpenAI


async def encode_text(open_ai_client: AsyncOpenAI, value: Union[List[str], str]):
    is_list = isinstance(value, list)
    input = value if is_list else [value]

    response = await open_ai_client.embeddings.create(
        input=input, model="text-embedding-3-small"
    )

    if not is_list:
        return response.data[0].embedding
    else:
        return [em.embedding for em in response.data]
