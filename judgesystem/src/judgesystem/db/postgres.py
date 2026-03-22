"""PostgreSQL database adapter."""

from __future__ import annotations

import pandas as pd

from judgesystem.db.base import DBAdapter

try:
    import psycopg2
    from psycopg2.extras import execute_values
    from sqlalchemy import create_engine

    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False


class PostgresAdapter(DBAdapter):
    """PostgreSQL implementation of DBAdapter."""

    def __init__(
        self,
        host: str,
        port: int = 5432,
        database: str = "postgres",
        user: str = "postgres",
        password: str = "",
    ) -> None:
        if not POSTGRES_AVAILABLE:
            raise RuntimeError(
                "psycopg2 and sqlalchemy are required for PostgreSQL support. "
                "Install with: pip install psycopg2-binary sqlalchemy"
            )

        self.host = host
        self.port = port
        self.database = database
        self.user = user
        self.password = password

        self._conn = psycopg2.connect(
            host=host, port=port, database=database,
            user=user, password=password,
        )
        self._conn.autocommit = True

        self._engine = create_engine(
            f"postgresql://{user}:{password}@{host}:{port}/{database}"
        )

    def execute(self, query: str, params: dict | None = None) -> pd.DataFrame:
        return pd.read_sql_query(query, self._engine, params=params)

    def execute_update(self, query: str, params: dict | None = None) -> int:
        cur = self._conn.cursor()
        cur.execute(query, params)
        return cur.rowcount

    def table_exists(self, table_name: str) -> bool:
        cur = self._conn.cursor()
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_name = %s)",
            (table_name,),
        )
        row = cur.fetchone()
        return bool(row and row[0])

    def drop_table(self, table_name: str) -> None:
        cur = self._conn.cursor()
        cur.execute(f"DROP TABLE IF EXISTS {table_name} CASCADE")

    def upload_dataframe(
        self, df: pd.DataFrame, table_name: str, chunk_size: int = 5000
    ) -> None:
        df.to_sql(
            table_name, self._engine, if_exists="append",
            index=False, chunksize=chunk_size, method="multi",
        )

    def create_table(self, table_name: str, schema: str) -> None:
        cur = self._conn.cursor()
        cur.execute(schema)

    def create_index(
        self, index_name: str, table_name: str, columns: list[str]
    ) -> None:
        cols = ", ".join(columns)
        cur = self._conn.cursor()
        cur.execute(
            f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({cols})"
        )

    def ensure_column(
        self, table_name: str, column_name: str, column_type: str
    ) -> None:
        cur = self._conn.cursor()
        cur.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = %s AND column_name = %s",
            (table_name, column_name),
        )
        if cur.fetchone() is None:
            cur.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
            )

    def close(self) -> None:
        self._conn.close()
        self._engine.dispose()
