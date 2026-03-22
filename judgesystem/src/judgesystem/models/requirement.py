"""Requirement data models."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class RequirementType(Enum):
    """Types of bid requirements."""

    EXPERIENCE = "実績要件"
    LOCATION = "所在地要件"
    TECHNICIAN = "技術者要件"
    GRADE_ITEM = "等級・業種要件"
    INELIGIBILITY = "不適格要件"
    OTHER = "その他"

    @classmethod
    def from_text(cls, text: str) -> RequirementType:
        """Classify requirement type from its text content."""
        lower = text.lower()

        if any(kw in lower for kw in ["実績", "施工実績", "工事実績"]):
            return cls.EXPERIENCE
        if any(kw in lower for kw in ["所在地", "本店", "支店", "営業所"]):
            return cls.LOCATION
        if any(kw in lower for kw in ["技術者", "資格", "主任技術者", "監理技術者"]):
            return cls.TECHNICIAN
        if any(kw in lower for kw in ["等級", "業種", "格付", "ランク"]):
            return cls.GRADE_ITEM
        if any(kw in lower for kw in ["不適格", "排除", "指名停止"]):
            return cls.INELIGIBILITY

        return cls.OTHER


@dataclass
class Requirement:
    """A single bid requirement extracted from an announcement."""

    requirement_no: int = 0
    announcement_no: int = 0
    requirement_type: str = ""
    requirement_text: str = ""
    requirement_detail: str = ""
    is_mandatory: bool = True
