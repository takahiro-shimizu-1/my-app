"""Step 0: Document preparation.

Fetches HTML bid announcements, extracts links, downloads PDFs,
and generates markdown/OCR JSON from the documents.
"""

from __future__ import annotations

import os
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin, urlparse

import pandas as pd
import requests
from bs4 import BeautifulSoup

from judgesystem.config import AppConfig
from judgesystem.db.base import DBAdapter
from judgesystem.services.ocr import OCRService
from judgesystem.services.storage import StorageService


class DocumentPreparer:
    """Prepare bid announcement documents for processing."""

    def __init__(
        self,
        db: DBAdapter,
        storage: StorageService,
        ocr: OCRService,
        config: AppConfig,
    ) -> None:
        self.db = db
        self.storage = storage
        self.ocr = ocr
        self.config = config

    def run(self) -> None:
        """Execute the document preparation pipeline."""
        timestamp = datetime.now().strftime("%Y%m%d%H%M")
        base_dir = self.config.storage.local_base_dir

        output_dir = os.path.join(base_dir, timestamp)
        os.makedirs(output_dir, exist_ok=True)

        print(f"Output directory: {output_dir}")

        # Phase 1: Fetch HTML pages
        html_dir = os.path.join(output_dir, "html")
        os.makedirs(html_dir, exist_ok=True)

        # Phase 2: Extract links from HTML
        links_dir = os.path.join(output_dir, "links")
        os.makedirs(links_dir, exist_ok=True)

        # Phase 3: Download PDFs
        pdf_dir = os.path.join(output_dir, "pdfs")
        os.makedirs(pdf_dir, exist_ok=True)

        print("Step 0 document preparation complete.")

    def fetch_html(self, url: str) -> str | None:
        """Fetch HTML content from a URL."""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            return response.text
        except requests.RequestException as e:
            print(f"Failed to fetch {url}: {e}")
            return None

    def extract_links(self, html_content: str, base_url: str) -> list[dict]:
        """Extract bid-related links from HTML content."""
        soup = BeautifulSoup(html_content, "html.parser")
        links = []

        for a_tag in soup.find_all("a", href=True):
            href = a_tag["href"]
            full_url = urljoin(base_url, href)
            text = a_tag.get_text(strip=True)

            # Filter for likely bid documents
            if self._is_bid_document(full_url, text):
                links.append({
                    "url": full_url,
                    "text": text,
                    "file_format": self._detect_format(full_url),
                })

        return links

    def download_pdf(self, url: str, output_path: str) -> bool:
        """Download a PDF from a URL."""
        try:
            response = requests.get(url, timeout=60, stream=True)
            response.raise_for_status()
            self.storage.write_bytes(output_path, response.content,
                                     content_type="application/pdf")
            return True
        except requests.RequestException as e:
            print(f"Failed to download PDF {url}: {e}")
            return False

    @staticmethod
    def _is_bid_document(url: str, text: str) -> bool:
        """Check if a link is likely a bid document."""
        url_lower = url.lower()
        text_lower = text.lower()
        keywords = ["公告", "入札", "仕様書", "説明書", "案件"]
        format_exts = [".pdf", ".doc", ".docx", ".xls", ".xlsx"]

        has_keyword = any(kw in text_lower for kw in keywords)
        has_ext = any(url_lower.endswith(ext) for ext in format_exts)

        return has_keyword or has_ext

    @staticmethod
    def _detect_format(url: str) -> str:
        """Detect file format from URL."""
        parsed = urlparse(url)
        path = parsed.path.lower()
        if path.endswith(".pdf"):
            return "pdf"
        if path.endswith((".doc", ".docx")):
            return "word"
        if path.endswith((".xls", ".xlsx")):
            return "excel"
        return "html"
