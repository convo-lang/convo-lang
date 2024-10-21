import logging
from datetime import datetime

from fastapi import FastAPI

from . import rest_api

log_file = f"embedding_api_{datetime.now().strftime('%Y_%m_%d_%H_%M_%S')}.log"
logging.basicConfig(filename=log_file, level=logging.INFO)
logging.getLogger().addHandler(logging.StreamHandler())

app = FastAPI()
app.include_router(rest_api.document_handler)
