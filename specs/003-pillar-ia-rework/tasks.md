---
description: 'Task list for feature implementation'
---

# Tasks: Rework de IA e identidade — páginas por pilar com ano na URL

**Input**: Design documents from `/specs/003-pillar-ia-rework/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: MANDATORY (constitution Principle II). Test tasks come first and MUST be observed failing before the implementation task begins.

**Hard boundaries**: `src/data/**` untouched; indicator values and the JSON data contract unchanged; the pre-existing data/formatters/selectors/chart/anoEmAndamento suites remain green and unmodified (uiState suite is deleted together with the panel it tested).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single Astro project: `src/pages/`, `src/pages/pilar-1/`, `src/components/`, `src/layouts/`, `src/lib/`, `src/styles/`, `public/fonts/`, `tests/`
- Contracts: `specs/003-pillar-ia-rework/contracts/` (routes, export, identity)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Asset swap for the new identity

- [x] T001 Add self-hosted `public/fonts/source-sans-3-400.woff2`, `source-sans-3-600.woff2`, `source-sans-3-700.woff2` (latin subset, OFL — Google Fonts) and DELETE `public/fonts/ubuntu-400.woff2`, `ubuntu-500.woff2`, `ubuntu-700.woff2`, `ubuntu-mono-400.woff2`, `ubuntu-mono-500.woff2`, `ubuntu-mono-700.woff2`

---

## Phase 2: Foundational (Identity tokens + BaseLayout — blocking)

**Purpose**: Own identity in place before any page rework; Horizon and the a11y panel removed

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] Rewrite `tests/tokens.test.ts` for the identity contract: exactly the tokens of `specs/003-pillar-ia-rework/contracts/identity-contract.md` in `:root` (claro) and `[data-theme='escuro']` (escuro) — NO contrast-level scopes; `--font-sans` names 'Source Sans 3' first
- [x] T003 [P] Rewrite `tests/contrast.test.ts`: claro/escuro base matrix (AA text pairs, chart mark ≥3:1, notice pair) using `src/lib/contrast.ts`; remove alto/maximo scopes and the yellow rule
- [x] T004 [P] Rewrite `tests/identity.test.ts`: the 3 Source Sans 3 files exist and ubuntu-*.woff2 do NOT; `src/layouts/BaseLayout.astro` declares @font-face with `import.meta.env.BASE_URL` + `font-display: swap`; renders the "IF" monogram + "Indicadores IFES" mark; contains NO InstitutionalStripe, NO AccessibilityBar, NO uiState references, NO data-contrast/data-fontsize, NO "Ubuntu"; no raw hex outside `src/styles/tokens.css`
- [x] T005 Rewrite `src/styles/tokens.css` to the identity contract (indigo palette claro/escuro, Source Sans 3 stacks, tabular-nums guidance comment) — makes T002/T003 green
- [x] T006 Create `src/components/HeaderMarca.astro` ("IF" monogram + text mark) and rewrite `src/layouts/BaseLayout.astro` (Source Sans 3 @font-face, three-line dark-mode script setting data-theme, no stripe/panel/Ubuntu, no data-contrast/data-fontsize); DELETE `src/components/InstitutionalStripe.astro`, `src/components/AccessibilityBar.astro`, `src/lib/uiState.ts`, `tests/uiState.test.ts` — makes T004 green

**Checkpoint**: Own identity rendered on every page; Horizon and the panel are gone; suite green

---

## Phase 3: User Story 1 — Navegação por pilares (Priority: P1) 🎯 MVP

**Goal**: `/` with three pillar cards (P1 ativo, P2/P3 "em breve"), `/pilar-1/` with 4 indicator cards, details at `/pilar-1/<sigla>/`; old routes removed

**Independent Test**: Visit `/`, `/pilar-1/` and the four detail routes; pillar placeholders without links; four cards linking correctly; `/indicadores/...` gone

### Tests for User Story 1 (write FIRST, ensure they FAIL) ⚠️

- [x] T007 [P] [US1] Create `tests/routes.test.ts`: `src/pages/pilar-1/index.astro` and `src/pages/pilar-1/[sigla].astro` exist; `src/pages/indicadores/` does NOT exist; `src/pages/index.astro` references the three pillar cards with two "em breve"; `[sigla].astro` declares getStaticPaths over the four indicators; pillar links use the `/pilar-1/` prefix

### Implementation for User Story 1

- [x] T008 [US1] Create `src/components/CartaoPilar.astro` (ativo → link; "em breve" → non-link placeholder card) and rewrite `src/pages/index.astro` (overview of the three pillars, sober pt-BR copy)
- [x] T009 [US1] Create `src/pages/pilar-1/index.astro` (exactly four `IndicatorCard`s: NTPP, QSPP, PIES, PICOT) with breadcrumb back to `/`
- [x] T010 [US1] Create `src/pages/pilar-1/[sigla].astro` (getStaticPaths over the four indicators; header, value/selector area, série histórica, methodology, export area placeholder, breadcrumb) and DELETE `src/pages/indicadores/`

**Checkpoint**: New IA navigable end-to-end (quickstart S1)

---

## Phase 4: User Story 2 — Ano explícito na URL (Priority: P1)

**Goal**: Every value tied to an explicit year; `?ano=YYYY` in the URL with native back/forward; default 2025; 2026 labeled partial; never sum years; PIES/PICOT unavailable regardless

**Independent Test**: Open detail with/without `?ano=`, change year, use back/forward, share `?ano=2024`, `?ano=2019`, `?ano=abc`, `?ano=1999`; overview cards show the default year labeled; no combined numbers anywhere

### Tests for User Story 2 (write FIRST, ensure they FAIL) ⚠️

- [x] T011 [P] [US2] Create `tests/ano.test.ts` for `src/lib/ano.ts`: default year = latest with values excluding the in-progress year (2025 for NTPP/QSPP); fallback to the in-progress year when it is the only one with values; `?ano=2024` → 2024; `?ano=2019` → 2019 (well-formed, page shows unavailable); `?ano=abc` and `?ano=1999` → default; `?ano=2026` → 2026 (labeled partial upstream); integration with `valuesForYear` for the unavailable indicators

### Implementation for User Story 2

- [x] T012 [US2] Implement `src/lib/ano.ts` (query parsing, well-formed window 2000–2100, default-year rule reusing `src/lib/anoEmAndamento.ts`) — makes T011 green
- [x] T013 [US2] Create `src/components/YearLinks.astro` (native select navigating to the same path with `?ano=<year>`; reads `location.search` on load; 2026 option labeled "2026 — em andamento") and integrate the year-value area into `src/pages/pilar-1/[sigla].astro` (value of the resolved year via `valuesForYear`, partial label, "Dado indisponível" for years without data or unavailable indicators)
- [x] T014 [US2] Rework `src/components/IndicatorCard.astro`: value for the DEFAULT year labeled with the year (uses `src/lib/ano.ts`), "Dado indisponível" for unavailable indicators — no most-recent-value logic left

**Checkpoint**: Year semantics verified end-to-end (quickstart S2)

---

## Phase 5: User Story 3 — Exportação CSV/JSON (Priority: P2)

**Goal**: Each detail page offers CSV (pt-BR) and JSON downloads of that indicator's repository data

**Independent Test**: Download both formats for NTPP and PIES; CSV matches the export contract (BOM, `;`, ano;valor;motivo, component sections); JSON is byte-identical to `src/data/<sigla>.json`

### Tests for User Story 3 (write FIRST, ensure they FAIL) ⚠️

- [x] T015 [P] [US3] Create `tests/exportacao.test.ts` for `src/lib/exportacao.ts`: CSV has BOM, `\r\n`, `ano;valor;motivo` rows ascending, empty valor + reason for unavailable years, `componente;<SIGLA>;<nome>` sections with `ano;quantidade;motivo`; JSON generation returns the repository file contents verbatim; no fabricated numbers

### Implementation for User Story 3

- [x] T016 [US3] Implement `src/lib/exportacao.ts` (`gerarCsv(indicador)`, `conteudoJson(indicador)`) — makes T015 green
- [x] T017 [US3] Create static endpoints `src/pages/pilar-1/[sigla]/dados.csv.ts` and `src/pages/pilar-1/[sigla]/dados.json.ts` (getStaticPaths × 4, correct Content-Type) and `src/components/ExportLinks.astro` ("Baixar CSV" / "Baixar JSON", `download` attribute), wired into `src/pages/pilar-1/[sigla].astro`

**Checkpoint**: Exports verifiable (quickstart S3)

---

## Phase 6: User Story 4 — Identidade própria e registro (Priority: P2)

**Goal**: All remaining components styled with the own identity; voice audit canonical strings updated; nothing of Horizon remains in components

**Independent Test**: Visual pass on all pages (indigo, Source Sans 3, monogram, thin borders, no shadows) + voice audit green

### Tests for User Story 4 (write FIRST, ensure they FAIL) ⚠️

- [x] T018 [P] [US4] Update `tests/voiceAudit.test.ts` canonical strings: keep the institutional core ("Indicadores de Pesquisa e Inovação", "Dado indisponível", "Quanto maior, melhor", "Metodologia", "Série histórica", "Valor por ano"); replace panel labels with the new navigation strings ("Visão geral dos pilares", "Indicadores do Pilar 1", "Baixar CSV", "Baixar JSON"); keep forbidden-terms and emoji rules

### Implementation for User Story 4

- [x] T019 [US4] Restyle `src/components/SeriesChart.astro`, `src/components/HistoricalSeries.astro`, `src/components/UnavailableNotice.astro`, `src/components/ComponentCount.astro` with the new tokens (primary fills, tabular-nums numerals, notice pair) and fix any voice-audit violations until `tests/voiceAudit.test.ts` passes

**Checkpoint**: Identity complete across components (quickstart S4)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, end-to-end validation, quality sweep

- [x] T020 [P] Rewrite `README.md`: own identity section (indigo palette, Source Sans 3, mark), new routes and `?ano=` semantics, exports, automatic dark mode, data-update workflow
- [x] T021 Execute quickstart S1–S5 from `specs/003-pillar-ia-rework/quickstart.md` (routes, year URL semantics, exports, identity/panel removal, register + regression)
- [x] T022 Quality sweep: mobile ~360px (no horizontal scrolling), keyboard navigation of select/links, ESLint/Prettier/tests/build green, confirm `src/data/**` untouched and pre-existing suites green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)** → **US2 (Phase 4)**: year semantics build on the new pages
- **US3 (Phase 5)**: depends on US1's detail route; independent of US2's selector (links are static)
- **US4 (Phase 6)**: depends on US1/US2 pages existing (audits their strings/styles); independent of US3
- **Polish (Phase 7)**: depends on all user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependencies on other stories
- **US2 (P1)**: After US1 (pages exist to host the year semantics)
- **US3 (P2)**: After US1 (detail route + export area); independent of US2
- **US4 (P2)**: After US2 (strings/styles of the reworked components); independent of US3

### Within Each User Story

- Tests (red) before implementation (green)
- Pure lib modules before components/endpoints that consume them

### Parallel Opportunities

- Phase 2: T002, T003, T004 (three independent test files)
- US1: T007 before T008–T010 (audit first); T008/T009 touch different files
- US2: T011 single test file; T013/T014 sequential after T012
- US3: T015 before T016/T017; US3 ∥ US4 after US1/US2

---

## Parallel Example: Foundational

```bash
# Launch the three identity test rewrites together (different files):
Task: "Rewrite tests/tokens.test.ts for the identity contract"
Task: "Rewrite tests/contrast.test.ts (claro/escuro matrix)"
Task: "Rewrite tests/identity.test.ts (own identity, no Horizon, no panel)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1
4. **STOP and VALIDATE**: quickstart S1 — new IA navigable, Horizon gone

### Incremental Delivery

1. Setup + Foundational → own identity + panel removed
2. Add US1 → new IA demoable (MVP)
3. Add US2 → year-correct, shareable URLs (core correctness)
4. Add US3 + US4 → exports and complete identity
5. Polish → release-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail BEFORE implementing (red → green → refactor)
- `src/data/**`, indicator values and the data contract are out of bounds
- Pre-existing suites (data/formatters/selectors/chart/anoEmAndamento) stay green and unmodified; `tests/uiState.test.ts` is deleted with the panel
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
