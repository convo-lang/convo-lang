from __future__ import annotations
import os
from pathlib import Path
import shutil

def discover_convo_bin() -> str:
    """Locate Convo-Lang CLI executable across platforms."""
    for name in ("convo.cmd", "convo.ps1", "convo"):
        p = shutil.which(name)
        if p:
            return p
    # Typical global npm on Windows
    appdata = os.environ.get("APPDATA")
    if appdata:
        win_bin = Path(appdata) / "npm" / "convo.cmd"
        if win_bin.exists():
            return str(win_bin)
    # Local node_modules/.bin
    local_bin = Path.cwd() / "node_modules" / ".bin"
    for name in ("convo.cmd", "convo"):
        cand = local_bin / name
        if cand.exists():
            return str(cand)
    raise FileNotFoundError(
        "Convo CLI not found.\n"
        "Install globally:\n  npm i -g @convo-lang/convo-lang-cli\n"
        "or locally:\n  npm i @convo-lang/convo-lang-cli --save-dev"
    )
