from .types import DocumentConversionRequest
from iyio_common import getEnvVar

from pdfminer.high_level import extract_text


def convert_document(request:DocumentConversionRequest):

    srcPath=request.srcPath
    destPath=request.destPath

    docPrefix=getEnvVar('DOCUMENT_PREFIX_PATH')
    if docPrefix:

        if not srcPath.startswith('/'):
            srcPath='/'+srcPath
        srcPath=docPrefix+srcPath

        if not destPath.startswith('/'):
            destPath='/'+destPath
        destPath=docPrefix+destPath

    if srcPath.endswith('.pdf') and destPath.endswith('.txt'):
        pdf_to_text(srcPath,destPath)
        return True
    else:
        return False


def pdf_to_text(srcPath:str,destPath:str):
    text=extract_text(srcPath)

    f=open(destPath,"w")
    f.write(text)
    f.close()
