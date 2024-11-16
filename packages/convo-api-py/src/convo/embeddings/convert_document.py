import os

import pdfminer
import pdfminer.high_level

from .types import DocumentConversionRequest


def convert_document(request: DocumentConversionRequest):
    src_path = request.srcPath
    dest_path = request.destPath

    docPrefix = os.getenv("DOCUMENT_PREFIX_PATH")

    if docPrefix:
        if not src_path.startswith("/"):
            src_path = "/" + src_path
        src_path = docPrefix + src_path

        if not dest_path.startswith("/"):
            dest_path = "/" + dest_path
        dest_path = docPrefix + dest_path

    if src_path.endswith(".pdf") and dest_path.endswith(".txt"):
        pdf_to_text(src_path, dest_path)
        return True
    else:
        return False


def pdf_to_text(src_path: str, dest_path: str):
    text = pdfminer.high_level.extract_text(src_path)

    with open(dest_path, "w") as f:
        f.write(text)
