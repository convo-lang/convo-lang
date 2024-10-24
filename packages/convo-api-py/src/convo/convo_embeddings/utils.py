import re


def parse_s3_path(path: str):
    match = re.search("^s3://([^/]+)/([^/]+)", path)
    if not match:
        raise Exception("Invalid s3 url")

    return {"bucket": match.group(1), "key": match.group(2)}
