# Identity Contract: own palette, typeface, mark

**Feature**: `003-pillar-ia-rework` | **Date**: 2026-09-21

Contract for the site's own visual identity (replacing the Horizon brand of
feature 002). Locked by `tests/tokens.test.ts`, `tests/contrast.test.ts` and
`tests/identity.test.ts` (TDD).

## Palette (own primary hue: indigo)

| Papel                   | Claro     | Escuro                   | Uso                               |
| ----------------------- | --------- | ------------------------ | --------------------------------- |
| `--color-primary`       | `#4F46E5` | `#818CF8`                | Preenchimentos, barras de gráfico |
| `--color-primary-dark`  | `#3730A3` | `#A5B4FC`                | Texto, títulos, links (AA)        |
| `--color-accent-amber`  | `#B45309` | `#FBBF24`                | Acento com parcimônia             |
| `--color-ink`           | `#1E1B33` | `#ECEBF4`                | Texto padrão                      |
| `--color-bg`            | `#F6F6FA` | `#12111A`                | Fundo                             |
| `--color-surface`       | `#FFFFFF` | `#1B1A26`                | Cartões, painéis                  |
| `--color-border`        | `#E3E3EE` | `rgba(255,255,255,0.12)` | Bordas 1px                        |
| `--color-muted`         | `#5D5A72` | `#A6A3BC`                | Texto secundário                  |
| `--color-notice-text`   | `#7A4D00` | `#FBBF24`                | Avisos                            |
| `--color-notice-bg`     | `#FCF4E4` | `#2B2411`                | Fundo de avisos                   |
| `--color-notice-border` | `#B45309` | `#FBBF24`                | Borda de avisos                   |

- Scopes: `:root` (claro) and `[data-theme='escuro']` (escuro) — the ONLY
  two scopes; no contrast-level overrides (panel removed; dark mode is
  automatic via the OS preference applied by a three-line inline script).
- Required tokens only; component styles reference tokens (no raw hex).

## Typography

- `--font-sans`: `'Source Sans 3', system-ui, …sans-serif` — headings and
  body.
- Numerals/KPI/chart axis labels: same family with
  `font-variant-numeric: tabular-nums` (mono stack
  `--font-mono: ui-monospace, …` reserved for code-ish contexts).
- Self-hosted files: `public/fonts/source-sans-3-{400,600,700}.woff2`
  (latin subset, OFL license), `@font-face` with
  `import.meta.env.BASE_URL`, `font-display: swap`.

## Mark

- "IF" monogram (rounded square, primary fill, ink-contrasting letters) next
  to the text mark "Indicadores IFES" in the header of every page.
- No Horizon elements: no four-color stripe, no "H" square mark, no
  Ubuntu/Ubuntu Mono files or @font-face — asserted by `tests/identity.test.ts`.

## Invariants

1. WCAG AA for all text pairs in claro and escuro (contrast matrix).
2. Chart marks vs surface ≥ 3:1 (non-text).
3. Cards: surface + 1px border, no drop shadows.
4. Sober institutional pt-BR register (voice audit unchanged).
