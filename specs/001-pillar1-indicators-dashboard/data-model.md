# Data Model: Dashboard de Indicadores Pilar 1 CONIF

**Feature**: `001-pillar1-indicators-dashboard` | **Date**: 2026-09-21

Entities as defined in the spec ([spec.md](./spec.md) — Key Entities),
materialized as typed shapes in `src/data/indicadores.ts` and one JSON file
per indicator. See [contracts/data-contract.md](./contracts/data-contract.md)
for the exact file contract and validation rules.

## Entities

### Indicador

One Pillar 1 indicator. Identity: `sigla` (unique, uppercase acronym) /
`slug` (unique, lowercase ASCII, drives the URL).

| Field             | Type                                    | Rules                                        |
| ----------------- | --------------------------------------- | -------------------------------------------- |
| `sigla`           | `"NTPP" \| "QSPP" \| "PIES" \| "PICOT"` | Unique; verbatim from report                 |
| `slug`            | `string`                                | `sigla.toLowerCase()`; unique; URL segment   |
| `nome`            | `string`                                | Full name transcribed from the report        |
| `oQueMede`        | `string`                                | What the indicator measures, from the report |
| `formula`         | `string`                                | Formula as presented in the report           |
| `variaveis`       | `Variavel[]`                            | ≥ 1 entry                                    |
| `polaridade`      | `"maior-e-melhor"`                      | All four indicators are higher-is-better     |
| `fonteDados`      | `string`                                | Data source, from the report                 |
| `dataAtualizacao` | `string (YYYY-MM-DD) \| null`           | `null` renders as "Dado indisponível"        |
| `valores`         | `ValorAnual[]`                          | ≥ 0 entries; years unique and ascending      |
| `componentes`     | `Componente[]`                          | ≥ 0 entries (e.g., NEP)                      |

### ValorAnual

The indicator's value for one calendar year, or an explicit unavailable
state.

| Field                | Type                  | Rules                                                   |
| -------------------- | --------------------- | ------------------------------------------------------- |
| `ano`                | `number`              | Calendar year; unique within `valores`                  |
| `valor`              | `number \| null`      | `null` ⇔ missing data; MUST NOT be a placeholder zero   |
| `motivoIndisponivel` | `string \| undefined` | REQUIRED when `valor === null`; names the missing input |

Invariant (Principle III): a missing value is `null` + reason; a real zero
may only appear when the report itself reports zero.

### Variavel

| Field       | Type     | Rules                        |
| ----------- | -------- | ---------------------------- |
| `sigla`     | `string` | Variable acronym (e.g., NEP) |
| `descricao` | `string` | Description from the report  |

### Componente

A quantity inside the indicator's formula displayed as a plain count, never
as the percentage.

| Field     | Type                                                                         | Rules                               |
| --------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| `sigla`   | `string`                                                                     | e.g., `"NEP"`                       |
| `nome`    | `string`                                                                     | Full name from the report           |
| `valores` | `{ ano: number; quantidade: number \| null; motivoIndisponivel?: string }[]` | Same null-invariant as `ValorAnual` |

## Relationships

- `Indicador 1 ── * ValorAnual` (ordered by `ano`)
- `Indicador 1 ── * Componente`; `Componente 1 ── * ValorAnual`-like counts
- A `Componente.sigla` typically appears in the parent indicator's
  `variaveis` list.

## State transitions

- **Indicador**: `indisponível` → `disponível` when the report later supplies
  the missing inputs (e.g., total de matriculados for PIES, modalidade de
  ingresso for PICOT). This is a **data change only** — no code or layout
  change; pages/cards render from data.
- **ValorAnual**: immutable per report edition; a new report edition adds or
  amends rows via a repository data update.

## Data volume / scale

- 4 indicators; expected single-digit to low-double-digit number of years
  each; 0–2 components per indicator. Trivial volume; no pagination,
  lazy-loading, or compression strategies needed.

## Validation rules (enforced by tests + loader)

1. `sigla`/`slug` unique across the four data files; exactly four indicators
   with the expected acronyms.
2. `valores` years strictly ascending, no duplicates; `ano` within
   2000–2100.
3. `valor === null` ⇔ `motivoIndisponivel` present and non-empty.
4. `dataAtualizacao`, when present, matches `YYYY-MM-DD`.
5. No field may contain personal or individual-level data (review on data
   PRs; Principle IV).
6. `componentes[*].valores` follow rule 3 as well.
