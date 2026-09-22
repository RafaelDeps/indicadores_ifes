# Export Contract: CSV (pt-BR) and JSON per indicator

**Feature**: `003-pillar-ia-rework` | **Date**: 2026-09-21

Contract for the build-time export endpoints. Any change MUST update
`tests/exportacao.test.ts` first (TDD).

## Endpoints

| Formato | URL                           | Content-Type                      |
| ------- | ----------------------------- | --------------------------------- |
| CSV     | `/pilar-1/<sigla>/dados.csv`  | `text/csv; charset=utf-8`         |
| JSON    | `/pilar-1/<sigla>/dados.json` | `application/json; charset=utf-8` |

## CSV (pt-BR convention)

- Encoding: UTF-8 with BOM (`\uFEFF` as first character).
- Separator: `;`. Line break: `\r\n`.
- Section 1 (indicator values): header `ano;valor;motivo`, one row per year
  in the series (ascending). `valor` is the raw number (no thousands
  separators; decimal comma when fractional). For unavailable years `valor`
  is empty and `motivo` carries the reason text. Available rows have empty
  `motivo`.
- Section per component (only when the indicator has components): blank
  line, header `componente;<SIGLA>;<nome>`, then `ano;quantidade;motivo`
  rows with the same rules.
- Example (NTPP):

```
ano;valor;motivo
2024;514;
2025;644;
2026;534;
```

- Example (PIES, unavailable with NEP component):

```
ano;valor;motivo
componente;NEP;Número de estudantes envolvidos em projetos de pesquisa
ano;quantidade;motivo
2024;344;
2025;465;
2026;376;
```

## JSON

- Byte-identical to `src/data/<sigla>.json` (the repository data file) — no
  transformation, guaranteeing fidelity (FR-014).

## Invariants

1. Exports derive exclusively from the validated repository data (same
   source the pages render).
2. No individual-level data anywhere (Principle IV).
3. Unavailable years NEVER export a fabricated number (empty valor + reason).
4. Components appear only when present in the data file.
