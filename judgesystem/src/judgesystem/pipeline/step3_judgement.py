"""Step 3: Requirement judgment.

Evaluates all (company x office x requirement) combinations
using registered judges, with multiprocessing for scalability.
"""

from __future__ import annotations

import uuid
from multiprocessing import Pool, cpu_count

import numpy as np
import pandas as pd
from tqdm import tqdm

from judgesystem.config import AppConfig
from judgesystem.db.base import DBAdapter
from judgesystem.db.schema import (
    COMPANY_BID_JUDGEMENT,
    INSUFFICIENT_REQUIREMENTS,
    SUFFICIENT_REQUIREMENTS,
)
from judgesystem.judges import (
    ExperienceJudge,
    GradeItemJudge,
    IneligibilityJudge,
    JudgeRegistry,
    LocationJudge,
    TechnicianJudge,
)
from judgesystem.models.judgement import JudgementContext, RequirementStatus
from judgesystem.services.master_data import MasterDataService


def _process_chunk(args: tuple) -> dict:
    """Process a chunk of judgement combinations (for multiprocessing).

    This is a module-level function (not a method) because
    multiprocessing.Pool requires picklable callables.
    """
    df_chunk, req_map, master_dict, registry_types = args

    # Recreate registry in worker process
    registry = _build_registry()

    judgement_results = []
    sufficient_results = []
    insufficient_results = []

    for _, row in df_chunk.iterrows():
        announcement_no = int(row["announcement_no"])
        company_no = int(row["company_no"])
        office_no = int(row["office_no"])

        # Get requirements for this announcement
        reqs = req_map.get(announcement_no, pd.DataFrame())
        if reqs.empty:
            continue

        has_insufficient = False

        for _, req in reqs.iterrows():
            req_type = str(req.get("requirement_type", ""))
            req_text = str(req.get("requirement_text", ""))

            context = JudgementContext(
                announcement_no=announcement_no,
                company_no=company_no,
                office_no=office_no,
                requirement_type=req_type,
                requirement_text=req_text,
                requirement_detail=str(req.get("requirement_detail", "")),
                master_data=master_dict,
            )

            result = registry.evaluate(context)

            result_id = str(uuid.uuid4())

            if result.is_sufficient:
                sufficient_results.append({
                    "sufficient_requirement_no": result_id,
                    "evaluation_no": f"{announcement_no}_{company_no}_{office_no}",
                    "announcement_no": announcement_no,
                    "company_no": company_no,
                    "office_no": office_no,
                    "requirement_type": req_type,
                    "requirement_text": req_text,
                    "reason": result.reason,
                })
            else:
                has_insufficient = True
                insufficient_results.append({
                    "insufficient_requirement_no": result_id,
                    "evaluation_no": f"{announcement_no}_{company_no}_{office_no}",
                    "announcement_no": announcement_no,
                    "company_no": company_no,
                    "office_no": office_no,
                    "requirement_type": req_type,
                    "requirement_text": req_text,
                    "reason": result.reason,
                })

        # Create judgement summary
        final_status = "不適格" if has_insufficient else "適格"
        judgement_results.append({
            "evaluation_no": f"{announcement_no}_{company_no}_{office_no}",
            "announcement_no": announcement_no,
            "company_no": company_no,
            "office_no": office_no,
            "final_status": final_status,
        })

    return {
        "judgement": judgement_results,
        "sufficient": sufficient_results,
        "insufficient": insufficient_results,
    }


def _build_registry() -> JudgeRegistry:
    """Build a judge registry with all judges."""
    registry = JudgeRegistry()
    registry.register(ExperienceJudge())
    registry.register(LocationJudge())
    registry.register(TechnicianJudge())
    registry.register(GradeItemJudge())
    registry.register(IneligibilityJudge())
    return registry


