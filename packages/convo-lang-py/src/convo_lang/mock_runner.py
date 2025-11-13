from __future__ import annotations
from typing import Dict, List, Optional

from .errors import ExecFailed


class MockConvoRunner:
    """In-memory runner for tests."""
    def __init__(self, *, fail_with=None, response: str | None = None):
        self.fail_with = fail_with
        self.response = response or (
            's:{}\n'
            'm:[]\n'
            'f:[{"role":"assistant","content":"Hi there!"}]\n'
            ': assistant\n'
            'Hi there!\n'
        )

    def run_file(
        self,
        script_path: str,
        *,
        variables: Optional[Dict] = None,
        timeout: Optional[float] = 120.0,
        working_dir: Optional[str] = None,
        extra_args: Optional[List[str]] = None,
    ) -> str:
        if self.fail_with:
            raise self.fail_with
        return self.response

    def run_text(
        self,
        convo_text: str,
        *,
        variables: Optional[Dict] = None,
        timeout: Optional[float] = 120.0,
        working_dir: Optional[str] = None,
        extra_args: Optional[List[str]] = None,
        keep_temp: bool = False,
    ) -> str:
        if not convo_text.strip():
            raise ExecFailed("Empty .convo text submitted to runner.")
        if self.fail_with:
            raise self.fail_with
        return self.response
