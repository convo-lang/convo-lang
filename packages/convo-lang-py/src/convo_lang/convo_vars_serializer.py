import json
from typing import Any, Dict, List

class ConvoVarsSerializer:
    def to_convo_vars(self, vars_dict: Dict[str, Any]) -> str:
        return self._encode_object(vars_dict)

    def _encode_value(self, value: Any) -> str:
        if isinstance(value, bool):
            return "true" if value else "false"
        if value is None:
            return "null"
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return str(value)
        if isinstance(value, dict):
            return self._encode_object(value)
        if isinstance(value, (list, tuple)):
            return self._encode_array(list(value))
        if isinstance(value, str):
            parsed = self._try_parse_json_string(value)
            if parsed is not None:
                return self._encode_value(parsed)
            return json.dumps(value, ensure_ascii=False)
        normalized = value.replace("\r\n", " ").replace("\n", " ").strip()
        return json.dumps(normalized, ensure_ascii=False)

    def _try_parse_json_string(self, value: str) -> Any | None:
        """
        Try to parse a string as JSON.
        Returns parsed object on success, otherwise None.
        """
        value = value.strip()
        if not value:
            return None
        if value[0] not in "{[":
            return None
        try:
            return json.loads(value)
        except Exception:
            return None

    def _encode_object(self, obj: Dict[str, Any]) -> str:
        parts: List[str] = []
        for key, value in obj.items():
            parts.append(f"{key}:{self._encode_value(value)}")
        return "{" + ", ".join(parts) + "}"

    def _encode_array(self, arr: List[Any]) -> str:
        return "[" + ", ".join(self._encode_value(v) for v in arr) + "]"
