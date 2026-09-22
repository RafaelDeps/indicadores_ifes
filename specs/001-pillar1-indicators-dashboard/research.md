# Research: Dashboard de Indicadores Pilar 1 CONIF

**Feature**: `001-pillar1-indicators-dashboard` | **Date**: 2026-09-21

All Technical Context fields were resolvable from the constitution and the
spec; no external research tasks were required. This file records the
decisions made for each potentially-ambiguous area, with rationale and
rejected alternatives.

## D1 — Site framework

- **Decision**: Astro 5.x static output with TypeScript, per constitution.
- **Rationale**: Constitution Principle I fixes the stack; static output
  matches the read-only, publicly hosted nature of the dashboard and
  Principle VI's GitHub Pages deploy.
- **Alternatives considered**: Next.js/React SPA (extra runtime + deps,
  violates Principle I); plain static HTML generator scripts (loses
  component model and typed data imports).

## D2 — Historical series chart without a chart library

- **Decision**: Hand-rolled inline SVG chart (`SeriesChart.astro` + pure
  mapping functions in `src/lib/chart.ts`), rendered at build time; no
  charting dependency.
- **Rationale**: Principle I minimizes dependencies; the chart is a simple
  per-year value trend (few points). Pure mapping functions
  (years/values → SVG coordinates) are ideal TDD targets (Principle II).
  Years without data are never plotted as zero — they are skipped and the
  listing shows "Dado indisponível" (Principle III).
- **Alternatives considered**: Chart.js/Recharts (runtime JS + hydration,
  unnecessary deps); CSS-only bar chart (poor fit for trend reading, harder
  to make accessible labels).

## D3 — Data format and location

- **Decision**: One JSON file per indicator in `src/data/`, typed by a
  discriminated shape (`valor: number | null` with required
  `motivoIndisponivel` when `null`), imported at build time.
- **Rationale**: JSON imports are native to Astro/Vite with zero parsing
  code; one file per indicator keeps manual report transcription and review
  (git diff) simple. The type makes "no data" structurally distinct from
  zero, enforcing Principle III at the type level.
- **Alternatives considered**: CSV (needs a parser; worse for nested
  variables/components); YAML (extra dependency); SQLite (backend, out of
  scope).

## D4 — Representing missing data

- **Decision**: Missing value = `valor: null` + `motivoIndisponivel` string
  naming the missing input (e.g., "Total de matriculados não informado").
  A single formatter (`formatValor`) renders every missing value as
  "Dado indisponível"; zero is a legitimate data value only when the report
  itself reports zero.
- **Rationale**: Centralizes Principle III in one tested function so no
  component can accidentally render `0` for `null`.
- **Alternatives considered**: Sentinel values (-1) (error-prone, leaks into
  aggregates); per-component ad-hoc conditionals (duplicated logic).

## D5 — Routing and page generation

- **Decision**: `src/pages/index.astro` (overview) +
  `src/pages/indicadores/[slug].astro` with `getStaticPaths` generating
  `/indicadores/ntpp`, `/indicadores/qspp`, `/indicadores/pies`,
  `/indicadores/picot` at build time.
- **Rationale**: Pre-rendered static pages, no client router; slugs
  lowercase ASCII for clean GitHub Pages URLs.
- **Alternatives considered**: Hash-based single page (worse URLs,
  shareability, accessibility).

## D6 — Year selector behavior on a static site

- **Decision**: All years' values are embedded in the detail page's static
  HTML; a tiny vanilla inline script toggles the displayed value when the
  user selects a year. No framework island, no hydration runtime.
- **Rationale**: Principle I (no extra layers); the interaction is a trivial
  value swap; works without JS by default (the listing always shows every
  year's value).
- **Alternatives considered**: Astro islands with Preact/Solid (adds a
  client framework); server endpoints (out of scope — static site).

## D7 — pt-BR formatting

- **Decision**: `Intl.NumberFormat("pt-BR")` /
  `Intl.DateTimeFormat("pt-BR")` (platform built-ins) inside the tested
  formatter module; user-facing literals hardcoded in pt-BR in components.
- **Rationale**: Correct decimal comma and date formats with zero
  dependencies; formatting is a TDD target.
- **Alternatives considered**: Manual string formatting (reimplements
  built-ins); i18n libraries (out of scope — single language).

## D8 — CI/CD pipeline

- **Decision**: Single GitHub Actions workflow: on push/PR → install →
  lint (ESLint) → format check (Prettier) → test (Vitest) → build (Astro)
  → deploy job (GitHub Pages via official actions) dependent on the build
  job succeeding.
- **Rationale**: Implements Principle VI exactly: publication only after
  tests and build pass.
- **Alternatives considered**: Deploy from local machine (manual, violates
  Principle VI); third-party CI (unneeded external dependency).

## D9 — Lint/format toolchain

- **Decision**: ESLint flat config with `typescript-eslint` +
  `eslint-plugin-astro` + `eslint-plugin-jsx-a11y` (astro preset), Prettier
  with Astro plugin; both run as CI gates.
- **Rationale**: Official Astro integrations; a11y checks support Principle
  V's "works well" requirement at negligible cost.
- **Alternatives considered**: Biome (single tool, less established for
  `.astro` files at decision time); no linting (violates Principle V).

## D10 — Indicator display names (resolves spec's outstanding terminology item)

- **Decision**: Full names, formulas, variable descriptions, and data
  sources are transcribed verbatim from the official report into each JSON
  file's `nome`, `formula`, `variaveis`, and `fonteDados` fields; acronyms
  (NTPP, QSPP, PIES, PICOT, NEP) are used for headings/cards with the full
  name shown alongside.
- **Rationale**: Keeps the spec's promise that methodology content comes
  from the report (Principle III) without inventing terminology.
- **Alternatives considered**: Hardcoding names in components (duplicates
  data, harder to update with new report editions).
