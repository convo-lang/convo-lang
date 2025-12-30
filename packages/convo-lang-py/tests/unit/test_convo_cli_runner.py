import os
import sys
import json
import subprocess
from types import SimpleNamespace
from pathlib import Path
from collections import OrderedDict

import pytest

sys.path.insert(0, os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "src")
))
from convo_lang.mock_runner import MockConvoRunner
from convo_lang.errors import ExecFailed, Timeout, ConvoNotFound
from convo_lang.convo_cli_runner import ConvoCLIRunner


def test_post_init_raises_when_discovery_fails(monkeypatch):

    def fake_discover():
        raise Exception("not found")

    monkeypatch.setattr(
        "convo_lang.convo_cli_runner.discover_convo_bin",
        fake_discover,
    )
    with pytest.raises(ConvoNotFound):
        ConvoCLIRunner()

def test_run_file_raises_when_script_missing():
    runner = ConvoCLIRunner(convo_bin="convo")
    missing = "nonexistent_file.convo"
    with pytest.raises(ConvoNotFound):
        runner.run_file(missing)

def test_run_file_raises_timeout_when_subprocess_times_out(
    monkeypatch, tmp_path
):
    script = tmp_path / "script.convo"
    script.write_text("dummy")

    def fake_run(*args, **kwargs):
        raise subprocess.TimeoutExpired(
            cmd="cmd",
            timeout=kwargs.get("timeout", None)
        )

    monkeypatch.setattr(subprocess, "run", fake_run)
    runner = ConvoCLIRunner(convo_bin="convo")
    with pytest.raises(Timeout):
        runner.run_file(str(script), timeout=0.01)

def test_run_file_nonzero_return_raises_execfailed(monkeypatch, tmp_path):
    script = tmp_path / "script.convo"
    script.write_text("dummy")

    def fake_run(*args, **kwargs):
        return SimpleNamespace(returncode=2, stdout="out", stderr="err")

    def fake_raise_for_cli_failure(returncode, stdout, stderr):
        raise ExecFailed(f"failed: {returncode}")

    monkeypatch.setattr(subprocess, "run", fake_run)
    monkeypatch.setattr("convo_lang.convo_cli_runner.raise_for_cli_failure",
                        fake_raise_for_cli_failure)
    runner = ConvoCLIRunner(convo_bin="convo")
    with pytest.raises(ExecFailed):
        runner.run_file(str(script))

def test_run_text_writes_temp_calls_run_file_and_deletes_tmp(
    monkeypatch, tmp_path
):
    captured = {}

    def fake_run_file(path, *, variables=None, timeout=None, working_dir=None,
                      extra_args=None):
        captured["path"] = Path(path)
        return "transcript"

    runner = ConvoCLIRunner(convo_bin="convo")
    monkeypatch.setattr(runner, "run_file", fake_run_file)
    out = runner.run_text("say hi", timeout=1.0, working_dir=str(tmp_path),
                          extra_args=["--foo"])
    assert out == "transcript"
    tmp_path_created = captured["path"]
    assert not tmp_path_created.exists()
    captured2 = {}

    def fake_run_file2(path, **kwargs):
        captured2["path"] = Path(path)
        return "t2"

    monkeypatch.setattr(runner, "run_file", fake_run_file2)
    out2 = runner.run_text("say hi 2", keep_temp=True)
    assert out2 == "t2"
    tmp_keep = captured2["path"]
    assert tmp_keep.exists()
    tmp_keep.unlink()

def test_run_file_success_with_mock(tmp_path):
    script = tmp_path / "script.convo"
    script.write_text("dummy")
    r = MockConvoRunner(response="prefix assistant: Hello\nassistant: Final")
    out = r.run_file(str(script))
    assert "prefix assistant: Hello" in out
    assert "assistant: Final" in out

def test_run_file_exec_failed_with_mock(tmp_path):
    script = tmp_path / "script.convo"
    script.write_text("dummy")
    r = MockConvoRunner(fail_with=ExecFailed("Convo exited with code 2"))
    with pytest.raises(ExecFailed):
        r.run_file(str(script))

def test_run_file_timeout_with_mock(tmp_path):
    script = tmp_path / "script.convo"
    script.write_text("dummy")
    r = MockConvoRunner(fail_with=Timeout("Convo CLI timed out"))
    with pytest.raises(Timeout):
        r.run_file(str(script), timeout=0.01)

def test_run_text_empty_raises_with_mock():
    r = MockConvoRunner()
    with pytest.raises(ExecFailed):
        r.run_text("   ")

def test_run_text_success_and_keep_temp_flag_with_mock():
    r = MockConvoRunner(response="assistant: ok")
    out = r.run_text("say hello")
    assert "assistant: ok" in out
    out2 = r.run_text("say hello", keep_temp=True)
    assert out2 == out

