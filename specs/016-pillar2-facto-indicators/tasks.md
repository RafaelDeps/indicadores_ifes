# Tasks: Pillar 2 FACTO Indicators Integration

**Input**: Design documents from `specs/016-pillar2-facto-indicators/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
**Tests**: Tests are **MANDATORY** per Constitution Principle II (Test-First Development). Red $\to$ Green $\to$ Refactor must be strictly followed for all calculation and ingestion logic.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Update domain schemas and entity models that foundational modules and user stories depend on.

- [x] T001 [P] Update Pillar 2 JSON schema in `specs/016-pillar2-facto-indicators/contracts/pilar2-schema.json` and `specs/008-python-hexagonal-etl/contracts/pilar2-schema.json` to allow integers for PIPDI and numbers for TAFPPI while keeping OCC/PINV null.
- [x] T002 [P] Update `AgregadosPilar2` type annotations in `etl/core/logic/models/indicators.py` to support `int | None` and `float | None` metrics.
- [x] T003 [P] Create `ProjetoFacto` dataclass and helper methods in `etl/core/logic/models/facto.py` per data model.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core CSV ingestion adapter and campus resolver that MUST be complete before user story calculations can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Implement unit tests for CSV parsing, currency conversions, and graceful fallback in `tests/etl/test_facto_pilar2.py`.
- [x] T005 Implement `FactoCsvSource` adapter in `etl/adapters/sources/facto_csv_source.py` with delimiter/encoding handling and missing directory fallback.
- [x] T006 Implement unit tests for FACTO campus mapping and Rectorate/CEFOR resolution in `tests/etl/test_facto_pilar2.py`.
- [x] T007 Implement campus resolution logic for FACTO projects in `etl/core/logic/resolvers/campus_resolver.py` supporting Rectorate and explicit campus identification.

**Checkpoint**: Foundation ready — raw FACTO CSV data can be parsed and mapped to canonical campus slugs.

---

## Phase 3: User Story 1 - Visualization of R&D&I Partnership Agreements (PIPDI) (Priority: P1) 🎯 MVP

**Goal**: Ingest FACTO projects and compute verified partnership agreements (`PIPDI` / `NAPPCT`) for each campus and the institutional `todos` scope across 2024–2026.

**Independent Test**: Run `pytest tests/etl/test_facto_pilar2.py -k test_pipdi` and verify that PIPDI metrics report genuine non-negative integers for all campuses and `todos` with valid partnership projects.

### Tests for User Story 1 (MANDATORY per Constitution Principle II) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T008 [P] [US1] Write unit tests in `tests/etl/test_facto_pilar2.py` verifying PIPDI project type filtering (including PDeI keywords, excluding exams/pure teaching), legal instrument filtering, blank instrument with external funder, and multi-year temporal validity.
- [x] T009 [P] [US1] Write contract compliance tests in `tests/etl/test_facto_pilar2.py` verifying that generated PIPDI metrics validate against `pilar2-schema.json`.

### Implementation for User Story 1

- [x] T010 [US1] Implement PIPDI calculation logic (`calcular_pipdi`) in `etl/core/logic/calculators/pillar2.py`.
- [x] T011 [US1] Integrate PIPDI calculation into `etl/core/logic/calculators/aggregator.py` for each campus and the `todos` scope across target reference years.
- [x] T012 [US1] Update `_montar_pilar2` in `etl/adapters/sinks/json_pilar_sink.py` to serialize calculated PIPDI values.

**Checkpoint**: User Story 1 (MVP) complete — PIPDI metrics calculate and serialize with verified non-null integers.

---

## Phase 4: User Story 2 - Transparent Research Funding Ingestion (TAFPPI in PINV) (Priority: P2)

**Goal**: Ingest approved research and innovation funding amounts (`TAFPPI`) from FACTO projects and attribute to project start years, preserving `OCC` and the `PINV` ratio strictly as `null` per Constitution Principle III.

**Independent Test**: Run `pytest tests/etl/test_facto_pilar2.py -k test_tafppi` and verify that `TAFPPI_valor_total_aporte_pesquisa` reports valid float amounts for start years, while `OCC` and `percentual_calculado_PINV` are strictly `null`.

### Tests for User Story 2 (MANDATORY per Constitution Principle II) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T013 [P] [US2] Write unit tests in `tests/etl/test_facto_pilar2.py` verifying that `TAFPPI` aggregates approved funding values strictly in the project start year (`ano de início`) and evaluates to `null` in years without new awards.
- [x] T014 [P] [US2] Write tests in `tests/etl/test_facto_pilar2.py` verifying strict preservation of `null` for `OCC_valor_orcamento_total_capital_custeio` and `percentual_calculado_PINV` across all campuses and years.

### Implementation for User Story 2

- [x] T015 [US2] Implement TAFPPI aggregation logic (`calcular_tafppi`) in `etl/core/logic/calculators/pillar2.py`.
- [x] T016 [US2] Integrate TAFPPI aggregation into `etl/core/logic/calculators/aggregator.py` associating projects with reference years matching `ano_inicio`.
- [x] T017 [US2] Update `_montar_pilar2` in `etl/adapters/sinks/json_pilar_sink.py` to output calculated `TAFPPI` and preserve null `OCC`/`PINV`.

**Checkpoint**: User Story 2 complete — TAFPPI values populate correctly by start year, and PINV percentage remains faithfully "Dado indisponível".

---

## Phase 5: User Story 3 - Resilient Ingestion and Provenance Tracking (Priority: P3)

**Goal**: Orchestrate FACTO ingestion inside `IndicadoresFlow` and `etl.main`, track execution metrics in `ExecutionTracker`, and handle fallback when raw files are absent.

**Independent Test**: Execute `python3 -m etl.main` both with and without `data/raw/pilar2/` present, asserting that `indicadores.zip` is created cleanly and `data/reports/etl_run_report.md` logs execution status.

### Tests for User Story 3 (MANDATORY per Constitution Principle II) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T018 [P] [US3] Write integration tests in `tests/etl/test_facto_pilar2.py` verifying end-to-end execution of `IndicadoresFlow` with `FactoCsvSource`.
- [x] T019 [P] [US3] Write tests in `tests/etl/test_facto_pilar2.py` asserting that missing `data/raw/pilar2/` logs an `AVISO` and yields null Pillar 2 metrics without crashing the pipeline.

### Implementation for User Story 3

- [x] T020 [US3] Update `etl/flows/indicadores_flow.py` to instantiate and extract from `FactoCsvSource`, passing FACTO projects to `agregar_indicadores`.
- [x] T021 [US3] Update `etl/main.py` CLI parser to accept `--facto-dir` option (defaulting to `data/raw/pilar2`).
- [x] T022 [US3] Update `etl/tracking/tracker.py` to record FACTO projects count and Pillar 2 volumetry in `data/reports/etl_run_report.md`.

**Checkpoint**: User Story 3 complete — full pipeline orchestrates canonical and foundation data with tracking and fallback.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end validation, regression testing, and code quality.

- [x] T023 [P] Run full Python test suite with `pytest tests/etl/` and ensure 100% pass rate with zero regressions on Pillar 1 and Pillar 3.
- [x] T024 [P] Run frontend test suite with `npm test` and build with `npm run build` to confirm compatibility.
- [x] T025 Execute end-to-end pipeline with `python3 -m etl.main` and validate output zip against scenarios in `specs/016-pillar2-facto-indicators/quickstart.md`.
- [x] T026 Verify compliance with Constitution Principles IV (no personal data in output JSON) and V (ESLint and Prettier checks pass).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — blocks all user stories.
- **User Story 1 (Phase 3)**: Depends on Phase 2 completion. Can proceed independently as MVP.
- **User Story 2 (Phase 4)**: Depends on Phase 2 completion. Integrates alongside US1 in `pillar2.py` and `aggregator.py`.
- **User Story 3 (Phase 5)**: Depends on US1 and US2 completion to wire full flow and CLI.
- **Polish (Phase 6)**: Depends on all user stories being complete.

### Parallel Opportunities

- In Phase 1: `T001`, `T002`, `T003` can run in parallel (different files).
- In Phase 2: `T004` (tests) and `T006` (tests) can run in parallel.
- In Phase 3: `T008` and `T009` (US1 tests) can run in parallel before US1 implementation.
- In Phase 4: `T013` and `T014` (US2 tests) can run in parallel before US2 implementation.
- In Phase 5: `T018` and `T019` (US3 tests) can run in parallel before US3 implementation.
- In Phase 6: `T023` and `T024` can run in parallel.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup models and schema).
2. Complete Phase 2 (Foundational CSV parser and campus mapping).
3. Complete Phase 3 (User Story 1: PIPDI agreements calculation).
4. **Validate MVP**: Run `pytest tests/etl/test_facto_pilar2.py -k test_pipdi` and inspect generated PIPDI values.

### Incremental Delivery

1. Setup + Foundational $\to$ Foundation ready.
2. User Story 1 $\to$ Verified PIPDI partnership metrics displayed (MVP).
3. User Story 2 $\to$ Verified TAFPPI funding metrics displayed with null OCC.
4. User Story 3 $\to$ Pipeline orchestrated with CLI flag, tracking, and CI fallback.
5. Polish $\to$ Full regression suite, Astro build verification, quickstart validation.
