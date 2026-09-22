# Tokens Contract: src/styles/tokens.css

**Feature**: `002-horizon-visual-redesign` | **Date**: 2026-09-21

Contract between the design tokens file and every consumer (component
styles, tests, layout). Any change to token names or scope rules MUST update
`tests/tokens.test.ts` and `tests/contrast.test.ts` first (TDD).

## Scopes (CSS selectors)

| Scope        | Selector                                                                | Conteúdo                                                            |
| ------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Base (claro) | `:root`                                                                 | Light palette + font stacks + font sizes                            |
| Escuro       | `[data-theme="escuro"]`                                                 | Dark palette overrides                                              |
| Auto         | `:root` + `@media (prefers-color-scheme: dark)` → `[data-theme="auto"]` | Resolves to claro/escuro tokens                                     |
| Alto         | `[data-contrast="alto"]`                                                | AA-safe token overrides (both themes via theme-qualified selectors) |
| Máximo       | `[data-contrast="maximo"]`                                              | AAA-safe token overrides                                            |

## Required custom properties (names fixed)

```
--color-primary          --color-primary-dark
--color-accent-yellow    --color-accent-red      --color-accent-blue
--color-ink              --color-bg              --color-surface
--color-border
--font-sans              /* Ubuntu + fallbacks */
--font-mono              /* Ubuntu Mono + fallbacks */
--font-size-step-*       /* padrao: 100%, grande: 112.5%, maior: 125% */
```

## Values (brand, from spec)

- Claro: `--color-primary: #009640`; `--color-primary-dark: #006B3F`;
  `--color-accent-yellow: #FDB913`; `--color-accent-red: #E30613`;
  `--color-accent-blue: #0072BC`; `--color-ink: #1A2B22`;
  `--color-bg: #F5F7F5`; `--color-surface: #FFFFFF`;
  `--color-border: #E1E7E2`.
- Escuro: `#12B24A`, `#1BA94C`, `#FFC73A`, `#FF5A4D`, `#3BA0E0`, `#EAF1EC`,
  `#0E1512`, `#16201B`, `rgba(255,255,255,0.12)`.

## Rules validated by tests

1. Exactly the nine color tokens exist in base and dark scopes (no extras,
   no renames).
2. Font stacks name "Ubuntu" / "Ubuntu Mono" first, system fallbacks last.
3. No `font-weight: 600` anywhere in `src/**` (only 400/500/700).
4. No raw hex colors in component styles outside `tokens.css` (grep-based
   check; tests enforce).
5. Contrast matrix (parsed from this file) passes AA everywhere and AAA at
   `maximo` — see `tests/contrast.test.ts` pair list.
6. No white-text-on-yellow pair exists in any scope.
7. Contrast override scopes redefine semantic tokens only (never introduce
   new hues outside the brand palette).
