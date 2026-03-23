"""
URL auto-collection pipeline stages.

This package contains the sequential stages of the collector pipeline:

  Stage 1 - HTML Extract:   Fetch HTML pages from agency bid URLs
  Stage 2 - Link Extract:   Parse HTML to extract announcement links
  Stage 3 - Formatting:     Normalize and deduplicate extracted data
  Stage 4 - PDF Download:   Download and OCR bid-related PDF documents
  Stage 6 - Gemini Extract: Use Gemini to extract structured data from PDFs

Each stage can be run independently via its __main__ block,
or orchestrated sequentially through the FastAPI wrapper (api.py).
"""

from dataclasses import dataclass
from typing import Callable, Optional


@dataclass(frozen=True)
class StageInfo:
    """Metadata for a single pipeline stage."""

    number: int
    name: str
    module: str
    description: str


STAGES: list[StageInfo] = [
    StageInfo(
        number=1,
        name="html_extract",
        module="stages.stage1_html_extract",
        description="Fetch HTML pages from agency bid announcement URLs",
    ),
    StageInfo(
        number=2,
        name="link_extract",
        module="stages.stage2_link_extract",
        description="Parse saved HTML files and extract announcement links",
    ),
    StageInfo(
        number=3,
        name="formatting",
        module="stages.stage3_formatting",
        description="Normalize, deduplicate, and merge extracted announcement data",
    ),
    StageInfo(
        number=4,
        name="pdf_download",
        module="stages.stage4_pdf_download",
        description="Download PDF documents and extract text via OCR",
    ),
    StageInfo(
        number=6,
        name="gemini_extract",
        module="stages.stage6_gemini_extract",
        description="Use Gemini to extract structured fields from PDF text",
    ),
]

STAGE_COUNT = len(STAGES)

__all__ = ["StageInfo", "STAGES", "STAGE_COUNT"]
