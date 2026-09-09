"""
High-Speed In-Memory PDF Text Extractor.
Extracts the core announcement text from SEBI/Exchange regulatory filing PDFs.
"""

import logging
import requests
import io
from typing import Optional

logger = logging.getLogger("disclosure_radar.pdf")

try:
    import fitz  # PyMuPDF
    HAVE_FITZ = True
except ImportError:
    HAVE_FITZ = False

try:
    import pypdf
    HAVE_PYPDF = True
except ImportError:
    HAVE_PYPDF = False

PDF_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept": "application/pdf,*/*",
}

def extract_pdf_text(pdf_url: str, max_pages: int = 3, timeout: int = 8) -> str:
    """
    Download PDF directly into memory and extract text from the first max_pages.
    Fast execution (< 1 second typical) with zero disk writes.
    """
    if not pdf_url or not pdf_url.startswith("http"):
        return ""

    try:
        import urllib.request
        req = urllib.request.Request(pdf_url, headers=PDF_HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            if resp.status != 200:
                return ""
            pdf_bytes = resp.read()

        if len(pdf_bytes) < 50:
            return ""

        # 1. Use PyMuPDF (fastest)
        if HAVE_FITZ:
            try:
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                pages_to_read = min(len(doc), max_pages)
                extracted = []
                for i in range(pages_to_read):
                    t = doc[i].get_text("text")
                    if t:
                        extracted.append(t.strip())
                return "\n\n".join(extracted)
            except Exception as e:
                logger.debug(f"PyMuPDF failed on {pdf_url}: {e}")

        # 2. Fallback to pypdf
        if HAVE_PYPDF:
            try:
                reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
                pages_to_read = min(len(reader.pages), max_pages)
                extracted = []
                for i in range(pages_to_read):
                    t = reader.pages[i].extract_text()
                    if t:
                        extracted.append(t.strip())
                return "\n\n".join(extracted)
            except Exception as e:
                logger.debug(f"pypdf failed on {pdf_url}: {e}")

        return ""
    except Exception as e:
        logger.debug(f"Could not extract text from {pdf_url}: {e}")
        return ""
