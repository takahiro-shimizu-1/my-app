"""File storage service (local filesystem and Google Cloud Storage).

Replaces the scattered GCS helper functions from main.py with
a unified storage interface.
"""

from __future__ import annotations

import os
from pathlib import Path

from judgesystem.config import StorageConfig


class StorageService:
    """Unified file storage for local and GCS backends."""

    def __init__(self, config: StorageConfig | None = None) -> None:
        self._config = config or StorageConfig()
        self._gcs_client = None

    @property
    def use_gcs(self) -> bool:
        return self._config.use_gcs

    def _get_gcs_client(self):
        """Lazy-init GCS client."""
        if self._gcs_client is None:
            from google.cloud import storage
            self._gcs_client = storage.Client()
        return self._gcs_client

    def exists(self, path: str) -> bool:
        """Check if a file exists (local or GCS)."""
        if path.startswith("gs://"):
            return self._gcs_exists(path)
        return os.path.exists(path)

    def read_bytes(self, path: str) -> bytes:
        """Read file contents as bytes."""
        if path.startswith("gs://"):
            return self._gcs_download(path)
        return Path(path).read_bytes()

    def read_text(self, path: str, encoding: str = "utf-8") -> str:
        """Read file contents as text."""
        return self.read_bytes(path).decode(encoding)

    def write_bytes(self, path: str, data: bytes, content_type: str | None = None) -> None:
        """Write bytes to a file."""
        if path.startswith("gs://"):
            self._gcs_upload(path, data, content_type)
        else:
            p = Path(path)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)

    def write_text(self, path: str, text: str, encoding: str = "utf-8") -> None:
        """Write text to a file."""
        self.write_bytes(path, text.encode(encoding))

    def list_files(self, prefix: str) -> list[str]:
        """List files under a path prefix."""
        if prefix.startswith("gs://"):
            return self._gcs_list(prefix)
        p = Path(prefix)
        if p.is_dir():
            return [str(f) for f in p.rglob("*") if f.is_file()]
        return []

    def build_path(self, *parts: str) -> str:
        """Build a storage path (GCS or local)."""
        if self.use_gcs and self._config.gcs_bucket:
            return f"gs://{self._config.gcs_bucket}/{'/'.join(parts)}"
        return os.path.join(self._config.local_base_dir, *parts)

    # -- GCS internals --

    @staticmethod
    def _parse_gcs_path(gcs_path: str) -> tuple[str, str]:
        parts = gcs_path[5:].split("/", 1)
        return parts[0], parts[1] if len(parts) == 2 else ""

    def _gcs_exists(self, gcs_path: str) -> bool:
        bucket_name, blob_name = self._parse_gcs_path(gcs_path)
        try:
            bucket = self._get_gcs_client().bucket(bucket_name)
            return bucket.blob(blob_name).exists()
        except Exception:
            return False

    def _gcs_download(self, gcs_path: str) -> bytes:
        bucket_name, blob_name = self._parse_gcs_path(gcs_path)
        bucket = self._get_gcs_client().bucket(bucket_name)
        return bucket.blob(blob_name).download_as_bytes()

    def _gcs_upload(self, gcs_path: str, data: bytes, content_type: str | None = None) -> None:
        bucket_name, blob_name = self._parse_gcs_path(gcs_path)
        client = self._get_gcs_client()
        bucket = client.bucket(bucket_name)
        if not bucket.exists():
            bucket.create()
        blob = bucket.blob(blob_name)
        if content_type:
            blob.upload_from_string(data, content_type=content_type)
        else:
            blob.upload_from_string(data)

    def _gcs_list(self, gcs_prefix: str) -> list[str]:
        bucket_name, prefix = self._parse_gcs_path(gcs_prefix)
        client = self._get_gcs_client()
        bucket = client.bucket(bucket_name)
        return [f"gs://{bucket_name}/{b.name}" for b in bucket.list_blobs(prefix=prefix)]
