# Implementation Plan: Redesign visual — sistema de marca Horizon

**Branch**: `002-horizon-visual-redesign` | **Date**: 2026-09-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-horizon-visual-redesign/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Visual redesign of the existing 5-page static dashboard to the Horizon brand
system: institutional palette (light/dark variants per color) as CSS custom
properties in a single tokens file, institutional stripe (yellow, green, red,
blue) above the header on every page, self-hosted Ubuntu/Ubuntu Mono
typography (weights 400/500/700 only), indicator cards as surface + 1px
border without shadows, a fixed accessibility bar in the header (theme
claro/escuro/automático, contraste normal/alto/máximo, tamanho de fonte) with
WCAG AA everywhere and AAA at maximum contrast, and a sober institutional
pt-BR voice pass. Zero changes to data, routes, or the data contract.
Automated Vitest contrast and voice-audit tests are written first.

## Technical Context

**Language/Version**: TypeScript 5.x on Astro 5.x (existing site), CSS custom
properties (no preprocessor, no framework migration)

**Primary Dependencies**: Existing stack only — `astro` (build), `vitest`
(tests), `eslint`/`prettier` (quality). **No new dependencies.** Fonts are
static assets; contrast math is implemented in-repo (pure TypeScript, no
library).

**Storage**: N/A (backend unchanged). Visitor preferences (theme, contrast,
font size) persist client-side in `localStorage`; no personal data involved.

**Testing**: Vitest (TDD: red → green). New test files: contrast-ratio
computation and theme × contrast matrix (AA everywhere, AAA at máximo),
tokens-file contract validation, voice/register audit, UI-state module
behavior.

**Target Platform**: GitHub Pages (static), evergreen desktop and mobile
browsers; the redesign must not regress mobile layout (Principle V).

**Project Type**: Static web site (existing Astro project)

**Performance Goals**: Self-hosted `woff2` font files (6 files: Ubuntu
400/500/700, Ubuntu Mono 400/500/700, latin subset), `font-display: swap`,
system fallback stacks; no runtime framework added; Lighthouse-style
perceived performance not worse than current.

**Constraints**: No new dependencies; no CSS framework migration; single
tokens file under `src/styles/`; fonts under `public/fonts` (no CDN); weight
600 never used; yellow never carries white text; no changes to indicator
values, JSON data contract, or routes (existing 43 tests must keep passing).

**Scale/Scope**: 5 pages (overview + 4 detail pages); restyle of existing
components in `src/` plus the new accessibility bar; no new routes.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle                               | Status  | Evidence                                                                                                                                                                |
| --- | --------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Simplicity                              | ✅ Pass | Zero new dependencies; single tokens file (`src/styles/tokens.css`); plain CSS custom properties; vanilla inline script for preferences; no CSS framework migration     |
| II  | Test-First (NON-NEGOTIABLE)             | ✅ Pass | Contrast matrix, tokens contract, voice audit and UI-state tests written first in `tests/` (Vitest), before the CSS/components they validate                            |
| III | Fidelity to report data                 | ✅ Pass | Visual-only pass: FR-008/SC-005 require identical values; existing 43 tests (data contract, formatters, selectors, chart, ano em andamento) must remain green untouched |
| IV  | Aggregated data only                    | ✅ Pass | No data changes; preferences stored locally are UI state, not personal data                                                                                             |
| V   | Basic quality                           | ✅ Pass | ESLint/Prettier gates unchanged; pt-BR sober register audited; WCAG AA everywhere and AAA at máximo; mobile layout re-verified                                          |
| VI  | Automated deployment with quality gates | ✅ Pass | Existing CI pipeline runs lint → format → tests → build → deploy; new tests join the same gate                                                                          |

**Post-design re-evaluation (Phase 1)**: ✅ All six gates still pass. The
tokens contract (`contracts/tokens-contract.md`) and the UI-state contract
(`contracts/ui-contract.md`) keep the design enforceable by tests; no
dependency or abstraction was added.

## Project Structure

### Documentation (this feature)

```text
specs/002-horizon-visual-redesign/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── tokens-contract.md
│   └── ui-contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit.specify output)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── styles/
│   └── tokens.css             # ALL design tokens (palette light/dark, contrast
│                              #  overrides, font stacks, sizes) — single source
├── lib/
│   ├── contrast.ts            # WCAG relative luminance + ratio math (TDD)
│   ├── uiState.ts             # theme/contrast/fontsize state + localStorage (TDD)
│   └── voiceAudit.ts          # forbidden-terms/emoji wordlist matcher (TDD)
├── components/
│   ├── AccessibilityBar.astro # Fixed bar in header: theme, contrast, font size
│   ├── InstitutionalStripe.astro  # 4 vertical bars: yellow, green, red, blue
│   ├── BaseLayout.astro       # Updated: stripe, tokens import, @font-face w/ base path
│   ├── IndicatorCard.astro    # Restyled: surface + 1px border, no shadow
│   ├── UnavailableNotice.astro # Restyled (same text/behavior)
│   ├── YearSelector.astro     # Restyled (same behavior/script)
│   ├── HistoricalSeries.astro # Restyled (same text/behavior)
│   ├── SeriesChart.astro      # Restyled: primary green bars/line, mono axis labels
│   └── ComponentCount.astro   # Restyled (same text/behavior)
├── layouts/
│   └── (BaseLayout stays in src/layouts/ per current structure)
├── pages/                     # UNCHANGED routes: / and /indicadores/[slug]
└── data/                      # UNCHANGED (no edits allowed in this feature)
public/
└── fonts/
    ├── ubuntu-{400,500,700}.woff2
    └── ubuntu-mono-{400,500,700}.woff2
tests/
├── contrast.test.ts           # Theme × contrast matrix → AA / AAA(max) (TDD)
├── tokens.test.ts             # tokens.css contract: names, variants, weights
├── uiState.test.ts            # State transitions + persistence keys (TDD)
└── voiceAudit.test.ts         # Forbidden terms/emoji over UI strings (TDD)
```

**Structure Decision**: All visual identity flows from one tokens file
consumed by the existing components (user-directed decision). New pure
TypeScript modules (`contrast`, `uiState`, `voiceAudit`) keep logic testable
per constitution Principle II. `src/data/**` is explicitly out of bounds for
this feature.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    |            |                                      |
