FROM python:3.11

ENV PYTHONUNBUFFERED=1 \
    # prevents python creating .pyc files
    PYTHONDONTWRITEBYTECODE=1 \
    \
    # pip
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    \
    # poetry
    # https://python-poetry.org/docs/configuration/#using-environment-variables
    POETRY_VERSION=1.8.3 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_CACHE_DIR='/var/cache/pypoetry' \
    POETRY_HOME='/usr/local'

# prepend poetry and venv to path
ENV PATH="$POETRY_HOME/bin:$VENV_PATH/bin:$PATH"

WORKDIR /app

RUN apt-get update
RUN apt-get install -y libmagic1 libgl1-mesa-dev ffmpeg tesseract-ocr curl build-essential

RUN curl -sSL https://install.python-poetry.org | python3 -

COPY packages/iyio-common-py ./iyio-common-py
RUN ls .
WORKDIR /app/convo-api-py
COPY packages/convo-api-py/pyproject.toml pyproject.toml
COPY packages/convo-api-py/poetry.lock poetry.lock
COPY packages/convo-api-py/src/ src

RUN poetry install --only=main --no-interaction --no-ansi --without dev

EXPOSE 8080

CMD [ "uvicorn", "convo.main:app", "--host", "0.0.0.0", "--port", "8080" ]
