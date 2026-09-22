# Feature Specification: CONIF Pillar 1 Indicators Dashboard

**Feature Branch**: `001-pillar1-indicators-dashboard`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "A public dashboard for IFES managers and the community to follow the 4 indicators of Pillar 1 of the CONIF model: NTPP, QSPP, PIES and PICOT. An overview page with one card per indicator and a detail page for each one. Each indicator shows its value per calendar year (with a year selector and historical series), what it measures, the formula, the variables, the polarity (higher is better), the data source, and the data update date. Indicators without enough data (currently PIES and PICOT, because the total number of enrolled students and the admission modality are missing) show 'Dado indisponível' explaining what is missing, with no estimated value. Existing components (such as NEP) may appear as plain counts, clearly labeled as not being the percentage. All user-facing text is in Brazilian Portuguese (pt-BR). Out of scope: Pillars 2 and 3, login, individual-level data, and editing data through the interface."

## Clarifications

### Session 2026-09-21

- Q: Should the historical series on each indicator detail page include a
  visual chart in addition to the year/value listing? → A: Listing + simple
  chart (both).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Overview page with indicator cards (Priority: P1)

A visitor (IFES manager or community member) opens the dashboard and sees one
card for each of the four Pillar 1 indicators: NTPP, QSPP, PIES and PICOT.
Each card shows the indicator name and its most recent available value with
the reference year, or "Dado indisponível" when no year has data. Each card
leads to the indicator's detail page.

**Why this priority**: The overview is the entry point of the dashboard;
without it no other journey exists.

**Independent Test**: Can be fully tested by opening the site and verifying
that exactly four cards appear, one per indicator, each showing either its
latest value with year or "Dado indisponível", and each leading to a detail
page.

**Acceptance Scenarios**:

1. **Given** the visitor opens the overview page, **When** the page loads,
   **Then** exactly four cards are shown: NTPP, QSPP, PIES and PICOT.
2. **Given** an indicator has data for at least one year, **When** its card
   is shown, **Then** the card displays the most recent available value and
   the calendar year it refers to.
3. **Given** an indicator has no data for any year, **When** its card is
   shown, **Then** the card displays "Dado indisponível" and never a zero or
   an estimated value.
4. **Given** the visitor clicks an indicator card, **When** the navigation
   completes, **Then** the detail page of that specific indicator is shown.

---

### User Story 2 - Indicator detail page with year selection and historical series (Priority: P1)

A visitor opens the detail page of an indicator that has data (for example,
NTPP or QSPP) and can: select a calendar year and see the indicator's value
for that year; view the historical series of values per year; and read the
indicator's context: what it measures, the formula, the variables, the
polarity (higher is better), the data source, and the data update date.

**Why this priority**: The detail page is the core informational value of the
dashboard: it exposes both the numbers and the methodology behind them.

**Independent Test**: Can be fully tested by opening an indicator with data,
changing the selected year, and verifying the displayed value, the historical
series and all six context items (measure, formula, variables, polarity, data
source, update date).

**Acceptance Scenarios**:

1. **Given** the detail page of an indicator with data, **When** it loads,
   **Then** the page shows what the indicator measures, its formula, its
   variables, its polarity ("quanto maior, melhor"), the data source, and the
   data update date.
2. **Given** the detail page of an indicator with data, **When** the visitor
   selects a different available year, **Then** the displayed value updates
   to that year's value.
3. **Given** the detail page of an indicator with data for multiple years,
   **When** the visitor views the historical series, **Then** the value for
   every year available in the report is shown, in calendar year order, both
   as a year/value listing and as a simple visual chart.
4. **Given** a year for which the report provides no value for the indicator,
   **When** that year is selected (or shown in the series), **Then** the
   value is shown as "Dado indisponível", never as zero.

---

### User Story 3 - Unavailable indicators explained (Priority: P2)

A visitor opens the detail page (or card) of an indicator that cannot be
calculated — currently PIES and PICOT — and sees "Dado indisponível" together
with a plain-language explanation of which data is missing (PIES: the total
number of enrolled students; PICOT: the admission modality). No estimated
value is ever shown.

**Why this priority**: Transparency about missing data is a core requirement,
but it depends on the overview and detail structure existing first.

**Independent Test**: Can be fully tested by opening the PIES and PICOT
detail pages and verifying the "Dado indisponível" message names the missing
inputs and no numeric value or estimate appears.

**Acceptance Scenarios**:

1. **Given** the detail page of PIES, **When** it loads, **Then** it displays
   "Dado indisponível" and explains that the total number of enrolled
   students is missing.
2. **Given** the detail page of PICOT, **When** it loads, **Then** it
   displays "Dado indisponível" and explains that the admission modality data
   is missing.
3. **Given** an unavailable indicator, **When** its page or card is shown,
   **Then** no zero, dash-as-value, or estimated value is presented as the
   indicator value.
4. **Given** an unavailable indicator whose methodology is documented in the
   report, **When** the detail page loads, **Then** the page still shows what
   the indicator measures, the formula, the variables, the polarity and the
   data source.

---

### User Story 4 - Existing components shown as plain counts (Priority: P3)

When the report provides a component used in an indicator's formula (such as
NEP) even though the full indicator cannot be computed, the dashboard may
display that component as a plain count for the available years, clearly
labeled so the visitor understands it is a component count and NOT the
indicator percentage.

**Why this priority**: Useful transparency for the community, but secondary
to the four main journeys.

**Independent Test**: Can be tested by opening a detail page that includes a
component count and verifying the count is shown for its available years with
a label stating it is not the indicator percentage.

