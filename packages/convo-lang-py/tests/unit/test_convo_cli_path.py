import shutil

import pytest

from convo_lang.convo_cli_path import discover_convo_bin

def test_discover_by_which(monkeypatch):
    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/convo" if name == "convo" else None)
    assert discover_convo_bin() == "/usr/bin/convo"

def test_discover_appdata_fallback(monkeypatch, tmp_path):
    monkeypatch.setattr(shutil, "which", lambda name: None)
    appdata = tmp_path / "AppData"
    npm = appdata / "npm"
    npm.mkdir(parents=True)
    win_bin = npm / "convo.cmd"
    win_bin.write_text("")
    monkeypatch.setenv("APPDATA", str(appdata))
    assert discover_convo_bin() == str(win_bin)

def test_discover_local_node_modules(monkeypatch, tmp_path):
    monkeypatch.setattr(shutil, "which", lambda name: None)
    project = tmp_path / "project"
    bin_dir = project / "node_modules" / ".bin"
    bin_dir.mkdir(parents=True)
    local_bin = bin_dir / "convo"
    local_bin.write_text("")
    empty_appdata = tmp_path / "empty_appdata"
    empty_appdata.mkdir()
    monkeypatch.setenv("APPDATA", str(empty_appdata))
    monkeypatch.chdir(project)
    assert discover_convo_bin() == str(local_bin)

def test_no_convo_raises(monkeypatch, tmp_path):
    monkeypatch.setattr(shutil, "which", lambda name: None)
    monkeypatch.setenv("APPDATA", str(tmp_path / "empty"))
    (tmp_path / "empty").mkdir()
    monkeypatch.chdir(tmp_path)
    with pytest.raises(FileNotFoundError):
        discover_convo_bin()
