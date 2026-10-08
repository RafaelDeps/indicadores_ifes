<!--
=== SYNC IMPACT REPORT — AMENDMENT 2.0.0 (2026-10-05) ===
Version change: 1.1.0 → 2.0.0 (MAJOR: a principle was changed in substance)
Modified principles:
  IV (Aggregated Data Only) — REWRITTEN. Was an unconditional prohibition on
    individual-level data in the repository, in build artifacts, and in Git
    history. It now permits publication of the raw chain inputs
    (`exports_canonical.zip`, `listagem_*.xlsx`), subject to a governance gate.
Added sections:
  - Inside IV: "Publicação dos insumos brutos" — the conditions, the
    fail-closed gate, and what the principle does not settle
  - Inside IV: "O que este princípio não resolve" — irreversibility of history
Removed sections: none
Summary: Feature 016 (Página de Downloads dos Dados) decided that the files
  used by `make dados` are themselves public, so that a reader can reproduce
  the indicators. This is a direct contradiction of IV as written: those files
  contain the `Nome` column with full names. The contradiction is resolved by
  amending the principle, not by reinterpreting it — the feature's requirement
  FR-016a records this amendment as a precondition of publication.

  The amendment is conditional in substance and unconditional in mechanism:
  publishing raw inputs is permitted only while the gate in
  `.specify/governanca/pendencias.yaml` is open, and the gate fails CLOSED —
  a missing or unparseable registry stops the build rather than publishing.

  Legal basis for the permitted processing: art. 7º, II (legitimate interest)
  and art. 33 (international transfer), authorized 2026-10-05 by Paulo Sérgio
  dos Santos Júnior, Diretor de Extensão e Pesquisa do Campus Serra. The
  versioned record is `docs/revisao-privacidade.md`.
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate is generic
     and derives gates from this file; no change needed
  ✅ .specify/templates/spec-template.md — compatible; no change needed
  ✅ .specify/templates/tasks-template.md — tests remain MANDATORY per
     Principle II (unchanged in that respect); no change needed
  ✅ .specify/templates/commands/ — directory absent; no command files to review
  ⚠️ README.md — UPDATED in this change: the section "Governança de Dados,
     Fidelidade e LGPD" no longer claims the canonical source is
     "permanentemente ignorada pelo Git", and now states that raw inputs
     contain personal (not sensitive) data and are published under the gate
  ⚠️ specs/012-gate-proveniencia-workflow-dados/spec.md — UPDATED: FR-026
     revoked (raw rows are now versioned and served), FR-028 kept and
     clarified (the aggregate package still carries no individual data)
  ⚠️ specs/012-gate-proveniencia-workflow-dados/medidas-de-protecao.md —
     UPDATED: §3 corrected (legitimate interest, not legal obligation; personal
     data, not sensitive data), §4.1 closed (international transfer authorized)
  Follow-up TODOs: none
=== SYNC IMPACT REPORT — AMENDMENT 1.1.0 (2026-09-29) ===
Version change: 1.0.0 → 1.1.0 (Minor: expanded guidance — no principle removed)
Modified principles: II (test runner rule no longer "Vitest only")
Added sections: none
Removed sections: none
Summary: ETL pipeline (etl/, tests/etl/) uses pytest; frontend uses Vitest.
  Principle II, Technology stack constraint, and Workflow step 1 updated to
  reflect the layer-specific runner. This codifies the documented deviation
  recorded in specs/010 plan.md (Complexity Tracking).
Templates requiring updates:
  ✅ .specify/templates/plan-template.md — Constitution Check gate is generic
     and derives gates from this file; no change needed
  ✅ .specify/templates/spec-template.md — compatible; no change needed
  ✅ .specify/templates/tasks-template.md — tests remain MANDATORY per
     Principle II (unchanged in that respect); no change needed
  ✅ .specify/templates/commands/ — directory absent; no command files to review
  ✅ README.md / docs/ — no runtime guidance to update
Follow-up TODOs: none
=== ORIGINAL RATIFICATION REPORT (1.0.0, 2026-09-21) ===
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

> A versão vigente está no rodapé do arquivo, na seção "Governance". Mantê-la
> também aqui, no cabeçalho, criava duas respostas para "qual é a versão?" — e
> foi assim que o portão de governança leu 1.1.0 de uma constitution já emendada.

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

