import pytest

from convo_lang.error_utils import raise_for_cli_failure
from convo_lang.errors import ConvoValidationError, ConvoRuntimeError, ConvoCLIError

def test_no_raise_on_success():
    raise_for_cli_failure(0, "", "")

def test_validation_error_from_stdout():
    with pytest.raises(ConvoValidationError) as exc:
        raise_for_cli_failure(1, "Syntax error: missing variable X", "")
    assert "Syntax error" in str(exc.value)

def test_runtime_error_from_stderr():
    with pytest.raises(ConvoRuntimeError) as exc:
        raise_for_cli_failure(2, "", "Failed to execute: exception in convo")
    assert "Failed to execute" in str(exc.value)

def test_validation_precedence_over_runtime():
    text = "syntax error and runtime error"
    with pytest.raises(ConvoValidationError):
        raise_for_cli_failure(1, text, text)

def test_cli_error_with_empty_output_uses_exit_code_message():
    with pytest.raises(ConvoCLIError) as exc:
        raise_for_cli_failure(5, "", "")
    assert "exit code 5" in str(exc.value)

def test_case_insensitive_matching():
    with pytest.raises(ConvoValidationError):
        raise_for_cli_failure(1, "VaLiDaTiOn ErRoR detected", "")
