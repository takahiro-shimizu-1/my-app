"""OCR processing service using Google Gemini API.

Extracted from the monolithic BidJudgementSan class.
Handles PDF → Markdown and PDF → structured JSON extraction.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from judgesystem.config import OCRConfig
from judgesystem.services.storage import StorageService


class OCRService:
    """Gemini-based OCR for bid announcement PDFs."""

    def __init__(
        self,
        config: OCRConfig | None = None,
        storage: StorageService | None = None,
    ) -> None:
        self._config = config or OCRConfig()
        self._storage = storage or StorageService()
        self._client = None

    def _get_client(self):
        """Lazy-init Gemini client."""
        if self._client is None:
            from google import genai

            api_key_path = self._config.google_api_key_path
            api_key = Path(api_key_path).read_text().strip()
            self._client = genai.Client(api_key=api_key)
        return self._client

    def pdf_to_markdown(self, pdf_path: str) -> str:
        """Convert a PDF to markdown summary using Gemini.

        Args:
            pdf_path: Path to PDF (local or gs://).

        Returns:
            Markdown text extracted from the PDF.
        """
        pdf_bytes = self._storage.read_bytes(pdf_path)
        client = self._get_client()

        prompt = (
            "この入札公告PDFの内容をMarkdown形式で構造化して出力してください。\n"
            "見出し、表、リストなどの構造を維持してください。"
        )

        response = client.models.generate_content(
            model=self._config.gemini_model,
            contents=[
                {"mime_type": "application/pdf", "data": pdf_bytes},
                prompt,
            ],
        )
        return self._clean_markdown(response.text or "")

    def pdf_to_json(self, pdf_path: str) -> dict:
        """Extract structured requirement data from a PDF using Gemini.

        Args:
            pdf_path: Path to PDF (local or gs://).

        Returns:
            Dict with extracted announcement and requirement fields.
        """
        pdf_bytes = self._storage.read_bytes(pdf_path)
        client = self._get_client()

        prompt = (
            "この入札公告PDFから以下の情報をJSON形式で抽出してください:\n"
            "- project_name: 工事名/業務名\n"
            "- organization: 発注機関名\n"
            "- deadline: 入札期限\n"
            "- budget: 予定価格\n"
            "- work_location: 工事場所\n"
            "- requirements: [{type, text, detail}] (参加資格要件の一覧)\n"
            "JSONのみ出力してください。"
        )

        response = client.models.generate_content(
            model=self._config.gemini_model,
            contents=[
                {"mime_type": "application/pdf", "data": pdf_bytes},
                prompt,
            ],
        )
        return self._parse_json(response.text or "")

    @staticmethod
    def _clean_markdown(text: str) -> str:
        """Clean up Gemini markdown output."""
        text = re.sub(r"```markdown\n?", "", text)
        text = re.sub(r"```\n?$", "", text)
        return text.strip()

    @staticmethod
    def _parse_json(text: str) -> dict:
        """Parse JSON from Gemini response, handling markdown wrapping."""
        text = text.strip()
        text = re.sub(r"^```json\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"raw_text": text, "parse_error": True}
