# Research: Redesign visual — sistema de marca Horizon

**Feature**: `002-horizon-visual-redesign` | **Date**: 2026-09-21

No external research tasks were required: the stack is fixed (existing Astro
site), the brand values were supplied by the user (extract of the sibling
repo's BRANDING.md), and the two open UX decisions were resolved in
`/speckit.clarify` (fixed header bar; máximo = AAA). This file records the
decisions with rationale and rejected alternatives.

## D1 — Tokens file as the single source of visual truth

- **Decision**: One file, `src/styles/tokens.css`, defining CSS custom
  properties for the palette (light and dark variants), contrast-level
  overrides, font stacks and font-size steps. Imported once by
  `BaseLayout.astro`. Components consume only token names — no raw hex in
  component styles.
- **Rationale**: User-directed ("sim, arquivo único de variáveis CSS"). A
  single file makes the tokens contract testable (parse it in Vitest) and
  makes brand updates a one-file change.
- **Alternatives considered**: CSS-in-JS (violates simplicity, new deps);
  per-component variables (duplicated brand truth); Tailwind/other framework
  migration (explicitly out of scope).

## D2 — Theme / contrast / font-size state model

- **Decision**: Three orthogonal preferences on `<html>` as data attributes:
  `data-theme="claro|escuro|auto"`, `data-contrast="normal|alto|maximo"`,
  `data-fontsize="padrao|grande|maior"`. "Auto" resolves to the OS
  `prefers-color-scheme` and follows live changes. Preferences persist in
  `localStorage` and are applied before paint by a tiny inline script in the
  `<head>` (no flash of wrong theme). Logic isolated in `src/lib/uiState.ts`
  (pure, unit-tested); the inline script only calls it.
- **Rationale**: Data attributes let tokens.css target every combination via
  descendant selectors (e.g., `[data-theme="escuro"][data-contrast="maximo"]`)
  with zero JavaScript in the styling layer; pure state module satisfies TDD.
- **Alternatives considered**: Class-based theming (same effect, less
  semantic); cookies/backend (no backend, unnecessary); CSS-only via
  `prefers-color-scheme` (cannot offer explicit claro/escuro choice or
  persist user override).

## D3 — Self-hosted fonts and base-path correctness

- **Decision**: `woff2` files for Ubuntu and Ubuntu Mono (weights 400, 500,
  700; latin subset) under `public/fonts/`. `@font-face` declarations are
  emitted in `BaseLayout.astro` (global style) with URLs built from
  `import.meta.env.BASE_URL`, so a future GitHub Pages project-site base
  path (`/indicadores_ifes/`) cannot break font loading.
  `font-display: swap` with system fallback stacks (`ui-sans-serif`-style
  sans; `ui-monospace`-style mono).
- **Rationale**: User-directed (public/fonts, no CDN). BASE_URL interpolation
  is the only Astro-native way to keep `public/` font URLs correct under a
  configurable base path; `font-display: swap` avoids invisible text.
- **Alternatives considered**: Font CDN (explicitly forbidden); importing
  fonts from `src/assets` via Vite (works, but user directed public/fonts);
  shipping all weights without subsetting (larger payload; latin subset is
  sufficient for pt-BR — no other scripts are used).

## D4 — Automated contrast testing without new dependencies

- **Decision**: `src/lib/contrast.ts` implements WCAG 2.x relative luminance
  and contrast ratio for `#RRGGBB` and `rgba()` inputs (pure TypeScript).
  `tests/contrast.test.ts` parses `tokens.css` (regex extraction of custom
  properties per scope — light/dark × normal/alto/maximo), assembles the
  semantic color pairs actually used by components (texto↔fundo, texto↔
  superfície, verde-escuro↔superfície, links, avisos, barra do gráfico↔
  superfície as non-text 3:1), and asserts AA (4.5:1 / 3:1) for normal and
  alto, and AAA (7:1 / 4.5:1) for máximo, across light and dark. The yellow
  rule is asserted as "no white-text pair on yellow exists".
- **Rationale**: No new dependencies (constitution I); the test is the
  executable form of SC-001; parsing the tokens file directly makes the CSS
  the single source of truth (no mirrored constants to drift).
- **Alternatives considered**: axe-core/pa11y/playwright (heavy new deps +
  browser harness for a static site); manual review only (not repeatable,
  violates TDD principle).

## D5 — High/maximum contrast strategy within the brand palette

- **Decision**: `normal` uses the brand palette as specified. `alto` and
  `maximo` override the semantic tokens (not new hues): text moves fully to
  the ink color, borders strengthen, the dark-green text role resolves to
  darker/lighter steps as needed to reach AA (alto) and AAA (máximo) in both
  themes. Feasibility verified by hand for the key pairs (e.g., light:
  `#1A2B22` on `#FFFFFF` ≈ 15.4:1; dark: `#EAF1EC` on `#16201B` ≈ 11:1;
  dark-mode green `#12B24A` on surface ≈ 5.9:1 — fine for fills, text uses
  ink). Exact override values are settled by the contrast tests during
  implementation (TDD decides the final hexes).
- **Rationale**: Keeps the brand palette authoritative while making
  accessibility a token-level concern; tests pin the guarantees.
- **Alternatives considered**: Separate high-contrast palette (duplicates
  brand, drifts); only enlarging text (doesn't fix ratio).

## D6 — Voice/register audit

- **Decision**: `src/lib/voiceAudit.ts` holds the forbidden wordlist
  (poderoso, premium, inteligente, eleve, transforme, potencialize) and an
  emoji/diacritical-pictograph regex range. `tests/voiceAudit.test.ts` scans
  the user-facing string sources (components + layout) for violations and
  asserts sentence case for a curated list of canonical interface headings
  (exact-match against the approved pt-BR strings). Full human review of
  sentence case stays a quickstart manual step (heuristic detection of Title
  Case in Portuguese is unreliable).
- **Rationale**: Automated, repeatable enforcement of FR-007 without false
  positives; curated heading list doubles as the canonical copy deck.
- **Alternatives considered**: LLM-based copy review (non-deterministic);
  no audit (FR-007 unenforceable).

## D7 — Font-size steps

- **Decision**: `data-fontsize` steps map to root font-size:
  `padrao` = 100%, `grande` = 112.5%, `maior` = 125%. All component sizing
  already uses `rem`-friendly units where possible; audit any remaining
  fixed pixel values during implementation.
- **Rationale**: Matches the spec assumption (~100/112.5/125); root-relative
  scaling preserves the layout system; rem audit keeps the promise "no
  horizontal scrolling at phone width" at every step.
- **Alternatives considered**: Browser zoom only (not an in-product
  control); continuous slider (overkill for 3 spec'd levels).

## D8 — Institutional stripe

- **Decision**: `InstitutionalStripe.astro` renders a fixed-height (6px)
  flex container with four equal vertical bars in the order amarelo,
  verde, vermelho, azul, placed as the first element inside `<body>` in
  `BaseLayout.astro` so it appears above the header on every page. Bars use
  the accent tokens (so dark mode variants apply automatically).
- **Rationale**: Single component included by the shared layout = presence
  on 100% of pages by construction (SC-002); token-driven colors keep
  contrast/variants consistent.
- **Alternatives considered**: CSS pseudo-element on body (harder to keep
  semantic/testable); per-page inclusion (drift risk).
