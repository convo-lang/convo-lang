import json
import os
from pathlib import Path
import subprocess
import sys
from types import SimpleNamespace

import pytest

sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "src")
))
from convo_lang import convo_cli_runner as runner_mod
from convo_lang.convo_cli_runner import ConvoCLIRunner
from convo_lang.errors import ConvoNotFound, ExecFailed, Timeout

def test_build_cmd_with_config_vars_and_extra_args():
    r = ConvoCLIRunner(convo_bin="convo", config={"k": "v"})
    p = Path("/tmp/script.convo")
    cmd = r._build_cmd(p, variables={"x": 1}, extra_args=["--foo"],
                       use_prefix_output=True)
    assert cmd[0] == "convo"
    assert cmd[1] == str(p)
    assert "--inlineConfig" in cmd
    inline_idx = cmd.index("--inlineConfig") + 1
    parsed = json.loads(cmd[inline_idx])
    assert parsed == {"k": "v"}
    assert "--vars" in cmd
    vars_idx = cmd.index("--vars") + 1
    assert json.loads(cmd[vars_idx]) == {"x": 1}
    assert "--prefixOutput" in cmd
    assert "--foo" in cmd

def test_build_cmd_no_prefix_output():
    r = ConvoCLIRunner(convo_bin="convo")
    p = Path("/tmp/script.convo")
    cmd = r._build_cmd(p, variables=None, extra_args=None,
                       use_prefix_output=False)
    assert "--prefixOutput" not in cmd

def test_post_init_uses_discover(monkeypatch):
    monkeypatch.setattr(runner_mod, "discover_convo_bin",
                        lambda: "/some/found/convo")
    r = ConvoCLIRunner(convo_bin=None)
    assert r.convo_bin == "/some/found/convo"

def test_post_init_discover_raises(monkeypatch):
    def raise_exc():
        raise Exception("not found")
    monkeypatch.setattr(runner_mod, "discover_convo_bin", raise_exc)
    with pytest.raises(ConvoNotFound):
        ConvoCLIRunner(convo_bin=None)

def test_run_file_success(tmp_path, monkeypatch):
    script = tmp_path / "script.convo"
    script.write_text("dummy")
    captured_cmd = {}

    def fake_run(cmd, capture_output, text, cwd, timeout):
        assert str(script) in cmd
        return SimpleNamespace(
            returncode=0,
            stdout="prefix assistant: Hello\nassistant: Final",
            stderr=""
        )
    monkeypatch.setattr(runner_mod.subprocess, "run", fake_run)
    r = ConvoCLIRunner(convo_bin="convo")
    out = r.run_file(str(script))
    assert "prefix assistant: Hello" in out
    assert "assistant: Final" in out

def test_run_file_not_found_raises():
    r = ConvoCLIRunner(convo_bin="convo")
    with pytest.raises(ConvoNotFound):
        r.run_file("/does/not/exist.convo")

def test_run_file_exec_failed(tmp_path, monkeypatch):
    script = tmp_path / "script.convo"
    script.write_text("dummy")

    def fake_run(cmd, capture_output, text, cwd, timeout):
        return SimpleNamespace(returncode=2, stdout="out", stderr="err")

    monkeypatch.setattr(runner_mod.subprocess, "run", fake_run)
    r = ConvoCLIRunner(convo_bin="convo")
    with pytest.raises(ExecFailed) as ei:
        r.run_file(str(script))
    assert "Convo exited with code 2" in str(ei.value)
    assert "STDERR" in str(ei.value)
    assert "STDOUT" in str(ei.value)

def test_run_file_timeout(tmp_path, monkeypatch):
    script = tmp_path / "script.convo"
    script.write_text("dummy")

    def fake_run(cmd, capture_output, text, cwd, timeout):
        raise subprocess.TimeoutExpired(cmd="cmd", timeout=timeout)

    monkeypatch.setattr(runner_mod.subprocess, "run", fake_run)
    r = ConvoCLIRunner(convo_bin="convo")
    with pytest.raises(Timeout):
        r.run_file(str(script), timeout=0.01)

def test_run_text_empty_raises():
    r = ConvoCLIRunner(convo_bin="convo")
    with pytest.raises(ExecFailed):
        r.run_text("   ")

def test_run_text_writes_temp_and_deletes_by_default(tmp_path, monkeypatch):
    saved_paths = []

    def fake_run_file(self, path, *, variables=None, timeout=None,
                      working_dir=None, extra_args=None):
        saved_paths.append(Path(path))
        return "transcript"

    monkeypatch.setattr(ConvoCLIRunner, "run_file", fake_run_file)
    r = ConvoCLIRunner(convo_bin="convo")
    out = r.run_text("say hello")
    assert out == "transcript"
    assert len(saved_paths) == 1
    assert not saved_paths[0].exists()

def test_run_text_keep_temp_true(tmp_path, monkeypatch):
    saved_paths = []

    def fake_run_file(self, path, *, variables=None, timeout=None,
                      working_dir=None, extra_args=None):
        saved_paths.append(Path(path))
        return "transcript"

    monkeypatch.setattr(ConvoCLIRunner, "run_file", fake_run_file)
    r = ConvoCLIRunner(convo_bin="convo")
    out = r.run_text("say hello", keep_temp=True)
    assert out == "transcript"
    assert len(saved_paths) == 1
    assert saved_paths[0].exists()
    saved_paths[0].unlink()
