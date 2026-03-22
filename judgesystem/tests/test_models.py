"""Tests for data models."""

from __future__ import annotations

from judgesystem.models.judgement import JudgementResult, RequirementStatus
from judgesystem.models.requirement import RequirementType


class TestRequirementType:
    def test_from_text_experience(self):
        assert RequirementType.from_text("施工実績を有すること") == RequirementType.EXPERIENCE

    def test_from_text_location(self):
        assert RequirementType.from_text("本店所在地が東京都") == RequirementType.LOCATION

    def test_from_text_technician(self):
        assert RequirementType.from_text("主任技術者を配置") == RequirementType.TECHNICIAN

    def test_from_text_grade(self):
        assert RequirementType.from_text("A等級に格付されている") == RequirementType.GRADE_ITEM

    def test_from_text_ineligibility(self):
        assert RequirementType.from_text("指名停止中でないこと") == RequirementType.INELIGIBILITY

    def test_from_text_unknown(self):
        assert RequirementType.from_text("その他の条件") == RequirementType.OTHER


class TestJudgementResult:
    def test_is_sufficient(self):
        result = JudgementResult(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="実績要件",
            status=RequirementStatus.SUFFICIENT,
        )
        assert result.is_sufficient is True

    def test_is_not_sufficient(self):
        result = JudgementResult(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="実績要件",
            status=RequirementStatus.INSUFFICIENT,
        )
        assert result.is_sufficient is False
