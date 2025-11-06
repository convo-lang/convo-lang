import os
import sys

sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "src")
))
from convo_lang import Conversation
from convo_lang.mock_runner import MockConvoRunner

def test_send_dialog_no_model():
    convo = Conversation()
    convo.add_system_message("You are a test bot.")
    convo.add_user_message("Hello?")
    convo.add_assistant_message("Hi there!")
    convo.convo_cli_runner = MockConvoRunner()
    last = convo.complete(timeout=30)
    assert isinstance(last, str)
    assert "Hi there!" in last
    assert convo.messages, "Parsed messages must not be empty"
    assert convo.messages[-1]["role"] == "assistant"
    assert convo.messages[-1]["content"] == "Hi there!"
    assert isinstance(convo.state, dict)
    assert isinstance(convo.syntax_messages, list)
