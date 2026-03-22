"""Judgement result data models."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class RequirementStatus(Enum):
    """Result of a single requirement evaluation."""

    SUFFICIENT = "sufficient"
    INSUFFICIENT = "insufficient"
    NOT_APPLICABLE = "not_applicable"
    ERROR = "error"


@dataclass
class JudgementContext:
    """Input context for a single judgment evaluation.

    Represents one (company, office, announcement) combination
    with all associated requirements and master data.
    """

    announcement_no: int
    company_no: int
    office_no: int
    requirement_type: str
    requirement_text: str
    requirement_detail: str = ""
    master_data: dict = field(default_factory=dict)


@dataclass
class JudgementResult:
    """Output of a single requirement judgment."""

    announcement_no: int
    company_no: int
    office_no: int
    requirement_type: str
    status: RequirementStatus
    reason: str = ""
    details: dict = field(default_factory=dict)

    @property
    def is_sufficient(self) -> bool:
        return self.status == RequirementStatus.SUFFICIENT
