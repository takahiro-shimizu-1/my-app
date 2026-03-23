"""
FastAPI wrapper for the judgment engine requirement-checking functions.

Each endpoint accepts JSON with requirement text and company/office identifiers,
fetches the necessary master data from PostgreSQL, and returns a judgment result
with {is_ok: bool, reason: str}.
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Optional

import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text

from requirements.ineligibility import checkIneligibilityDynamic
from requirements.experience import checkExperienceRequirement
from requirements.grade_item import checkGradeAndItemRequirement
from requirements.location import checkLocationRequirement
from requirements.technician import checkTechnicianRequirement

logger = logging.getLogger("judgment-engine")
logging.basicConfig(level=logging.INFO)

# ---------------------------------------------------------------------------
# Database connection
# ---------------------------------------------------------------------------

def get_database_url() -> str:
    """Build PostgreSQL connection URL from environment variables."""
    host = os.environ.get("PGHOST", "localhost")
    port = os.environ.get("PGPORT", "5432")
    database = os.environ.get("PGDATABASE", "judgesystem")
    user = os.environ.get("PGUSER", "postgres")
    password = os.environ.get("PGPASSWORD", "postgres")
    return f"postgresql://{user}:{password}@{host}:{port}/{database}"


_engine = None


def get_engine():
    """Lazy-initialise and return a SQLAlchemy engine."""
    global _engine
    if _engine is None:
        _engine = create_engine(get_database_url(), pool_pre_ping=True)
    return _engine


def read_table(table_name: str, **kwargs) -> pd.DataFrame:
    """Read a whole table into a DataFrame.  Extra kwargs are forwarded to
    ``pd.read_sql_table`` (e.g. ``dtype`` overrides)."""
    engine = get_engine()
    try:
        return pd.read_sql_table(table_name, engine, **kwargs)
    except Exception as exc:
        logger.warning("Could not read table %s: %s", table_name, exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Master data loaders (cached per-request is fine for now)
# ---------------------------------------------------------------------------

def load_company_data() -> pd.DataFrame:
    return read_table("company_master")


def load_office_registration_authorization_data() -> pd.DataFrame:
    return read_table("office_registration_authorization_master")


def load_office_experience_data() -> pd.DataFrame:
    return read_table("office_work_achivements_master")


def load_agency_data() -> pd.DataFrame:
    return read_table("agency_master")


def load_construction_data() -> pd.DataFrame:
    return read_table("construction_master")


def load_office_data() -> pd.DataFrame:
    return read_table("office_master")


def load_license_data() -> pd.DataFrame:
    return read_table(
        "office_registration_authorization_master",
        dtype={"construction_no": str},
    )


def load_employee_data() -> pd.DataFrame:
    return read_table("employee_master")


def load_employee_qualification_data() -> pd.DataFrame:
    return read_table("employee_qualification_master")


def load_technician_qualification_master() -> pd.DataFrame:
    return read_table("technician_qualification_master")


def load_employee_experience_data() -> pd.DataFrame:
    return read_table("employee_experience_master")


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------

class JudgmentResult(BaseModel):
    """Common response schema returned by every judgment endpoint."""
    is_ok: bool
    reason: str


class IneligibilityRequest(BaseModel):
    """Request body for the ineligibility check."""
    requirement_text: str = Field(..., description="Requirement text to evaluate")
    company_no: int = Field(..., description="Company number")
    office_no: int = Field(..., description="Office (branch) number")


class ExperienceRequest(BaseModel):
    """Request body for the experience check."""
    requirement_text: str = Field(..., description="Requirement text to evaluate")
    office_no: int = Field(..., description="Office (branch) number")


class GradeRequest(BaseModel):
    """Request body for the grade and item check."""
    requirement_text: str = Field(..., description="Requirement text to evaluate")
    office_no: int = Field(..., description="Office (branch) number")


class LocationRequest(BaseModel):
    """Request body for the location check."""
    requirement_text: str = Field(..., description="Requirement text to evaluate")
    office_no: int = Field(..., description="Office (branch) number")


class TechnicianRequest(BaseModel):
    """Request body for the technician check."""
    requirement_text: str = Field(..., description="Requirement text to evaluate")
    company_no: int = Field(..., description="Company number")
    office_no: int = Field(..., description="Office (branch) number")


# ---------------------------------------------------------------------------
# Application lifespan
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(application: FastAPI):
    """Verify DB connectivity on startup."""
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection verified")
    except Exception as exc:
        logger.warning("Database not reachable at startup: %s", exc)
    yield
    # Shutdown: dispose engine
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None


# ---------------------------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Judgment Engine API",
    description="FastAPI wrapper around bid-announcement requirement judgment functions",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health", response_model=dict)
async def health_check():
    """Return service health status."""
    db_ok = False
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass
    return {"status": "ok", "database": db_ok}


# ---------------------------------------------------------------------------
# Judgment endpoints
# ---------------------------------------------------------------------------

@app.post("/api/judge/check-ineligibility", response_model=JudgmentResult)
async def check_ineligibility(req: IneligibilityRequest):
    """Check ineligibility (disqualification) requirements."""
    try:
        company_data = load_company_data()
        office_reg_auth_data = load_office_registration_authorization_data()

        result = checkIneligibilityDynamic(
            requirementText=req.requirement_text,
            companyNo=req.company_no,
            officeNo=req.office_no,
            company_data=company_data,
            office_registration_authorization_data=office_reg_auth_data,
        )
        return JudgmentResult(is_ok=result["is_ok"], reason=result["reason"])
    except Exception as exc:
        logger.exception("check-ineligibility failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/judge/check-experience", response_model=JudgmentResult)
async def check_experience(req: ExperienceRequest):
    """Check experience (track-record) requirements."""
    try:
        office_experience_data = load_office_experience_data()
        agency_data = load_agency_data()
        construction_data = load_construction_data()

        result = checkExperienceRequirement(
            requirementText=req.requirement_text,
            officeNo=req.office_no,
            office_experience_data=office_experience_data,
            agency_data=agency_data,
            construction_data=construction_data,
        )
        return JudgmentResult(is_ok=result["is_ok"], reason=result["reason"])
    except Exception as exc:
        logger.exception("check-experience failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/judge/check-grade", response_model=JudgmentResult)
async def check_grade(req: GradeRequest):
    """Check grade and business-item requirements."""
    try:
        license_data = load_license_data()
        agency_data = load_agency_data()
        construction_data = load_construction_data()

        result = checkGradeAndItemRequirement(
            requirementText=req.requirement_text,
            officeNo=req.office_no,
            licenseData=license_data,
            agencyData=agency_data,
            constructionData=construction_data,
        )
        return JudgmentResult(is_ok=result["is_ok"], reason=result["reason"])
    except Exception as exc:
        logger.exception("check-grade failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/judge/check-location", response_model=JudgmentResult)
async def check_location(req: LocationRequest):
    """Check location (office address) requirements."""
    try:
        agency_data = load_agency_data()
        office_data = load_office_data()

        result = checkLocationRequirement(
            requirementText=req.requirement_text,
            officeNo=req.office_no,
            agencyData=agency_data,
            officeData=office_data,
        )
        return JudgmentResult(is_ok=result["is_ok"], reason=result["reason"])
    except Exception as exc:
        logger.exception("check-location failed")
        raise HTTPException(status_code=500, detail=str(exc))


@app.post("/api/judge/check-technician", response_model=JudgmentResult)
async def check_technician(req: TechnicianRequest):
    """Check technician (qualified engineer) requirements."""
    try:
        employee_data = load_employee_data()
        qual_data = load_employee_qualification_data()
        qual_master_data = load_technician_qualification_master()
        exp_data = load_employee_experience_data()

        result = checkTechnicianRequirement(
            requirementText=req.requirement_text,
            companyNo=req.company_no,
            officeNo=req.office_no,
            employeeData=employee_data,
            qualData=qual_data,
            qualMasterData=qual_master_data,
            expData=exp_data,
        )
        return JudgmentResult(is_ok=result["is_ok"], reason=result["reason"])
    except Exception as exc:
        logger.exception("check-technician failed")
        raise HTTPException(status_code=500, detail=str(exc))
