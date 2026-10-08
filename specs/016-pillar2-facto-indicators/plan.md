# Implementation Plan: Pillar 2 FACTO Indicators Integration

**Branch**: `fix/first-pilar` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-pillar2-facto-indicators/spec.md`

## Summary

Implement ingestion and calculation of Pillar 2 indicators (Funding and Ecosystem Connection) in the Python hexagonal ETL pipeline from foundation project data located in `data/raw/pilar2/projetos.csv`. The solution parses project metadata, resolves executing campuses (including Rectorate systemic rules and explicit CEFOR mapping), computes active partnership agreements (`PIPDI` / `NAPPCT`) and new research funding (`TAFPPI`) across the 2024–2026 reference window, and outputs verified numeric metrics while preserving `OCC` and the `PINV` percentage as strictly `null` in accordance with Constitution Principle III. A graceful fallback ensures CI workflows pass even when `data/raw/` is absent.

## Technical Context

**Language/Version**: Python 3.11+ (ETL pipeline) and TypeScript 5+ (Astro frontend).

**Primary Dependencies**: Exclusively the Python Standard Library (`csv`, `zipfile`, `json`, `dataclasses`, `pathlib`, `re`, `unicodedata`, `datetime`). Zero external runtime libraries.

**Storage**: Input CSV files in `data/raw/pilar2/`, canonical archive in `data/canonical/exports_canonical.zip`, output package in `data/dist/indicadores.zip`, and static Astro content.

**Testing**: `pytest` for Python ETL test suites (`tests/etl/`); `Vitest` for Astro frontend (`npm test`).

**Target Platform**: Linux / GitHub Actions CI / GitHub Pages static hosting.

**Project Type**: Batch ETL Pipeline (Hexagonal / Ports & Adapters) & Static Web Application.

**Performance Goals**: Ingestion, aggregation, and generation of all Pillar 2 indicators across all campuses and years in < 2 seconds.

**Constraints**:

- Strict adherence to Principle I (Simplicity: no Pandas or extra dependencies).
- Principle II (Test-First: red/green/refactor with `pytest`).
- Principle III (Fidelity: `OCC` and `PINV` ratio remain strictly `null`).
- Principle IV (Privacy: aggregated data only; personal names and CPFs never exported).
- Graceful fallback: If `data/raw/pilar2/` is missing, log an informative warning and emit `null` for Pillar 2 without crashing.

**Scale/Scope**: 115 foundation projects, 23 IFES campuses + institutional `todos` scope, 3 reference years (2024, 2025, 2026).

## Constitution Check

| Principle                        |  Status  | Justification / Implementation Alignment                                                                                                                             |
| :------------------------------- | :------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicity**                | **PASS** | Uses standard library `csv` module and existing dataclasses. No new dependencies.                                                                                    |
| **II. Test-First**               | **PASS** | Tests in `tests/etl/test_facto_pilar2.py` will be written and observed failing before implementing adapters and calculators.                                         |
| **III. Fidelity to Report Data** | **PASS** | `OCC` and `percentual_calculado_PINV` are strictly `null` (rendered as "Dado indisponível"); genuine values (`PIPDI`, `TAFPPI`) reflect verified foundation records. |
| **IV. Aggregated Data Only**     | **PASS** | Only integer counts and currency totals are exported. Coordinator names, CPF numbers, and individual payments are omitted from output JSON.                          |
| **V. Basic Quality**             | **PASS** | Code formatted with Black/Prettier/ESLint; Brazilian Portuguese labels preserved in UI.                                                                              |
| **VI. Automated Deployment**     | **PASS** | Full test suites run in CI; fallback mode prevents missing raw data from failing remote builds.                                                                      |

## Project Structure

### Documentation (this feature)

```text
specs/016-pillar2-facto-indicators/
├── spec.md              # Feature specification
├── plan.md              # This plan
├── research.md          # Architecture decisions & trade-offs
├── data-model.md        # Domain entities, value objects & calculation formulas
├── quickstart.md        # Verification and end-to-end testing guide
├── contracts/
│   ├── pilar2-schema.json    # JSON Schema draft-07 for pilar2_{campus}_{year}.json
│   └── facto-csv-contract.md # Contract for data/raw/pilar2/projetos.csv
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
data/
├── raw/pilar2/
│   ├── projetos.csv                    # Ingested FACTO projects
│   └── recursos_rubrica.csv            # Secondary financial details
├── canonical/
│   └── exports_canonical.zip          # Canonical campus and production entities
└── dist/
    └── indicadores.zip                 # Output package containing pilar2_*.json

etl/
├── adapters/
│   ├── sources/
│   │   ├── facto_csv_source.py         # NEW: Ingests data/raw/pilar2/projetos.csv with fallback
│   │   └── zip_canonical_source.py     # Existing canonical extractor
│   └── sinks/
│       ├── json_pilar_sink.py          # UPDATE: Serializes real Pillar 2 metrics
│       └── zip_indicadores_sink.py     # Existing ZIP packager
├── core/
│   └── logic/
│       ├── calculators/
│       │   ├── aggregator.py           # UPDATE: Coordinates Pillar 2 metrics aggregation
│       │   └── pillar2.py              # UPDATE: Calculates PIPDI and TAFPPI from ProjetoFacto
│       └── models/
│           ├── facto.py                # NEW: ProjetoFacto domain entity
│           └── indicators.py           # UPDATE: AgregadosPilar2 field types
└── flows/
    └── indicadores_flow.py             # UPDATE: Orchestrates FACTO source alongside canonical

tests/
└── etl/
    ├── test_facto_pilar2.py            # NEW: Unit tests for FACTO ingestion & calculations
    └── test_calculators.py             # UPDATE: Verifies fallback null behavior
```

**Structure Decision**: Placed within the existing hexagonal ETL structure in `etl/adapters/sources/`, `etl/core/logic/calculators/`, and `etl/core/logic/models/`, keeping clean boundaries between ingestion adapters and calculation logic.

## Complexity Tracking

> No constitutional violations or unwarranted complexity introduced. All principles PASS.
