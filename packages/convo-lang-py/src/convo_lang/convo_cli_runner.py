from __future__ import annotations
from contextlib import contextmanager
from dataclasses import dataclass
import json
from pathlib import Path
import subprocess
import tempfile
from typing import Any, Dict, Iterator, List, Optional

from .convo_cli_path import discover_convo_bin
from .error_utils import raise_for_cli_failure
from .errors import ConvoNotFound, ExecFailed, Timeout
from .convo_vars_serializer import ConvoVarsSerializer


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
        """Compose the CLI command arguments (no I/O, no shell quoting)."""
        cmd: List[str] = [self.convo_bin, str(path)]
        if variables:
            serializer = ConvoVarsSerializer()
            cmd += ["--vars", serializer.to_convo_vars(vars_dict=variables)]
        if use_prefix_output:
            cmd += ["--prefixOutput"]
        if extra_args:
            cmd += list(extra_args)
        return cmd

    def _materialize_config_file(self) -> Optional[Path]:
        if not self.config:
            return None
        tmp = tempfile.NamedTemporaryFile(
            prefix="convo_config_",
            suffix=".json",
            delete=False,
            mode="w",
            encoding="utf-8",
        )
        json.dump(self.config, tmp, ensure_ascii=False, indent=2)
        tmp.close()
        return Path(tmp.name)

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
        Run a .convo file via CLI and return full transcript (stdout).
        Raises ConvoNotFound, ExecFailed, or Timeout on errors.
        """
        path = Path(script_path).resolve()
        with self._temporary_config_path() as config_path:
            cmd = self._build_cli_command(
                path,
                variables=variables,
                extra_args=extra_args,
                config_path=config_path,
            )
            proc = self._run_subprocess(
                cmd,
                timeout=timeout,
                working_dir=working_dir,
            )
            self._raise_on_nonzero_exit(proc)
            return proc.stdout or ""

    @contextmanager
    def _temporary_config_path(self) -> Iterator[Optional[Path]]:
        """Create a temporary JSON config file if self.config is provided."""
        config_path: Optional[Path] = None
        try:
            if self.config:
                config_path = self._write_temp_config_json(self.config)
            yield config_path
        finally:
            if config_path:
                try:
                    config_path.unlink(missing_ok=True)
                except Exception:
                    pass

    def _write_temp_config_json(self, config: Dict) -> Path:
        """Write config to a temp file and return its path."""
        tmp_cfg = tempfile.NamedTemporaryFile(
            prefix="convo_config_",
            suffix=".json",
            delete=False,
            mode="w",
            encoding="utf-8",
        )
        try:
            json.dump(config, tmp_cfg, ensure_ascii=False, indent=2)
        finally:
            tmp_cfg.close()
        return Path(tmp_cfg.name)

    def _build_cli_command(
        self,
        script_path: Path,
        *,
        variables: Optional[Dict],
        extra_args: Optional[List[str]],
        config_path: Optional[Path],
    ) -> List[str]:
        """Build CLI command including optional config path."""
        cmd = self._build_cmd(
            script_path,
            variables=variables,
            extra_args=extra_args,
            use_prefix_output=True,
        )
        if config_path:
            cmd += ["--config", str(config_path)]
        return cmd

    def _run_subprocess(
        self,
        cmd: List[str],
        *,
        timeout: Optional[float],
        working_dir: Optional[str],
    ) -> subprocess.CompletedProcess[str]:
        """Run subprocess and map low-level errors to SDK errors."""
        try:
            return subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=working_dir or None,
                timeout=timeout,
                encoding="utf-8",
                errors="replace",
            )
        except subprocess.TimeoutExpired as e:
            raise Timeout(f"Convo CLI timed out after {timeout} seconds") from e
        except FileNotFoundError as e:
            raise ConvoNotFound(f"Convo CLI binary not found: {e}") from e
        except OSError as e:
            raise ExecFailed(f"Failed to execute Convo CLI: {e}") from e

    def _raise_on_nonzero_exit(self, proc: subprocess.CompletedProcess[str]) -> None:
        """Raise a normalized error if CLI returned non-zero exit code."""
        if proc.returncode != 0:
            raise_for_cli_failure(
                returncode=proc.returncode,
                stdout=proc.stdout or "",
                stderr=proc.stderr or "",
            )

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
