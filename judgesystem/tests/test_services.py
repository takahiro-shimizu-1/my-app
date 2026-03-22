"""Tests for service modules."""

from __future__ import annotations

import pandas as pd
import pytest

from judgesystem.services.master_data import MasterDataService
from judgesystem.services.storage import StorageService
from judgesystem.config import StorageConfig


class TestMasterDataService:
    def test_loads_data(self, sample_master_data):
        service = MasterDataService(sample_master_data)
        assert len(service.agency) == 2
        assert len(service.company) == 2

    def test_caching(self, sample_master_data):
        service = MasterDataService(sample_master_data)
        df1 = service.agency
        df2 = service.agency
        assert df1 is df2  # Same object (cached)

    def test_clear_cache(self, sample_master_data):
        service = MasterDataService(sample_master_data)
        _ = service.agency
        service.clear_cache()
        assert len(service._cache) == 0

    def test_as_dict(self, sample_master_data):
        service = MasterDataService(sample_master_data)
        d = service.as_dict()
        assert "agency" in d
        assert "company" in d
        assert "construction" in d


class TestStorageService:
    def test_local_write_and_read(self, tmp_path):
        config = StorageConfig(local_base_dir=str(tmp_path))
        storage = StorageService(config)

        path = str(tmp_path / "test.txt")
        storage.write_text(path, "hello world")
        assert storage.exists(path)
        assert storage.read_text(path) == "hello world"

    def test_local_read_bytes(self, tmp_path):
        config = StorageConfig(local_base_dir=str(tmp_path))
        storage = StorageService(config)

        path = str(tmp_path / "test.bin")
        data = b"\x00\x01\x02"
        storage.write_bytes(path, data)
        assert storage.read_bytes(path) == data

    def test_build_path_local(self):
        config = StorageConfig(local_base_dir="/output")
        storage = StorageService(config)
        path = storage.build_path("2024", "docs", "file.pdf")
        assert path == "/output/2024/docs/file.pdf"

    def test_build_path_gcs(self):
        config = StorageConfig(use_gcs=True, gcs_bucket="my-bucket")
        storage = StorageService(config)
        path = storage.build_path("2024", "docs", "file.pdf")
        assert path == "gs://my-bucket/2024/docs/file.pdf"

    def test_list_files(self, tmp_path):
        config = StorageConfig(local_base_dir=str(tmp_path))
        storage = StorageService(config)

        (tmp_path / "a.txt").write_text("a")
        (tmp_path / "b.txt").write_text("b")

        files = storage.list_files(str(tmp_path))
        assert len(files) == 2
