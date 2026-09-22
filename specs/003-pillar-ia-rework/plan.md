# Implementation Plan: Rework de IA e identidade — páginas por pilar com ano na URL

**Branch**: `003-pillar-ia-rework` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-pillar-ia-rework/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Rework of the dashboard's information architecture and visual identity:
pillar-scoped routes (`/`, `/pilar-1/`, `/pilar-1/<sigla>/` with room for
`/pilar-2/`, `/pilar-3/`), explicit year selection reflected in the URL
(`?ano=YYYY`, default 2025, 2026 labeled partial, years never summed),
CSV/JSON data export per indicator (static build endpoints), removal of the
in-app accessibility panel (dark mode becomes automatic via the OS
preference), and an own visual identity — indigo palette, Source Sans 3
typography, "IF" text/monogram mark — replacing the Horizon brand. Data
values and the JSON data contract are untouched.

## Technical Context

**Language/Version**: TypeScript 5.x on Astro 5.x (existing site), static
output with static file endpoints for exports

**Primary Dependencies**: Existing stack only — `astro`, `vitest`,
`eslint`/`prettier`. **No new dependencies.** New webfont (Source Sans 3)
is a static asset like before.

**Storage**: N/A — year state lives in the URL query string; no
localStorage, no backend.

**Testing**: Vitest (TDD red → green). New/updated suites: year resolution
(`ano.ts`), CSV/JSON export generation (`exportacao.ts`), token/contrast
matrix for the new palette (claro/escuro base, AA), route/identity audits
(no Horizon elements, no accessibility panel, no old routes), voice audit
(unchanged rules), plus all pre-existing data/formatters/selectors/chart
tests kept green.

**Target Platform**: GitHub Pages (static), evergreen desktop and mobile
browsers

**Project Type**: Static web site (existing Astro project)

**Performance Goals**: One self-hosted webfont family (Source Sans 3,
400/600/700, latin subset ≈ 150 KB total); net payload REDUCTION versus
current (a11y panel + Ubuntu fonts + Horizon assets removed); year change is
a plain browser navigation between static pages

**Constraints**: Indicator values, JSON data contract and data files
untouched; year in URL query param; years never summed; no Horizon brand
elements; no user-facing theme/contrast/font-size controls (dark mode via OS
preference only); pt-BR sober register; cards thin border + surface

**Scale/Scope**: 6 pages (`/`, `/pilar-1/`, 4 detail pages) + 8 static
export endpoints (4 indicators × CSV/JSON); removal of the old
`/indicadores/...` routes

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle                               | Status  | Evidence                                                                                                                                                                                                                                                                               |
| --- | --------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Simplicity                              | ✅ Pass | No new dependencies; year state is a URL query (no client state layer); exports are build-time static files; the a11y panel and its state module are REMOVED (net simplification); pillar routes are plain Astro directories — future pillars add one directory each, no restructuring |
| II  | Test-First (NON-NEGOTIABLE)             | ✅ Pass | `ano.ts` (query parsing, default/fallback rules) and `exportacao.ts` (CSV/JSON shape) get red-first Vitest suites; token/contrast and identity audits updated red-first; existing data tests keep passing untouched                                                                    |
| III | Fidelity to report data                 | ✅ Pass | FR-014 keeps values and contract frozen; exports derive from the same JSON (SC-004 exact match); year-explicit display makes partial 2026 impossible to misread; the "never sum years" rule is enforced in the value-selection design (no combined-total code path exists)             |
| IV  | Aggregated data only                    | ✅ Pass | Exports contain aggregate yearly values/counts only                                                                                                                                                                                                                                    |
| V   | Basic quality                           | ✅ Pass | ESLint/Prettier unchanged; WCAG AA re-audited for the new palette (light+dark); pt-BR sober register audit stays; mobile layout re-verified                                                                                                                                            |
| VI  | Automated deployment with quality gates | ✅ Pass | Existing CI pipeline unchanged (lint → format → test → build → deploy)                                                                                                                                                                                                                 |

**Post-design re-evaluation (Phase 1)**: ✅ All six gates still pass. The
route/year/export contracts pin the behavior; net code size decreases (a11y
panel, uiState and Horizon assets removed).

## Project Structure

### Documentation (this feature)

```text
specs/003-pillar-ia-rework/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── routes-contract.md
│   ├── export-contract.md
│   └── identity-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify output)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── styles/
│   └── tokens.css             # REWRITTEN: own indigo palette (claro/escuro base, AA)
├── lib/
│   ├── ano.ts                 # NEW: ?ano= parsing, default/fallback rules (TDD)
│   ├── exportacao.ts          # NEW: CSV (pt-BR) + JSON payload builders (TDD)
│   ├── contrast.ts            # KEPT (reuse for new-palette matrix)
│   ├── voiceAudit.ts          # KEPT (canonical strings updated)
│   ├── anoEmAndamento.ts      # KEPT (2026 partial label)
│   ├── formatters.ts          # KEPT
│   ├── selectors.ts           # KEPT + new valorDoAno wrapper use
│   ├── chart.ts               # KEPT
│   └── uiState.ts             # DELETED (panel removed)
├── components/
│   ├── HeaderMarca.astro      # NEW: "IF" monogram + "Indicadores IFES" text mark
│   ├── CartaoPilar.astro      # NEW: pillar card (ativo / "em breve")
│   ├── IndicatorCard.astro    # REWORKED: value for the default year, labeled
│   ├── YearLinks.astro        # NEW: year navigation via ?ano= links/select
│   ├── HistoricalSeries.astro # REWORKED (styling + mono numerals)
│   ├── SeriesChart.astro      # REWORKED (styling only)
│   ├── UnavailableNotice.astro# RESTYLED (same text/behavior)
│   ├── ExportLinks.astro      # NEW: CSV/JSON download links
│   ├── ComponentCount.astro   # RESTYLED
│   └── BaseLayout.astro       # REWRITTEN: new identity, no stripe/panel/Ubuntu
├── layouts/                   # (BaseLayout remains here per current structure)
├── pages/
│   ├── index.astro            # REWRITTEN: pillar overview (P1 ativo, P2/P3 em breve)
│   ├── pilar-1/
│   │   ├── index.astro        # NEW: 4 indicator cards
│   │   └── [sigla].astro      # NEW: detail (getStaticPaths × 4)
│   ├── pilar-1/[sigla]/dados.csv.ts   # NEW: static CSV endpoint
│   ├── pilar-1/[sigla]/dados.json.ts  # NEW: static JSON endpoint
│   └── indicadores/           # DELETED (old routes)
├── data/                      # UNCHANGED (out of bounds)
└── public/fonts/              # source-sans-3-{400,600,700}.woff2 (Ubuntu removed)
tests/
├── ano.test.ts                # NEW
├── exportacao.test.ts         # NEW
├── tokens.test.ts             # REWRITTEN (new palette contract)
├── contrast.test.ts           # REWRITTEN (claro/escuro base matrix, AA)
├── identity.test.ts           # REWRITTEN (own identity + no-Horizon + no-panel audits)
├── voiceAudit.test.ts         # UPDATED (canonical strings)
└── (data/formatters/selectors/chart/anoEmAndamento tests: UNTOUCHED, green)
```

**Structure Decision**: Pillar-scoped static directories (explicit
`pilar-1/` folder, not a catch-all `[pilar]` dynamic segment) keep routes
honest and typed while satisfying the "future pillars without
restructuring" requirement — adding a pillar later means adding one
directory. Exports are Astro static endpoints built once per indicator.
Year semantics live in one pure module (`ano.ts`) consumed by pages and
cards.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    |            |                                      |
