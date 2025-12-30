import os
import sys
import json
from collections import OrderedDict

import pytest

sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "src")
))

from convo_lang.convo_vars_serializer import ConvoVarsSerializer

def test_to_convo_vars_encodes_primitives_in_order():
    s = ConvoVarsSerializer()
    vars_dict = OrderedDict([
        ("t", True),
        ("f", False),
        ("n", None),
        ("i", 1),
        ("fl", 1.5),
    ])
    assert s.to_convo_vars(vars_dict) == "{t:true, f:false, n:null, i:1, fl:1.5}"

def test_to_convo_vars_encodes_nested_objects_and_arrays():
    s = ConvoVarsSerializer()
    vars_dict = OrderedDict([
        ("a", OrderedDict([
            ("b", [1, "x"]),
        ])),
    ])
    assert s.to_convo_vars(vars_dict) == '{a:{b:[1, "x"]}}'

def test_to_convo_vars_encodes_tuple_as_array():
    s = ConvoVarsSerializer()
    assert s.to_convo_vars(OrderedDict([("a", (1, 2))])) == "{a:[1, 2]}"

def test_string_that_is_json_object_is_parsed_and_reencoded():
    s = ConvoVarsSerializer()
    json_str = '{"x": 1, "y": [true, null]}'
    assert s.to_convo_vars(OrderedDict([("a", json_str)])) == "{a:{x:1, y:[true, null]}}"

def test_string_that_is_json_array_is_parsed_and_reencoded():
    s = ConvoVarsSerializer()
    json_str = '[1, "x", true, null]'
    assert s.to_convo_vars(OrderedDict([("a", json_str)])) == '{a:[1, "x", true, null]}'

def test_string_that_looks_like_json_but_invalid_is_quoted():
    s = ConvoVarsSerializer()
    assert s.to_convo_vars(OrderedDict([("a", "{not json}")])) == '{a:"{not json}"}'

def test_string_not_starting_with_brace_or_bracket_is_not_parsed_as_json():
    s = ConvoVarsSerializer()
    assert s.to_convo_vars(OrderedDict([("a", "1")])) == '{a:"1"}'

def test_string_unicode_is_not_ascii_escaped():
    s = ConvoVarsSerializer()
    out = s.to_convo_vars(OrderedDict([("a", "café")]))
    assert out == '{a:"café"}'
    assert "\\u" not in out

def test_fallback_branch_normalizes_newlines_and_strips_for_non_str_with_replace():
    class WeirdText:
        def __init__(self, text: str):
            self.text = text

        def replace(self, old: str, new: str):
            return self.text.replace(old, new)

    s = ConvoVarsSerializer()
    v = WeirdText("  hello\r\nworld\nok  ")
    assert s.to_convo_vars(OrderedDict([("a", v)])) == '{a:"hello world ok"}'
