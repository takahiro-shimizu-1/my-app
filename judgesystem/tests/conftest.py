"""Shared test fixtures."""

from __future__ import annotations

import sqlite3
import tempfile
from pathlib import Path

import pandas as pd
import pytest

from judgesystem.config import AppConfig, DBConfig, MasterDataConfig, TableNames
from judgesystem.db.sqlite import SQLiteAdapter


@pytest.fixture
def tmp_db(tmp_path):
    """Create a temporary SQLite database."""
    db_path = str(tmp_path / "test.db")
    adapter = SQLiteAdapter(db_path)
    yield adapter
    adapter.close()


@pytest.fixture
def sample_master_data(tmp_path):
    """Create sample master data files for testing."""
    master_dir = tmp_path / "master"
    master_dir.mkdir()

    # Agency master
    agency_df = pd.DataFrame({
        "agency_no": [1, 2],
        "agency_name": ["防衛省", "北海道防衛局"],
        "parent_agency_no": [0, 1],
        "agency_level": [1, 2],
        "agency_area": ["全国", "北海道"],
    })
    agency_df.to_csv(master_dir / "agency_master.txt", sep="\t", index=False)

    # Company master
    company_df = pd.DataFrame({
        "company_no": [1, 2],
        "company_name": ["テスト建設株式会社", "サンプル工業株式会社"],
    })
    company_df.to_csv(master_dir / "company_master.txt", sep="\t", index=False)

    # Construction master
    construction_df = pd.DataFrame({
        "construction_no": [1, 2],
        "construction_name": ["土木一式工事", "建築一式工事"],
        "category_segment": ["土木", "建築"],
        "parent_construction_no": [0, 0],
    })
    construction_df.to_csv(master_dir / "construction_master.txt", sep="\t", index=False)

    # Office master
    office_df = pd.DataFrame({
        "office_no": [1, 2],
        "company_no": [1, 1],
        "office_name": ["本店", "札幌支店"],
        "prefecture": ["東京都", "北海道"],
    })
    office_df.to_csv(master_dir / "office_master.txt", sep="\t", index=False)

    # Office work achievements
    achievements_df = pd.DataFrame({
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
    })
    achievements_df.to_csv(
        master_dir / "office_work_achivements_master.txt", sep="\t", index=False
    )

    # Office registration authorization
    reg_df = pd.DataFrame({
        "office_no": [1],
        "construction_no": [1],
        "construction_name": ["土木一式工事"],
        "grade": ["A"],
    })
    reg_df.to_csv(
        master_dir / "office_registration_authorization_master.txt",
        sep="\t", index=False,
    )

    # Employee master
    employee_df = pd.DataFrame({
        "employee_no": [1],
        "company_no": [1],
        "employee_name": ["山田太郎"],
    })
    employee_df.to_csv(master_dir / "employee_master.txt", sep="\t", index=False)

    # Employee qualification master
    emp_qual_df = pd.DataFrame({
        "employee_no": [1],
        "qualification_no": [1],
    })
    emp_qual_df.to_csv(
        master_dir / "employee_qualification_master.txt", sep="\t", index=False
    )

    # Employee experience master
    emp_exp_df = pd.DataFrame({
        "employee_no": [1],
        "project_name": ["テスト工事"],
    })
    emp_exp_df.to_csv(
        master_dir / "employee_experience_master.txt", sep="\t", index=False
    )

    # Technician qualification master
    tech_df = pd.DataFrame({
        "qualification_no": [1],
        "qualification_name": ["1級土木施工管理技士"],
    })
    tech_df.to_csv(
        master_dir / "technician_qualification_master.txt", sep="\t", index=False
    )

    # Partners master
    partners_df = pd.DataFrame({
        "partner_no": [1],
        "partner_name": ["協力建設"],
    })
    partners_df.to_csv(master_dir / "partners_master.txt", sep="\t", index=False)

    return MasterDataConfig(base_dir=str(master_dir))


@pytest.fixture
def app_config(tmp_path, sample_master_data):
    """Create a test AppConfig."""
    db_path = str(tmp_path / "test.db")
    return AppConfig(
        db=DBConfig(backend="sqlite", sqlite_path=db_path),
        master_data=sample_master_data,
    )