def test_run_file_accepts_optional_args_and_vars_with_mock(tmp_path):
    script = tmp_path / "script.convo"
    script.write_text("dummy")
    r = MockConvoRunner(response="ok")
    out = r.run_file(
        str(script),
        variables={"x": 1},
        extra_args=["--foo"],
        timeout=1.2,
        working_dir=str(tmp_path)
    )
    assert out == "ok"

def test_run_text_accepts_optional_args_and_vars_with_mock(tmp_path):
    r = MockConvoRunner(response="ok")
    out = r.run_text(
        "say hi",
        variables={"x": 1},
        extra_args=["--foo"],
        timeout=1.2,
        working_dir=str(tmp_path)
    )
    assert out == "ok"

def test_run_file_builds_command_including_prefix_vars_extra_args(monkeypatch, tmp_path):
    script = tmp_path / "script.convo"
    script.write_text("dummy")

    captured = {}

    def fake_run_subprocess(cmd, *, timeout, working_dir):
        captured["cmd"] = cmd
        captured["timeout"] = timeout
        captured["working_dir"] = working_dir
        return SimpleNamespace(returncode=0, stdout="ok", stderr="")

    runner = ConvoCLIRunner(convo_bin="convo")
    monkeypatch.setattr(runner, "_run_subprocess", fake_run_subprocess)
    out = runner.run_file(
        str(script),
        variables={"x": 1},
        extra_args=["--foo", "bar"],
        timeout=1.2,
        working_dir=str(tmp_path),
    )
    assert out == "ok"
    cmd = captured["cmd"]
    assert cmd[0] == "convo"
    assert str(script.resolve()) in cmd
    assert "--prefixOutput" in cmd
    assert "--vars" in cmd
    assert "--foo" in cmd and "bar" in cmd

def test_run_file_writes_config_and_deletes_it_on_success(monkeypatch, tmp_path):
    script = tmp_path / "script.convo"
    script.write_text("dummy")

    captured = {}

    def fake_run_subprocess(cmd, *, timeout, working_dir):
        idx = cmd.index("--config")
        cfg_path = Path(cmd[idx + 1])
        captured["cfg_path"] = cfg_path
        assert cfg_path.exists()
        return SimpleNamespace(returncode=0, stdout="ok", stderr="")

    runner = ConvoCLIRunner(convo_bin="convo", config={"a": 1})
    monkeypatch.setattr(runner, "_run_subprocess", fake_run_subprocess)
    out = runner.run_file(str(script))
    assert out == "ok"
    assert "cfg_path" in captured
    assert not captured["cfg_path"].exists()

def test_run_file_deletes_config_even_when_cli_fails(monkeypatch, tmp_path):
    script = tmp_path / "script.convo"
    script.write_text("dummy")

    captured = {}

    def fake_run_subprocess(cmd, *, timeout, working_dir):
        idx = cmd.index("--config")
        cfg_path = Path(cmd[idx + 1])
        captured["cfg_path"] = cfg_path
        assert cfg_path.exists()
        return SimpleNamespace(returncode=2, stdout="out", stderr="err")

    def fake_raise_for_cli_failure(returncode, stdout, stderr):
        raise ExecFailed(f"failed: {returncode}")

    runner = ConvoCLIRunner(convo_bin="convo", config={"a": 1})
    monkeypatch.setattr(runner, "_run_subprocess", fake_run_subprocess)
    monkeypatch.setattr("convo_lang.convo_cli_runner.raise_for_cli_failure", fake_raise_for_cli_failure)

    with pytest.raises(ExecFailed):
        runner.run_file(str(script))
    assert "cfg_path" in captured
    assert not captured["cfg_path"].exists()

def test_run_subprocess_maps_filenotfound_to_convonotfound(monkeypatch):
    def fake_run(*args, **kwargs):
        raise FileNotFoundError("no such file or directory")

    monkeypatch.setattr(subprocess, "run", fake_run)
    runner = ConvoCLIRunner(convo_bin="convo")
    with pytest.raises(ConvoNotFound):
        runner._run_subprocess(["convo", "x.convo"], timeout=1.0, working_dir=None)

def test_run_subprocess_maps_oserror_to_execfailed(monkeypatch):
    def fake_run(*args, **kwargs):
        raise OSError("bad exec")

    monkeypatch.setattr(subprocess, "run", fake_run)
    runner = ConvoCLIRunner(convo_bin="convo")
    with pytest.raises(ExecFailed):
        runner._run_subprocess(["convo", "x.convo"], timeout=1.0, working_dir=None)

