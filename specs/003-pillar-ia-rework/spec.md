# Feature Specification: Rework de IA e identidade — páginas por pilar com ano na URL

**Feature Branch**: `003-pillar-ia-rework`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Rework the dashboard's information architecture and visual identity. Screens: / (overview of all pillars; Pillar 1 active, Pillars 2 and 3 'em breve'), /pilar-1/ (overview of the 4 Pillar 1 indicators), /pilar-1/<sigla>/ (detail per indicator, URL pattern reusable by future pillars). Year selection: no page shows an indicator value without a year selected; never sum or blend years into one number; selected year reflected in the URL (?ano=2025) for shareable links and back/forward navigation; default year 2025 (latest closed year); 2026 selectable but labeled partial; historical chart with all years side by side is fine; PIES/PICOT show 'Dado indisponível' regardless of year. Accessibility panel: remove the in-app theme/contrast/font-size toggles entirely (plugin will come later); keep semantic HTML, labels and WCAG AA base contrast. Data export: each indicator detail page offers download of that indicator's data as CSV and/or JSON. Visual identity: own identity, not a copy of horizon_dashboard — no Horizon stripe/'H' mark/Ubuntu typography; distinct palette (own primary hue, WCAG AA light and dark), distinct typeface, simple text or monogram mark of this project's own name; same sober institutional pt-BR register; cards with thin border and surface color, no decorative shadows. Out of scope: Pillars 2 and 3 content (placeholder only) and indicator values/data contract."

## Clarifications

### Session 2026-09-21

- Q: Após remover o painel de acessibilidade, quais modos de apresentação o
  site mantém? → A: Claro + escuro automático (segue a preferência do
  sistema, sem controle na interface).
- Q: Qual o formato do CSV exportado em cada página de indicador? → A: pt-BR
  (UTF-8 com BOM, separador ponto e vírgula), colunas ano;valor;motivo.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Navegação por pilares com espaço para o futuro (Priority: P1)

A visitor arrives at `/` and sees an overview of the pillars: Pillar 1
(Pesquisa e Inovação) as an active card leading to `/pilar-1/`, and Pillars 2
and 3 presented as "em breve" placeholders without content links. From
`/pilar-1/`, the visitor sees one card per Pillar 1 indicator (NTPP, QSPP,
PIES, PICOT) leading to `/pilar-1/ntpp/`, `/pilar-1/qspp/`, `/pilar-1/pies/`
and `/pilar-1/picot/`. The URL pattern is pillar-scoped so future pillars
(`/pilar-2/<sigla>/`, `/pilar-3/<sigla>/`) can be added without
restructuring.

**Why this priority**: The new information architecture is the backbone of
this rework; every other story depends on the new routes.

