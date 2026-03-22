"""Step 1: Transcription / Transfer.

Extracts structured announcement and requirement data from
documents and stores them in the database.
"""

from __future__ import annotations

import pandas as pd

from judgesystem.config import AppConfig
from judgesystem.db.base import DBAdapter
from judgesystem.db.schema import BID_ANNOUNCEMENTS, BID_REQUIREMENTS
from judgesystem.models.requirement import RequirementType


class TransferStep:
    """Transfer/transcribe announcement data to structured tables."""

    def __init__(self, db: DBAdapter, config: AppConfig) -> None:
        self.db = db
        self.config = config

    def run(self, remove_table: bool = False) -> None:
        """Execute the transcription step."""
        tables = self.config.tables
        dialect = self.config.db.backend if self.config.db.backend != "bigquery" else "postgres"

        # Manage announcements table
        if remove_table and self.db.table_exists(tables.bid_announcements):
            self.db.drop_table(tables.bid_announcements)
            print(f"Dropped table: {tables.bid_announcements}")

        if not self.db.table_exists(tables.bid_announcements):
            self.db.create_table(
                tables.bid_announcements,
                BID_ANNOUNCEMENTS.to_ddl(dialect),
            )
            print(f"Created table: {tables.bid_announcements}")

        # Manage requirements table
        if remove_table and self.db.table_exists(tables.bid_requirements):
            self.db.drop_table(tables.bid_requirements)
            print(f"Dropped table: {tables.bid_requirements}")

        if not self.db.table_exists(tables.bid_requirements):
            self.db.create_table(
                tables.bid_requirements,
                BID_REQUIREMENTS.to_ddl(dialect),
            )
            print(f"Created table: {tables.bid_requirements}")

        # Process documents from the document table
        doc_table = tables.announcements_document_table
        if not self.db.table_exists(doc_table):
            print(f"No documents table ({doc_table}) found. Skipping step 1.")
            return

        documents = self.db.select_all(doc_table)
        print(f"Processing {len(documents)} documents for transcription.")

        self._process_documents(documents)

    def _process_documents(self, documents: pd.DataFrame) -> None:
        """Process documents and create announcement/requirement records."""
        announcements = []
        requirements = []
        req_counter = 0

        for _, doc in documents.iterrows():
            announcement_no = doc.get("announcement_no", 0)

            # Create announcement record
            announcements.append({
                "announcement_no": announcement_no,
                "document_id": doc.get("document_id", ""),
                "project_name": doc.get("project_name", ""),
                "organization": doc.get("agency_name", ""),
                "agency_name": doc.get("agency_name", ""),
                "parent_agency_name": doc.get("top_agency_name", ""),
            })

        if announcements:
            df_ann = pd.DataFrame(announcements)
            self.db.upload_dataframe(df_ann, self.config.tables.bid_announcements)
            print(f"Uploaded {len(announcements)} announcements.")

        if requirements:
            df_req = pd.DataFrame(requirements)
            self.db.upload_dataframe(df_req, self.config.tables.bid_requirements)
            print(f"Uploaded {len(requirements)} requirements.")

    @staticmethod
    def classify_requirement(text: str) -> str:
        """Classify requirement type from text."""
        return RequirementType.from_text(text).value
