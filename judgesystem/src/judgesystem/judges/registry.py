"""Judge registry for dynamic dispatch by requirement type."""

from __future__ import annotations

from judgesystem.judges.base import BaseJudge
from judgesystem.models.judgement import (
    JudgementContext,
    JudgementResult,
    RequirementStatus,
)


class JudgeRegistry:
    """Registry mapping requirement types to their judge implementations.

    Usage:
        registry = JudgeRegistry()
        registry.register(ExperienceJudge())
        registry.register(LocationJudge())
        result = registry.evaluate(context)
    """

    def __init__(self) -> None:
        self._judges: dict[str, BaseJudge] = {}

    def register(self, judge: BaseJudge) -> None:
        """Register a judge for its requirement type."""
        self._judges[judge.requirement_type] = judge

    def get_judge(self, requirement_type: str) -> BaseJudge | None:
        """Get the judge for a requirement type."""
        return self._judges.get(requirement_type)

    def evaluate(self, context: JudgementContext) -> JudgementResult:
        """Dispatch evaluation to the appropriate judge.

        Falls back to NOT_APPLICABLE if no judge is registered
        for the requirement type.
        """
        judge = self._judges.get(context.requirement_type)
        if judge is None:
            return JudgementResult(
                announcement_no=context.announcement_no,
                company_no=context.company_no,
                office_no=context.office_no,
                requirement_type=context.requirement_type,
                status=RequirementStatus.NOT_APPLICABLE,
                reason=f"No judge registered for type: {context.requirement_type}",
            )
        return judge.evaluate(context)

    @property
    def registered_types(self) -> list[str]:
        """List all registered requirement types."""
        return list(self._judges.keys())