**Acceptance Scenarios**:

1. **Given** an indicator whose component (e.g., NEP) has values in the
   report, **When** its detail page is shown, **Then** the component appears
   as a plain count per available year.
2. **Given** a component count is displayed, **When** the visitor reads it,
   **Then** a clear label states that the count is a component and not the
   indicator percentage (e.g., "Contagem absoluta — não é o percentual do
   indicador").
3. **Given** a component has no value for a year, **When** that year is
   shown, **Then** the count is shown as "Dado indisponível", never as zero.

---

### Edge Cases

- What happens when the visitor selects a year with no data for an indicator?
  → The value area shows "Dado indisponível" for that year.
- What happens when an indicator has data for some years but not others?
  → The historical series shows available values per year and
  "Dado indisponível" for the gaps.
- What happens when an indicator has no data for any year? → No year
  selection implying data availability is offered; the page explains what is
  missing.
- What happens when the data update date is unknown for an indicator? → The
  update date is shown as "Dado indisponível" as well.
- What happens when the report later supplies the missing inputs (total
  enrolled students, admission modality)? → The indicator becomes a normal
  indicator with values; no code or layout change should be needed.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The overview page MUST display exactly one card for each of the
  four Pillar 1 indicators: NTPP, QSPP, PIES and PICOT.
- **FR-002**: Each card MUST show the indicator's most recent available value
  with its reference year, or "Dado indisponível" when no year has data.
- **FR-003**: Each card MUST provide navigation to that indicator's detail
  page.
- **FR-004**: Each indicator detail page MUST display: what the indicator
  measures, the formula, the variables, the polarity (higher is better), the
  data source, and the data update date.
- **FR-005**: Each indicator detail page MUST allow selecting a calendar year
  from the years available for that indicator and MUST show the indicator's
  value for the selected year.
- **FR-006**: Each indicator detail page MUST present the historical series:
  the indicator's value for every year available in the report, ordered by
  calendar year, shown both as a year/value listing and as a simple visual
  chart (trend view). Years with no data MUST NOT be plotted as zero in the
  chart.
- **FR-007**: When the selected year or a series year has no value, the site
  MUST display "Dado indisponível" for that year.
- **FR-008**: For indicators that cannot be calculated due to missing inputs
  (currently PIES: total number of enrolled students; PICOT: admission
  modality), the site MUST display "Dado indisponível" together with an
  explanation naming the missing data.
- **FR-009**: The site MUST NEVER display an estimated, invented, rounded or
  interpolated value; a missing value MUST always be "Dado indisponível",
  never zero.
- **FR-010**: The site MAY display report components (such as NEP) as plain
  counts for their available years; every count MUST be clearly labeled as a
  component count and not the indicator percentage.
- **FR-011**: All user-facing text MUST be in Brazilian Portuguese (pt-BR).
- **FR-012**: The site MUST be publicly accessible without login or
  registration.
- **FR-013**: The site MUST contain only aggregated data; no names, CPF, or
  any individual-level data may be displayed.
- **FR-014**: The site MUST NOT offer any interface for editing indicator
  data; values are updated only by the project maintainers from the official
  report.
- **FR-015**: The site MUST present only Pillar 1 indicators; no content for
  Pillars 2 and 3 may appear.

### Key Entities _(include if feature involves data)_

- **Indicador (Indicator)**: A Pillar 1 indicator identified by its acronym
  (NTPP, QSPP, PIES, PICOT), with name, description of what it measures,
  formula, list of variables, polarity (higher is better), data source, and
  data update date.
- **Valor anual (Yearly Value)**: The indicator's value for a specific
  calendar year, or an explicit "unavailable" state with the reason (which
  input is missing). A year never has a zero as a substitute for "no data".
- **Componente (Component)**: A quantity used inside an indicator's formula
  (e.g., NEP) that has its own yearly counts and is displayed, when present,
  as a plain count clearly distinguished from the indicator percentage.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A first-time visitor can identify the status (value or
  unavailability) of all four Pillar 1 indicators within 30 seconds of
  opening the overview page.
- **SC-002**: Any indicator's value for a given year is reachable in at most
  two clicks from the overview page.
- **SC-003**: 100% of the numeric values displayed match exactly the values
  in the official report; zero invented or estimated values.
- **SC-004**: 100% of indicators with missing data display "Dado indisponível"
  plus the missing-data explanation; zero occurrences of missing data shown
  as zero.
- **SC-005**: All pages can be read and navigated on a phone-sized screen
  without horizontal scrolling or truncated content.
- **SC-006**: 100% of user-facing text is in Brazilian Portuguese.
- **SC-007**: A visitor with no prior knowledge of the CONIF model can
  understand, from the detail page alone, what each indicator measures, how
  it is calculated, and which data is missing when applicable.

## Assumptions

- Indicator values and metadata (formula, variables, polarity, data source,
  update date) come from the official CONIF report and are curated by the
  project maintainers; updates happen through repository data updates, never
  through the site interface.
- All four Pillar 1 indicators have "higher is better" polarity.
- The year selector defaults to the most recent year with available data for
  the indicator; the historical series is presented both as a readable
  year/value listing and as a simple visual chart, with the listing remaining
  the authoritative view of exact report values.
- The currently missing inputs are exactly: total number of enrolled students
  (blocking PIES) and admission modality (blocking PICOT); when these become
  available, the indicators display normally.
- Scope boundaries: Pillars 2 and 3 are out of scope; login/authentication is
  out of scope; individual-level data is out of scope; data editing through
  the interface is out of scope.
