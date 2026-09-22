# Research: Rework de IA e identidade — páginas por pilar com ano na URL

**Feature**: `003-pillar-ia-rework` | **Date**: 2026-09-21

No external research tasks were required; the stack is fixed and the two
open questions were resolved in `/speckit.clarify` (claro + escuro
automático; CSV pt-BR). Decisions with rationale and rejected alternatives:

## D1 — Pillar-scoped static directories (no catch-all route)

- **Decision**: `src/pages/pilar-1/index.astro` +
  `src/pages/pilar-1/[sigla].astro` with `getStaticPaths` over the four
  indicators. Future pillars add `src/pages/pilar-2/…` etc.
- **Rationale**: Explicit directories keep routes honest and typed; the spec
  requires only that future pillars reuse the PATTERN without restructuring,
  and adding one directory per pillar satisfies exactly that. A global
  `[pilar]/[sigla].astro` would render arbitrary unknown slugs and blur
  which pillar owns which indicators.
- **Alternatives considered**: Catch-all `[pilar]/[sigla]` (permissive 200s
  for invalid pillars); content collections (overkill for 4 static entries).

## D2 — Year in the URL: plain navigation, not client state

- **Decision**: The year control is a native `<select>` whose change event
  navigates to the same path with `?ano=<year>` (full browser navigation
  between pre-rendered static pages). On load, a small inline script reads
  `location.search` and renders the requested year's value; the historical
  listing remains fully readable without JavaScript (default year shown).
- **Rationale**: Static pages cannot read query strings at build time, and
  using real navigation makes shareable links AND back/forward work natively
  — no history API bookkeeping. Each year change is an instant static-page
  load.
- **Alternatives considered**: `history.pushState` + DOM swap (more client
  code, duplicated state); one pre-rendered page per year (URL would be
  paths, not query params as specified); links-only year list (kept as the
  no-JS-fallback content via the listing).

## D3 — Year resolution rules (`src/lib/ano.ts`)

- **Decision**: Pure function `anoSolicitado(query: string, indicador)`:
  1. Parse `?ano=`; non-numeric or outside 2000–2100 → default year.
  2. Default year = latest year with values that is not the in-progress year
     (2026); if only the in-progress year has values, default to it.
  3. A well-formed year within 2000–2100 but absent from the series renders
     as "Dado indisponível" for that year (per spec edge case: NTPP 2019).
- **Rationale**: The spec distinguishes "year with no data for this
  indicator" (show unavailable) from "invalid year" (fall back); the
  2000–2100 plausibility window is the same bound used by the data
  validation since feature 001. Default logic generalizes "latest closed
  year = 2025" so 2027 works later without edits.
- **Alternatives considered**: Strict fallback for ANY year without data
  (contradicts the spec's 2019 example); showing an error page (worse UX).

## D4 — "Never sum years" by construction

- **Decision**: There is no combined-total code path: every displayed value
  comes from `valuesForYear(indicador, ano)` for one explicitly selected
  year (default year on overviews). The chart/listing show per-year values
  side by side. A Vitest audit asserts no page renders a value without a
  year label.
- **Rationale**: The constraint is structural, not stylistic — removing the
  "most recent value" card logic from feature 001 (replaced by
  "value for the default year, labeled") and never aggregating.
- **Alternatives considered**: Keeping a "total acumulado" card behind a
  flag (out of scope and contrary to the explicit instruction).

## D5 — Exports as build-time static endpoints

- **Decision**: `src/pages/pilar-1/[sigla]/dados.csv.ts` and `dados.json.ts`
  with `getStaticPaths` generate `/pilar-1/<sigla>/dados.csv` and
  `/pilar-1/<sigla>/dados.json` at build time; the detail page links to them
  with `download` attributes. CSV: UTF-8 with BOM, semicolon separator,
  columns ano;valor;motivo, then one section per component
  (componente;<sigla>;<nome> header, ano;quantidade;motivo rows). JSON: the
  indicator's repository data file verbatim.
- **Rationale**: Static endpoints need no server/JS, work on GitHub Pages,
  and the JSON download is byte-identical to the curated file (fidelity).
  pt-BR CSV (BOM + `;`) opens correctly in Excel pt-BR per the clarified
  decision.
- **Alternatives considered**: Client-side Blob generation (JS-dependent,
  untestable at build); hosting the raw files under /public (duplicates data
  outside the contract).

## D6 — Own visual identity (indigo, Source Sans 3, "IF" mark)

- **Decision**: Palette with indigo primary hue — `--color-primary`
  `#4F46E5` (claro) / `#818CF8` (escuro) for fills and chart marks;
  `--color-primary-dark` `#3730A3` / `#A5B4FC` for text, titles and links
  (≥ 4.5:1 in both modes, verified by the contrast matrix). Ink `#1E1B33` /
  `#ECEBF4`, bg `#F6F6FA` / `#12111A`, surface `#FFFFFF` / `#1B1A26`, border
  `#E3E3EE` / `rgba(255,255,255,0.12)`, muted, and amber notice tokens.
  Typeface: Source Sans 3 (400/600/700, latin subset, self-hosted woff2)
  with system fallbacks; numerals use tabular figures. Mark: "IF" monogram
  (two letters in a rounded square using the primary color) beside the text
  "Indicadores IFES". Horizon's stripe, "H" mark and Ubuntu fonts are
  removed (files, @font-face, tests).
- **Rationale**: Indigo is visibly unrelated to Horizon's green/yellow/red/
  blue stripe; Source Sans 3 is an open (OFL) institutional sans distinct
  from Ubuntu; the text mark uses the project's own name. All values are
  locked by the rewritten token/contrast tests (TDD).
- **Alternatives considered**: System-font-only stack (zero payload but
  weaker, less deliberate identity); teal/green family (too close to
  Horizon's green).

## D7 — Dark mode without the panel

- **Decision**: Tokens keep the claro base and the escuro scope; a three-line
  inline script sets `data-theme` from `matchMedia('(prefers-color-scheme:
dark)')` on load — no localStorage, no UI, no listener bookkeeping.
  Without JavaScript the site renders claro.
- **Rationale**: Preserves the existing token/test infrastructure (scope
  parsing, cascade merging) while honoring the clarified "claro + escuro
  automático"; `uiState.ts`, the panel and the bootstrap-with-storage are
  deleted outright.
- **Alternatives considered**: `@media (prefers-color-scheme: dark)` with
  duplicated dark blocks (breaks the flat token parser and duplicates brand
  values); removing dark mode entirely (contradicts SC-005).

## D8 — Old routes replaced without redirects

- **Decision**: `src/pages/indicadores/` is deleted; no redirect pages.
- **Rationale**: Pre-launch site (documented assumption in the spec);
  redirects would add 6 files of permanent cruft for links that do not yet
  exist in the wild. If the site is ever launched before this ships, add
  redirects then.
- **Alternatives considered**: Meta-refresh redirect pages (permanent
  maintenance burden).
