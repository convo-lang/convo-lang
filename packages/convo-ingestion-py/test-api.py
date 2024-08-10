from dotenv import load_dotenv
load_dotenv('../../.env.local')

from src.rest_api import start_rest_api


start_rest_api()
