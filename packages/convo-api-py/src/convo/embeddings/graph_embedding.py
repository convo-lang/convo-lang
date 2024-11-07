import json
import logging
import uuid
from dataclasses import asdict, dataclass
from typing import Dict, List, Optional

import age
from nano_graphrag._op import extract_entities
from nano_graphrag.base import (
    BaseGraphStorage,
    BaseVectorStorage,
    TextChunkSchema,
)
from unstructured.documents.elements import Element

from .types import GraphRagConfig

logger = logging.getLogger(__name__)


def _format_data(x: Dict[str, str]):
    def process_key(a: str) -> str:
        return a.strip('"')

    def process_value(b: str) -> str:
        if isinstance(b, str):
            b = b.replace('"', "'")
            b = '"' + b + '"'
        return b

    entries = [(process_key(k), process_value(v)) for k, v in x.items()]
    return "{" + ", ".join([f"{k}:{v}" for k, v in entries]) + "}"


@dataclass
class AgeGraphStorage(BaseGraphStorage):
    ag: age.Age
    namespace: str

    async def has_node(self, node_id: str) -> bool:
        query = f"MATCH (n) WHERE n.id = {node_id} RETURN COUNT(n) > 0"
        logger.debug("has-node query %s", query)
        cursor = self.ag.execCypher(query)
        return list(cursor)[0][0]

    async def has_edge(self, source_node_id: str, target_node_id: str) -> bool:
        query = (
            f"MATCH (s)-[r]->(t) "
            f"WHERE s.id = {source_node_id} AND t.id = {target_node_id} "
            "RETURN COUNT(r) > 0"
        )
        logger.debug("has-edge query %s", query)
        cursor = self.ag.execCypher(query)
        return list(cursor)[0][0]

    async def get_node(self, node_id: str) -> Optional[Dict]:
        query = f"MATCH (n) WHERE n.id = {node_id} RETURN properties(n)"
        logger.debug("get-node query %s", query)
        records = self.ag.execCypher(query)
        records = list(records)

        if len(records) == 0:
            return None
        else:
            raw_node_data = records[0][0]

        raw_node_data["clusters"] = json.dumps(
            [
                {
                    "level": index,
                    "cluster": cluster_id,
                }
                for index, cluster_id in enumerate(
                    raw_node_data.get("communityIds", [])
                )
            ]
        )
        return raw_node_data

    async def get_edge(
        self, source_node_id: str, target_node_id: str
    ) -> Optional[Dict]:
        query = (
            f"MATCH (s)-[r]->(t) "
            f"WHERE s.id = {source_node_id} AND t.id = {target_node_id} "
            "RETURN properties(r)"
        )
        logger.debug("get-edge query %s", query)
        records = self.ag.execCypher(query)
        records = list(records)
        return records[0][0] if records else None

    async def upsert_node(self, node_id: str, node_data: Dict[str, str]):
        node_type = node_data.get("entity_type", "UNKNOWN").strip('"')
        node_data["doc_path"] = self.namespace
        params = _format_data(node_data)
        query = f"MERGE (n:{node_type} {{id: {node_id}}}) SET n += {params}"
        logger.debug("upsert-node query %s", query)
        self.ag.execCypher(query)
        self.ag.commit()

    async def upsert_edge(
        self, source_node_id: str, target_node_id: str, edge_data: Dict[str, str]
    ):
        edge_data.setdefault("weight", 0.0)
        edge_data["doc_path"] = self.namespace
        params = _format_data(edge_data)
        query = (
            f"MATCH (s), (t) "
            f"WHERE s.id = {source_node_id} AND t.id = {target_node_id} "
            "MERGE (s)-[r:RELATED]->(t) "
            f"SET r += {params}"
        )
        logger.debug("upsert-edge query %s", query)
        self.ag.execCypher(query)
        self.ag.commit()


async def graph_embed_docs(
    graph_db: age.Age,
    chunks: List[Element],
    doc_path: str,
    graph_rag_config: GraphRagConfig,
    entity_vdb: Optional[BaseVectorStorage] = None,
):
    logger.info("Graph embedding documents")

    age_graph = AgeGraphStorage(
        ag=graph_db,
        # TODO: Insert document source here, but need to
        #  look if there is more performant way of adding this
        #  as an index
        namespace=doc_path,
        global_config=asdict(graph_rag_config),
    )

    ids = [str(uuid.uuid4()) for _ in chunks]
    chunks = {
        uuid: TextChunkSchema(
            tokens=0,  # Unused by graph-rag
            content=chunk.text,
            full_doc_id=doc_path,
            chunk_order_index=0,  # Unused by graph-rag
        )
        for i, (uuid, chunk) in enumerate(zip(ids, chunks))
    }

    _ = await extract_entities(
        chunks,
        age_graph,
        entity_vdb,
        asdict(graph_rag_config),
    )
