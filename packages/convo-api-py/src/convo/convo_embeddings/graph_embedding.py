import asyncio
import json
from dataclasses import dataclass
from typing import Dict, List, Optional

import age
from langchain_core.documents import Document
from nano_graphrag._llm import gpt_4o_complete, gpt_4o_mini_complete
from nano_graphrag._op import extract_entities
from nano_graphrag.base import (
    BaseGraphStorage,
    BaseVectorStorage,
    TextChunkSchema,
)


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
    namespace: str
    host: str
    port: str
    dbname: str
    user: str
    password: str
    graph: str
    ag: age.Age = None

    def __post_init__(self):
        self.ag = age.connect(
            host=self.host,
            port=self.port,
            dbname=self.dbname,
            user=self.user,
            password=self.password,
            graph=self.graph,
        )

    async def has_node(self, node_id: str) -> bool:
        query = f"MATCH (n) WHERE n.id = {node_id} RETURN COUNT(n) > 0"
        cursor = self.ag.execCypher(query)
        return list(cursor)[0][0]

    async def has_edge(self, source_node_id: str, target_node_id: str) -> bool:
        query = (
            f"MATCH (s)-[r]->(t) "
            f"WHERE s.id = {source_node_id} AND t.id = {target_node_id} "
            "RETURN COUNT(r) > 0"
        )
        cursor = self.ag.execCypher(query)
        return list(cursor)[0][0]

    async def get_node(self, node_id: str) -> Optional[Dict]:
        query = f"MATCH (n) WHERE n.id = {node_id} RETURN properties(n)"
        print("Get node ", query)
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
        print("Get edge ", query)
        records = self.ag.execCypher(query)
        records = list(records)
        return records[0][0] if records else None

    async def upsert_node(self, node_id: str, node_data: Dict[str, str]):
        node_type = node_data.get("entity_type", "UNKNOWN").strip('"')
        params = _format_data(node_data)
        query = f"MERGE (n:{node_type} {{id: {node_id}}}) SET n += {params}"
        print("Upsert node ", query)
        self.ag.execCypher(query)
        self.ag.commit()

    async def upsert_edge(
        self, source_node_id: str, target_node_id: str, edge_data: Dict[str, str]
    ):
        edge_data.setdefault("weight", 0.0)
        params = _format_data(edge_data)
        query = (
            f"MATCH (s), (t) "
            f"WHERE s.id = {source_node_id} AND t.id = {target_node_id} "
            "MERGE (s)-[r:RELATED]->(t) "
            f"SET r += {params}"
        )
        print("Upsert edge ", query)
        self.ag.execCypher(query)
        self.ag.commit()


def graph_embed_docs(
    docs: List[Document],  # Chunk key and chunk data
    knowledge_graph_inst: AgeGraphStorage,
    entity_vdb: Optional[BaseVectorStorage] = None,
) -> AgeGraphStorage:
    chunks = {
        f"{i:#0{6}x}": TextChunkSchema(
            tokens=0,
            content=doc.page_content,
            full_doc_id=f"{i:#0{6}x}",
            chunk_order_index=0,
        )
        for i, doc in enumerate(docs)
    }

    global_config = dict(
        best_model_func=gpt_4o_complete,
        best_model_max_token_size=32768,
        best_model_max_async=16,
        cheap_model_func=gpt_4o_mini_complete,
        cheap_model_max_token_size=32768,
        cheap_model_max_async=16,
        tiktoken_model_name="gpt-4o",
        entity_summary_to_max_tokens=500,
        entity_extract_max_gleaning=1,
    )

    knowledge_graph_inst.global_config = global_config

    updated_graph = asyncio.run(
        extract_entities(
            chunks,
            knowledge_graph_inst,
            entity_vdb,
            global_config,
        )
    )

    knowledge_graph_inst.ag.commit()

    return updated_graph
