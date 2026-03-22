"""Application configuration with Pydantic validation."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Literal


@dataclass(frozen=True)
class DBConfig:
    """Database connection configuration."""

    backend: Literal["sqlite", "postgres", "bigquery"] = "sqlite"

    # SQLite
    sqlite_path: str | None = None

    # PostgreSQL
    postgres_host: str | None = None
    postgres_port: int = 5432
    postgres_database: str | None = None
    postgres_user: str | None = None
    postgres_password: str | None = None

    # BigQuery
    bigquery_location: str | None = None
    bigquery_project_id: str | None = None
    bigquery_dataset_name: str | None = None


@dataclass(frozen=True)
class StorageConfig:
    """File storage configuration (local or GCS)."""

    use_gcs: bool = False
    gcs_bucket: str | None = None
    local_base_dir: str = "output"


@dataclass(frozen=True)
class OCRConfig:
    """OCR processing configuration."""

    google_api_key_path: str = "data/sec/google_ai_studio_api_key.txt"
    gemini_model: str = "gemini-2.5-flash"
    max_concurrency: int = 5
    max_api_calls_per_run: int = 1000


@dataclass(frozen=True)
class MasterDataConfig:
    """Master data file paths."""

    base_dir: str = "data/master"

    @property
    def agency(self) -> str:
        return f"{self.base_dir}/agency_master.txt"

    @property
    def company(self) -> str:
        return f"{self.base_dir}/company_master.txt"

    @property
    def construction(self) -> str:
        return f"{self.base_dir}/construction_master.txt"

    @property
    def office(self) -> str:
        return f"{self.base_dir}/office_master.txt"

    @property
    def office_work_achievements(self) -> str:
        return f"{self.base_dir}/office_work_achivements_master.txt"

    @property
    def office_registration_authorization(self) -> str:
        return f"{self.base_dir}/office_registration_authorization_master.txt"

    @property
    def employee(self) -> str:
        return f"{self.base_dir}/employee_master.txt"

    @property
    def employee_qualification(self) -> str:
        return f"{self.base_dir}/employee_qualification_master.txt"

    @property
    def employee_experience(self) -> str:
        return f"{self.base_dir}/employee_experience_master.txt"

    @property
    def technician_qualification(self) -> str:
        return f"{self.base_dir}/technician_qualification_master.txt"

    @property
    def partners(self) -> str:
        return f"{self.base_dir}/partners_master.txt"


@dataclass(frozen=True)
class TableNames:
    """Database table name configuration."""

    bid_announcements_pre: str = "bid_announcements_pre"
    bid_announcements: str = "bid_announcements"
    bid_requirements: str = "bid_requirements"
    company_bid_judgement: str = "company_bid_judgement"
    sufficient_requirements: str = "sufficient_requirements"
    insufficient_requirements: str = "insufficient_requirements"
    office_master: str = "office_master"
    announcements_document_table: str = "announcements_documents_master"


@dataclass(frozen=True)
class PipelineConfig:
    """Pipeline execution configuration."""

    run_step0: bool = False
    run_step0_only: bool = False
    stop_after_step1: bool = False
    step1_remove_table: bool = False
    step3_remove_table: bool = False
    top_agency_name: str = "防衛省"


@dataclass(frozen=True)
class AppConfig:
    """Top-level application configuration."""

    db: DBConfig = field(default_factory=DBConfig)
    storage: StorageConfig = field(default_factory=StorageConfig)
    ocr: OCRConfig = field(default_factory=OCRConfig)
    master_data: MasterDataConfig = field(default_factory=MasterDataConfig)
    tables: TableNames = field(default_factory=TableNames)
    pipeline: PipelineConfig = field(default_factory=PipelineConfig)
