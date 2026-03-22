"""Tests for judgment strategy modules."""

from __future__ import annotations

import pandas as pd
import pytest

from judgesystem.judges import (
    ExperienceJudge,
    GradeItemJudge,
    IneligibilityJudge,
    JudgeRegistry,
    LocationJudge,
    TechnicianJudge,
)
from judgesystem.models.judgement import JudgementContext, RequirementStatus


@pytest.fixture
def master_data():
    """Sample master data for judge tests."""
    return {
        "agency": pd.DataFrame({
            "agency_no": [1, 2],
            "agency_name": ["防衛省", "北海道防衛局"],
            "parent_agency_no": [0, 1],
            "agency_level": [1, 2],
            "agency_area": ["全国", "北海道"],
        }),
        "company": pd.DataFrame({
            "company_no": [1],
            "company_name": ["テスト建設"],
        }),
        "office": pd.DataFrame({
            "office_no": [1, 2],
            "company_no": [1, 1],
            "office_name": ["本店", "札幌支店"],
            "prefecture": ["東京都", "北海道"],
        }),
        "construction": pd.DataFrame({
            "construction_no": [1, 2],
            "construction_name": ["土木一式工事", "建築一式工事"],
            "category_segment": ["土木", "建築"],
            "parent_construction_no": [0, 0],
        }),
        "office_work_achievements": pd.DataFrame({
            "office_experience_no": [1],
            "office_no": [1],
            "agency_no": [1],
            "construction_no": [1],
            "project_name": ["テスト工事"],
            "contractor_layer": ["元請け"],
            "start_date": ["2023-01-01"],
            "completion_date": ["2024-06-01"],
            "final_score": [80],
            "total_amount": [50000000],
            "is_jv_flag": [False],
            "jv_ratio": [100],
            "remarks": [""],
        }),
        "office_registration_authorization": pd.DataFrame({
            "office_no": [1],
            "construction_no": [1],
            "construction_name": ["土木一式工事"],
            "grade": ["A"],
        }),
        "employee": pd.DataFrame({
            "employee_no": [1],
            "company_no": [1],
            "employee_name": ["山田太郎"],
        }),
        "employee_qualification": pd.DataFrame({
            "employee_no": [1],
            "qualification_no": [1],
        }),
        "technician_qualification": pd.DataFrame({
            "qualification_no": [1],
            "qualification_name": ["1級土木施工管理技士"],
        }),
    }


class TestExperienceJudge:
    def test_sufficient_with_experience(self, master_data):
        judge = ExperienceJudge()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="実績要件",
            requirement_text="施工実績を有すること",
            master_data=master_data,
        )
        result = judge.evaluate(ctx)
        assert result.status == RequirementStatus.SUFFICIENT

    def test_insufficient_no_experience(self, master_data):
        judge = ExperienceJudge()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=99,
            requirement_type="実績要件",
            requirement_text="施工実績を有すること",
            master_data=master_data,
        )
        result = judge.evaluate(ctx)
        assert result.status == RequirementStatus.INSUFFICIENT


class TestLocationJudge:
    def test_sufficient_matching_prefecture(self, master_data):
        judge = LocationJudge()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="所在地要件",
            requirement_text="東京都に本店を有すること",
            master_data=master_data,
        )
        result = judge.evaluate(ctx)
        assert result.status == RequirementStatus.SUFFICIENT

    def test_insufficient_wrong_prefecture(self, master_data):
        judge = LocationJudge()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="所在地要件",
            requirement_text="北海道に本店を有すること",
            master_data=master_data,
        )
        result = judge.evaluate(ctx)
        assert result.status == RequirementStatus.INSUFFICIENT

    def test_sufficient_jurisdiction(self, master_data):
        judge = LocationJudge()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=2,
            requirement_type="所在地要件",
            requirement_text="北海道防衛局管轄区域内",
            master_data=master_data,
        )
        result = judge.evaluate(ctx)
        assert result.status == RequirementStatus.SUFFICIENT


class TestTechnicianJudge:
    def test_sufficient_with_qualification(self, master_data):
        judge = TechnicianJudge()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="技術者要件",
            requirement_text="1級土木施工管理技士の資格を有する者",
            master_data=master_data,
        )
        result = judge.evaluate(ctx)
        assert result.status == RequirementStatus.SUFFICIENT

    def test_insufficient_no_qualification(self, master_data):
        judge = TechnicianJudge()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="技術者要件",
            requirement_text="一級建築士の資格を有する者",
            master_data=master_data,
        )
        result = judge.evaluate(ctx)
        assert result.status == RequirementStatus.INSUFFICIENT


class TestGradeItemJudge:
    def test_sufficient_grade(self, master_data):
        judge = GradeItemJudge()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="等級・業種要件",
            requirement_text="A等級の土木一式工事",
            master_data=master_data,
        )
        result = judge.evaluate(ctx)
        assert result.status == RequirementStatus.SUFFICIENT


class TestIneligibilityJudge:
    def test_not_disqualified(self, master_data):
        judge = IneligibilityJudge()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="不適格要件",
            requirement_text="指名停止中でないこと",
            master_data=master_data,
        )
        result = judge.evaluate(ctx)
        assert result.status == RequirementStatus.SUFFICIENT


class TestJudgeRegistry:
    def test_dispatch_to_correct_judge(self, master_data):
        registry = JudgeRegistry()
        registry.register(ExperienceJudge())
        registry.register(LocationJudge())

        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="実績要件",
            requirement_text="施工実績を有すること",
            master_data=master_data,
        )
        result = registry.evaluate(ctx)
        assert result.status == RequirementStatus.SUFFICIENT

    def test_unknown_type_returns_not_applicable(self, master_data):
        registry = JudgeRegistry()
        ctx = JudgementContext(
            announcement_no=1, company_no=1, office_no=1,
            requirement_type="未知の要件",
            requirement_text="テスト",
            master_data=master_data,
        )
        result = registry.evaluate(ctx)
        assert result.status == RequirementStatus.NOT_APPLICABLE
