# JudgeSystem - Scalable Architecture

## Overview

Refactored bid announcement judgment system (入札公告判定システム) with a modular,
testable, and scalable architecture. The original 6,843-line monolithic `main.py`
has been decomposed into focused modules following SOLID principles.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                     CLI / API                        │
│                    (cli.py)                           │
└─────────────┬───────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────┐
│              Pipeline Orchestrator                    │
│           (pipeline/__init__.py)                      │
├─────────────┬──────────┬──────────┬─────────────────┤
│   Step 0    │  Step 1  │ Step 2   │     Step 3       │
│ Documents   │ Transfer │   OCR    │   Judgement       │
│ (step0_     │ (step1_  │ (step2_  │  (step3_         │
│ documents)  │ transfer)│  ocr)    │  judgement)       │
└──────┬──────┴────┬─────┴────┬─────┴──────┬──────────┘
       │           │          │            │
       ▼           ▼          ▼            ▼
┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐
│ Storage  │ │    DB    │ │  OCR   │ │    Judges    │
│ Service  │ │  Layer   │ │Service │ │  (Strategy)  │
│(local/   │ │(abstract)│ │(Gemini)│ ├──────────────┤
│  GCS)    │ │          │ │        │ │ Experience   │
└──────────┘ ├──────────┤ └────────┘ │ Location     │
             │ SQLite   │            │ Technician   │
             │ Postgres │            │ Grade/Item   │
             │ BigQuery │            │ Ineligibility│
             └──────────┘            └──────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Pydantic      │
         │  Models        │
         │ (type-safe)    │
         └────────────────┘
```

## Key Design Decisions

### 1. Monolith Decomposition (6,843 lines → ~15 focused modules)

| Original | Problem | Refactored |
|----------|---------|------------|
| `main.py` (all) | God Object | Split into pipeline/, judges/, db/, services/ |
| `DBOperator` + 3 subclasses | 2,500 lines duplicated SQL | Shared schema + dialect-specific adapters |
| `BidJudgementSan` | Mixed concerns | Pipeline steps as independent modules |
| `Master` class | Just file path holders | `MasterDataService` with caching |
| CLI arg parsing (80+ args) | In same file as logic | Separate `cli.py` with Pydantic config |

### 2. Strategy Pattern for Judges

Each requirement type is a pluggable `Judge` with a common interface:

```python
class BaseJudge(ABC):
    @abstractmethod
    def evaluate(self, context: JudgementContext) -> JudgementResult: ...
```

New requirement types can be added without modifying existing code.

### 3. Database Abstraction (DRY)

Schema definitions are shared; only dialect-specific SQL differs:

```python
class DBAdapter(ABC):
    @abstractmethod
    def execute(self, query: str, params: dict) -> pd.DataFrame: ...

class SchemaManager:
    TABLES: dict[str, TableSchema]  # Shared across all backends
```

### 4. Pipeline Pattern

Each step is an independent, testable unit:

```python
class PipelineStep(ABC):
    @abstractmethod
    def run(self, context: PipelineContext) -> PipelineContext: ...
```

### 5. Dependency Injection via Config

```python
@dataclass
class AppConfig:
    db: DBConfig
    storage: StorageConfig
    ocr: OCRConfig
```

No hardcoded paths. All external dependencies injected through configuration.

## Module Responsibilities

| Module | Lines | Responsibility |
|--------|-------|---------------|
| `config.py` | ~80 | Pydantic configuration models |
| `models/` | ~150 | Data models (Announcement, Requirement, Judgement) |
| `db/base.py` | ~60 | Abstract DB adapter interface |
| `db/schema.py` | ~180 | Shared table schemas (CREATE TABLE DDL) |
| `db/postgres.py` | ~120 | PostgreSQL-specific adapter |
| `db/sqlite.py` | ~80 | SQLite-specific adapter |
| `pipeline/orchestrator.py` | ~60 | Step orchestration |
| `pipeline/step0_documents.py` | ~100 | Document fetching & preparation |
| `pipeline/step1_transfer.py` | ~80 | Announcement transcription |
| `pipeline/step3_judgement.py` | ~120 | Judgment execution with parallelism |
| `judges/base.py` | ~30 | Judge interface |
| `judges/experience.py` | ~80 | Experience requirement evaluation |
| `judges/location.py` | ~60 | Location requirement evaluation |
| `judges/technician.py` | ~80 | Technician qualification evaluation |
| `judges/grade_item.py` | ~70 | Grade/category evaluation |
| `judges/ineligibility.py` | ~40 | Disqualification check |
| `services/master_data.py` | ~80 | Master data loading with caching |
| `services/storage.py` | ~70 | Local/GCS file storage |
| `services/ocr.py` | ~60 | Gemini OCR service |
| `cli.py` | ~80 | CLI entry point |

## Scalability Improvements

1. **Horizontal scaling**: Judgment step uses multiprocessing Pool, parallelizable across workers
2. **Database agnostic**: Swap backends without touching business logic
3. **Plugin judges**: Add new requirement types by implementing `BaseJudge`
4. **Caching**: Master data loaded once, shared across judgment iterations
5. **Batch processing**: Chunked DB operations (configurable chunk size)
6. **Containerized**: Docker-ready for Cloud Run deployment
