from dataclasses import field
from typing import Dict, List, Optional, Tuple, Union

from nano_graphrag._op import extract_entities
from nano_graphrag.base import (
    BaseGraphStorage,
    BaseVectorStorage,
    EmbeddingFunc,
    SingleCommunitySchema,
    TextChunkSchema,
)


class AgeGraphStorage(BaseGraphStorage):
    async def has_node(self, node_id: str) -> bool:
        raise NotImplementedError

    async def has_edge(self, source_node_id: str, target_node_id: str) -> bool:
        raise NotImplementedError

    async def node_degree(self, node_id: str) -> int:
        raise NotImplementedError

    async def edge_degree(self, src_id: str, tgt_id: str) -> int:
        raise NotImplementedError

    async def get_node(self, node_id: str) -> Optional[Dict]:
        raise NotImplementedError

    async def get_edge(
        self, source_node_id: str, target_node_id: str
    ) -> Union[Dict, None]:
        raise NotImplementedError

    async def get_node_edges(
        self, source_node_id: str
    ) -> Union[List[Tuple[str, str]], None]:
        raise NotImplementedError

    async def upsert_node(self, node_id: str, node_data: Dict[str, str]):
        raise NotImplementedError

    async def upsert_edge(
        self, source_node_id: str, target_node_id: str, edge_data: Dict[str, str]
    ):
        raise NotImplementedError

    async def clustering(self, algorithm: str):
        raise NotImplementedError

    async def community_schema(self) -> Dict[str, SingleCommunitySchema]:
        """Return the community representation with report and nodes"""
        raise NotImplementedError


class SQLVectorStorage(BaseVectorStorage):
    embedding_func: EmbeddingFunc
    meta_fields: set = field(default_factory=set)

    async def query(self, query: str, top_k: int) -> List[Dict]:
        raise NotImplementedError

    async def upsert(self, data: Dict[str, Dict]):
        """Use 'content' field from value for embedding, use key as id.
        If embedding_func is None, use 'embedding' field from value
        """
        raise NotImplementedError


def graph_embed_chunks(
    chunks: dict[str, TextChunkSchema],
    knowledge_graph_inst: AgeGraphStorage,
    entity_vdb: SQLVectorStorage,
    global_config: Dict,
) -> AgeGraphStorage:
    updated_graph = extract_entities(
        chunks,
        knowledge_graph_inst,
        entity_vdb,
        global_config,
    )

    return updated_graph
