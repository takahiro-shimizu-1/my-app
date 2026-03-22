"""CLI entry point for the judgment system.

Replaces the 80+ argument parser from the monolithic main.py
with a clean, organized argument structure.
"""

from __future__ import annotations

import argparse
import sys

from judgesystem.config import (
    AppConfig,
    DBConfig,
    MasterDataConfig,
    OCRConfig,
    PipelineConfig,
    StorageConfig,
    TableNames,
)
from judgesystem.pipeline import Pipeline


def parse_args(argv: list[str] | None = None) -> AppConfig:
    """Parse CLI arguments into an AppConfig."""
    parser = argparse.ArgumentParser(
        description="JudgeSystem - Bid Announcement Judgment Engine"
    )

    # Database backend
    db_group = parser.add_argument_group("Database")
    db_group.add_argument("--backend", choices=["sqlite", "postgres", "bigquery"],
                          default="sqlite", help="Database backend")
    db_group.add_argument("--sqlite-path", default=None,
                          help="SQLite database file path")
    db_group.add_argument("--postgres-host", default=None)
    db_group.add_argument("--postgres-port", type=int, default=5432)
    db_group.add_argument("--postgres-database", default=None)
    db_group.add_argument("--postgres-user", default=None)
    db_group.add_argument("--postgres-password", default=None)
    db_group.add_argument("--bigquery-location", default=None)
    db_group.add_argument("--bigquery-project-id", default=None)
    db_group.add_argument("--bigquery-dataset-name", default=None)

    # Storage
    storage_group = parser.add_argument_group("Storage")
    storage_group.add_argument("--use-gcs", action="store_true",
                               help="Use Google Cloud Storage for files")
    storage_group.add_argument("--gcs-bucket", default=None)
    storage_group.add_argument("--output-dir", default="output",
                               help="Local output directory")

    # OCR
    ocr_group = parser.add_argument_group("OCR")
    ocr_group.add_argument("--google-api-key-path",
                           default="data/sec/google_ai_studio_api_key.txt")
    ocr_group.add_argument("--gemini-model", default="gemini-2.5-flash")
    ocr_group.add_argument("--max-concurrency", type=int, default=5)
    ocr_group.add_argument("--max-api-calls", type=int, default=1000)

    # Master data
    master_group = parser.add_argument_group("Master Data")
    master_group.add_argument("--master-dir", default="data/master",
                              help="Directory containing master TSV files")

    # Pipeline control
    pipeline_group = parser.add_argument_group("Pipeline")
    pipeline_group.add_argument("--run-step0", action="store_true",
                                help="Run document preparation step")
    pipeline_group.add_argument("--step0-only", action="store_true",
                                help="Run step 0 only and exit")
    pipeline_group.add_argument("--stop-after-step1", action="store_true",
                                help="Stop after transcription step")
    pipeline_group.add_argument("--step1-remove-table", action="store_true",
                                help="Remove existing tables before step 1")
    pipeline_group.add_argument("--step3-remove-table", action="store_true",
                                help="Remove existing tables before step 3")
    pipeline_group.add_argument("--top-agency-name", default="防衛省")

    args = parser.parse_args(argv)

    # Map legacy --use_gcp_vm / --use_postgres to backend
    backend = args.backend
    if backend == "sqlite" and args.postgres_host:
        backend = "postgres"

    return AppConfig(
        db=DBConfig(
            backend=backend,
            sqlite_path=args.sqlite_path,
            postgres_host=args.postgres_host,
            postgres_port=args.postgres_port,
            postgres_database=args.postgres_database,
            postgres_user=args.postgres_user,
            postgres_password=args.postgres_password,
            bigquery_location=args.bigquery_location,
            bigquery_project_id=args.bigquery_project_id,
            bigquery_dataset_name=args.bigquery_dataset_name,
        ),
        storage=StorageConfig(
            use_gcs=args.use_gcs,
            gcs_bucket=args.gcs_bucket,
            local_base_dir=args.output_dir,
        ),
        ocr=OCRConfig(
            google_api_key_path=args.google_api_key_path,
            gemini_model=args.gemini_model,
            max_concurrency=args.max_concurrency,
            max_api_calls_per_run=args.max_api_calls,
        ),
        master_data=MasterDataConfig(base_dir=args.master_dir),
        tables=TableNames(),
        pipeline=PipelineConfig(
            run_step0=args.run_step0,
            run_step0_only=args.step0_only,
            stop_after_step1=args.stop_after_step1,
            step1_remove_table=args.step1_remove_table,
            step3_remove_table=args.step3_remove_table,
            top_agency_name=args.top_agency_name,
        ),
    )


def main(argv: list[str] | None = None) -> None:
    """Main entry point."""
    config = parse_args(argv)
    pipeline = Pipeline(config)

    try:
        pipeline.run()
    finally:
        pipeline.close()


if __name__ == "__main__":
    main()
