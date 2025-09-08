from __future__ import annotations
from dataclasses import dataclass
import json
from pathlib import Path
import subprocess
import tempfile
from typing import Dict, List, Optional

from .convo_cli_path import discover_convo_bin
from .errors import ConvoNotFound, ExecFailed, Timeout


@dataclass
class ConvoCLIRunner:
    """Thin, testable wrapper around the Convo-Lang CLI."""
    convo_bin: Optional[str] = None
    config: Optional[Dict] = None

    def __post_init__(self) -> None:
        if not self.convo_bin:
            try:
                self.convo_bin = discover_convo_bin()
            except Exception as e:
                raise ConvoNotFound(f"Convo CLI binary not found: {e}") from e

    def _build_cmd(
        self,
        path: Path,
        *,
        variables: Optional[Dict],
        extra_args: Optional[List[str]],
        use_prefix_output: bool = True,
    ) -> List[str]:
        """Compose the CLI command with inline config and variables."""
        cmd: List[str] = [self.convo_bin, str(path)]
        if self.config:
            cmd += ["--inlineConfig",
                    json.dumps(self.config, ensure_ascii=False)]
        if variables:
            cmd += ["--vars", json.dumps(variables, ensure_ascii=False)]
        if use_prefix_output:
            cmd += ["--prefixOutput"]
        if extra_args:
            cmd += list(extra_args)
        return cmd

    def run_file(
        self,
        script_path: str,
        *,
        variables: Optional[Dict] = None,
        timeout: Optional[float] = 120.0,
        working_dir: Optional[str] = None,
        extra_args: Optional[List[str]] = None,
    ) -> str:
        """
        Run a .convo file via CLI and return (full_transcript, last_assistant_text).
        Raises ConvoNotFound, ExecFailed, or Timeout on errors.
        """
        path = Path(script_path).resolve()
        if not path.exists():
            raise ConvoNotFound(f".convo script not found: {path}")
        cmd = self._build_cmd(path, variables=variables, extra_args=extra_args,
                              use_prefix_output=True)
        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=working_dir or None,
                timeout=timeout,
            )
        except subprocess.TimeoutExpired as e:
            raise Timeout(
                f"Convo CLI timed out after {timeout} seconds"
            ) from e
        if proc.returncode != 0:
            raise ExecFailed(
                f"Convo exited with code {proc.returncode}\n"
                f"STDERR:\n{proc.stderr}\n"
                f"STDOUT:\n{proc.stdout}"
            )
        transcript = proc.stdout
        return transcript

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
        """
        Materialize `convo_text` to a temp file and run it via CLI.
        If keep_temp=True, the temp file is preserved (useful for debugging).
        """
        if not convo_text.strip():
            raise ExecFailed("Empty .convo text submitted to runner.")
        tmp = tempfile.NamedTemporaryFile(
            prefix="convo_",
            suffix=".convo",
            delete=False,
            mode="w",
            encoding="utf-8"
        )
        tmp_path = Path(tmp.name)
        try:
            tmp.write(convo_text)
            tmp.close()
            transcript = self.run_file(
                str(tmp_path),
                variables=variables,
                timeout=timeout,
                working_dir=working_dir,
                extra_args=extra_args,
            )
            return transcript
        finally:
            if not keep_temp:
                try:
                    tmp_path.unlink(missing_ok=True)
                except Exception:
                    pass
