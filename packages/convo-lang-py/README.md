# Convo-Lang Python Wrapper (v0.6.3)
[![PyPI Downloads](https://static.pepy.tech/personalized-badge/convo-lang?period=total&units=INTERNATIONAL_SYSTEM&left_color=BLACK&right_color=GREEN&left_text=downloads)](https://pepy.tech/projects/convo-lang)

A Python wrapper around the **Convo-Lang CLI** that lets you build conversations in Python and execute them via the official Convo-Lang engine.

> **Status:** 0.6.3 – basic conversation building, runtime variables support, and single-shot completion via the CLI.

---

## Features

- Minimal, Pythonic API to build conversations (`system`, `user`, `assistant`)
- One-line `complete()` to run via Convo-Lang CLI, with optional runtime variables via `complete(variables={...})`
- Simple config with `env` passthrough (e.g., `OPENAI_API_KEY`) and `defaultModel`
- Zero server code required — uses the official Convo-Lang CLI under the hood

---

## Installation

### 1. Install Node.js and npm

The wrapper depends on the Convo-Lang CLI, which requires Node.js.\
Download and install the latest **LTS** version of Node.js (includes `npm`):

- [Node.js downloads](https://nodejs.org/en/download)

Verify installation:


```bash
node -v
npm -v
```

### 2. Install the Convo-Lang CLI

```bash
npm i -g @convo-lang/convo-lang-cli
```

This makes the `convo` binary available in your `PATH`.


### 3. Install the Python wrapper

```bash
pip install convo-lang
```

---

## Quick Start

```python
from convo_lang import Conversation

OPENAI_API_KEY = "sk-proj-EMA"
defaultModel = "gpt-5"
convo = Conversation(
    config={
        "env": {"OPENAI_API_KEY": OPENAI_API_KEY},
        "defaultModel": defaultModel,
    }
)
convo.add_system_message("You are a home automation assistant.")
convo.add_user_message("It's time for bed, can you turn off the lights")
answer = convo.complete()
print(answer)
```

### Passing Variables to `.convo`

You can pass variables to the Convo-Lang runtime using the `variables` argument of `complete()`. These variables can be referenced inside your `.convo` script.

```python
from convo_lang import Conversation

convo = Conversation(
    config={
        "env": {"OPENAI_API_KEY": OPENAI_API_KEY},
        "defaultModel": defaultModel,
    }
)

convo.add_convo_text(convo_text)

answer = convo.complete(variables={"isNewVisitor": True})
print(answer)
```

Variables are forwarded to the Convo-Lang CLI via `--vars` and support booleans, numbers, and strings.

---

## Requirements

- Python **3.8+**
- Node.js **18+** and `npm`
- Convo-Lang CLI: `npm i -g @convo-lang/convo-lang-cli`
- At least one LLM provider API key in the environment (e.g., `OPENAI_API_KEY`)

---

## Authors

- [Scott Vance](mailto\:scott@iyio.io)

## Maintainers

- [Sergey Inozemtsev](https://github.com/Inozem)
