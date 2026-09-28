# Research & Architectural Decisions: Python Hexagonal ETL Pipeline

**Feature Branch**: `008-python-hexagonal-etl`  
**Date**: 2026-09-25  
**Spec Reference**: [spec.md](./spec.md)

## Summary of Technical Investigations

This document consolidates research and architectural decisions made to implement the Python ETL pipeline in `indicadores_ifes`, mirroring the Ports & Adapters (Hexagonal) architecture of `horizon_etl/src/`.

---

### Decision 1: Runtime Dependency Model — Zero External Dependencies

- **Decision**: The ETL pipeline runtime (`etl/`) will use exclusively the Python standard library (`zipfile`, `json`, `dataclasses`, `pathlib`, `argparse`, `abc`, `typing`).
- **Rationale**:
  - The dataset processed from `exports_canonical.zip` comprises thousands of records, easily fitting in memory.
  - The complete aggregation and serialization executes in < 2 seconds using pure Python dataclasses and standard dictionaries.
  - Using zero third-party dependencies eliminates packaging risks, virtualenv requirements for execution, binary wheel incompatibilities (such as PEP 668 on Linux systems), and guarantees high portability.
- **Alternatives Considered**:
  - _Pandas / Polars_: Evaluated for tabular transformations, but rejected because they introduce massive dependency trees (~50-100MB wheels), slow down startup, complicate installation on diverse environments, and offer no benefit for tree-like hierarchical JSON data (initiatives with nested teams).
  - _Pydantic_: Evaluated for schema validation, but rejected for runtime since `@dataclass` + standard type annotations provide the required typing guarantees without third-party dependencies.

---

### Decision 2: Deterministic ZIP Generation & Compatibility

- **Decision**: Use Python's standard `zipfile.ZipFile` with `zipfile.ZIP_DEFLATED` compression, fixed `ZipInfo` timestamps (`1980-01-01 00:00:00`), POSIX permissions (`0o644`), and sorted entry paths. Persist via atomic write (`.tmp-*` renamed to target).
- **Rationale**:
  - The Astro frontend extracts files using `src/lib/zip.ts`, which natively supports both STORE (0) and DEFLATE (8) compression methods via Node's `zlib.inflateRawSync`.
  - Normal ZIP tools write current timestamps, which causes non-deterministic checksums and noisy diffs across runs. Constant DOS timestamp (1980-01-01) guarantees reproducible output.
  - Atomic rename (`os.replace`) ensures that even if the process is terminated mid-generation, the existing `indicadores.zip` is never corrupted.
- **Alternatives Considered**:
  - _Raw Buffer Construction (like in TypeScript `zipwriter.ts`)_: Unnecessary in Python, as `zipfile.ZipInfo` exposes exact control over header metadata, compression level, and timestamps.
  - _External system `zip` utility_: Rejected due to platform discrepancies across Linux, macOS, and container environments.

---

### Decision 3: JSON Formatting and Fidelity Serialization

- **Decision**: Serializer formats JSON files with `indent=2`, `sort_keys=True`, and `ensure_ascii=False` using `json.dumps`. Strict adherence to Principle III fidelity (`null` vs `0`).
- **Rationale**:
  - Preserves exact key order across all 216 files for deterministic hashing and readable diffs.
  - Preserves Portuguese characters (e.g., `Vitória`, `Engajamento Acadêmico`) without ASCII escapes (`\u...`).
  - Strict null enforcement: Metrics not present in canonical source (e.g., `NTE_total_estudantes_matriculados`, `TAFPPI_valor_total_aporte_pesquisa`) must output `null`, whereas true counts with zero verified instances (e.g., `PA` patents) must output `0`.
- **Alternatives Considered**:
  - _Compact single-line JSON_: Rejected because indented JSON improves debuggability, git reviewability, and matches the contract currently verified by Vitest dataset tests.

---

### Decision 4: Hexagonal / Ports & Adapters Architecture Mirroring `horizon_etl/src/`

- **Decision**: Structure `etl/` into four distinct layers:
  1. `core/ports/`: Interfaces `ISource(ABC)` and `ISink(ABC)`.
  2. `core/logic/`: Pure domain logic (`models.py`, `resolvers/`, `temporal/`, `calculators/`) with zero I/O and zero external dependencies.
  3. `adapters/`: I/O implementations (`sources/zip_canonical_source.py`, `sinks/json_pilar_sink.py`, `sinks/zip_indicadores_sink.py`).
  4. `flows/`: Pipeline orchestration (`indicadores_flow.py`).
  5. `main.py`: CLI entrypoint with `argparse`.
- **Rationale**:
  - Decouples calculation formulas from source format (can read from directory, ZIP, or database).
  - Enables 100% pure unit testing of domain calculators without file system fixtures.
  - Directly matches the mental model and architecture established in `horizon_etl/src/`.
- **Alternatives Considered**:
  - _Monolithic script_: Rejected due to poor testability, tight coupling, and violation of architectural specifications.

---

### Decision 5: Python Developer Tooling & Environment Management

- **Decision**:
  - Development tools (`pytest`, `pytest-cov`, `black`, `isort`, `flake8`) managed in `requirements-etl.txt`.
  - `Makefile` intelligently detects virtual environments: `PYTHON_BIN ?= $(shell if [ -f .venv/bin/python ]; then echo .venv/bin/python; else echo python3; fi)`.
  - Provide `make setup-etl` or `make setup` to optionally create `.venv` and install `requirements-etl.txt`.
- **Rationale**:
  - Developer machines may have managed environments (Ubuntu PEP 668) where global `pip install` fails. Supporting `.venv` seamlessly while defaulting to `python3` if available ensures both isolated development and container/CI compatibility.
  - Matches `horizon_etl/Makefile` convention (`PYTHON_BIN ?= .venv/bin/python`).
- **Alternatives Considered**:
  - _Poetry / UV / Pipenv_: Evaluated, but standard `requirements-etl.txt` keeps the project simpler and aligns with the project constitution's simplicity principle.

---

### Decision 6: Migration & Legacy Elimination Strategy

- **Decision**: Delete legacy TypeScript ETL code in `src/etl/` and TypeScript tests in `tests/etl/*.test.ts`. Replace `tests/etl/` with Python test files (`test_*.py`). Update `package.json` `"etl"` command to `"python3 -m etl.main"`.
- **Rationale**:
  - Confirmed via user clarification Q2.
  - Keeps `src/` 100% clean and dedicated to the Astro frontend.
  - Keeps `npm test` (Vitest) running purely frontend tests (`tests/*.test.ts`), while `pytest` runs `tests/etl/`.
- **Alternatives Considered**:
  - _Keeping dual implementations_: Rejected due to maintenance overhead, drift risk, and confusion.
