"""
FastAPI wrapper for the URL auto-collection pipeline.

Provides HTTP endpoints to trigger, monitor, and schedule
the sequential collector pipeline stages.
"""

from __future__ import annotations

import importlib
import logging
import sys
import traceback
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from stages import STAGES, StageInfo

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
)
logger = logging.getLogger("collector")

# ---------------------------------------------------------------------------
# Pipeline state
# ---------------------------------------------------------------------------

class PipelineStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    ERROR = "error"


class PipelineState:
    """Mutable singleton tracking current pipeline execution."""

    def __init__(self) -> None:
        self.status: PipelineStatus = PipelineStatus.IDLE
        self.current_stage: Optional[int] = None
        self.current_stage_name: Optional[str] = None
        self.started_at: Optional[str] = None
        self.finished_at: Optional[str] = None
        self.last_error: Optional[str] = None
        self.stages_completed: list[int] = []

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status.value,
            "current_stage": self.current_stage,
            "current_stage_name": self.current_stage_name,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "last_error": self.last_error,
            "stages_completed": self.stages_completed,
        }

    def reset(self) -> None:
        self.status = PipelineStatus.IDLE
        self.current_stage = None
        self.current_stage_name = None
        self.started_at = None
        self.finished_at = None
        self.last_error = None
        self.stages_completed = []


pipeline_state = PipelineState()

# ---------------------------------------------------------------------------
# Scheduler
# ---------------------------------------------------------------------------
scheduler = BackgroundScheduler()

DEFAULT_CRON = "0 3 * * *"  # daily at 03:00 UTC
SCHEDULE_JOB_ID = "collector_pipeline"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def run_pipeline() -> None:
    """Execute all pipeline stages sequentially."""
    if pipeline_state.status == PipelineStatus.RUNNING:
        logger.warning("Pipeline already running -- skipping")
        return

    pipeline_state.reset()
    pipeline_state.status = PipelineStatus.RUNNING
    pipeline_state.started_at = _now_iso()

    logger.info("Pipeline started")

    for stage in STAGES:
        pipeline_state.current_stage = stage.number
        pipeline_state.current_stage_name = stage.name
        logger.info("Stage %d (%s) starting", stage.number, stage.name)

        try:
            mod = importlib.import_module(stage.module)
            # Each stage module is expected to expose a main() or
            # be runnable at import-time via its __main__ block.
            # We call main() if available; otherwise treat import as run.
            if hasattr(mod, "main"):
                mod.main()
            else:
                logger.info(
                    "Stage %d has no main(); import-time execution assumed",
                    stage.number,
                )
        except Exception:
            tb = traceback.format_exc()
            pipeline_state.status = PipelineStatus.ERROR
            pipeline_state.last_error = tb
            pipeline_state.finished_at = _now_iso()
            logger.error("Stage %d failed:\n%s", stage.number, tb)
            return

        pipeline_state.stages_completed.append(stage.number)
        logger.info("Stage %d (%s) completed", stage.number, stage.name)

    pipeline_state.status = PipelineStatus.COMPLETED
    pipeline_state.current_stage = None
    pipeline_state.current_stage_name = None
    pipeline_state.finished_at = _now_iso()
    logger.info("Pipeline finished successfully")


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start / stop the background scheduler with the app."""
    scheduler.add_job(
        run_pipeline,
        CronTrigger.from_crontab(DEFAULT_CRON),
        id=SCHEDULE_JOB_ID,
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started with default cron: %s", DEFAULT_CRON)
    yield
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")


app = FastAPI(
    title="Judgesystem Collector",
    description="URL auto-collection pipeline for bid announcements",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class ScheduleRequest(BaseModel):
    cron: str = Field(
        ...,
        description="Cron expression (5 fields: min hour day month weekday)",
        examples=["0 3 * * *"],
    )


class ScheduleResponse(BaseModel):
    cron: str
    next_run: Optional[str] = None


class StatusResponse(BaseModel):
    status: str
    current_stage: Optional[int] = None
    current_stage_name: Optional[str] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    last_error: Optional[str] = None
    stages_completed: list[int] = []


class RunResponse(BaseModel):
    message: str


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        service="judgesystem-collector",
        version="1.0.0",
    )


@app.post("/api/collector/run", response_model=RunResponse)
async def trigger_run() -> RunResponse:
    """Trigger the full pipeline manually (non-blocking)."""
    if pipeline_state.status == PipelineStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Pipeline is already running")

    # Run in a background thread so the HTTP response returns immediately
    import threading
    thread = threading.Thread(target=run_pipeline, daemon=True)
    thread.start()

    return RunResponse(message="Pipeline triggered")


@app.get("/api/collector/status", response_model=StatusResponse)
async def get_status() -> StatusResponse:
    """Return current pipeline status."""
    d = pipeline_state.to_dict()
    return StatusResponse(**d)


@app.get("/api/collector/schedule", response_model=ScheduleResponse)
async def get_schedule() -> ScheduleResponse:
    """Return the current schedule information."""
    job = scheduler.get_job(SCHEDULE_JOB_ID)
    if job is None:
        return ScheduleResponse(cron="not scheduled", next_run=None)

    next_run = job.next_run_time.isoformat() if job.next_run_time else None
    # Reconstruct cron string from trigger fields
    trigger = job.trigger
    cron_str = str(trigger)
    return ScheduleResponse(cron=cron_str, next_run=next_run)


@app.post("/api/collector/schedule", response_model=ScheduleResponse)
async def set_schedule(req: ScheduleRequest) -> ScheduleResponse:
    """Update the pipeline schedule with a new cron expression."""
    try:
        new_trigger = CronTrigger.from_crontab(req.cron)
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid cron expression: {exc}",
        )

    scheduler.reschedule_job(SCHEDULE_JOB_ID, trigger=new_trigger)
    job = scheduler.get_job(SCHEDULE_JOB_ID)
    next_run = job.next_run_time.isoformat() if job and job.next_run_time else None

    logger.info("Schedule updated to: %s", req.cron)
    return ScheduleResponse(cron=req.cron, next_run=next_run)
