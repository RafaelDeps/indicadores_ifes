# Data Model: Redesign visual — sistema de marca Horizon

**Feature**: `002-horizon-visual-redesign` | **Date**: 2026-09-21

This feature changes no product data (indicator JSON contract untouched —
`src/data/**` is out of bounds). The "data" of this feature is design tokens
and UI state. Contracts: [contracts/tokens-contract.md](./contracts/tokens-contract.md)
and [contracts/ui-contract.md](./contracts/ui-contract.md).

## Entities

### Token de cor (Color token)

A named design-token role with a light and a dark variant, expressed as CSS
custom properties in `src/styles/tokens.css`.

| Papel                   | Claro     | Escuro                  | Uso                               |
| ----------------------- | --------- | ----------------------- | --------------------------------- |
| `--color-primary`       | `#009640` | `#12B24A`               | Preenchimentos, barras de gráfico |
| `--color-primary-dark`  | `#006B3F` | `#1BA94C`               | Texto, títulos, links             |
| `--color-accent-yellow` | `#FDB913` | `#FFC73A`               | Destaque (nunca com texto branco) |
| `--color-accent-red`    | `#E30613` | `#FF5A4D`               | Acento                            |
| `--color-accent-blue`   | `#0072BC` | `#3BA0E0`               | Acento                            |
| `--color-ink`           | `#1A2B22` | `#EAF1EC`               | Texto padrão                      |
| `--color-bg`            | `#F5F7F5` | `#0E1512`               | Fundo                             |
| `--color-surface`       | `#FFFFFF` | `#16201B`               | Cartões, painéis                  |
| `--color-border`        | `#E1E7E2` | `rgba(255,255,255,.12)` | Bordas 1px                        |

Rules: every component style references tokens only (no raw hex); weight 600
never used; `--color-accent-yellow` never paired with white text.

### Preferência de acessibilidade (UI state)

One visitor preference triple, persisted in `localStorage` and reflected as
data attributes on `<html>`.

| Campo            | Valores                         | Default  | Persistência   |
| ---------------- | ------------------------------- | -------- | -------------- |
| tema             | `claro` \| `escuro` \| `auto`   | `auto`   | `localStorage` |
| contraste        | `normal` \| `alto` \| `maximo`  | `normal` | `localStorage` |
| tamanho de fonte | `padrao` \| `grande` \| `maior` | `padrao` | `localStorage` |

Rules: values are exactly the pt-BR strings above (canonical, no synonyms);
`auto` resolves at render time to the OS `prefers-color-scheme` and follows
live OS changes; storage keys are fixed (see UI contract); corrupt or unknown
stored values fall back to defaults (never break the page).

### Pairs de contraste (matriz validada)

Semantic foreground/background pairs assembled from tokens per scope
(theme × contrast): normal text pairs require ≥ 4.5:1 (AA), large text
≥ 3:1, non-text UI (chart bars vs surface) ≥ 3:1; at `maximo`, text pairs
require ≥ 7:1 / 4.5:1 (AAA). The test matrix covers 2 rendered themes
(claro/escuro; `auto` resolves to one of them) × 3 contrast levels = 6
scopes.

## Relationships

- Tokens → consumed by every component style (no direct colors).
- UI state → data attributes on `<html>` → selected token scope.
- Voice audit wordlist → user-facing strings in components/layout.

## State transitions

- `auto` ⇄ `claro`/`escuro`: explicit choice overrides OS; choosing `auto`
  reattaches the OS listener.
- Contrast/font size: independent of theme; combined matrix resolved by CSS
  specificity (contrast scope overrides base theme tokens).
- Unknown/corrupt stored preference → default value (graceful degradation).

## Volume

9 color tokens × 2 variants + contrast overrides + 3 font stacks + 3 font
sizes. Trivial; no tooling beyond Vitest.
