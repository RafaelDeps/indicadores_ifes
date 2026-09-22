# Data Model: Rework de IA e identidade

**Feature**: `003-pillar-ia-rework` | **Date**: 2026-09-21

Indicator data (Indicador/ValorAnual/Variavel/Componente) is UNCHANGED — see
`specs/001-pillar1-indicators-dashboard/data-model.md` and
`specs/003-pillar-ia-rework/contracts/export-contract.md`. This feature adds
routing/year-state entities and replaces the identity tokens. Contracts:
[contracts/routes-contract.md](./contracts/routes-contract.md),
[contracts/export-contract.md](./contracts/export-contract.md),
[contracts/identity-contract.md](./contracts/identity-contract.md).

## Entities

### Pilar

A CONIF pillar exposed in the navigation.

| Campo  | Tipo                    | Regras                                 |
| ------ | ----------------------- | -------------------------------------- |
| numero | `1 \| 2 \| 3`           | Unique                                 |
| slug   | `string`                | `pilar-<numero>`; URL segment          |
| titulo | `string`                | pt-BR (Pilar 1: "Pesquisa e Inovação") |
| status | `"ativo" \| "em-breve"` | Only Pillar 1 is `ativo`               |

Rules: `em-breve` pillars render placeholder cards WITHOUT content links
(FR-001). The indicator set of a pillar lives only in Pillar 1 today.

### AnoSelecionado (URL year state)

The year a page displays, derived from the URL query.

| Campo   | Tipo             | Regras                                                                                         |
| ------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| bruto   | `string \| null` | Value of `?ano=` in the URL                                                                    |
| ano     | `number`         | Well-formed years: 2000–2100 (may have no data → page shows "Dado indisponível" for that year) |
| efetivo | `number`         | `ano` when well-formed; otherwise the default year                                             |

Default year rule: latest year with values that is not the in-progress year
(2026); falls back to the in-progress year when it is the only one with
data. For unavailable indicators (no values at all), the page shows "Dado
indisponível" regardless of year.

State transitions: `?ano=<novo>` navigation replaces the displayed year;
back/forward restore previous years natively (real navigations). No state is
stored outside the URL.

### Exportação

Static per-indicator files generated at build.

| Campo     | Valor                                                                 |
| --------- | --------------------------------------------------------------------- |
| CSV       | UTF-8 BOM; `;` separator; `ano;valor;motivo` rows; component sections |
| JSON      | The indicator's repository data file, verbatim                        |
| Endpoints | `/pilar-1/<sigla>/dados.csv`, `/pilar-1/<sigla>/dados.json`           |

### Token de identidade (replaces Horizon tokens)

Own palette with claro/escuro variants (base AA), single typeface family,
no institutional stripe. Values fixed in
[contracts/identity-contract.md](./contracts/identity-contract.md) and
locked by tests.

## Relationships

- `Pilar 1 ── * Indicador` (navigation grouping only; data files unchanged)
- `Indicador ── 1 AnoSelecionado` per page render (query-derived)
- `Indicador ── 2 Exportação` (CSV + JSON)

## State transitions

- Pillars 2/3: `em-breve` → future `ativo` is a content addition (new data +
  directory), no restructuring.
- Year: URL-driven only; no persistence across visits (no localStorage).
- Dark mode: follows the OS preference on load; no user override anymore.

## Volume

6 pages, 8 export endpoints, 3 pillar entries, 4 indicators. Trivial.
