---
description: 'Task list for feature implementation'
---

# Tasks: Dashboard de Indicadores Pilar 1 CONIF

**Input**: Design documents from `/specs/001-pillar1-indicators-dashboard/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: MANDATORY for this project (constitution Principle II, Test-First Development). Tasks are ordered red → green: test tasks come first and MUST be observed failing before the implementation task begins.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project (Astro)**: `src/pages/`, `src/components/`, `src/layouts/`, `src/data/`, `src/lib/`, `tests/` at repository root
- Paths per plan.md Project Structure — do not invent alternate layouts

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Astro 5 project with TypeScript: create `package.json`, `astro.config.mjs` (static output), `tsconfig.json` (strict)
- [x] T002 Configure dev tooling: `vitest.config.ts`, ESLint flat config with `typescript-eslint` + `eslint-plugin-astro`, `.prettierrc`, and npm scripts `test`, `lint`, `format`, `format:check`, `build`, `preview` in `package.json`
- [x] T003 [P] Create base layout `src/layouts/BaseLayout.astro` with `<html lang="pt-BR">`, meta tags, and mobile-first global styles
- [x] T004 [P] Create GitHub Actions workflow `.github/workflows/deploy.yml`: install → lint → format:check → test → build → deploy to GitHub Pages, with the deploy job dependent on all gates passing

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data layer that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Define types `Indicador`, `ValorAnual`, `Variavel`, `Componente` and the JSON loader in `src/data/indicadores.ts` per `specs/001-pillar1-indicators-dashboard/data-model.md`
- [x] T006 [P] Create data files `src/data/ntpp.json`, `src/data/qspp.json`, `src/data/pies.json`, `src/data/picot.json` transcribed verbatim from the official report (missing values as `valor: null` + `motivoIndisponivel`, per `specs/001-pillar1-indicators-dashboard/contracts/data-contract.md`)
- [x] T007 Write failing data-validation tests in `tests/data-validation.test.ts` covering contract rules: exactly four indicators with expected `sigla`/unique `slug`, years strictly ascending and unique, `valor === null` ⇔ `motivoIndisponivel` non-empty, `dataAtualizacao` null or `YYYY-MM-DD`
- [x] T008 Implement validation in the loader `src/data/indicadores.ts` to make `tests/data-validation.test.ts` pass

**Checkpoint**: Foundation ready — data loads, validates, and user story implementation can begin

---

## Phase 3: User Story 1 — Overview page with indicator cards (Priority: P1) 🎯 MVP

**Goal**: Visitor opens `/` and sees one card per indicator (NTPP, QSPP, PIES, PICOT) with its most recent available value or "Dado indisponível", each linking to the detail page

**Independent Test**: Open `/` and verify exactly four cards in order, each showing latest value + year or "Dado indisponível", each navigating to `/indicadores/{slug}`

### Tests for User Story 1 (write FIRST, ensure they FAIL) ⚠️

- [x] T009 [P] [US1] Write failing tests for pt-BR value/year/date formatting in `tests/formatters.test.ts`: `formatValor` renders numbers with pt-BR decimal comma, renders `null` as exactly "Dado indisponível" and never `0`; `formatAno` and `formatDate` use pt-BR conventions
- [x] T010 [P] [US1] Write failing tests for `latestValue` in `tests/selectors.test.ts`: returns the most recent year with `valor !== null`, returns `null` result when no year has data, ignores later years whose value is null

### Implementation for User Story 1

- [x] T011 [US1] Implement `formatValor`, `formatAno`, `formatDate` in `src/lib/formatters.ts` (via `Intl.NumberFormat("pt-BR")` / `Intl.DateTimeFormat("pt-BR")`) to pass `tests/formatters.test.ts`
- [x] T012 [US1] Implement `latestValue` in `src/lib/selectors.ts` to pass `tests/selectors.test.ts`
- [x] T013 [US1] Create `src/components/UnavailableNotice.astro` rendering "Dado indisponível" plus the `motivoIndisponivel` reason when provided
- [x] T014 [US1] Create `src/components/IndicatorCard.astro`: acronym + full name, latest value + reference year (or `UnavailableNotice`), whole card links to `/indicadores/{slug}`
- [x] T015 [US1] Create `src/pages/index.astro`: heading in pt-BR identifying the dashboard, renders exactly four `IndicatorCard`s in fixed order NTPP, QSPP, PIES, PICOT from the loader

**Checkpoint**: Overview page fully functional and independently verifiable (quickstart S1)

---

## Phase 4: User Story 2 — Indicator detail page with year selection and historical series (Priority: P1)

**Goal**: Detail page per indicator with year selector, value per selected year, historical series listing + simple SVG chart, and full methodology metadata

**Independent Test**: Open `/indicadores/ntpp`, switch years and verify the value updates, series lists every year ascending, chart plots available values only, and all six methodology items render

### Tests for User Story 2 (write FIRST, ensure they FAIL) ⚠️

- [x] T016 [P] [US2] Write failing tests for `seriesFor` and `valuesForYear` in `tests/selectors.test.ts`: `seriesFor` returns all years ascending including years with `null` values; `valuesForYear` returns the year's value or explicit unavailable state
- [x] T017 [P] [US2] Write failing tests for SVG chart mapping in `tests/chart.test.ts`: maps years/values to plot coordinates in order, skips years with `null` (never maps them to zero or plots them), handles single-year series, produces sane output for equal values

### Implementation for User Story 2

- [x] T018 [US2] Implement `seriesFor` and `valuesForYear` in `src/lib/selectors.ts` to pass the new tests in `tests/selectors.test.ts`
- [x] T019 [US2] Implement `src/lib/chart.ts` (pure coordinate/path mapping) to pass `tests/chart.test.ts`
- [x] T020 [US2] Create `src/components/YearSelector.astro`: selects all years present in the data, pre-selected to most recent year with data, tiny inline vanilla script updating the displayed value without any framework runtime
- [x] T021 [US2] Create `src/components/HistoricalSeries.astro`: year/value listing ascending, rendering "Dado indisponível" for years without data
- [x] T022 [US2] Create `src/components/SeriesChart.astro`: inline SVG trend chart using `src/lib/chart.ts`, accessible labels, years without data not plotted
- [x] T023 [US2] Create `src/pages/indicadores/[slug].astro` with `getStaticPaths` over the four indicators: header (acronym + full name), year value + `YearSelector`, `HistoricalSeries` + `SeriesChart`, and methodology section (`O que mede`, `Fórmula`, `Variáveis`, "Polaridade: quanto maior, melhor", `Fonte dos dados`, `Data de atualização` — date via `formatDate` or "Dado indisponível" when null)

**Checkpoint**: Full browsing experience works (quickstart S2); US1 + US2 form the functional core

---

## Phase 5: User Story 3 — Unavailable indicators explained (Priority: P2)

**Goal**: PIES and PICOT show "Dado indisponível" naming the missing input (PIES: total de matriculados; PICOT: modalidade de ingresso), with no estimated value anywhere

**Independent Test**: Open `/indicadores/pies` and `/indicadores/picot` and verify the explanation names the missing input, no numeric value or estimate appears, and no year selector implies data availability

### Implementation for User Story 3

- [x] T024 [US3] Extend `src/components/UnavailableNotice.astro` and `src/pages/indicadores/[slug].astro`: render the indicator's `motivoIndisponivel` explanation naming the missing input; omit the `YearSelector` (and value display) when no year has data, so the UI never implies availability
- [x] T025 [US3] Verify per quickstart S3 that PIES/PICOT cards and detail pages show "Dado indisponível" with the correct missing-data explanation and zero occurrences of zero-as-missing or estimates

**Checkpoint**: Unavailable indicators transparent and correctly explained

---

## Phase 6: User Story 4 — Existing components shown as plain counts (Priority: P3)

**Goal**: Report components (e.g., NEP) appear as plain counts per available year, clearly labeled as NOT the indicator percentage

**Independent Test**: Open a detail page whose data includes a component and verify counts render for available years, each with the exact label, missing years showing "Dado indisponível"

### Implementation for User Story 4

- [x] T026 [US4] Create `src/components/ComponentCount.astro`: component acronym + full name, count per year via `formatValor`/`UnavailableNotice`, each labeled exactly "Contagem absoluta — não é o percentual do indicador"
- [x] T027 [US4] Render the components section in `src/pages/indicadores/[slug].astro` iterating `componentes` from the data (no section when the list is empty)

**Checkpoint**: All user stories independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T028 [P] Create `README.md`: project purpose (public CONIF Pillar 1 indicators dashboard), pt-BR data curation workflow, and command table from `specs/001-pillar1-indicators-dashboard/quickstart.md`
- [x] T029 Execute all validation scenarios S1–S6 from `specs/001-pillar1-indicators-dashboard/quickstart.md` (build, preview, manual checks, data fidelity spot check against the report)
- [x] T030 Accessibility/quality sweep: no horizontal scrolling at ~360 px viewport, pt-BR audit of every user-facing string (SC-005, SC-006), ESLint/Prettier/tests all green
- [x] T031 [P] Add "ano em andamento" notice for 2026 near the displayed value: `tests/anoEmAndamento.test.ts` (red first), `src/lib/anoEmAndamento.ts`, and render in `src/components/IndicatorCard.astro`, `src/components/YearSelector.astro` and `src/components/HistoricalSeries.astro`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)** → **US2 (Phase 4)**: US2 detail pages link from US1 cards; implement in order
- **US3 (Phase 5)** and **US4 (Phase 6)**: Depend on US2's detail page existing; independent of each other
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependencies on other stories
- **US2 (P1)**: After US1 (cards link to detail pages); reuses `UnavailableNotice` from US1
- **US3 (P2)**: After US2 (extends its page/component); independent of US4
- **US4 (P3)**: After US2 (adds a section to its page); independent of US3

### Within Each User Story

- Tests (red) before implementation (green) — constitution Principle II
- Selectors/formatters before components; components before pages
- Story complete before moving to the next priority

### Parallel Opportunities

- Setup: T003, T004 (different files)
- Foundational: T006 data files in parallel; T007 tests in parallel with T006
- US1: T009 + T010 test files in parallel; US2: T016 + T017 in parallel
- US3 and US4 phases can run in parallel by different implementers once US2 is done

---

## Parallel Example: User Story 1

```bash
# Launch both test-writing tasks together (different test files):
Task: "Failing tests for pt-BR formatting in tests/formatters.test.ts"
Task: "Failing tests for latestValue in tests/selectors.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run quickstart S1 — the overview already communicates the status of all four indicators

### Incremental Delivery

1. Setup + Foundational → data layer validated
2. Add US1 → overview demoable (MVP)
3. Add US2 → full browsing experience (core product complete)
4. Add US3 + US4 → transparency features
5. Polish → release-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Every user story is independently completable and testable
- Verify tests fail BEFORE implementing (red → green → refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
