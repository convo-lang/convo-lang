FROM python:3.11-buster

RUN pip install poetry==1.8.4

ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /app

RUN apt-get update && \
    apt-get install -y \
    libmagic1 \
    libgl1-mesa-dev \
    ffmpeg \
    tesseract-ocr \
    curl \
    build-essential \
    poppler-utils \
    libreoffice \
    pandoc

RUN curl -sSL https://install.python-poetry.org | python3 -

RUN curl https://sh.rustup.rs -sSf | bash -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"


COPY packages/iyio-common-py ./iyio-common-py
RUN ls .
WORKDIR /app/convo-api-py

COPY packages/convo-api-py/pyproject.toml pyproject.toml
COPY packages/convo-api-py/poetry.lock poetry.lock

RUN poetry install --without dev --no-root && rm -rf $POETRY_CACHE_DIR

COPY packages/convo-api-py/src/ src

RUN poetry install --without dev

EXPOSE 8080

CMD ["poetry", "run", "uvicorn", "convo.main:app", "--host", "0.0.0.0", "--port", "8080" ]
