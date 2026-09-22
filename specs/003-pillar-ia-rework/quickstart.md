# Quickstart: Rework de IA e identidade

Validation guide proving the rework works end-to-end. Implementation
details live in [plan.md](./plan.md) and `tasks.md`; URL/year rules in
[contracts/routes-contract.md](./contracts/routes-contract.md); export
shapes in [contracts/export-contract.md](./contracts/export-contract.md);
identity in [contracts/identity-contract.md](./contracts/identity-contract.md).

## Prerequisites

- Node 20 LTS, npm; dependencies installed
- Font files present at `public/fonts/source-sans-3-{400,600,700}.woff2`

## Commands

| Command                                | Purpose                                                                                   |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm run test`                         | Vitest: year resolution, exports, tokens, contrast, identity, voice + pre-existing suites |
| `npm run lint && npm run format:check` | Quality gates                                                                             |
| `npm run build && npm run preview`     | Build (6 pages + 8 export endpoints) and serve                                            |

## Validation scenarios

### S1 — Navegação por pilares (SC-001; FR-001..FR-003)

1. `npm run build && npm run preview`; open `/`.
2. **Expected**: three pillar cards — Pilar 1 ativo linking to `/pilar-1/`;
   Pilares 2 e 3 "em breve" without content links.
3. `/pilar-1/`: **Expected** exactly four indicator cards (NTPP, QSPP, PIES,
   PICOT) linking to `/pilar-1/<sigla>/`.
4. Old `/indicadores/...` routes no longer exist.

### S2 — Ano explícito na URL (SC-002, SC-003; FR-004..FR-009)

1. Open `/pilar-1/ntpp/` without `?ano=`: **Expected** value of 2025 shown,
   labeled with the year.
2. Change the year to 2024 via the selector: **Expected** URL becomes
   `?ano=2024`, value updates to 514.
3. Browser back: **Expected** previous year restored (e.g., 2025).
4. Open `/pilar-1/ntpp/?ano=2026`: **Expected** value 534 labeled "ano em
   andamento — dados parciais".
5. Open `/pilar-1/ntpp/?ano=2019`: **Expected** "Dado indisponível" for that
   year. Open `?ano=abc` and `?ano=1999`: **Expected** fallback to 2025.
6. `/pilar-1/pies/?ano=2024`: **Expected** "Dado indisponível" with the
   missing-data explanation, regardless of year.
7. Whole-site check: **Expected** no number anywhere that sums 2024+2025+
   2026; the chart shows years side by side.

### S3 — Exportação (SC-004; FR-010)

1. On `/pilar-1/ntpp/`: download `dados.csv` and `dados.json`.
   **Expected**: CSV UTF-8/BOM, `;` separator, `ano;valor;motivo` rows with
   514/644/534; JSON identical to `src/data/ntpp.json`.
2. On `/pilar-1/pies/`: **Expected** CSV with empty valor rows + NEP
   component section; JSON identical to `src/data/pies.json`.

### S4 — Identidade própria e painel removido (SC-005, SC-006; FR-011, FR-012, FR-015)

1. Any page: **Expected** indigo palette, Source Sans 3 typography, "IF"
   monogram + "Indicadores IFES" mark; no four-color stripe, no "H" mark, no
   Ubuntu fonts (devtools: no ubuntu-*.woff2 requests).
2. Header: **Expected** NO theme/contrast/font-size controls; with the OS in
   dark mode the site renders dark automatically; contrast tests pass AA for
   claro and escuro (`npm run test`).
3. Cards: thin border + surface, no drop shadows.

### S5 — Registro e regressão (SC-007; FR-013, FR-014)

1. `npm run test`: **Expected** voice audit green and ALL pre-existing data/
   formatter/selector/chart tests green untouched (43 from feature 001/002
   minus the removed uiState suite).
2. Values identical to the report (spot check NTPP 514/644/534).
3. Push the branch: **Expected** CI gates unchanged and green.
