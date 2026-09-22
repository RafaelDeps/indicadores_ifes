# Quickstart: Dashboard de Indicadores Pilar 1 CONIF

Validation guide proving the feature works end-to-end. Implementation
details live in [plan.md](./plan.md) and `tasks.md`; data rules in
[data-model.md](./data-model.md); rendered text in
[contracts/pages-contract.md](./contracts/pages-contract.md).

## Prerequisites

- Node 20 LTS and npm
- Data files present at `src/data/*.json` (one per indicator, per
  [contracts/data-contract.md](./contracts/data-contract.md))

## Setup

```bash
npm install
```

## Commands

| Command                | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `npm run dev`          | Local dev server                             |
| `npm run test`         | Vitest unit tests (all `src/lib` logic)      |
| `npm run lint`         | ESLint (must pass with zero errors)          |
| `npm run format:check` | Prettier check                               |
| `npm run build`        | Astro static build (pre-renders all 5 pages) |
| `npm run preview`      | Serves the built site for validation         |

## Validation scenarios

### S1 — Overview shows the four indicators (SC-001, FR-001..FR-003)

1. `npm run build && npm run preview`; open `/`.
2. **Expected**: exactly four cards — NTPP, QSPP, PIES, PICOT — in that
   order; each shows its most recent available value with year, or
   `Dado indisponível`; each links to `/indicadores/{slug}`.

### S2 — Detail page with data (US2, FR-004..FR-007)

1. Open `/indicadores/ntpp`.
2. **Expected**: methodology shows `O que mede`, `Fórmula`, `Variáveis`,
   `Polaridade: quanto maior, melhor`, `Fonte dos dados`,
   `Data de atualização`.
3. Select different years in the selector: **Expected**: displayed value
   changes to the selected year's report value.
4. Check the série histórica: **Expected**: listing of every year's value in
   ascending order plus the SVG chart; values match the report exactly;
   years without data render `Dado indisponível` and are not plotted as
   zero.

### S3 — Unavailable indicators explained (US3, FR-008, FR-009)

1. Open `/indicadores/pies`: **Expected**: `Dado indisponível` with an
   explanation naming the missing total de matriculados; no numeric value
   or estimate anywhere.
2. Open `/indicadores/picot`: **Expected**: same pattern, naming the
   missing modalidade de ingresso.
3. Confirm the overview cards for PIES/PICOT also show `Dado indisponível`
   (never `0`).

### S4 — Component counts labeled (US4, FR-010)

1. Open a detail page whose data includes a component (e.g., NEP).
2. **Expected**: the component appears as a plain count per available year,
   each labeled `Contagem absoluta — não é o percentual do indicador`.

### S5 — Quality gates (Principles II, V, VI)

1. `npm run test`, `npm run lint`, `npm run format:check`,
   `npm run build` — all must pass.
2. At a ~360 px-wide viewport: **Expected**: all pages readable, no
   horizontal scrolling.
3. All visible text is pt-BR.
4. Push to a branch: **Expected**: GitHub Actions runs lint → format check
   → tests → build, and the GitHub Pages deploy job only runs after they
   all succeed.

### S6 — Data fidelity spot check (SC-003)

Pick three values from the official report (one per indicator with data) and
compare with the rendered pages: **Expected**: exact match, including
decimal formatting per pt-BR conventions (decimal comma).
