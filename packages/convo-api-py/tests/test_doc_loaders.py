from moto import mock_aws
import pytest
import boto3
import docx
import tempfile
from convo.embeddings.s3_loader import load_s3


@pytest.mark.parametrize(
    "kwargs", 
    [dict(), dict(content_type="application/vnd.openxmlformats-officedocument")]
)
@mock_aws
def test_s3_load(kwargs):
    
    conn = boto3.resource("s3", region_name="us-east-1")
    conn.create_bucket(Bucket="bucket")

    title = "Title"
    body = "Foo bar."

    with tempfile.TemporaryDirectory() as tmpdir:    
        document = docx.Document()
        document.add_paragraph(title, style="Heading 1")
        document.add_paragraph(body, style="Body Text")
        f_path = f"{tmpdir}/test.docx"
        document.save(f_path)

        s3 = boto3.client("s3", region_name="us-east-1")
        s3.upload_file(f_path, "bucket", "foo")

    s3_path = "s3://bucket/foo/test.docx"
    elements = load_s3(s3_path, **kwargs)

    assert len(elements) == 2
    assert elements[0].text == title
    assert elements[1].text == body
