"""Database adapter factory."""

from __future__ import annotations

from judgesystem.config import DBConfig
from judgesystem.db.base import DBAdapter


def create_adapter(config: DBConfig) -> DBAdapter:
    """Create a database adapter based on configuration.

    Args:
        config: Database configuration specifying backend and credentials.

    Returns:
        Concrete DBAdapter instance.

    Raises:
        ValueError: If backend is unknown.
        RuntimeError: If required dependencies are not installed.
    """
    if config.backend == "sqlite":
        from judgesystem.db.sqlite import SQLiteAdapter

        if not config.sqlite_path:
            raise ValueError("sqlite_path is required for SQLite backend")
        return SQLiteAdapter(db_path=config.sqlite_path)

    if config.backend == "postgres":
        from judgesystem.db.postgres import PostgresAdapter

        if not config.postgres_host:
            raise ValueError("postgres_host is required for PostgreSQL backend")
        return PostgresAdapter(
            host=config.postgres_host,
            port=config.postgres_port,
            database=config.postgres_database or "postgres",
            user=config.postgres_user or "postgres",
            password=config.postgres_password or "",
        )

    if config.backend == "bigquery":
        raise NotImplementedError(
            "BigQuery adapter not yet migrated. "
            "Use PostgreSQL for production workloads."
        )

    raise ValueError(f"Unknown database backend: {config.backend}")
