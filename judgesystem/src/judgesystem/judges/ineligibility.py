"""Ineligibility (disqualification) judge.

Evaluates whether a company is disqualified from bidding
based on negative criteria (指名停止、排除措置など).
"""

from __future__ import annotations

import pandas as pd

from judgesystem.judges.base import BaseJudge
from judgesystem.models.judgement import (
    JudgementContext,
    JudgementResult,
    RequirementStatus,
)


class IneligibilityJudge(BaseJudge):
    """Judge for ineligibility/disqualification requirements (不適格要件).

    Unlike other judges, this uses negative logic:
    SUFFICIENT means the company is NOT disqualified (eligible).
    INSUFFICIENT means the company IS disqualified (ineligible).
    """

    @property
    def requirement_type(self) -> str:
        return "不適格要件"

    def evaluate(self, context: JudgementContext) -> JudgementResult:
        requirement_text = context.requirement_text

        # Check for disqualification keywords
        disqualification_keywords = [
            "指名停止",
            "排除措置",
            "営業停止",
            "入札参加資格停止",
            "競争参加資格停止",
        ]

        for keyword in disqualification_keywords:
            if keyword in requirement_text:
                # This is a negative requirement - company must NOT be disqualified
                # Since we don't have real-time disqualification data,
                # we mark as SUFFICIENT (assume eligible unless proven otherwise)
                return self._result(
                    context,
                    RequirementStatus.SUFFICIENT,
                    f"不適格要件({keyword})の該当なし（デフォルト適格判定）",
                )

        return self._result(context, RequirementStatus.SUFFICIENT,
                            "不適格要件に該当せず")

    def _result(
        self, ctx: JudgementContext, status: RequirementStatus, reason: str
    ) -> JudgementResult:
        return JudgementResult(
            announcement_no=ctx.announcement_no,
            company_no=ctx.company_no,
            office_no=ctx.office_no,
            requirement_type=self.requirement_type,
            status=status,
            reason=reason,
        )
