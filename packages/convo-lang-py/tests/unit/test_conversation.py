import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "src")
))
from convo_lang import Conversation, ParseError
from convo_lang.mock_runner import MockConvoRunner

def test_add_message_variants_and_to_convo():
    c = Conversation()
    c.add_convo_text("*convo*This is the header\n")
    c.add_user_message("hi")
    c.add_assistant_message("hello")
    c.add_system_message("sys")
    expected = (
        "This is the header\n\n"
        "> user\nhi\n\n"
        "> assistant\nhello\n\n"
        "> system\nsys\n\n"
    )
    assert c.to_convo() == expected

def test_complete_parsing_with_mock_runner():
    transcript = (
        's:{"foo":["bar"]}\n'
        'm:[{"role":"assistant","content":"syntax-msg"}]\n'
        'f:[{"role":"user","content":"hi"},{"role":"assistant","content":"hello"}]\n'
        ': > user\n'
        ': hi\n'
        ': > assistant\n'
        ': hello\n'
    )
    c = Conversation()
    c.add_convo_text("*convo*placeholder\n")
    c.convo_cli_runner = MockConvoRunner(response=transcript)
    last = c.complete()
    assert last == "hello"
    assert c.state == {"foo": ["bar"]}
    assert c.syntax_messages == [
        {"role": "assistant", "content": "syntax-msg"}
    ]
    assert c.messages == [
        {"role": "user", "content": "hi"},
        {"role": "assistant", "content": "hello"},
    ]
    convo_text = c.to_convo()
    assert "> user" in convo_text
    assert "hi" in convo_text
    assert "> assistant" in convo_text
    assert "hello" in convo_text


def test_complete_raises_on_invalid_json_with_mock_runner():
    bad_transcript = 's:{"bad": }\n'
    c = Conversation()
    c.add_convo_text("*convo*placeholder\n")
    c.convo_cli_runner = MockConvoRunner(response=bad_transcript)
    with pytest.raises(ParseError):
        c.complete()

