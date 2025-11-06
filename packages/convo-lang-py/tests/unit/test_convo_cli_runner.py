import os
import sys
import json
import subprocess
from types import SimpleNamespace
from pathlib import Path

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

def test__build_cmd_includes_flags_and_json():
    runner = ConvoCLIRunner(convo_bin="convo-bin", config={"k": "v"})
    vars_ = {"x": 1}
    extra = ["--foo", "--bar"]
    cmd = runner._build_cmd(
        Path("script.convo"),
        variables=vars_,
        extra_args=extra,
        use_prefix_output=True,
    )
    assert cmd[0] == "convo-bin"
    assert str(Path("script.convo")) in cmd
    assert "--inlineConfig" in cmd
    cfg_index = cmd.index("--inlineConfig") + 1
    parsed_cfg = json.loads(cmd[cfg_index])
    assert parsed_cfg == {"k": "v"}
    assert "--vars" in cmd
    vars_index = cmd.index("--vars") + 1
    parsed_vars = json.loads(cmd[vars_index])
    assert parsed_vars == vars_
    assert "--prefixOutput" in cmd
    assert "--foo" in cmd and "--bar" in cmd
    cmd2 = runner._build_cmd(
        Path("script.convo"),
        variables=None,
        extra_args=None,
        use_prefix_output=False,
    )
    assert "--prefixOutput" not in cmd2

def test_run_file_raises_when_script_missing():
    runner = ConvoCLIRunner(convo_bin="convo")
    missing = "nonexistent_file.convo"
    with pytest.raises(ConvoNotFound):
        runner.run_file(missing)

def test_run_file_calls_subprocess_and_returns_stdout(monkeypatch, tmp_path):
    script = tmp_path / "script.convo"
    script.write_text("dummy")
    captured = {}

    def fake_run(cmd, capture_output, text, cwd, timeout):
        captured["cmd"] = cmd
        captured["cwd"] = cwd
        captured["timeout"] = timeout
        return SimpleNamespace(returncode=0, stdout="full transcript",
                               stderr="")

    monkeypatch.setattr(subprocess, "run", fake_run)
    runner = ConvoCLIRunner(convo_bin="/usr/bin/convo")
    out = runner.run_file(str(script), timeout=1.5, working_dir=str(tmp_path))
    assert out == "full transcript"
    assert captured["timeout"] == 1.5
    assert captured["cmd"][0] == "/usr/bin/convo"
    assert str(script.resolve()) in captured["cmd"]

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
