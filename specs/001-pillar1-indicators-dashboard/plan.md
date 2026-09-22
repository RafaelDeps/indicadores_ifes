# Implementation Plan: Dashboard de Indicadores Pilar 1 CONIF

**Branch**: `001-pillar1-indicators-dashboard` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-pillar1-indicators-dashboard/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Public static dashboard that presents the 4 Pillar 1 indicators of the CONIF
model (NTPP, QSPP, PIES, PICOT) for IFES managers and the community: an
overview page with one card per indicator and a detail page per indicator
with per-year values (year selector), historical series (year/value listing +
simple chart), methodology metadata, and explicit "Dado indisponível" states
that name the missing inputs — never zero or estimates. Technical approach
per constitution: Astro static site with default structure and TypeScript,
data as JSON files curated from the official report, Vitest TDD for all
value/formatting logic, inline-SVG chart (no chart library), GitHub Actions
deploy gated on lint + tests + build.

## Technical Context

**Language/Version**: TypeScript 5.x on Astro 5.x (static output), Node 20 LTS

**Primary Dependencies**: Runtime/build: `astro`. Dev-only: `vitest`
(tests), `eslint` + `typescript-eslint` + `eslint-plugin-astro` (lint),
`prettier` (format). No UI framework, no chart library, no CSS framework —
plain scoped Astro styles and a hand-rolled inline-SVG chart.

**Storage**: N/A — static JSON data files in the repository
(`src/data/*.json`), one per indicator, curated from the official CONIF
report. No database, no backend.

**Testing**: Vitest (unit tests, TDD: red → green → refactor)

**Target Platform**: GitHub Pages (static hosting); evergreen desktop and
mobile browsers; responsive mobile-first layout

**Project Type**: Static web site (Astro)

**Performance Goals**: Pre-rendered static HTML; no client-side framework
runtime (only a tiny inline script for the year selector); fast first load on
mobile connections

**Constraints**: Values MUST match the report exactly; missing data MUST
render as "Dado indisponível" (never zero/estimate); all user-facing text in
pt-BR; aggregated data only (LGPD); dependencies minimized per constitution

**Scale/Scope**: 4 indicators → 1 overview page + 4 detail pages; a handful
of historical years per indicator; data updates are manual repository edits

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle                               | Status  | Evidence                                                                                                                                                      |
| --- | --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Simplicity                              | ✅ Pass | Astro default structure (`src/pages`, `src/components`, `src/layouts`); TypeScript; dependencies limited to astro + dev tooling; no abstractions beyond Astro |
| II  | Test-First (NON-NEGOTIABLE)             | ✅ Pass | Vitest; all value selection/formatting/chart-mapping logic in `src/lib/` with tests written first (see tasks phase ordering)                                  |
| III | Fidelity to report data                 | ✅ Pass | Data model represents missing values as `null` + explicit reason; single formatter centralizes "Dado indisponível"; values transcribed verbatim from report   |
| IV  | Aggregated data only                    | ✅ Pass | Data files contain aggregate counts/percentages only; no names, CPF, or individual-level records                                                              |
| V   | Basic quality                           | ✅ Pass | ESLint + Prettier gates in CI; pt-BR literals in components; mobile-first responsive layout                                                                   |
| VI  | Automated deployment with quality gates | ✅ Pass | GitHub Actions: lint → test → build → deploy to GitHub Pages; deploy job depends on all gates passing                                                         |

**Post-design re-evaluation (Phase 1)**: ✅ All six gates still pass. The
hand-rolled SVG chart and vanilla year-selector script keep dependencies at
zero beyond Astro; the `null`-with-reason data contract is the mechanism that
makes Principle III testable.

## Project Structure

### Documentation (this feature)

```text
specs/001-pillar1-indicators-dashboard/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── data-contract.md
│   └── pages-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify output)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── data/
│   ├── ntpp.json              # Indicator data curated from the report
│   ├── qspp.json
│   ├── pies.json
│   ├── picot.json
│   └── indicadores.ts         # Types + typed loader (JSON → Indicador)
├── lib/
│   ├── formatters.ts          # formatValue, formatDate, unavailable text (TDD)
│   ├── selectors.ts           # latestValue, seriesFor, valuesForYear (TDD)
│   └── chart.ts               # SVG point/path mapping from series (TDD)
├── components/
│   ├── IndicatorCard.astro    # Overview card (value or unavailable)
│   ├── UnavailableNotice.astro # "Dado indisponível" + missing-data reason
│   ├── YearSelector.astro     # Year picker + tiny inline script
│   ├── HistoricalSeries.astro # Year/value listing
│   ├── SeriesChart.astro      # Inline SVG trend chart
│   └── ComponentCount.astro   # Plain count labeled as NOT the percentage
├── layouts/
│   └── BaseLayout.astro       # <html lang="pt-BR">, meta, mobile-first styles
└── pages/
    ├── index.astro            # Overview: one card per indicator
    └── indicadores/
        └── [slug].astro       # Detail page via getStaticPaths (4 pages)
tests/
├── formatters.test.ts
├── selectors.test.ts
└── chart.test.ts
```

**Structure Decision**: Astro single-project layout (constitution Principle
I). Calculation/formatting logic is isolated in `src/lib/` as plain
TypeScript functions so it is unit-testable with Vitest before any UI exists;
`.astro` components stay thin renderers. Data ships as JSON imported at build
time, so the published site is fully static.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    |            |                                      |
