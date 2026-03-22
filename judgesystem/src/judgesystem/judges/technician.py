"""Technician qualification requirement judge.

Evaluates whether a company has employees with the required
technical qualifications (licenses, certifications) for the bid.
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

# Known qualification categories for matching
QUALIFICATION_KEYWORDS = [
    "1級建設機械施工管理技士",
    "2級建設機械施工管理技士",
    "1級土木施工管理技士",
    "2級土木施工管理技士",
    "1級建築施工管理技士",
    "2級建築施工管理技士",
    "1級電気工事施工管理技士",
    "2級電気工事施工管理技士",
    "1級管工事施工管理技士",
    "2級管工事施工管理技士",
    "1級造園施工管理技士",
    "2級造園施工管理技士",
    "1級舗装施工管理技術者",
    "2級舗装施工管理技術者",
    "一級建築士",
    "二級建築士",
    "技術士",
    "監理技術者",
    "主任技術者",
]


class TechnicianJudge(BaseJudge):
    """Judge for technician qualification requirements (技術者要件)."""

    @property
    def requirement_type(self) -> str:
        return "技術者要件"

    def evaluate(self, context: JudgementContext) -> JudgementResult:
        master = context.master_data
        company_no = context.company_no
        requirement_text = context.requirement_text

        employees: pd.DataFrame = master.get("employee", pd.DataFrame())
        qualifications: pd.DataFrame = master.get("employee_qualification", pd.DataFrame())
        tech_quals: pd.DataFrame = master.get("technician_qualification", pd.DataFrame())

        # Get company employees
        company_employees = employees[employees["company_no"] == company_no]
        if company_employees.empty:
            return self._result(context, RequirementStatus.INSUFFICIENT,
                                "該当企業の技術者情報なし")

        employee_nos = company_employees["employee_no"].tolist()

        # Get qualifications for these employees
        emp_quals = qualifications[qualifications["employee_no"].isin(employee_nos)]

        # Extract required qualifications from text
        required_quals = self._extract_required_qualifications(requirement_text)

        if not required_quals:
            # Cannot determine specific qualification → check if any technician exists
            if not emp_quals.empty:
                return self._result(context, RequirementStatus.SUFFICIENT,
                                    "技術者在籍確認（具体的資格要件の特定不可）")
            return self._result(context, RequirementStatus.INSUFFICIENT,
                                "技術者資格情報なし")

        # Check if any employee holds any of the required qualifications
        for qual_name in required_quals:
            matching = self._find_matching_qualification(
                qual_name, emp_quals, tech_quals
            )
            if not matching.empty:
                return self._result(context, RequirementStatus.SUFFICIENT,
                                    f"資格保有者あり: {qual_name}")

        return self._result(
            context,
            RequirementStatus.INSUFFICIENT,
            f"必要資格({', '.join(required_quals[:3])})の保有者なし",
        )

    def _extract_required_qualifications(self, text: str) -> list[str]:
        """Extract required qualification names from text."""
        found = []
        for kw in QUALIFICATION_KEYWORDS:
            if kw in text:
                found.append(kw)
        return found

    def _find_matching_qualification(
        self,
        qual_name: str,
        emp_quals: pd.DataFrame,
        tech_quals: pd.DataFrame,
    ) -> pd.DataFrame:
        """Find employees with a matching qualification."""
        if tech_quals.empty or emp_quals.empty:
            return pd.DataFrame()

        # Find qualification numbers matching the name
        matching_qual_nos = tech_quals[
            tech_quals["qualification_name"].str.contains(qual_name, na=False)
        ]["qualification_no"].tolist()

        if not matching_qual_nos:
            return pd.DataFrame()

        return emp_quals[emp_quals["qualification_no"].isin(matching_qual_nos)]

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
