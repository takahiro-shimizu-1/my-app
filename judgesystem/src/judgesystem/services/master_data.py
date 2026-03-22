"""Master data loading service with caching.

Replaces the original Master class which was just a bag of file paths.
Provides lazy-loaded, cached access to all master data files.
"""

from __future__ import annotations

from functools import lru_cache

import pandas as pd

from judgesystem.config import MasterDataConfig


class MasterDataService:
    """Centralized master data access with caching.

    Master data is loaded once and cached for the lifetime of the service.
    This eliminates the original pattern of re-reading CSV files
    on every function call (including via mutable default arguments).
    """

    def __init__(self, config: MasterDataConfig | None = None) -> None:
        self._config = config or MasterDataConfig()
        self._cache: dict[str, pd.DataFrame] = {}

    def _load(self, key: str, path: str, **kwargs) -> pd.DataFrame:
        """Load a TSV file with caching."""
        if key not in self._cache:
            self._cache[key] = pd.read_csv(path, sep="\t", **kwargs)
        return self._cache[key]

    @property
    def agency(self) -> pd.DataFrame:
        return self._load("agency", self._config.agency)

    @property
    def company(self) -> pd.DataFrame:
        return self._load("company", self._config.company)

    @property
    def construction(self) -> pd.DataFrame:
        return self._load("construction", self._config.construction)

    @property
    def office(self) -> pd.DataFrame:
        return self._load("office", self._config.office)

    @property
    def office_work_achievements(self) -> pd.DataFrame:
        return self._load("office_work_achievements",
                          self._config.office_work_achievements)

    @property
    def office_registration_authorization(self) -> pd.DataFrame:
        return self._load("office_registration_authorization",
                          self._config.office_registration_authorization)

    @property
    def office_registration_authorization_str(self) -> pd.DataFrame:
        """Office registration with construction_no as string."""
        return self._load(
            "office_registration_authorization_str",
            self._config.office_registration_authorization,
            converters={"construction_no": lambda x: str(x)},
        )

    @property
    def employee(self) -> pd.DataFrame:
        return self._load("employee", self._config.employee)

    @property
    def employee_qualification(self) -> pd.DataFrame:
        return self._load("employee_qualification",
                          self._config.employee_qualification)

    @property
    def employee_experience(self) -> pd.DataFrame:
        return self._load("employee_experience",
                          self._config.employee_experience)

    @property
    def technician_qualification(self) -> pd.DataFrame:
        return self._load("technician_qualification",
                          self._config.technician_qualification)

    @property
    def partners(self) -> pd.DataFrame:
        return self._load("partners", self._config.partners)

    def as_dict(self) -> dict[str, pd.DataFrame]:
        """Return all master data as a dict (for passing to judges)."""
        return {
            "agency": self.agency,
            "company": self.company,
            "construction": self.construction,
            "office": self.office,
            "office_work_achievements": self.office_work_achievements,
            "office_registration_authorization": self.office_registration_authorization,
            "employee": self.employee,
            "employee_qualification": self.employee_qualification,
            "employee_experience": self.employee_experience,
            "technician_qualification": self.technician_qualification,
        }

    def clear_cache(self) -> None:
        """Clear all cached data (useful for testing)."""
        self._cache.clear()
