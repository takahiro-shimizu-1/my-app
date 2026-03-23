#coding: utf-8

"""
config.py - DB接続設定、環境変数、定数

judgment-engine の設定値を一元管理するモジュール。
"""

import warnings
from dataclasses import dataclass

# Suppress FutureWarning for cleaner output
warnings.simplefilter(action="ignore", category=FutureWarning)

# ---------------------------------------------------------------------------
# Optional dependency imports (graceful degradation)
# ---------------------------------------------------------------------------

try:
    from google.cloud import bigquery
except Exception as e:
    print(e)

try:
    import psycopg2
    from psycopg2 import sql
    from psycopg2.extras import execute_values
except Exception as e:
    print(e)

try:
    from sqlalchemy import create_engine
except Exception as e:
    print(e)

try:
    from pandas_gbq import to_gbq
except Exception as e:
    print(e)

try:
    from google.api_core.exceptions import NotFound
except Exception as e:
    print(e)

# GCS support for PDF storage
try:
    from google.cloud import storage
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False


# ---------------------------------------------------------------------------
# Table names configuration
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class TablenamesConfig:
    """
    テーブル名を保持。
    """

    bid_announcements_pre: str = "bid_announcements_pre"
    bid_announcements: str = "bid_announcements"
    bid_requirements: str = "bid_requirements"
    company_bid_judgement: str = "company_bid_judgement"
    sufficient_requirements: str = "sufficient_requirements"
    insufficient_requirements: str = "insufficient_requirements"
    office_master: str = "office_master"
    bid_announcements_document_table: str = "announcements_documents_master"


# ---------------------------------------------------------------------------
# Master data paths configuration
# ---------------------------------------------------------------------------

MASTER_DATA_PATHS = {
    "agency_master": "data/master/agency_master.txt",
    "announcements_competing_companies_master": "data/master/announcements_competing_companies_master.txt",
    "announcements_competing_company_bids_master": "data/master/announcements_competing_company_bids_master.txt",
    "company_master": "data/master/company_master.txt",
    "construction_master": "data/master/construction_master.txt",
    "employee_master": "data/master/employee_master.txt",
    "employee_qualification_master": "data/master/employee_qualification_master.txt",
    "employee_experience_master": "data/master/employee_experience_master.txt",
    "office_master": "data/master/office_master.txt",
    "office_registration_authorization_master": "data/master/office_registration_authorization_master.txt",
    "office_work_achivements_master": "data/master/office_work_achivements_master.txt",
    "technician_qualification_master": "data/master/technician_qualification_master.txt",
    "announcements_estimated_amounts": "data/master/announcements_estimated_amounts.txt",
    "similar_cases_master": "data/master/similar_cases_master.txt",
    "similar_cases_competitors": "data/master/similar_cases_competitors.txt",
    "partners_master": "data/master/partners_master.txt",
    "partners_branches": "data/master/partners_branches.txt",
    "partners_categories": "data/master/partners_categories.txt",
    "partners_past_projects": "data/master/partners_past_projects.txt",
    "partners_qualifications_orderer_items": "data/master/partners_qualifications_orderer_items.txt",
    "partners_qualifications_orderers": "data/master/partners_qualifications_orderers.txt",
    "partners_qualifications_unified": "data/master/partners_qualifications_unified.txt",
}
