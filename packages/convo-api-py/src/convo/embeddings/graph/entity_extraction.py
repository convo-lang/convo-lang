import re
from collections import defaultdict
from typing import Dict, Tuple

from nano_graphrag._op import (
    _handle_single_entity_extraction,
    _handle_single_relationship_extraction,
)
from nano_graphrag._utils import (
    pack_user_ass_to_openai_messages,
    split_string_by_multi_markers,
)
from nano_graphrag.prompt import PROMPTS


async def extract_chunk_entities_and_relationships(
    chunk: str,
    global_config: Dict,
) -> Tuple[Dict, Dict]:
    use_llm_func: callable = global_config["best_model_func"]
    entity_extract_max_gleaning = global_config["entity_extract_max_gleaning"]

    entity_extract_prompt = PROMPTS["entity_extraction"]
    continue_prompt = PROMPTS["entiti_continue_extraction"]
    if_loop_prompt = PROMPTS["entiti_if_loop_extraction"]

    context_base = dict(
        tuple_delimiter=PROMPTS["DEFAULT_TUPLE_DELIMITER"],
        record_delimiter=PROMPTS["DEFAULT_RECORD_DELIMITER"],
        completion_delimiter=PROMPTS["DEFAULT_COMPLETION_DELIMITER"],
        entity_types=",".join(PROMPTS["DEFAULT_ENTITY_TYPES"]),
    )

    hint_prompt = entity_extract_prompt.format(**context_base, input_text=chunk)
    final_result = await use_llm_func(hint_prompt)

    history = pack_user_ass_to_openai_messages(hint_prompt, final_result)

    for now_glean_index in range(entity_extract_max_gleaning):
        glean_result = await use_llm_func(continue_prompt, history_messages=history)

        history += pack_user_ass_to_openai_messages(continue_prompt, glean_result)
        final_result += glean_result
        if now_glean_index == entity_extract_max_gleaning - 1:
            break

        if_loop_result: str = await use_llm_func(
            if_loop_prompt, history_messages=history
        )
        if_loop_result = if_loop_result.strip().strip('"').strip("'").lower()
        if if_loop_result != "yes":
            break

    records = split_string_by_multi_markers(
        final_result,
        [context_base["record_delimiter"], context_base["completion_delimiter"]],
    )

    maybe_nodes = defaultdict(list)
    maybe_edges = defaultdict(list)

    for record in [r for r in records if r is not None]:
        record = re.search(r"\((.*)\)", record)
        record = record.group(1)
        record_attributes = split_string_by_multi_markers(
            record, [context_base["tuple_delimiter"]]
        )
        if_entities = await _handle_single_entity_extraction(record_attributes, "NA")

        if if_entities is not None:
            maybe_nodes[if_entities["entity_name"]].append(if_entities)
            continue

        if_relation = await _handle_single_relationship_extraction(
            record_attributes, "NA"
        )

        if if_relation is not None:
            maybe_edges[(if_relation["src_id"], if_relation["tgt_id"])].append(
                if_relation
            )

    return dict(maybe_nodes), dict(maybe_edges)
