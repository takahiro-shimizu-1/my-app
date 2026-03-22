"""Tests for configuration module."""

from __future__ import annotations

from judgesystem.config import (
    AppConfig,
    DBConfig,
    MasterDataConfig,
    OCRConfig,
    PipelineConfig,
    StorageConfig,
    TableNames,
)


class TestDBConfig:
    def test_defaults(self):
        config = DBConfig()
        assert config.backend == "sqlite"
        assert config.postgres_port == 5432

    def test_postgres_config(self):
        config = DBConfig(
            backend="postgres",
            postgres_host="localhost",
            postgres_database="biddb",
        )
        assert config.backend == "postgres"
        assert config.postgres_host == "localhost"

    def test_frozen(self):
        config = DBConfig()
        try:
            config.backend = "postgres"  # type: ignore
            assert False, "Should raise"
        except AttributeError:
            pass


class TestMasterDataConfig:
    def test_paths(self):
        config = MasterDataConfig(base_dir="data/master")
        assert config.agency == "data/master/agency_master.txt"
        assert config.company == "data/master/company_master.txt"


class TestAppConfig:
    def test_defaults(self):
        config = AppConfig()
        assert config.db.backend == "sqlite"
        assert config.storage.use_gcs is False
        assert config.pipeline.run_step0 is False

    def test_nested_config(self):
        config = AppConfig(
            db=DBConfig(backend="postgres", postgres_host="db.example.com"),
            pipeline=PipelineConfig(run_step0=True, step3_remove_table=True),
        )
        assert config.db.postgres_host == "db.example.com"
        assert config.pipeline.run_step0 is True
        assert config.pipeline.step3_remove_table is True
