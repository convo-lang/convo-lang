import logging
from datetime import datetime

from fastapi import FastAPI

from . import rest_api

log_file_path = f"./embedding_api_{datetime.now().strftime('%Y_%m_%d_%H_%M_%S')}.log"
logger = logging.getLogger(__name__)
logging.basicConfig(filename=log_file_path, level=logging.INFO)


app = FastAPI()
app.include_router(rest_api.document_handler)
