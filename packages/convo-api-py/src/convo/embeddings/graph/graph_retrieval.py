from typing import Dict, List, Tuple
from .entity_extraction import extract_chunk_entities_and_relationships
from convo.embeddings import types
from dataclasses import asdict
import age
import asyncio
from nano_graphrag.prompt import GRAPH_FIELD_SEP


def process_results(record: Tuple[age.Vertex, age.Edge, age.Vertex]) -> Tuple[Dict, Dict, Dict]:
    parsed_record = (
        dict(**record[0].properties),
        dict(**record[1].properties),
        dict(**record[2].properties),
    )
    for r in parsed_record:
        r["source_id"] = r["source_id"].split(GRAPH_FIELD_SEP)
        r["description"] = r["description"].split(GRAPH_FIELD_SEP)

    return parsed_record
        

async def get_chunk_entity_neighbours(
    ag: age.Age, graph_rag_config: types.GraphRagConfig, chunk: str
) -> Dict[List[Dict], List[Dict]]:
    
    nodes, _edges = await extract_chunk_entities_and_relationships(
        chunk, asdict(graph_rag_config)
    )

    entity_names = list(nodes.keys())
    
    async def get_vertex_neighbours(entity_id: str):
        query = f"MATCH (V {{id: {entity_id}}})-[R:RELATED]-(V2) RETURN V, R, V2"
        records = ag.execCypher(query, cols=["V", "R", "V2"])
        records = [process_results(r) for r in records]
        return records

    graph_record_tasks = [get_vertex_neighbours(i) for i in entity_names]
    graph_records = await asyncio.gather(*graph_record_tasks)
    graph_records = [r for records in graph_records for r in records]

    return graph_records
