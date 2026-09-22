# UI Contract: accessibility bar, state, voice

**Feature**: `002-horizon-visual-redesign` | **Date**: 2026-09-21

Contract for the visitor-facing UI surface added/changed by this feature.
Routes and pages are unchanged (`/` and `/indicadores/{slug}`).

## Accessibility bar (fixed, in the header area, every page)

- Rendered by `AccessibilityBar.astro` inside `BaseLayout.astro`, above the
  main content, always visible (no panel/modal).
- Three controls with pt-BR labels (sentence case, exact):
  - Tema: options `Automático`, `Claro`, `Escuro`
  - Contraste: options `Normal`, `Alto`, `Máximo`
  - Tamanho da fonte: options `Padrão`, `Grande`, `Maior`
- Controls are native form elements (select or radio group) — keyboard
  operable, labeled, usable without JavaScript (page renders with defaults).

## State (data attributes + persistence)

- Applied to `<html>`: `data-theme`, `data-contrast`, `data-fontsize` with
  canonical values `claro|escuro|auto`, `normal|alto|maximo`,
  `padrao|grande|maior`.
- localStorage keys (fixed): `horizon:theme`, `horizon:contrast`,
  `horizon:fontsize`.
- An inline head script applies stored preferences before first paint (no
  flash of wrong theme); `auto` follows `prefers-color-scheme` live.
- Unknown/corrupt stored values are discarded → defaults
  (`auto`/`normal`/`padrao`).

## Institutional stripe

- `InstitutionalStripe.astro` is the first element inside `<body>` (above
  the header) on every page: four equal vertical bars, order amarelo →
  verde → vermelho → azul, using the accent tokens.

## Typography rules

- Headings + body: `--font-sans` (Ubuntu first). Numbers, KPI values, chart
  axis labels and table numeric cells: `--font-mono` (Ubuntu Mono first).
- Weights allowed: 400, 500, 700 only.
- `@font-face` URLs built from `import.meta.env.BASE_URL` (base-path safe),
  `font-display: swap`, system fallbacks.

## Voice (pt-BR institucional)

- Forbidden in any user-facing string: `poderoso`, `premium`, `inteligente`,
  `eleve`, `transforme`, `potencialize`; no emoji in headings or labels.
- Sentence case for headings/labels; numbers presented plainly with factual
  context.
- Canonical strings (curated, exact) are asserted by
  `tests/voiceAudit.test.ts`; examples: "Indicadores de Pesquisa e Inovação",
  "Valor por ano", "Série histórica", "Metodologia", "Dado indisponível",
  "Quanto maior, melhor", "Ver detalhes", "Tema", "Contraste",
  "Tamanho da fonte".
