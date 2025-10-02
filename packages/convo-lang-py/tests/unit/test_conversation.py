import os
import pytest
import sys
from unittest import mock

sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "src")
))
from convo_lang.conversation import Conversation, ParseError

def test_add_message_variants_and_to_convo():
    c = Conversation()
    c.add_convo_text("*convo*This is the header\n")
    c.add_user("hi")
    c.add_assistant("hello")
    c.add_system("sys")
    expected = (
        "This is the header\n\n"
        "> user\nhi\n\n"
        "> assistant\nhello\n\n"
        "> system\nsys\n\n"
    )
    assert c.to_convo() == expected

def test_complete_parsing_with_mock():
    transcript = (
        's:{"foo":["bar"]}\n'
        'm:[{"role":"assistant","content":"syntax-msg"}]\n'
        'f:[{"role":"user","content":"hi"},{"role":"assistant","content":"hello"}]\n'
        ': > user\n'
        ': hi\n'
        ': > assistant\n'
        ': hello\n'
    )
    with mock.patch("convo_lang.conversation.ConvoCLIRunner") as MockRunner:
        MockRunner.return_value.run_text.return_value = transcript
        c = Conversation()
        last = c.complete()
        MockRunner.assert_called_once_with(config=c.config)
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

def test_complete_raises_on_invalid_json_with_mock():
    bad_transcript = 's:{"bad": }\n'
    with mock.patch("convo_lang.conversation.ConvoCLIRunner") as MockRunner:
        MockRunner.return_value.run_text.return_value = bad_transcript
        c = Conversation()
        with pytest.raises(ParseError):
            c.complete()
