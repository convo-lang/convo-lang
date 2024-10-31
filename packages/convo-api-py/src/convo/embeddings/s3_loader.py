import re
import tempfile
from typing import List, Optional, Union

import boto3
from botocore.client import Config
from unstructured.documents.elements import Element
from unstructured.partition.auto import partition


def parse_s3_path(path: str):
    match = re.search("^s3://([^/]+)/([^/]+)", path)
    if not match:
        raise Exception("Invalid s3 url")

    return match.group(1), match.group(2)


def load_s3(
    path: str,
    region_name: Optional[str] = None,
    api_version: Optional[str] = None,
    use_ssl: Optional[bool] = True,
    verify: Optional[Union[str, bool]] = None,
    endpoint_url: Optional[str] = None,
    aws_access_key_id: Optional[str] = None,
    aws_secret_access_key: Optional[str] = None,
    aws_session_token: Optional[str] = None,
    boto_config: Optional[Config] = None,
    **kwargs,
) -> List[Element]:
    bucket, key = parse_s3_path(path)

    s3 = boto3.client(
        "s3",
        region_name=region_name,
        api_version=api_version,
        use_ssl=use_ssl,
        verify=verify,
        endpoint_url=endpoint_url,
        aws_access_key_id=aws_access_key_id,
        aws_secret_access_key=aws_secret_access_key,
        aws_session_token=aws_session_token,
        config=boto_config,
    )

    with tempfile.TemporaryFile() as tf:
        with open(tf.name, mode="wb") as f:
            s3.download_fileobj(bucket, key, f)
        with open(tf.name, mode="rb") as f:
            return partition(file=f, **kwargs)
