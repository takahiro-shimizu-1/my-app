"""Abstract database adapter interface.

All database-specific implementations (SQLite, PostgreSQL, BigQuery)
implement this interface. Business logic depends only on this abstraction,
never on concrete database classes.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

import pandas as pd


class DBAdapter(ABC):
    """Abstract database adapter.

    Provides a uniform interface for all database operations.
    Concrete implementations handle dialect-specific SQL.
    """

    @abstractmethod
    def execute(self, query: str, params: dict | None = None) -> pd.DataFrame:
        """Execute a query and return results as DataFrame."""

    @abstractmethod
    def execute_update(self, query: str, params: dict | None = None) -> int:
        """Execute an update/insert query and return affected row count."""

    @abstractmethod
    def table_exists(self, table_name: str) -> bool:
        """Check if a table exists."""

    @abstractmethod
    def drop_table(self, table_name: str) -> None:
        """Drop a table if it exists."""

    @abstractmethod
    def upload_dataframe(
        self, df: pd.DataFrame, table_name: str, chunk_size: int = 5000
    ) -> None:
        """Upload a DataFrame to a table (create or append)."""

    @abstractmethod
    def create_table(self, table_name: str, schema: str) -> None:
        """Create a table from a DDL schema string."""

    @abstractmethod
    def create_index(
        self, index_name: str, table_name: str, columns: list[str]
    ) -> None:
        """Create an index on a table."""

    @abstractmethod
    def ensure_column(
        self, table_name: str, column_name: str, column_type: str
    ) -> None:
        """Add a column to a table if it doesn't exist."""

    def select_all(self, table_name: str, where: str = "") -> pd.DataFrame:
        """Select all rows from a table with optional WHERE clause."""
        query = f"SELECT * FROM {table_name}"
        if where:
            query += f" WHERE {where}"
        return self.execute(query)

    @abstractmethod
    def close(self) -> None:
        """Close the database connection."""
