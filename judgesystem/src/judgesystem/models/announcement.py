"""Announcement data models."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class AnnouncementDocument:
    """Raw document metadata from Step 0."""

    document_id: str
    announcement_url: str
    top_agency_name: str = ""
    agency_name: str = ""
    project_name: str = ""
    file_format: str = ""
    pdf_path: str = ""
    markdown_path: str = ""
    ocr_json_path: str = ""
    page_count: int = 0
    fetched_at: str = ""


@dataclass
class Announcement:
    """Structured bid announcement from Step 1."""

    announcement_no: int = 0
    document_id: str = ""
    project_name: str = ""
    organization: str = ""
    agency_name: str = ""
    parent_agency_name: str = ""
    deadline: str = ""
    budget: str = ""
    work_location: str = ""
    category: str = ""
    bid_type: str = ""
    construction_type: str = ""
    grade: str = ""
    prefecture: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
