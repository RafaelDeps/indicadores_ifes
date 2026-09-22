<!--
=== SYNC IMPACT REPORT ===
Version change: (none, unfilled template) → 1.0.0
Modified principles: N/A (initial ratification)
Added sections:
  - Core Principles I–VI (template had 5 placeholder slots; expanded to 6
    principles per user requirements)
  - Additional Constraints (filled [SECTION_2_NAME])
  - Quality and Deployment Workflow (filled [SECTION_3_NAME])
  - Governance (filled [GOVERNANCE_RULES])
Removed sections: none
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate is generic
     and derives gates from this file; no change needed
  ✅ .specify/templates/spec-template.md — compatible; no change needed
  ✅ .specify/templates/tasks-template.md — updated: tests are MANDATORY per
     Principle II (was "optional unless requested")
  ✅ .specify/templates/commands/ — directory absent; no command files to review
  ✅ README.md / docs/ — absent; no runtime guidance to update
Follow-up TODOs: none
Project name note: user input contained literal placeholder "project-name";
name inferred from repository directory (indicadores_ifes) and site purpose.
===
-->

# Indicadores de Pesquisa e Inovação IFES Constitution

## Core Principles

### I. Simplicity

The project MUST use Astro's default project structure (`src/pages`,
`src/components`, `src/layouts`) with TypeScript. Dependencies MUST be kept to
the minimum necessary; every added dependency MUST be justified in the plan.
No extra layers or abstractions beyond what Astro already provides: no custom
frameworks, no state management libraries, no premature generalization.
**Rationale**: the site is a small, static indicator display; unnecessary
complexity is the main maintenance risk for a project of this size.

### II. Test-First Development (NON-NEGOTIABLE)

Tests MUST be written before the code they cover, using Vitest as the only
test runner. This discipline is mandatory for indicator calculations and data
formatting: a calculation or formatter MUST NOT be implemented before a
failing test exists for it (red → green → refactor). **Rationale**: indicator
values are the product; numeric regressions are the most damaging and least
visible defects this project can ship.

### III. Fidelity to Report Data

The site MUST display exactly the values published in the source report.
Values MUST NEVER be invented, estimated, rounded, or interpolated. An
indicator with no data MUST be rendered as "Dado indisponível" and MUST NOT be
shown as zero, a dash, or any substitute that could be read as a value.
**Rationale**: the site's credibility depends on being a faithful public view
of the official report; a single invented number invalidates it.

### IV. Aggregated Data Only

The repository and the published site are public. Only aggregated data MAY be
committed or rendered. Names, CPF, registration numbers, or any
individual-level data MUST NOT appear in the codebase, data files, build
artifacts, or Git history. **Rationale**: legal and ethical privacy obligation
(LGPD); exposure of personal data in a public Git history is effectively
irreversible.

### V. Basic Quality

Code MUST pass ESLint and Prettier with zero errors before merge. All
user-facing text MUST be in Brazilian Portuguese (pt-BR). The site MUST work
well on mobile: every page MUST be verified to render correctly on narrow
viewports. **Rationale**: a consistent, accessible presentation in the
audience's language is part of the deliverable, not an afterthought.

### VI. Automated Deployment with Quality Gates

Deployment to GitHub Pages MUST be automatic via GitHub Actions and MUST run
only after tests and build pass. A failing test or failing build MUST block
publication. **Rationale**: the public site must never show unverified or
broken content; gates are cheaper than rollbacks.

## Additional Constraints

- **Technology stack**: Astro (static output) + TypeScript + Vitest.
  Deviations MUST be justified in the implementation plan's Complexity
  Tracking section.
- **Static only**: no server-side runtime, no backend, no database; data
  ships as static assets produced at build time.
- **Language policy**: user-facing text and UI labels in pt-BR; code
  identifiers in English; commit messages in either language, used
  consistently.
- **Privacy review**: every feature that adds or transforms data MUST be
  reviewed for compliance with Principle IV before merge.

## Quality and Deployment Workflow

1. Red: write a failing Vitest test for the calculation or formatting change.
2. Green: implement the minimum code needed to pass.
3. Refactor: clean up while ESLint and Prettier remain error-free.
4. Verify displayed values against the report before opening a PR.
5. CI (GitHub Actions) MUST run lint, tests, and build; the deploy job MUST
   depend on all of them passing and MUST target GitHub Pages.

## Governance

- This constitution supersedes any conflicting practice or documentation in
  the repository.
- Amendments MUST be recorded in this file with a new version, the amendment
  date, and a Sync Impact Report; all templates MUST be checked for
  consistency after every amendment.
- Versioning policy: MAJOR for incompatible principle removals or
  redefinitions; MINOR for new principles or materially expanded guidance;
  PATCH for clarifications and non-semantic fixes.
- Every PR review MUST verify compliance with Principles I–VI; violations
  MUST be either justified in the plan's Complexity Tracking section or
  rejected.

**Version**: 1.0.0 | **Ratified**: 2026-09-21 | **Last Amended**: 2026-09-21
