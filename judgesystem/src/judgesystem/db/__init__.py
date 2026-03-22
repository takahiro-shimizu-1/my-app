"""Database abstraction layer."""

from judgesystem.db.base import DBAdapter
from judgesystem.db.factory import create_adapter

__all__ = ["DBAdapter", "create_adapter"]