class JudgementStep:
    """Execute requirement judgments for all company-office-requirement combinations."""

    def __init__(
        self,
        db: DBAdapter,
        master_data: MasterDataService,
        config: AppConfig,
    ) -> None:
        self.db = db
        self.master_data = master_data
        self.config = config
        self.registry = _build_registry()

    def run(self, remove_table: bool = False) -> None:
        """Execute the judgment step."""
        tables = self.config.tables
        dialect = self.config.db.backend if self.config.db.backend != "bigquery" else "postgres"

        # Ensure result tables exist
        self._ensure_tables(tables, dialect, remove_table)

        # Load master data
        print("Loading master data...")
        master_dict = self.master_data.as_dict()
        print("Master data loaded.")

        # Get target combinations
        df_targets = self._get_target_combinations(tables)
        print(f"Target combinations: {len(df_targets)}")

        if df_targets.empty:
            print("No combinations to process.")
            return

        # Load requirements grouped by announcement
        req_df = self.db.select_all(tables.bid_requirements)
        req_map = dict(tuple(req_df.groupby("announcement_no")))

        # Parallel processing
        n_processes = cpu_count()
        print(f"Using {n_processes} processes for parallel execution")

        chunks = np.array_split(df_targets, n_processes)
        tasks = [
            (chunk, req_map, master_dict, self.registry.registered_types)
            for chunk in chunks
            if len(chunk) > 0
        ]

        print(f"Starting parallel processing with {len(tasks)} tasks...")
        with Pool(processes=n_processes) as pool:
            chunk_results = list(
                tqdm(
                    pool.imap(_process_chunk, tasks),
                    total=len(tasks),
                    desc="Processing chunks",
                )
            )

        # Aggregate results
        self._aggregate_and_store(chunk_results, tables)

    def _ensure_tables(
        self, tables, dialect: str, remove_table: bool
    ) -> None:
        """Create or recreate result tables."""
        table_schemas = [
            (tables.company_bid_judgement, COMPANY_BID_JUDGEMENT),
            (tables.sufficient_requirements, SUFFICIENT_REQUIREMENTS),
            (tables.insufficient_requirements, INSUFFICIENT_REQUIREMENTS),
        ]

        for table_name, schema in table_schemas:
            if self.db.table_exists(table_name):
                if remove_table:
                    self.db.drop_table(table_name)
                    print(f"Dropped: {table_name}")
                else:
                    print(f"Exists: {table_name}")
                    continue

            self.db.create_table(table_name, schema.to_ddl(dialect))
            print(f"Created: {table_name}")

    def _get_target_combinations(self, tables) -> pd.DataFrame:
        """Get company-office-announcement combinations to evaluate."""
        if not self.db.table_exists(tables.company_bid_judgement):
            return pd.DataFrame()

        # Get combinations where final_status is not yet set
        query = f"""
            SELECT DISTINCT
                cbj.announcement_no,
                cbj.company_no,
                cbj.office_no
            FROM {tables.company_bid_judgement} cbj
            WHERE cbj.final_status IS NULL
        """
        try:
            return self.db.execute(query)
        except Exception:
            # If no unprocessed records, try cross-join approach
            return self._build_combinations(tables)

    def _build_combinations(self, tables) -> pd.DataFrame:
        """Build all company-office-announcement combinations."""
        query = f"""
            SELECT DISTINCT
                ba.announcement_no,
                om.company_no,
                om.office_no
            FROM {tables.bid_announcements} ba
            CROSS JOIN {tables.office_master} om
        """
        try:
            return self.db.execute(query)
        except Exception as e:
            print(f"Failed to build combinations: {e}")
            return pd.DataFrame()

    def _aggregate_and_store(self, chunk_results: list[dict], tables) -> None:
        """Aggregate parallel results and store to database."""
        judgements = []
        sufficient = []
        insufficient = []

        for result in chunk_results:
            judgements.extend(result["judgement"])
            sufficient.extend(result["sufficient"])
            insufficient.extend(result["insufficient"])

        print(
            f"Results: {len(judgements)} judgements, "
            f"{len(sufficient)} sufficient, {len(insufficient)} insufficient"
        )

        if judgements:
            df = pd.DataFrame(judgements)
            self.db.upload_dataframe(df, tables.company_bid_judgement)
            print(f"Stored {len(judgements)} judgement results.")

        if sufficient:
            df = pd.DataFrame(sufficient)
            self.db.upload_dataframe(df, tables.sufficient_requirements)
            print(f"Stored {len(sufficient)} sufficient requirements.")

        if insufficient:
            df = pd.DataFrame(insufficient)
            self.db.upload_dataframe(df, tables.insufficient_requirements)
            print(f"Stored {len(insufficient)} insufficient requirements.")
