# Implementation Plan: Python Hexagonal ETL Pipeline

**Branch**: `008-python-hexagonal-etl` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-python-hexagonal-etl/spec.md`

---

## Summary

Implement a high-performance Python ETL pipeline (>= 3.11/3.12) located at `etl/`, mirroring the exact Ports & Adapters (Hexagonal) architecture used in `horizon_etl/src/`. The pipeline processes canonical data from `exports_canonical.zip` and generates a deterministic, contract-validated `indicadores.zip` (containing 216 files for 23 campuses and institutional `todos` across 2024–2026). The runtime pipeline uses zero external dependencies (Python standard library only). Legacy TypeScript ETL code in `src/etl/` and `tests/etl/*.test.ts` is completely removed, leaving `src/` dedicated to the Astro dashboard and `tests/etl/` dedicated to `pytest`.

---

## Technical Context

**Language/Version**: Python >= 3.11 (tested on Python 3.14) + Node.js >= 20 (for Astro dashboard and Vitest).

**Primary Dependencies**:

- Runtime: Zero external dependencies (exclusive use of Python standard library: `zipfile`, `json`, `dataclasses`, `pathlib`, `argparse`, `abc`, `typing`).
- Development & Testing: `pytest`, `pytest-cov`, `black`, `isort`, `flake8` managed via `requirements-etl.txt`.

**Storage**: File-based ZIP archives (`exports_canonical.zip` as input; `indicadores.zip` as deterministic atomic output).

**Testing**: `pytest` for Python ETL (`tests/etl/`); `vitest` for Astro frontend (`tests/*.test.ts`).

**Target Platform**: Linux / POSIX workstation and CI/CD runners.

**Project Type**: Data transformation CLI pipeline + static website dashboard.

**Performance Goals**: Complete pipeline execution under 5 seconds for all 216 files.

**Constraints**:

- Strict null fidelity per CONIF guidelines (uncollected census/budget indicators must be `null`, not `0`).
- Strict LGPD privacy per Constitution Principle IV (no PII in output files).
- Deterministic ZIP generation (DOS timestamp 1980-01-01, sorted entries, atomic rename).

**Scale/Scope**: 23 campuses + consolidated `todos` × 3 pilares × 3 reference years (2024, 2025, 2026) = 216 JSON files.

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Principle                                       | Status   | Justification                                                                                                                                                                                                                          |
| :---------------------------------------------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicity**                               | **PASS** | The runtime ETL uses zero external packages (standard library only). The hexagonal architecture decouples domain logic cleanly without over-engineering or third-party framework overhead. Astro structure in `src/` remains standard. |
| **II. Test-First Development**                  | **PASS** | Test suite implemented in `tests/etl/` using `pytest`, covering unit logic (resolvers, temporal, calculators), adapters, flows, and CLI end-to-end. Vitest continues covering Astro frontend.                                          |
| **III. Fidelity to Report Data**                | **PASS** | Output schemas strictly enforce `null` for uncollected metrics (`NTE`, `PIES`, `PICOT`, `TAFPPI`, `PINV`, `PIPDI`, `PIPROTR`) and `0` for verified zero counts (`PA`). Validated automatically by sink contract.                       |
| **IV. Aggregated Data Only (LGPD)**             | **PASS** | `Pessoa` and `MembroEquipe` names/IDs are used strictly in-memory during aggregation and are excluded from all generated indicator files. Sink validator checks schema compliance.                                                     |
| **V. Basic Quality**                            | **PASS** | Code quality enforced via `flake8`, `black`, and `isort` for Python, and `eslint` + `prettier` for TypeScript. User-facing text in pt-BR.                                                                                              |
| **VI. Automated Deployment with Quality Gates** | **PASS** | `Makefile` provides unified targets: `make check` executes formatting check, linting, Python pytest, and Astro Vitest before any build or deployment.                                                                                  |

---

## Project Structure

### Documentation (this feature)

```text
specs/008-python-hexagonal-etl/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Technical decisions and architectural rationale
├── data-model.md        # Canonical entities, domain objects, and aggregate schemas
├── quickstart.md        # End-to-end execution and validation guide
├── contracts/           # Interface contracts and JSON schemas
│   ├── cli-contract.md
│   ├── canonical-source-contract.md
│   ├── pilar1-schema.json
│   ├── pilar2-schema.json
│   └── pilar3-schema.json
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
etl/
├── core/
│   ├── ports/
│   │   ├── __init__.py
│   │   ├── source.py                 # ISource(ABC) contract
│   │   └── sink.py                   # ISink(ABC) contract
│   └── logic/
│       ├── __init__.py
│       ├── models.py                 # Domain dataclasses & aggregates
│       ├── resolvers/
│       │   ├── __init__.py
│       │   ├── campus_resolver.py    # Hierarchical campus resolution
│       │   └── people_registry.py    # Merged researchers & students
│       ├── temporal/
│       │   ├── __init__.py
│       │   └── activity_filter.py    # Calendar year window check
│       └── calculators/
│           ├── __init__.py
│           ├── pillar1.py            # NTPP, QSPP, NEP calculations
│           ├── pillar2.py            # PINV, PIPDI strict nulls
│           ├── pillar3.py            # NPB, NPT, PC software, PA=0
│           └── aggregator.py         # Multi-campus and 'todos' aggregation
├── adapters/
│   ├── __init__.py
│   ├── sources/
│   │   ├── __init__.py
│   │   └── zip_canonical_source.py   # ISource: reads exports_canonical.zip
│   └── sinks/
│       ├── __init__.py
│       ├── json_pilar_sink.py        # Formats pilar{N}_{campus}_{year}.json
│       └── zip_indicadores_sink.py   # ISink: deterministic atomic ZIP writer
├── flows/
│   ├── __init__.py
│   └── indicadores_flow.py           # Pipeline orchestrator
├── __init__.py
└── main.py                           # CLI entrypoint (argparse)

tests/
├── etl/                              # Python test suite (pytest)
│   ├── __init__.py
│   ├── conftest.py                   # Fixtures and synthetic canonical zips
│   ├── test_resolvers.py             # Campus resolution & people registry
│   ├── test_temporal.py              # Activity filter logic
│   ├── test_calculators.py           # Pillar 1, 2, 3 formulas & nulls
│   ├── test_aggregator.py            # Multi-campus and institutional 'todos'
│   ├── test_adapters.py              # ZipCanonicalSource, JsonPilarSink, ZipIndicadoresSink
│   ├── test_flow.py                  # IndicadoresFlow integration
│   ├── test_cli.py                   # CLI options, arguments, exit codes
│   ├── test_fidelity.py              # Contract & schema compliance
│   └── test_privacy.py               # Zero PII verification
├── ano.test.ts                       # Astro Vitest test suites (frontend)
├── dataset.test.ts
├── zip.test.ts
└── ... (other Astro tests)

src/                                  # Astro frontend ONLY (components, layouts, pages, lib)
Makefile                              # Automation targets (make etl, make check, etc.)
requirements-etl.txt                  # Python dev dependencies (pytest, black, flake8, isort)
package.json                          # Node configuration (updated "etl": "python3 -m etl.main")
```

---

## Complexity Tracking

| Violation                                                      | Why Needed                                                                                                                                                                                                                                 | Simpler Alternative Rejected Because                                                                                                                           |
| :------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dual Language Stack** (Python for ETL, TypeScript for Astro) | Ingestion and canonical source generation (`horizon_etl`) is already Python. Implementing the CONIF transformation in Python mirrors the upstream domain model and enables data engineers to maintain both pipelines in the same language. | Keeping ETL in TypeScript required duplicating data engineering patterns, lacked synergy with `horizon_etl`, and ran into JavaScript zip serialization quirks. |
| **Hexagonal Architecture** (Ports & Adapters in `etl/`)        | Decouples pure CONIF calculation logic from storage format (ZIP vs directory vs database) and allows 100% test coverage of domain rules without file I/O.                                                                                  | A flat script mixes file parsing, validation, and domain math into a single file, making regression testing difficult and violating FR-002.                    |
