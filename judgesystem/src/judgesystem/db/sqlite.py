"""SQLite database adapter."""

from __future__ import annotations

import sqlite3

import pandas as pd

from judgesystem.db.base import DBAdapter


class SQLiteAdapter(DBAdapter):
    """SQLite implementation of DBAdapter."""

    def __init__(self, db_path: str) -> None:
        self.db_path = db_path
        self.conn = sqlite3.connect(db_path, isolation_level=None)
        self.conn.row_factory = sqlite3.Row

    def execute(self, query: str, params: dict | None = None) -> pd.DataFrame:
        if params:
            return pd.read_sql_query(query, self.conn, params=params)
        return pd.read_sql_query(query, self.conn)

    def execute_update(self, query: str, params: dict | None = None) -> int:
        cur = self.conn.cursor()
        if params:
            cur.execute(query, params)
        else:
            cur.execute(query)
        return cur.rowcount

    def table_exists(self, table_name: str) -> bool:
        cur = self.conn.cursor()
        cur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,),
        )
        return cur.fetchone() is not None

    def drop_table(self, table_name: str) -> None:
        self.conn.execute(f"DROP TABLE IF EXISTS {table_name}")

    def upload_dataframe(
        self, df: pd.DataFrame, table_name: str, chunk_size: int = 5000
    ) -> None:
        df.to_sql(table_name, self.conn, if_exists="append", index=False,
                   chunksize=chunk_size)

    def create_table(self, table_name: str, schema: str) -> None:
        self.conn.execute(schema)

    def create_index(
        self, index_name: str, table_name: str, columns: list[str]
    ) -> None:
        cols = ", ".join(columns)
        self.conn.execute(
            f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({cols})"
        )

    def ensure_column(
        self, table_name: str, column_name: str, column_type: str
    ) -> None:
        cur = self.conn.cursor()
        cur.execute(f"PRAGMA table_info({table_name})")
        existing = {row[1] for row in cur.fetchall()}
        if column_name not in existing:
            self.conn.execute(
                f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"
            )

    def close(self) -> None:
        self.conn.close()
