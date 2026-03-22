"""Shared database schema definitions.

Table schemas are defined once and used by all database backends.
Each backend translates these to dialect-specific DDL.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ColumnDef:
    """Column definition for schema generation."""

    name: str
    pg_type: str  # PostgreSQL type (canonical)
    sqlite_type: str = ""  # SQLite type override (if different)
    nullable: bool = True
    primary_key: bool = False

    def get_type(self, dialect: str) -> str:
        if dialect == "sqlite" and self.sqlite_type:
            return self.sqlite_type
        return self.pg_type


@dataclass(frozen=True)
class TableSchema:
    """Table schema definition."""

    name: str
    columns: tuple[ColumnDef, ...]

    def to_ddl(self, dialect: str = "postgres") -> str:
        """Generate CREATE TABLE DDL for the given dialect."""
        col_defs = []
        for col in self.columns:
            parts = [col.name, col.get_type(dialect)]
            if col.primary_key:
                parts.append("PRIMARY KEY")
            elif not col.nullable:
                parts.append("NOT NULL")
            col_defs.append(" ".join(parts))

        cols_sql = ",\n    ".join(col_defs)
        return f"CREATE TABLE IF NOT EXISTS {self.name} (\n    {cols_sql}\n)"


# -- Shared table schemas --

BID_ANNOUNCEMENTS = TableSchema(
    name="bid_announcements",
    columns=(
        ColumnDef("announcement_no", "INTEGER", primary_key=True),
        ColumnDef("document_id", "TEXT"),
        ColumnDef("project_name", "TEXT"),
        ColumnDef("organization", "TEXT"),
        ColumnDef("agency_name", "TEXT"),
        ColumnDef("parent_agency_name", "TEXT"),
        ColumnDef("deadline", "TEXT"),
        ColumnDef("budget", "TEXT"),
        ColumnDef("work_location", "TEXT"),
        ColumnDef("category", "TEXT"),
        ColumnDef("bid_type", "TEXT"),
        ColumnDef("construction_type", "TEXT"),
        ColumnDef("grade", "TEXT"),
        ColumnDef("prefecture", "TEXT"),
        ColumnDef("created_at", "TEXT"),
    ),
)

BID_REQUIREMENTS = TableSchema(
    name="bid_requirements",
    columns=(
        ColumnDef("requirement_no", "INTEGER", primary_key=True),
        ColumnDef("announcement_no", "INTEGER", nullable=False),
        ColumnDef("requirement_type", "TEXT"),
        ColumnDef("requirement_text", "TEXT"),
        ColumnDef("requirement_detail", "TEXT"),
        ColumnDef("is_mandatory", "INTEGER", sqlite_type="INTEGER"),
    ),
)

COMPANY_BID_JUDGEMENT = TableSchema(
    name="company_bid_judgement",
    columns=(
        ColumnDef("evaluation_no", "TEXT", primary_key=True),
        ColumnDef("announcement_no", "INTEGER"),
        ColumnDef("company_no", "INTEGER"),
        ColumnDef("company_name", "TEXT"),
        ColumnDef("office_no", "INTEGER"),
        ColumnDef("office_name", "TEXT"),
        ColumnDef("office_prefecture", "TEXT"),
        ColumnDef("project_name", "TEXT"),
        ColumnDef("organization", "TEXT"),
        ColumnDef("deadline", "TEXT"),
        ColumnDef("final_status", "TEXT"),
        ColumnDef("work_status", "TEXT"),
        ColumnDef("priority", "TEXT"),
    ),
)

SUFFICIENT_REQUIREMENTS = TableSchema(
    name="sufficient_requirements",
    columns=(
        ColumnDef("sufficient_requirement_no", "TEXT", primary_key=True),
        ColumnDef("evaluation_no", "TEXT"),
        ColumnDef("announcement_no", "INTEGER"),
        ColumnDef("company_no", "INTEGER"),
        ColumnDef("office_no", "INTEGER"),
        ColumnDef("requirement_type", "TEXT"),
        ColumnDef("requirement_text", "TEXT"),
        ColumnDef("reason", "TEXT"),
    ),
)

INSUFFICIENT_REQUIREMENTS = TableSchema(
    name="insufficient_requirements",
    columns=(
        ColumnDef("insufficient_requirement_no", "TEXT", primary_key=True),
        ColumnDef("evaluation_no", "TEXT"),
        ColumnDef("announcement_no", "INTEGER"),
        ColumnDef("company_no", "INTEGER"),
        ColumnDef("office_no", "INTEGER"),
        ColumnDef("requirement_type", "TEXT"),
        ColumnDef("requirement_text", "TEXT"),
        ColumnDef("reason", "TEXT"),
    ),
)

ANNOUNCEMENTS_DOCUMENTS = TableSchema(
    name="announcements_documents_master",
    columns=(
        ColumnDef("document_id", "TEXT", primary_key=True),
        ColumnDef("announcement_url", "TEXT"),
        ColumnDef("top_agency_name", "TEXT"),
        ColumnDef("agency_name", "TEXT"),
        ColumnDef("project_name", "TEXT"),
        ColumnDef("file_format", "TEXT"),
        ColumnDef("pdf_path", "TEXT"),
        ColumnDef("markdown_path", "TEXT"),
        ColumnDef("ocr_json_path", "TEXT"),
        ColumnDef("page_count", "INTEGER"),
        ColumnDef("fetched_at", "TEXT"),
    ),
)

# Registry of all schemas for automated table creation
ALL_SCHEMAS: dict[str, TableSchema] = {
    "bid_announcements": BID_ANNOUNCEMENTS,
    "bid_requirements": BID_REQUIREMENTS,
    "company_bid_judgement": COMPANY_BID_JUDGEMENT,
    "sufficient_requirements": SUFFICIENT_REQUIREMENTS,
    "insufficient_requirements": INSUFFICIENT_REQUIREMENTS,
    "announcements_documents_master": ANNOUNCEMENTS_DOCUMENTS,
}
