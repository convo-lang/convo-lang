import os
import sys

sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "src")
))
from convo_lang import Conversation

def test_send_dialog_no_model():
    """Smoke: end-to-end run without real LLM (assistant is predefined)."""
    convo = Conversation()
    convo.add_system("You are a test bot.")
    convo.add_user("Hello?")
    convo.add_assistant("Hi there!")
    class DummyRunner:
        def run_text(self, *args, **kwargs):
            return (
                's:{}\n'
                'm:[]\n'
                'f:[{"role":"assistant","content":"Hi there!"}]\n'
                ': assistant\n'
                'Hi there!\n'
            )
    convo.convo_cli_runner = DummyRunner()
    last = convo.complete(timeout=30)
    assert isinstance(last, str)
    assert "Hi there!" in last
    assert convo.messages, "Parsed messages must not be empty"
    assert convo.messages[-1]["role"] == "assistant"
    assert convo.messages[-1]["content"] == "Hi there!"
    assert isinstance(convo.state, dict)
    assert isinstance(convo.syntax_messages, list)
