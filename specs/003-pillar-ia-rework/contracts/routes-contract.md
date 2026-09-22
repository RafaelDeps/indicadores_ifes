# Routes Contract: URLs, ano query, navigation

**Feature**: `003-pillar-ia-rework` | **Date**: 2026-09-21

Contract for the site's URL map and year-selection semantics. Any change
MUST update `tests/ano.test.ts` and the route audits first (TDD).

## URL map

| Route                         | Página                             | Origem                                    |
| ----------------------------- | ---------------------------------- | ----------------------------------------- |
| `/`                           | Visão geral dos pilares            | `src/pages/index.astro`                   |
| `/pilar-1/`                   | Visão geral do Pilar 1 (4 cartões) | `src/pages/pilar-1/index.astro`           |
| `/pilar-1/ntpp/`              | Detalhe NTPP                       | `src/pages/pilar-1/[sigla].astro`         |
| `/pilar-1/qspp/`              | Detalhe QSPP                       | idem                                      |
| `/pilar-1/pies/`              | Detalhe PIES                       | idem                                      |
| `/pilar-1/picot/`             | Detalhe PICOT                      | idem                                      |
| `/pilar-1/<sigla>/dados.csv`  | Export CSV                         | `src/pages/pilar-1/[sigla]/dados.csv.ts`  |
| `/pilar-1/<sigla>/dados.json` | Export JSON                        | `src/pages/pilar-1/[sigla]/dados.json.ts` |

- Pattern reserved for the future: `/pilar-2/<sigla>/`, `/pilar-3/<sigla>/`.
- Old routes `/`, `/indicadores/…` from feature 001 are REMOVED without
  redirects (pre-launch assumption).

## Query parameter `ano`

- Canonical form: `?ano=<YYYY>` (4-digit year).
- Well-formed: numeric, 2000–2100. Behavior:
  - Year exists in the indicator's series → display that year's value (or
    "Dado indisponível" if that year has no value).
  - Year not in the series (e.g., 2019 for NTPP) → value area shows "Dado
    indisponível" for that year.
- Malformed or out of range (`abc`, `1999`) → default year.
- Default year (no `?ano=`): latest year with values excluding the
  in-progress year (today: 2025); if only the in-progress year has values,
  it is the default (still labeled partial). Today: **2025**.
- 2026 is always allowed and labeled "ano em andamento — dados parciais".

## Year control behavior

- Native `<select>`; on change the browser navigates to the same path with
  `?ano=<year>` (real navigation → back/forward and shared links work
  natively).
- On load, an inline script reads `location.search` and renders the
  requested year; without JavaScript the page shows the default year and the
  complete year/value listing (never a combined number).
- Overview cards on `/pilar-1/` display the DEFAULT year's value, labeled
  with the year; unavailable indicators show "Dado indisponível".

## Navigation invariants

- Every page links back to `/`; detail pages link back to `/pilar-1/`.
- `/` shows three pillar cards; `em-breve` pillars have no content links.
- No page displays an indicator value without an explicit year label, and no
  page displays a number that combines years.
