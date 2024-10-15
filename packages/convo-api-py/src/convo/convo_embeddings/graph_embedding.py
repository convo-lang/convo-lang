import json
from typing import Dict, List, Optional, Union

import age
from langchain_core.documents import Document
from nano_graphrag._llm import gpt_4o_complete, gpt_4o_mini_complete
from nano_graphrag._op import extract_entities
from nano_graphrag.base import (
    BaseGraphStorage,
    BaseVectorStorage,
    TextChunkSchema,
)


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
        record = self.ag.execCypher(
            f"MATCH (n:{self.namespace}) WHERE n.id = {node_id} RETURN COUNT(n) > 0 AS exists",
        )
        return record["exists"] if record else False

    async def has_edge(self, source_node_id: str, target_node_id: str) -> bool:
        record = self.ag.execCypher(
            f"MATCH (s:{self.namespace})-[r]->(t:{self.namespace}) "
            f"WHERE s.id = {source_node_id} AND t.id = {target_node_id} "
            "RETURN COUNT(r) > 0 AS exists",
        )
        return record["exists"] if record else False

    async def get_node(self, node_id: str) -> Optional[Dict]:
        record = self.ag.execCypher(
            f"MATCH (n:{self.namespace}) WHERE n.id = {node_id} RETURN properties(n) AS node_data",
            node_id=node_id,
        )
        raw_node_data = record["node_data"] if record else None

        if raw_node_data is None:
            return None

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
    ) -> Union[Dict, None]:
        record = self.ag.execCypher(
            f"MATCH (s:{self.namespace})-[r]->(t:{self.namespace}) "
            f"WHERE s.id = {source_node_id} AND t.id = {target_node_id} "
            "RETURN properties(r) AS edge_data",
        )
        return record["edge_data"] if record else None

    async def upsert_node(self, node_id: str, node_data: Dict[str, str]):
        node_type = node_data.get("entity_type", "UNKNOWN").strip('"')
        self.ag.execCypher(
            f"MERGE (n:{self.namespace}:{node_type} {node_id}) SET n += {node_data}",
        )

    async def upsert_edge(
        self, source_node_id: str, target_node_id: str, edge_data: Dict[str, str]
    ):
        edge_data.setdefault("weight", 0.0)
        self.ag.execCypher(
            f"MATCH (s:{self.namespace}), (t:{self.namespace}) "
            f"WHERE s.id = {source_node_id} AND t.id = {target_node_id} "
            "MERGE (s)-[r:RELATED]->(t) "
            f"SET r += {edge_data}",
        )


def graph_embed_docs(
    docs: List[Document],  # Chunk key and chunk data
    knowledge_graph_inst: AgeGraphStorage,
    entity_vdb: Optional[BaseVectorStorage] = None,
) -> AgeGraphStorage:
    chunks = {
        i: TextChunkSchema(
            tokens=0, content=doc.page_content, full_doc_id=str(i), chunk_order_index=0
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
    )

    updated_graph = extract_entities(
        chunks,
        knowledge_graph_inst,
        entity_vdb,
        global_config,
    )

    knowledge_graph_inst.ag.commit()

    return updated_graph
