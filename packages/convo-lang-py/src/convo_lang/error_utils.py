import re

from .errors import ExecFailed, ConvoValidationError, ConvoRuntimeError, ConvoCLIError

_VALIDATION_PATTERNS = [
    re.compile(r"syntax error", re.IGNORECASE),
    re.compile(r"validation error", re.IGNORECASE),
    re.compile(r"missing variable", re.IGNORECASE),
    re.compile(r"unknown variable", re.IGNORECASE),
]
_RUNTIME_PATTERNS = [
    re.compile(r"runtime error", re.IGNORECASE),
    re.compile(r"failed to execute", re.IGNORECASE),
    re.compile(r"exception in convo", re.IGNORECASE),
]

def raise_for_cli_failure(returncode: int, stdout: str, stderr: str) -> None:
    """
    Inspect CLI output and raise a specific ExecFailed subclass.
    """
    if returncode == 0:
        return
    text = f"{stdout}\n{stderr}".strip()
    for pat in _VALIDATION_PATTERNS:
        if pat.search(text):
            raise ConvoValidationError(text or "Convo validation failed")
    for pat in _RUNTIME_PATTERNS:
        if pat.search(text):
            raise ConvoRuntimeError(text or "Convo runtime failed")
    raise ConvoCLIError(text or f"Convo CLI failed with exit code {returncode}")
