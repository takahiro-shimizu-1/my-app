"""Tests for database abstraction layer."""

from __future__ import annotations

import pandas as pd
import pytest

from judgesystem.db.schema import BID_ANNOUNCEMENTS, TableSchema, ColumnDef
from judgesystem.db.sqlite import SQLiteAdapter
from judgesystem.db.factory import create_adapter
from judgesystem.config import DBConfig


class TestSQLiteAdapter:
    def test_create_and_query_table(self, tmp_db):
        tmp_db.create_table("test", BID_ANNOUNCEMENTS.to_ddl("sqlite"))
        assert tmp_db.table_exists("bid_announcements")

    def test_upload_and_select(self, tmp_db):
        tmp_db.create_table("items", "CREATE TABLE items (id INTEGER, name TEXT)")
        df = pd.DataFrame({"id": [1, 2], "name": ["a", "b"]})
        tmp_db.upload_dataframe(df, "items")
        result = tmp_db.select_all("items")
        assert len(result) == 2

    def test_drop_table(self, tmp_db):
        tmp_db.create_table("temp", "CREATE TABLE temp (id INTEGER)")
        assert tmp_db.table_exists("temp")
        tmp_db.drop_table("temp")
        assert not tmp_db.table_exists("temp")

    def test_ensure_column(self, tmp_db):
        tmp_db.create_table("t", "CREATE TABLE t (id INTEGER)")
        tmp_db.ensure_column("t", "name", "TEXT")
        df = pd.DataFrame({"id": [1], "name": ["test"]})
        tmp_db.upload_dataframe(df, "t")
        result = tmp_db.select_all("t")
        assert "name" in result.columns

    def test_create_index(self, tmp_db):
        tmp_db.create_table("t", "CREATE TABLE t (id INTEGER, name TEXT)")
        # Should not raise
        tmp_db.create_index("idx_t_name", "t", ["name"])


class TestTableSchema:
    def test_ddl_generation_postgres(self):
        schema = TableSchema(
            name="test_table",
            columns=(
                ColumnDef("id", "INTEGER", primary_key=True),
                ColumnDef("name", "TEXT", nullable=False),
                ColumnDef("value", "REAL"),
            ),
        )
        ddl = schema.to_ddl("postgres")
        assert "CREATE TABLE IF NOT EXISTS test_table" in ddl
        assert "id INTEGER PRIMARY KEY" in ddl
        assert "name TEXT NOT NULL" in ddl

    def test_ddl_generation_sqlite_override(self):
        schema = TableSchema(
            name="test",
            columns=(
                ColumnDef("flag", "BOOLEAN", sqlite_type="INTEGER"),
            ),
        )
        ddl = schema.to_ddl("sqlite")
        assert "INTEGER" in ddl

        ddl_pg = schema.to_ddl("postgres")
        assert "BOOLEAN" in ddl_pg


class TestFactory:
    def test_create_sqlite(self, tmp_path):
        config = DBConfig(backend="sqlite", sqlite_path=str(tmp_path / "test.db"))
        adapter = create_adapter(config)
        assert isinstance(adapter, SQLiteAdapter)
        adapter.close()

    def test_create_unknown_raises(self):
        config = DBConfig(backend="unknown")  # type: ignore
        with pytest.raises(ValueError, match="Unknown database backend"):
            create_adapter(config)

    def test_create_sqlite_without_path_raises(self):
        config = DBConfig(backend="sqlite")
        with pytest.raises(ValueError, match="sqlite_path is required"):
            create_adapter(config)
