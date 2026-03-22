"""Location requirement judge.

Evaluates whether a company has an office in the required geographic
area for the bid announcement.
"""

from __future__ import annotations

import pandas as pd

from judgesystem.judges.base import BaseJudge
from judgesystem.models.judgement import (
    JudgementContext,
    JudgementResult,
    RequirementStatus,
)

# Jurisdiction area → prefecture mappings
JURISDICTION_PREFECTURES: dict[str, list[str]] = {
    "北海道防衛局": ["北海道"],
    "東北防衛局": ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
    "北関東防衛局": ["茨城県", "栃木県", "群馬県", "埼玉県", "新潟県", "長野県"],
    "南関東防衛局": ["千葉県", "東京都", "神奈川県", "山梨県", "静岡県"],
    "近畿中部防衛局": [
        "富山県", "石川県", "福井県", "岐阜県", "愛知県", "三重県",
        "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
    ],
    "中国四国防衛局": [
        "鳥取県", "島根県", "岡山県", "広島県", "山口県",
        "徳島県", "香川県", "愛媛県", "高知県",
    ],
    "九州防衛局": [
        "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県",
    ],
    "沖縄防衛局": ["沖縄県"],
}


class LocationJudge(BaseJudge):
    """Judge for location requirements (所在地要件)."""

    @property
    def requirement_type(self) -> str:
        return "所在地要件"

    def evaluate(self, context: JudgementContext) -> JudgementResult:
        master = context.master_data
        office_no = context.office_no
        requirement_text = context.requirement_text

        office_master: pd.DataFrame = master.get("office", pd.DataFrame())
        agency_master: pd.DataFrame = master.get("agency", pd.DataFrame())

        # Get office information
        office_row = office_master[office_master["office_no"] == office_no]
        if office_row.empty:
            return self._result(context, RequirementStatus.INSUFFICIENT,
                                "拠点情報なし")

        office_prefecture = str(office_row.iloc[0].get("prefecture", ""))

        # Extract required prefectures from requirement text
        required_prefectures = self._extract_required_prefectures(
            requirement_text, agency_master
        )

        if not required_prefectures:
            # No specific location requirement found → pass
            return self._result(context, RequirementStatus.SUFFICIENT,
                                "所在地要件の特定不可（適格とみなす）")

        if office_prefecture in required_prefectures:
            return self._result(context, RequirementStatus.SUFFICIENT,
                                f"拠点所在地({office_prefecture})が要件地域に含まれる")

        return self._result(
            context,
            RequirementStatus.INSUFFICIENT,
            f"拠点所在地({office_prefecture})が要件地域"
            f"({', '.join(required_prefectures[:3])}...)に含まれない",
        )

    def _extract_required_prefectures(
        self, text: str, agency_master: pd.DataFrame
    ) -> list[str]:
        """Extract required prefectures from requirement text."""
        prefectures: list[str] = []

        # Check jurisdiction areas
        for area_name, area_prefs in JURISDICTION_PREFECTURES.items():
            if area_name in text:
                prefectures.extend(area_prefs)

        # Check direct prefecture mentions
        all_prefs = [
            "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
            "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
            "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
            "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
            "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
            "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
            "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
        ]
        for pref in all_prefs:
            if pref in text and pref not in prefectures:
                prefectures.append(pref)

        return prefectures

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
