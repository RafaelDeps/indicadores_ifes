# Quickstart: Redesign visual — sistema de marca Horizon

Validation guide proving the redesign works end-to-end without touching
data, routes, or the data contract. Implementation details live in
[plan.md](./plan.md) and `tasks.md`; token names in
[contracts/tokens-contract.md](./contracts/tokens-contract.md); UI behavior
in [contracts/ui-contract.md](./contracts/ui-contract.md).

## Prerequisites

- Node 20 LTS, npm; dependencies installed (`npm install`)
- Font files present at `public/fonts/ubuntu-{400,500,700}.woff2` and
  `public/fonts/ubuntu-mono-{400,500,700}.woff2`

## Commands

| Command                                | Purpose                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run test`                         | Vitest: contrast matrix, tokens contract, UI state, voice audit + all pre-existing tests |
| `npm run lint && npm run format:check` | Quality gates (unchanged)                                                                |
| `npm run build && npm run preview`     | Build and serve for manual validation                                                    |

## Validation scenarios

### S1 — Identidade visual (SC-002, SC-003; FR-001..FR-003, FR-006)

1. `npm run build && npm run preview`; open `/` and each
   `/indicadores/{slug}`.
2. **Expected**: 6px institutional stripe at the very top of every page,
   four bars in the order amarelo, verde, vermelho, azul, above the header.
3. **Expected**: titles/links in dark green, chart bars in primary green,
   cards on surface with a 1px border and no drop shadows.
4. **Expected**: headings/body in Ubuntu; numbers, KPI values and chart axis
   labels in Ubuntu Mono; only weights 400/500/700 (devtools: no 600; no
   requests to any external font CDN).

### S2 — Acessibilidade (SC-001, SC-006; FR-004, FR-005)

1. `npm run test`: **Expected** contrast tests pass for all 6 scopes
   (claro/escuro × normal/alto/máximo): AA everywhere, AAA at máximo.
2. Open any page: **Expected** the three controls visible in the fixed
   header bar (Tema, Contraste, Tamanho da fonte), operable by keyboard.
3. Switch Tema → Escuro: **Expected** dark palette applied immediately and
   after navigating to another page (choice persists).
4. Switch Contraste → Máximo in both themes: **Expected** text remains
   readable and meets AAA (per tests).
5. Switch Tamanho da fonte → Maior at ~360px viewport: **Expected** no
   horizontal scrolling, layout intact.
6. Set an invalid value in `localStorage` (e.g., `horizon:theme` = "x"),
   reload: **Expected** graceful fallback to Automático (no breakage).

### S3 — Voz institucional (SC-004; FR-007)

1. `npm run test`: **Expected** voice audit passes — none of the forbidden
   terms (poderoso, premium, inteligente, eleve, transforme, potencialize),
   no emoji in headings/labels, canonical headings in sentence case.
2. Manual read-through of headings and labels: sober institutional register,
   numbers plain ("534 projetos de pesquisa em 2026").

### S4 — Regressão zero de dados (SC-005; FR-008)

1. `npm run test`: **Expected** all pre-existing tests still pass untouched
   (data validation 15, formatters 8, selectors 9, chart 7, ano em
   andamento 4 = 43 tests).
2. Compare `/indicadores/ntpp` values before/after the redesign branch:
   **Expected** identical values (514/644/534), same routes, same "Dado
   indisponível" behavior for PIES/PICOT with NEP counts labeled.

### S5 — Deploy gates (Principle VI)

1. Push the branch: **Expected** CI runs lint → format:check → full test
   suite → build, and the GitHub Pages deploy job only runs after all pass.
