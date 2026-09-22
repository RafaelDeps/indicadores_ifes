# Data Contract: indicator JSON files

**Feature**: `001-pillar1-indicators-dashboard` | **Date**: 2026-09-21

Contract between the curated data files (`src/data/*.json`) and the
site build (loader `src/data/indicadores.ts`, components, tests). Any change
to this contract MUST be reflected in the typed loader and its tests first
(TDD, constitution Principle II).

## File layout

```text
src/data/
├── ntpp.json
├── qspp.json
├── pies.json
└── picot.json
```

## Shape

```json
{
  "sigla": "NTPP",
  "slug": "ntpp",
  "nome": "<full indicator name, verbatim from the report>",
  "oQueMede": "<what the indicator measures, from the report>",
  "formula": "<formula, as presented in the report>",
  "variaveis": [{ "sigla": "NEP", "descricao": "<variable description from the report>" }],
  "polaridade": "maior-e-melhor",
  "fonteDados": "<data source, from the report>",
  "dataAtualizacao": "2026-09-21",
  "valores": [
    { "ano": 2022, "valor": 42.5 },
    {
      "ano": 2023,
      "valor": null,
      "motivoIndisponivel": "Total de matriculados não informado no relatório."
    }
  ],
  "componentes": [
    {
      "sigla": "NEP",
      "nome": "<component full name from the report>",
      "valores": [
        { "ano": 2022, "quantidade": 123 },
        { "ano": 2023, "quantidade": null, "motivoIndisponivel": "Não informado no relatório." }
      ]
    }
  ]
}
```

- `componentes` may be `[]` and `valores` may be `[]` (e.g., PICOT while the
  admission modality data is missing).
- Numeric values are transcribed verbatim from the report (no rounding,
  re-basing, or estimation at any layer).

## Validation rules

1. Exactly four files; `sigla` values exactly `NTPP`, `QSPP`, `PIES`,
   `PICOT`; `slug === sigla.toLowerCase()`; both unique.
2. `valores[*].ano` strictly ascending, unique, within 2000–2100.
3. `valor === null` ⇔ `motivoIndisponivel` present and non-empty (same for
   `componentes[*].valores[*].quantidade`).
4. `dataAtualizacao` is `null` or `YYYY-MM-DD`.
5. `polaridade` is always `"maior-e-melhor"`.
6. No individual-level data anywhere in the files (Principle IV).

## Rendering invariants guaranteed by this contract

- A missing value renders as "Dado indisponível" (never `0`, never a
  fabricated number) — enforced by `formatValor` in `src/lib/formatters.ts`.
- A zero may only appear when the report itself reports zero.
- Component counts render with the label "Contagem absoluta — não é o
  percentual do indicador" (see [pages-contract.md](./pages-contract.md)).
