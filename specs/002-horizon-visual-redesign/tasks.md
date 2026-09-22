---
description: 'Task list for feature implementation'
---

# Tasks: Redesign visual — sistema de marca Horizon

**Input**: Design documents from `/specs/002-horizon-visual-redesign/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/, quickstart.md

**Tests**: MANDATORY (constitution Principle II, Test-First Development). Test tasks come first in each phase and MUST be observed failing before the implementation task begins. Existing 43 tests MUST remain untouched and green.

**Hard boundary**: `src/data/**` and route definitions MUST NOT be modified in any task of this feature.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single Astro project: `src/styles/`, `src/lib/`, `src/components/`, `src/pages/`, `public/fonts/`, `tests/`
- Tokens contract: `specs/002-horizon-visual-redesign/contracts/tokens-contract.md`; UI contract: `contracts/ui-contract.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Brand assets and token scaffold

- [x] T001 Add self-hosted font files `public/fonts/ubuntu-400.woff2`, `ubuntu-500.woff2`, `ubuntu-700.woff2`, `ubuntu-mono-400.woff2`, `ubuntu-mono-500.woff2`, `ubuntu-mono-700.woff2` (latin subset, obtained from the official Ubuntu font release or the sibling horizon_dashboard repo)
- [x] T002 Create `src/styles/tokens.css` scaffold per tokens contract: base light palette in `:root` (9 color tokens), dark overrides in `[data-theme="escuro"]`, `--font-sans`/`--font-mono` stacks (Ubuntu/Ubuntu Mono first), `--font-size-step-*` (100%/112.5%/125%); import it in `src/components/BaseLayout.astro`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Token contract enforced by tests before any component restyle

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Write failing token-contract tests in `tests/tokens.test.ts`: exactly the 9 color tokens in base and dark scopes with the contract values; font stacks name Ubuntu/Ubuntu Mono first with system fallbacks; font-size steps are 100%/112.5%/125%; parse `src/styles/tokens.css` with regex (no new dependencies)
- [x] T004 Complete/correct `src/styles/tokens.css` until `tests/tokens.test.ts` passes

**Checkpoint**: Token foundation ready and contract-enforced

---

## Phase 3: User Story 1 — Identidade visual Horizon em todas as páginas (Priority: P1) 🎯 MVP

**Goal**: Institutional stripe above the header on every page, Horizon palette applied, Ubuntu/Ubuntu Mono typography self-hosted, cards as surface + 1px border without shadows — visual only

**Independent Test**: Build and open `/` and `/indicadores/ntpp`: stripe present in the correct order; dark-green titles/links; primary-green fills; mono numbers; no shadow on cards; no external font CDN requests; no weight 600

### Tests for User Story 1 (write FIRST, ensure they FAIL) ⚠️

- [x] T005 [US1] Write failing identity tests in `tests/identity.test.ts`: the 6 font files exist in `public/fonts/`; `src/components/BaseLayout.astro` declares `@font-face` with `import.meta.env.BASE_URL` and `font-display: swap` and renders `InstitutionalStripe` as the first element inside `<body>`; no raw hex colors in `src/components/**` or `src/layouts/**` (tokens only); no `font-weight: 600` anywhere in `src/**`; no external font URL (`http`/CDN) in `src/**`

### Implementation for User Story 1

- [x] T006 [US1] Create `src/components/InstitutionalStripe.astro`: fixed-height flex row, four equal vertical bars in the order amarelo, verde, vermelho, azul, using accent tokens (dark-mode variants apply automatically)
- [x] T007 [US1] Update `src/components/BaseLayout.astro`: render `InstitutionalStripe` as first element inside `<body>`; add `@font-face` rules for the 6 font files with URLs from `import.meta.env.BASE_URL` and `font-display: swap`; set body/heading font stacks from `--font-sans` and default `data-theme="auto" data-contrast="normal" data-fontsize="padrao"` on `<html>`
- [x] T008 [US1] Restyle `src/components/IndicatorCard.astro`: background `--color-surface`, border `1px solid var(--color-border)`, no box-shadow, titles/links `--color-primary-dark`, numeric values in `--font-mono`
- [x] T009 [P] [US1] Restyle `src/components/UnavailableNotice.astro` and `src/components/ComponentCount.astro` to tokens only (ink/aviso colors via tokens, mono numerals)
- [x] T010 [P] [US1] Restyle `src/components/YearSelector.astro` and `src/components/HistoricalSeries.astro` to tokens only (borders, surfaces, mono numeric cells)
- [x] T011 [US1] Restyle `src/components/SeriesChart.astro`: chart marks in `--color-primary`, axis labels in `--font-mono`, gridline/axis colors via `--color-border`

**Checkpoint**: Horizon identity visible on every page; identity tests green (quickstart S1)

---

## Phase 4: User Story 2 — Controles de acessibilidade com contraste WCAG AA/AAA (Priority: P1)

**Goal**: Fixed accessibility bar in the header (tema, contraste, tamanho da fonte), preferences persisted and applied before paint, contrast AA everywhere and AAA at máximo across claro/escuro

**Independent Test**: Toggle every control combination and run `npm run test`: contrast matrix passes for the 6 scopes (claro/escuro × normal/alto/máximo, AAA at máximo); choices persist across navigation; invalid stored values fall back gracefully

### Tests for User Story 2 (write FIRST, ensure they FAIL) ⚠️

- [x] T012 [P] [US2] Write failing contrast-math tests in `tests/contrast.test.ts`: relative luminance and ratio known values (e.g., white vs black = 21:1; identical colors = 1:1), `#RRGGBB` and `rgba()` parsing, rounding to 2 decimals
- [x] T013 [P] [US2] Extend `tests/contrast.test.ts` with the scope matrix: parse the token scopes from `src/styles/tokens.css` (claro/escuro × normal/alto/maximo), assemble the semantic pairs (texto↔fundo, texto↔superfície, verde-escuro↔superfície, avisos, links, barra do gráfico↔superfície as non-text 3:1) and assert AA for normal/alto and AAA for maximo; assert no white-text-on-yellow pair exists in any scope
- [x] T014 [P] [US2] Write failing UI-state tests in `tests/uiState.test.ts`: canonical values only (`claro|escuro|auto`, `normal|alto|maximo`, `padrao|grande|maior`), defaults `auto/normal/padrao`, localStorage keys `horizon:theme`, `horizon:contrast`, `horizon:fontsize`, invalid/corrupt stored values fall back to defaults, `auto` resolves via `prefers-color-scheme`

### Implementation for User Story 2

- [x] T015 [US2] Implement `src/lib/contrast.ts`: WCAG relative luminance and contrast ratio for hex and rgba inputs (pure TypeScript, no dependencies) to pass T012
- [x] T016 [US2] Add `[data-contrast="alto"]` and `[data-contrast="maximo"]` override scopes (theme-qualified) to `src/styles/tokens.css` — semantic token overrides only, no new hues — until the T013 matrix passes (tests settle the exact override values)
- [x] T017 [US2] Implement `src/lib/uiState.ts`: load/apply/persist the three preferences (canonical values, fixed localStorage keys, corrupt-value fallback, OS `prefers-color-scheme` listener for `auto`) to pass T014
- [x] T018 [US2] Create `src/components/AccessibilityBar.astro` (three native, labeled, keyboard-operable controls with exact pt-BR labels: Tema `Automático/Claro/Escuro`, Contraste `Normal/Alto/Máximo`, Tamanho da fonte `Padrão/Grande/Maior`) and wire it into `src/components/BaseLayout.astro` with an inline head script calling `uiState` before first paint (no flash of wrong theme)

**Checkpoint**: Accessibility bar functional on every page; contrast matrix green (quickstart S2)

---

## Phase 5: User Story 3 — Registro institucional sóbrio em pt-BR (Priority: P2)

**Goal**: All interface text in the sober institutional register: forbidden terms and emoji audited, canonical headings in sentence case

**Independent Test**: Run the voice-audit tests over the component string sources and manually review headings/labels — zero forbidden terms, zero emoji, sentence case everywhere

### Tests for User Story 3 (write FIRST, ensure they FAIL) ⚠️

- [x] T019 [US3] Write failing voice-audit tests in `tests/voiceAudit.test.ts`: forbidden terms (`poderoso`, `premium`, `inteligente`, `eleve`, `transforme`, `potencialize`) absent from user-facing strings in `src/components/**`; no emoji (Unicode pictograph ranges) in headings or labels; canonical strings in sentence case (`Indicadores de Pesquisa e Inovação`, `Valor por ano`, `Série histórica`, `Metodologia`, `Dado indisponível`, `Quanto maior, melhor`, `Ver detalhes`, `Tema`, `Contraste`, `Tamanho da fonte`)

### Implementation for User Story 3

- [x] T020 [US3] Implement `src/lib/voiceAudit.ts` (wordlist + emoji regex matcher) and fix any string violations found in `src/components/**` until `tests/voiceAudit.test.ts` passes

**Checkpoint**: Register audit green (quickstart S3)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, end-to-end validation, quality sweep

- [x] T021 [P] Update `README.md`: Horizon brand section (palette reference to tokens.css), self-hosted fonts note, and how to use the accessibility controls
- [x] T022 Execute quickstart validation S1–S5 from `specs/002-horizon-visual-redesign/quickstart.md` (identity, accessibility, voice, zero data regression — all 43 pre-existing tests still green untouched — and deploy gates)
- [x] T023 Quality sweep: mobile ~360px at all three font sizes (no horizontal scrolling), keyboard operability of the accessibility bar, ESLint/Prettier/build green

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)** → **US2 (Phase 4)**: contrast scopes build on the restyled token consumption; implement in order
- **US3 (Phase 5)**: Depends on US1 (audits the restyled components' strings); independent of US2
- **Polish (Phase 6)**: Depends on all user stories

### User Story Dependencies

- **US1 (P1)**: After Foundational — no dependencies on other stories
- **US2 (P1)**: After US1 (tokens consumed by components; matrix over final scopes)
- **US3 (P2)**: After US1; can run in parallel with US2

### Within Each User Story

- Tests (red) before implementation (green) — constitution Principle II
- Pure lib modules before components that consume them

### Parallel Opportunities

- Phase 1: T001 and T002 touch different files (fonts vs tokens) — T002 imports tokens.css, independent of T001
- US1: T009 and T010 are parallelizable after T008 establishes the token style pattern
- US2: T012, T013, T014 are three test concerns (math, matrix, state) — T012/T014 parallelizable; T013 extends T012's file
- US3 can run in parallel with US2 (different files) after US1

---

## Parallel Example: User Story 2

```bash
# Launch independent test-writing tasks together (different test concerns):
Task: "Contrast math tests in tests/contrast.test.ts"
Task: "UI state tests in tests/uiState.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: US1
4. **STOP and VALIDATE**: quickstart S1 — Horizon identity visible on every page

### Incremental Delivery

1. Setup + Foundational → token contract enforced
2. Add US1 → institutional identity demoable (MVP)
3. Add US2 → accessibility guarantees with automated AA/AAA proof
4. Add US3 → institutional register audited
5. Polish → release-ready

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Verify tests fail BEFORE implementing (red → green → refactor)
- `src/data/**` and routes are out of bounds for every task
- Existing 43 tests must remain green and unmodified (zero data regression)
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
