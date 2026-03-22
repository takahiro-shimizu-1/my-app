"""Experience requirement judge.

Evaluates whether a company's office has sufficient past project
experience to meet the bid announcement's experience requirements.
"""

from __future__ import annotations

import re
from datetime import datetime

import pandas as pd

from judgesystem.judges.base import BaseJudge
from judgesystem.models.judgement import (
    JudgementContext,
    JudgementResult,
    RequirementStatus,
)


class ExperienceJudge(BaseJudge):
    """Judge for experience requirements (実績要件)."""

    @property
    def requirement_type(self) -> str:
        return "実績要件"

    def evaluate(self, context: JudgementContext) -> JudgementResult:
        master = context.master_data
        office_no = context.office_no
        requirement_text = context.requirement_text

        achievements: pd.DataFrame = master.get("office_work_achievements", pd.DataFrame())
        construction: pd.DataFrame = master.get("construction", pd.DataFrame())
        agency: pd.DataFrame = master.get("agency", pd.DataFrame())

        # Filter achievements for this office
        office_achievements = achievements[achievements["office_no"] == office_no]

        if office_achievements.empty:
            return self._result(context, RequirementStatus.INSUFFICIENT,
                                "該当拠点の工事実績なし")

        # Extract conditions from requirement text
        conditions = self._extract_conditions(requirement_text)

        # Apply date filter if specified
        if conditions.get("year_from"):
            office_achievements = self._filter_by_date(
                office_achievements, conditions["year_from"]
            )
            if office_achievements.empty:
                return self._result(context, RequirementStatus.INSUFFICIENT,
                                    f"指定期間({conditions['year_from']}年以降)の実績なし")

        # Apply contractor layer filter
        if conditions.get("required_contractor_layer"):
            layer = conditions["required_contractor_layer"]
            office_achievements = office_achievements[
                office_achievements["contractor_layer"] == layer
            ]
            if office_achievements.empty:
                return self._result(context, RequirementStatus.INSUFFICIENT,
                                    f"指定立場({layer})の実績なし")

        # Apply construction type filter
        if conditions.get("construction_types"):
            office_achievements = self._filter_by_construction(
                office_achievements, conditions["construction_types"], construction
            )
            if office_achievements.empty:
                return self._result(context, RequirementStatus.INSUFFICIENT,
                                    "指定工種の実績なし")

        # Apply amount filter
        if conditions.get("min_amount"):
            office_achievements = office_achievements[
                office_achievements["total_amount"] >= conditions["min_amount"]
            ]
            if office_achievements.empty:
                return self._result(context, RequirementStatus.INSUFFICIENT,
                                    f"指定金額({conditions['min_amount']}円)以上の実績なし")

        return self._result(context, RequirementStatus.SUFFICIENT,
                            f"実績あり({len(office_achievements)}件)")

    def _extract_conditions(self, text: str) -> dict:
        """Extract structured conditions from requirement text."""
        conditions: dict = {}

        # Year extraction (e.g., "平成25年度以降" or "令和3年度以降")
        year_match = re.search(r"(平成|令和)(\d+)年度?以降", text)
        if year_match:
            era, year_num = year_match.group(1), int(year_match.group(2))
            if era == "平成":
                conditions["year_from"] = 1988 + year_num
            elif era == "令和":
                conditions["year_from"] = 2018 + year_num

        # Contractor layer
        if "元請" in text:
            conditions["required_contractor_layer"] = "元請け"

        # Amount
        amount_match = re.search(r"(\d[\d,]+)\s*(?:万円|千万円|億円|円)", text)
        if amount_match:
            raw = int(amount_match.group(1).replace(",", ""))
            if "億円" in text:
                raw *= 100_000_000
            elif "千万円" in text:
                raw *= 10_000_000
            elif "万円" in text:
                raw *= 10_000
            conditions["min_amount"] = raw

        return conditions

    def _filter_by_date(self, df: pd.DataFrame, year_from: int) -> pd.DataFrame:
        """Filter achievements by completion date >= year_from."""
        filtered = []
        for _, row in df.iterrows():
            try:
                completion = str(row.get("completion_date", ""))
                if completion and len(completion) >= 4:
                    year = int(completion[:4])
                    if year >= year_from:
                        filtered.append(row)
            except (ValueError, TypeError):
                continue
        if not filtered:
            return pd.DataFrame()
        return pd.DataFrame(filtered)

    def _filter_by_construction(
        self, df: pd.DataFrame, types: list[str], construction_master: pd.DataFrame
    ) -> pd.DataFrame:
        """Filter achievements by construction type."""
        if construction_master.empty:
            return df
        matching_nos = construction_master[
            construction_master["construction_name"].isin(types)
        ]["construction_no"].tolist()
        if not matching_nos:
            return df
        return df[df["construction_no"].isin(matching_nos)]

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
