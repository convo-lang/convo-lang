import tempfile

from convo.embeddings.convert_document import convert_document
from convo.embeddings.types import DocumentConversionRequest
from reportlab.pdfgen import canvas


def test_convert_pdf():
    with tempfile.TemporaryDirectory() as tmpdir:
        f_path = f"{tmpdir}/test.pdf"
        o_path = f"{tmpdir}/test_out.txt"

        pdf = canvas.Canvas(f_path)
        title = "Title"
        text = "Hello World"
        pdf.setTitle(title)
        pdf.drawString(100, 100, text)
        pdf.save()

        request = DocumentConversionRequest(
            srcPath=f_path,
            destPath=o_path,
        )

        result = convert_document(request)

        assert result

        with open(o_path, "r") as f:
            txt = f.read()
            assert txt == "Hello World\n\n\x0c"
