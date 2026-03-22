"""Judgment strategy modules (Strategy Pattern).

Each judge evaluates a specific requirement type against
company/office master data.
"""

from judgesystem.judges.base import BaseJudge
from judgesystem.judges.experience import ExperienceJudge
from judgesystem.judges.grade_item import GradeItemJudge
from judgesystem.judges.ineligibility import IneligibilityJudge
from judgesystem.judges.location import LocationJudge
from judgesystem.judges.registry import JudgeRegistry
from judgesystem.judges.technician import TechnicianJudge

__all__ = [
    "BaseJudge",
    "ExperienceJudge",
    "GradeItemJudge",
    "IneligibilityJudge",
    "JudgeRegistry",
    "LocationJudge",
    "TechnicianJudge",
]