**Independent Test**: Can be fully tested by visiting `/`, `/pilar-1/` and
each of the four detail routes, verifying the pillar cards (active vs "em
breve"), the four indicator cards, and that no page from the previous
structure is required for navigation.

**Acceptance Scenarios**:

1. **Given** the visitor opens `/`, **When** the page renders, **Then** the
   three pillars appear, with Pillar 1 active and Pillars 2 and 3 shown as
   "em breve" placeholders.
2. **Given** the visitor clicks the Pillar 1 card on `/`, **When** the
   navigation completes, **Then** `/pilar-1/` shows exactly four indicator
   cards: NTPP, QSPP, PIES and PICOT.
3. **Given** the visitor clicks an indicator card on `/pilar-1/`, **When**
   the navigation completes, **Then** the detail page of that indicator is
   served at `/pilar-1/<sigla>/`.
4. **Given** any page, **When** its navigation is inspected, **Then** there
   is a clear path back to `/` and to `/pilar-1/` from the detail pages.

---

### User Story 2 - Ano sempre explícito, na URL (Priority: P1)

Every displayed indicator value belongs to one explicitly selected calendar
year. The selected year is reflected in the URL as a query parameter (for
example `/pilar-1/ntpp/?ano=2025`), making links shareable and back/forward
navigation functional. When no year is specified, the default is 2025 (the
latest closed year). 2026 remains selectable but is labeled as an
in-progress year with partial data. Years are never summed or blended into a
single number; the historical chart shows all available years side by side.
Indicators with no data at all (PIES, PICOT) show "Dado indisponível"
regardless of the selected year.

**Why this priority**: Year-explicit values with URL state is the core
correctness rule of the dashboard — it prevents misreading partial data.

**Independent Test**: Can be fully tested by opening a detail page with and
without `?ano=`, changing the year, verifying the URL updates, using
back/forward, sharing a link with `?ano=2024`, and checking that no
combined-total number appears anywhere.

**Acceptance Scenarios**:

1. **Given** a detail page opened without `?ano=`, **When** it renders,
   **Then** it shows the value for 2025 and the URL reflects the effective
   default year selection.
2. **Given** the visitor selects a different available year, **When** the
   selection changes, **Then** the URL updates to `?ano=<year>` and the
   displayed value updates to that year's value.
3. **Given** a shared link with `?ano=2024`, **When** it is opened,
   **Then** the page shows the 2024 value.
4. **Given** the visitor navigates back after changing the year, **When**
   the previous page loads, **Then** the previous year's view is restored.
5. **Given** the year 2026 is selected, **When** the page renders, **Then**
   the value is labeled as an in-progress year with partial data.
6. **Given** any page or card, **When** numbers are inspected, **Then** no
   value sums or blends 2024, 2025 and 2026 into a single number.
7. **Given** PIES or PICOT with any `?ano=` value, **When** the page
   renders, **Then** it shows "Dado indisponível" with the missing-data
   explanation, never a value or estimate.
8. **Given** a URL with an invalid or unknown year (`?ano=1999`),
   **When** the page renders, **Then** it falls back to the default year.

---

### User Story 3 - Exportação dos dados do indicador (Priority: P2)

On each indicator detail page, the visitor can download that indicator's
data (the same data curated in the repository) as CSV and as JSON, without
any individual-level information.

**Why this priority**: Managers and researchers need the numbers in
reusable form; the data already exists, so this is a bounded addition.

**Independent Test**: Can be fully tested by downloading both formats for an
indicator with data (e.g., NTPP) and for an unavailable one (e.g., PIES),
and checking the contents match the repository data exactly.

**Acceptance Scenarios**:

1. **Given** the NTPP detail page, **When** the visitor downloads the CSV,
   **Then** the file is UTF-8 with semicolon separators, one row per year
   (ano;valor;motivo) with the exact report values.
2. **Given** the NTPP detail page, **When** the visitor downloads the JSON,
   **Then** the file matches the repository data for that indicator.
3. **Given** the PIES detail page, **When** the visitor downloads either
   format, **Then** the export reflects the unavailable state (no invented
   values) and includes the component counts that exist (e.g., NEP).

---

### User Story 4 - Identidade própria e remoção do painel de acessibilidade (Priority: P2)

The site presents its own visual identity, recognizably distinct from the
sibling horizon_dashboard project: a distinct institutional palette with its
own primary hue (meeting WCAG AA in light and dark modes), a distinct
typeface (not Ubuntu/Ubuntu Mono), and a simple text or monogram mark of
this project's own name. Horizon's four-color institutional stripe, its "H"
square mark and its typography do not appear. The in-app accessibility
control panel (theme/contrast/font-size toggles) is removed entirely — an
accessibility plugin will be added separately later — while semantic HTML,
labels and WCAG AA color contrast in the base styles are preserved. Cards
keep the thin border + surface treatment without decorative shadows, and
interface text keeps the sober institutional pt-BR register.

**Why this priority**: The identity change is required by the user, but it
is a visual layer over the reworked IA and year semantics.

**Independent Test**: Can be fully tested by inspecting the rendered pages
(no Horizon brand elements; new palette/typeface/mark present; accessibility
toggles absent) and by running the contrast and register audits.

**Acceptance Scenarios**:

1. **Given** any page, **When** it is inspected side by side with
   horizon_dashboard, **Then** the two projects look unrelated: no
   four-color stripe, no "H" mark, no Ubuntu typography.
2. **Given** any page in light or dark presentation, **When** text and
   background pairs are checked, **Then** they meet WCAG AA.
3. **Given** any page, **When** the header area is inspected, **Then** the
   accessibility control panel (theme/contrast/font-size toggles) is absent,
   the page retains its semantic headings, labels and landmarks, and dark
   mode follows the operating system preference automatically.
4. **Given** any indicator card, **When** it is inspected, **Then** it uses
   a thin border with a surface color and no decorative drop shadow.
5. **Given** any heading or label, **When** it is read, **Then** it follows
   the sober institutional register (sentence case, no marketing adjectives,
   no stage verbs, no emoji, plain numbers).

---

### Edge Cases

- What happens with `?ano=` for a year with no data for that indicator
  (e.g., NTPP in 2019)? → The value area shows "Dado indisponível" for that
  year.
- What happens with an invalid year (`?ano=abc`, `?ano=1999`)? → The page
  falls back to the default year (2025).
- What happens when only the in-progress year has data? → The default falls
  back to the in-progress year, still labeled as partial.
- What happens when a future pillar is later added? → The URL pattern
  `/pilar-2/<sigla>/` works without restructuring existing pages.
- What happens to old links (`/indicadores/ntpp/`)? → The previous route
  structure is replaced; no redirects are required while the site is
  pre-launch (documented assumption).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The home page (`/`) MUST present an overview of the pillars:
  Pillar 1 as an active card linking to `/pilar-1/`, and Pillars 2 and 3 as
  "em breve" placeholders without content links.
- **FR-002**: `/pilar-1/` MUST present exactly four indicator cards (NTPP,
  QSPP, PIES, PICOT), each linking to `/pilar-1/<sigla>/`.
- **FR-003**: Indicator detail pages MUST live at `/pilar-1/<sigla>/`
  (lowercase slug), a URL pattern that future pillars reuse without
  restructuring.
- **FR-004**: No page MAY display an indicator value without an explicitly
  selected year; overview cards MUST show the value for the default year,
  clearly labeled with that year.
- **FR-005**: The site MUST NEVER sum, average or blend values across years
  into a single displayed number.
- **FR-006**: The selected year MUST be reflected in the URL as `?ano=<year>`
  so links are shareable and back/forward navigation restores the year.
- **FR-007**: The default year MUST be 2025 (the latest closed year); 2026
  MUST remain selectable and MUST be labeled as an in-progress year with
  partial data.
- **FR-008**: Indicators with no data at all (PIES, PICOT) MUST show "Dado
  indisponível" with the missing-data explanation regardless of the selected
  year.
- **FR-009**: The historical chart MUST show all available years side by
  side (per-year values, never combined).
- **FR-010**: Each indicator detail page MUST offer downloads of that
  indicator's repository data in CSV and JSON formats. The CSV MUST use the
  pt-BR convention (UTF-8 with BOM, semicolon separator) with columns
  ano;valor;motivo — one row per year, empty valor and the reason text for
  unavailable years — followed by one section per existing component (e.g.,
  NEP) with columns ano;quantidade;motivo. The JSON download MUST be the
  indicator's repository data file itself.
- **FR-011**: The in-app accessibility control panel MUST be removed
  entirely; semantic HTML, labels, landmarks and WCAG AA color contrast in
  the base styles MUST be preserved. The site keeps light and dark
  presentations with dark mode following the operating system preference
  automatically — no user-facing theme, contrast or font-size controls.
- **FR-012**: The site MUST use its own visual identity: a distinct palette
  with an own primary hue (WCAG AA in light and dark modes), a distinct
  typeface (not Ubuntu/Ubuntu Mono), and a simple text or monogram mark of
  the project's own name; Horizon's stripe, "H" mark and typography MUST
  NOT appear.
- **FR-013**: All user-facing text MUST remain in the sober institutional
  pt-BR register (sentence case, no marketing adjectives, no stage verbs,
  no emoji in headings or labels, plain numbers).
- **FR-014**: Indicator values, the JSON data contract and the data files
  MUST remain unchanged.
- **FR-015**: Cards MUST use a thin border with a surface color, without
  decorative drop shadows.

### Key Entities _(include if feature involves data)_

- **Pilar**: A pillar of the CONIF model, identified by number (1, 2, 3) and
  slug (`pilar-1`, `pilar-2`, `pilar-3`), with a status: ativo (Pillar 1)
  or "em breve" (Pillars 2 and 3, placeholder only).
- **Indicador / Valor anual**: Unchanged from feature 001 — acronym
  (NTPP, QSPP, PIES, PICOT), slug, methodology metadata, per-year values or
  explicit unavailable state (see `specs/001-pillar1-indicators-dashboard/data-model.md`).
- **Exportação**: The download of one indicator's repository data in CSV or
  JSON format, reflecting the same values and unavailable states as the
  page.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of the new routes render correctly (`/`, `/pilar-1/`,
  `/pilar-1/ntpp/`, `/pilar-1/qspp/`, `/pilar-1/pies/`, `/pilar-1/picot/`),
  with Pillars 2 and 3 shown as "em breve" on `/`.
- **SC-002**: 100% of displayed indicator values reference an explicit
  calendar year; zero occurrences of summed or blended multi-year numbers.
- **SC-003**: A link with `?ano=2024` renders the 2024 value, and
  back/forward navigation restores the previous year selection in 100% of
  attempts.
- **SC-004**: Exports for every indicator match the repository data exactly
  (100%) in both CSV and JSON formats, including the unavailable state for
  PIES/PICOT.
- **SC-005**: The visual identity passes WCAG AA in light and dark modes,
  contains no Horizon brand elements, and uses a typeface distinct from
  Ubuntu/Ubuntu Mono.
- **SC-006**: The accessibility toggle UI is absent from 100% of pages while
  semantic headings, labels and landmarks remain.
- **SC-007**: 100% of interface text passes the institutional-register audit
  (unchanged rules from feature 002).

## Assumptions

- **Data export offers both formats** (CSV and JSON) — the "and/or" in the
  request is resolved to both, the superset.
- **No redirects from the old routes** (`/indicadores/...`): the site is
  pre-launch; the old route structure is simply replaced.
- **"Latest closed year" default**: implemented as 2025 today; the
  generalized rule is the latest year with data that is not the in-progress
  year (2026), falling back to the in-progress year if it is the only one
  with data.
- **Invalid or unknown `?ano=` values fall back to the default year** rather
  than erroring.
- **Concrete palette hexes, typeface and mark design are delegated to
  planning**, constrained by FR-012 (distinct from Horizon, own primary hue,
  WCAG AA light and dark, sober institutional tone). The Horizon identity
  installed by feature 002 (stripe, Ubuntu fonts, a11y panel) is removed or
  replaced by this feature.
- **Pillars 2 and 3 placeholders** are static "em breve" cards; their future
  content is out of scope.
- The chart presentation form (per-year side-by-side view plus year/value
  listing) is retained; only its styling follows the new identity.

## Notes

- The year-in-URL requirement changes behavior added by feature 001
  (year selector without URL state) and the "most recent value" cards from
  the same feature; where they conflict, this specification prevails.
- Feature 002's accessibility panel and Horizon identity are removed here by
  explicit user direction; the underlying semantic HTML, labels and WCAG AA
  base contrast are preserved.
