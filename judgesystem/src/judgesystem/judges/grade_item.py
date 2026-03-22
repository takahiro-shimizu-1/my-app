"""Grade and business category requirement judge.

Evaluates whether a company meets the grade (等級) and
business category (業種) requirements for the bid.
"""

from __future__ import annotations

import re

import pandas as pd

from judgesystem.judges.base import BaseJudge
from judgesystem.models.judgement import (
    JudgementContext,
    JudgementResult,
    RequirementStatus,
)

# Grade hierarchy (higher includes lower)
GRADE_HIERARCHY = {"A": 1, "B": 2, "C": 3, "D": 4}


class GradeItemJudge(BaseJudge):
    """Judge for grade and business category requirements (等級・業種要件)."""

    @property
    def requirement_type(self) -> str:
        return "等級・業種要件"

    def evaluate(self, context: JudgementContext) -> JudgementResult:
        master = context.master_data
        office_no = context.office_no
        requirement_text = context.requirement_text

        registrations: pd.DataFrame = master.get(
            "office_registration_authorization", pd.DataFrame()
        )
        construction: pd.DataFrame = master.get("construction", pd.DataFrame())

        # Get office registrations
        office_regs = registrations[registrations["office_no"] == office_no]
        if office_regs.empty:
            return self._result(context, RequirementStatus.INSUFFICIENT,
                                "該当拠点の資格登録情報なし")

        # Extract required grade and category
        required_grade = self._extract_grade(requirement_text)
        required_categories = self._extract_categories(requirement_text, construction)

        # Check grade
        if required_grade:
            grade_match = self._check_grade(office_regs, required_grade)
            if not grade_match:
                return self._result(context, RequirementStatus.INSUFFICIENT,
                                    f"等級要件({required_grade})を満たさない")

        # Check construction category
        if required_categories:
            cat_match = self._check_categories(office_regs, required_categories)
            if not cat_match:
                return self._result(
                    context,
                    RequirementStatus.INSUFFICIENT,
                    f"業種要件({', '.join(required_categories[:3])})を満たさない",
                )

        return self._result(context, RequirementStatus.SUFFICIENT,
                            "等級・業種要件を充足")

    def _extract_grade(self, text: str) -> str | None:
        """Extract required grade from text."""
        match = re.search(r"([A-D])(?:等級|ランク|級)", text)
        if match:
            return match.group(1)
        # Direct grade mention
        for grade in ["A", "B", "C", "D"]:
            if f"{grade}等級" in text or f"等級{grade}" in text:
                return grade
        return None

    def _extract_categories(
        self, text: str, construction_master: pd.DataFrame
    ) -> list[str]:
        """Extract required construction categories from text."""
        if construction_master.empty:
            return []
        categories = []
        for _, row in construction_master.iterrows():
            name = str(row.get("construction_name", ""))
            if name and name in text:
                categories.append(name)
        return categories

    def _check_grade(self, regs: pd.DataFrame, required: str) -> bool:
        """Check if any registration meets the grade requirement."""
        required_rank = GRADE_HIERARCHY.get(required, 99)
        for _, row in regs.iterrows():
            grade = str(row.get("grade", "")).strip().upper()
            reg_rank = GRADE_HIERARCHY.get(grade, 99)
            if reg_rank <= required_rank:
                return True
        return False

    def _check_categories(
        self, regs: pd.DataFrame, required: list[str]
    ) -> bool:
        """Check if any registration matches required categories."""
        reg_categories = set()
        for _, row in regs.iterrows():
            cat = str(row.get("construction_name", "")).strip()
            if cat:
                reg_categories.add(cat)
            construction_no = row.get("construction_no")
            if construction_no is not None:
                reg_categories.add(str(construction_no))
        return bool(reg_categories & set(required))

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