Tests MUST be written before the code they cover. The test runner is
layer-specific: **Vitest** for the frontend (TypeScript/Astro) and **pytest**
for the ETL pipeline (Python). This discipline is mandatory for indicator
calculations and data formatting: a calculation or formatter MUST NOT be
implemented before a failing test exists for it (red → green → refactor).
**Rationale**: indicator values are the product; numeric regressions are the
most damaging and least visible defects this project can ship.

### III. Fidelity to Report Data

The site MUST display exactly the values published in the source report.
Values MUST NEVER be invented, estimated, rounded, or interpolated. An
indicator with no data MUST be rendered as "Dado indisponível" and MUST NOT be
shown as zero, a dash, or any substitute that could be read as a value.
**Rationale**: the site's credibility depends on being a faithful public view
of the official report; a single invented number invalidates it.

### IV. Aggregated Data Only, With Conditional Publication of Raw Inputs

The repository and the published site are public. **Only aggregated data MAY be
rendered, and only aggregated data is offered as a download.** The aggregate
package (`indicadores.zip`) MUST NOT contain names, CPF, registration numbers,
or any individual-level datum.

Individual-level data MAY, however, be **published** — as raw chain inputs,
offered separately from the aggregate, explicitly marked as personal data and
explicitly not anonymized. The following conditions are mandatory:

1. **Scope.** The permitted set is exactly the files `make dados` consumes:
   `data/canonical/exports_canonical.zip` and `data/raw/listagem_*.xlsx`. No
   other individual-level file is covered by this permission.
2. **Marking.** Every published raw input MUST be labelled, in pt-BR, as
   containing personal data and not being anonymized. The marking MUST NOT rely
   on color alone.
3. **No open credentials.** Publication MUST be anonymous — no token, no login,
   no gated access. A restricted channel was rejected: it would signal control
   that does not exist and invite credential handling the project must not do.
4. **Governance gate.** Publication is permitted only while the gate declared in
   `.specify/governanca/pendencias.yaml` is open. The gate MUST fail **closed**:
   a missing, unreadable, or structurally invalid registry stops the build; a
   pending item omits the raw inputs from the site and reports the pendency. It
   MUST NOT fail open, because failing open means publishing personal data
   without the evaluation that authorizes it.
5. **Separation of duties.** Raw inputs MUST NOT be incorporated into the
   aggregate. The aggregate remains aggregate.
6. **Pipelines, logs and reports.** Individual-level rows MUST NOT appear in
   workflow logs, pull request bodies, or execution reports. `etl/tracking/`
   continues to sanitize them.

**Rationale**: the site's purpose is to let a reader _verify_ the numbers, and
verification is impossible without the inputs. The prior absolute prohibition
was honest about irreversibility but did not say that the inputs and the
aggregate are different artifacts with different risks; conflating them made the
choice appear to be "publish personal data" rather than "publish inputs
separately, labelled, under a gate". Exposure of personal data in a public Git
history is effectively irreversible, and this principle does not pretend
otherwise — see below.

#### O que este princípio NÃO resolve

Recording the irreversibility here, because a permission that hides its cost
gets misread as a clearance:

- **Versioning is permanent.** Once the raw inputs are committed, deleting them
  from `main` does not delete the objects. There is no erasure path short of
  removing the repository. A future reversal of this decision would not restore
  the prior state.
- **The gate governs publication, not history.** A closed gate stops new
  publications; it does not unpublish what a previous open gate served.
- **Anonymization remains the pipeline's goal, not the inputs' state.**
  `etl/tracking/` sanitizes logs and attestations; it does not anonymize the
  source files.
- **This permission covers personal data, not sensitive data** (art. 5º, II,
  LGPD). Should the inputs ever acquire sensitive data, this amendment does not
  authorize publishing them and a new decision is required.

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

- **Technology stack**: Astro (static output) + TypeScript + Vitest for the
  frontend; Python 3 + pytest for the ETL pipeline (`etl/`, tests in
  `tests/etl/`). Deviations MUST be justified in the implementation plan's
  Complexity Tracking section.
- **Static only**: no server-side runtime, no backend, no database; data
  ships as static assets produced at build time.
- **Language policy**: user-facing text and UI labels in pt-BR; code
  identifiers in English; commit messages in either language, used
  consistently.
- **Privacy review**: every feature that adds or transforms data MUST be
  reviewed for compliance with Principle IV before merge.

## Quality and Deployment Workflow

1. Red: write a failing test (pytest for ETL; Vitest for frontend) for the
   calculation or formatting change.
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

**Version**: 2.0.0 | **Ratified**: 2026-09-21 | **Last Amended**: 2026-10-05
