# Pages Contract: routes and user-facing text

**Feature**: `001-pillar1-indicators-dashboard` | **Date**: 2026-09-21

Contract for the site's URLs and their rendered sections/labels. All
user-facing text is pt-BR (constitution Principle V); strings marked
**exact** must match character-for-character.

## Routes

| Route                | Page         | Generated                 |
| -------------------- | ------------ | ------------------------- |
| `/`                  | Overview     | Static                    |
| `/indicadores/ntpp`  | NTPP detail  | Static (`getStaticPaths`) |
| `/indicadores/qspp`  | QSPP detail  | Static                    |
| `/indicadores/pies`  | PIES detail  | Static                    |
| `/indicadores/picot` | PICOT detail | Static                    |

## Overview page (`/`)

- Heading and page title in pt-BR identifying the dashboard (Indicadores de
  Pesquisa e Inovação — Pilar 1 CONIF).
- Exactly four cards in fixed order: NTPP, QSPP, PIES, PICOT. Each card:
  - Indicator acronym + full name.
  - Most recent available value (pt-BR number format) + reference year, or
    **exact**: `Dado indisponível`.
  - Links to `/indicadores/{slug}` (whole card clickable).

## Detail page (`/indicadores/{slug}`)

Sections, in order:

1. **Header**: acronym + full name.
2. **Current year value**: year selector (all years present in the data,
   pre-selected to the most recent year with data) + the selected year's
   value, or **exact**: `Dado indisponível` for years without data.
   Behavior: value updates on selection via tiny inline script; without
   JavaScript the historical listing below remains fully readable.
3. **Série histórica**: year/value listing for every year in the data
   (ascending), plus the inline SVG trend chart (years without data are not
   plotted; the listing shows `Dado indisponível` for them).
4. **Unavailable explanation** (indicators without enough data — currently
   PIES and PICOT): `Dado indisponível` plus a sentence naming the missing
   input (PIES: total de matriculados; PICOT: modalidade de ingresso). No
   estimated value.
5. **Component counts** (when present, e.g., NEP): plain count per available
   year, each labeled **exact**:
   `Contagem absoluta — não é o percentual do indicador`.
6. **Methodology**:
   - `O que mede` — full text from the report.
   - `Fórmula` — as presented in the report.
   - `Variáveis` — acronym + description list.
   - **exact**: `Polaridade: quanto maior, melhor`.
   - `Fonte dos dados` — from the report.
   - `Data de atualização` — pt-BR formatted date, or `Dado indisponível`.

## Shared UI invariants

- `<html lang="pt-BR">`; document titles follow
  `{Nome do indicador} — Indicadores Pilar 1 CONIF` on detail pages.
- Mobile-first responsive layout: no horizontal scrolling at common phone
  widths; chart and tables remain legible.
- No login, no data editing UI, no Pillar 2/3 content anywhere.
