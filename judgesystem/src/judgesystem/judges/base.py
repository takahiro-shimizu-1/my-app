"""Base judge interface (Strategy Pattern)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from judgesystem.models.judgement import JudgementContext, JudgementResult


class BaseJudge(ABC):
    """Abstract base for all requirement judges.

    Each concrete judge evaluates one type of bid requirement
    (experience, location, technician, grade/item, ineligibility).

    To add a new requirement type:
    1. Create a new class extending BaseJudge
    2. Implement the evaluate() method
    3. Register it in JudgeRegistry
    """

    @property
    @abstractmethod
    def requirement_type(self) -> str:
        """The requirement type this judge handles (e.g., '実績要件')."""

    @abstractmethod
    def evaluate(self, context: JudgementContext) -> JudgementResult:
        """Evaluate a single requirement for a company/office combination.

        Args:
            context: All data needed for the evaluation, including
                     master data, requirement text, and company/office info.

        Returns:
            JudgementResult with status and reason.
        """
