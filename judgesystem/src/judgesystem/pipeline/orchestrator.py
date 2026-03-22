"""Pipeline orchestrator.

Coordinates the execution of processing steps in sequence.
Each step is an independent, testable unit.
"""

from __future__ import annotations

from judgesystem.config import AppConfig
from judgesystem.db import DBAdapter, create_adapter
from judgesystem.db.schema import ALL_SCHEMAS
from judgesystem.services.master_data import MasterDataService
from judgesystem.services.ocr import OCRService
from judgesystem.services.storage import StorageService


class Pipeline:
    """Orchestrates the judgment pipeline.

    Steps:
        0. Document preparation (optional) - fetch HTML, extract links, download PDFs
        1. Transfer/transcription - extract announcement metadata
        2. OCR - process PDFs with Gemini
        3. Judgment - evaluate requirements for each company/office
    """

    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.db: DBAdapter = create_adapter(config.db)
        self.storage = StorageService(config.storage)
        self.ocr_service = OCRService(config.ocr, self.storage)
        self.master_data = MasterDataService(config.master_data)

    def run(self) -> None:
        """Execute the full pipeline based on configuration."""
        print("=== JudgeSystem Pipeline ===")

        if self.config.pipeline.run_step0:
            self._run_step0()

        if self.config.pipeline.run_step0_only:
            print("Step 0 only mode. Exiting.")
            return

        self._run_step1()

        if self.config.pipeline.stop_after_step1:
            print("Stopping after step 1.")
            return

        self._run_step3()
        print("=== Pipeline complete ===")

    def _run_step0(self) -> None:
        """Step 0: Document preparation."""
        from judgesystem.pipeline.step0_documents import DocumentPreparer

        print("\n--- Step 0: Document Preparation ---")
        preparer = DocumentPreparer(
            db=self.db,
            storage=self.storage,
            ocr=self.ocr_service,
            config=self.config,
        )
        preparer.run()

    def _run_step1(self) -> None:
        """Step 1: Transcription / transfer."""
        from judgesystem.pipeline.step1_transfer import TransferStep

        print("\n--- Step 1: Transcription ---")
        step = TransferStep(
            db=self.db,
            config=self.config,
        )
        step.run(remove_table=self.config.pipeline.step1_remove_table)

    def _run_step3(self) -> None:
        """Step 3: Requirement judgment."""
        from judgesystem.pipeline.step3_judgement import JudgementStep

        print("\n--- Step 3: Requirement Judgment ---")
        step = JudgementStep(
            db=self.db,
            master_data=self.master_data,
            config=self.config,
        )
        step.run(remove_table=self.config.pipeline.step3_remove_table)

    def ensure_tables(self) -> None:
        """Create all required tables if they don't exist."""
        for name, schema in ALL_SCHEMAS.items():
            if not self.db.table_exists(name):
                dialect = self.config.db.backend
                if dialect == "bigquery":
                    dialect = "postgres"
                self.db.create_table(name, schema.to_ddl(dialect))
                print(f"Created table: {name}")

    def close(self) -> None:
        """Clean up resources."""
        self.db.close()
