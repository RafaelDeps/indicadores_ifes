# Feature Specification: Horizon visual redesign (Redesign visual — sistema de marca Horizon)

**Feature Branch**: `002-horizon-visual-redesign`

**Created**: 2026-09-21

**Status**: Draft

**Input**: User description: "Redesign the visual identity of the dashboard to follow the Horizon brand system, the design language already used by the sibling project ifesserra-lab/horizon_dashboard (documented in that repo's BRANDING.md; ignore its DESIGN.md, which is an unrelated Apple design analysis left in that repo by mistake). This is a visual redesign only — no changes to data, routes, or the data contract. [...] Institutional color palette (light/dark variants), thin institutional stripe of four vertical color bars (yellow, green, red, blue) at the very top of every page, Ubuntu/Ubuntu Mono typography self-hosted with weights 400/500/700 only, sober institutional pt-BR voice, indicator cards with 1px border and no decorative shadows, accessibility controls (theme light/dark/auto, contrast normal/high/maximum, font size) meeting WCAG AA in every combination. Out of scope: indicator values, JSON data contract, set of pages/routes."

## Clarifications

### Session 2026-09-21

- Q: Como os controles de acessibilidade (tema, contraste, tamanho de fonte)
  devem aparecer em todas as páginas? → A: Barra fixa no cabeçalho, sempre
  visível, sem painel ou modal.
- Q: Qual meta de contraste WCAG para cada nível (normal / alto / máximo)?
  → A: Máximo = AAA; normal e alto = AA.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Identidade visual Horizon em todas as páginas (Priority: P1)

A visitor on any page of the dashboard perceives the Horizon institutional
identity: the thin institutional stripe above the header (four vertical bars
in the order yellow, green, red, blue), the institutional palette (primary
green fills, dark green text/titles/links, sparing yellow/red/blue accents),
Ubuntu typography for headings and body text, Ubuntu Mono for numbers, and
indicator cards presented on a surface color with a thin 1px border instead
of decorative drop shadows.

**Why this priority**: The institutional identity is the core of the
redesign; without it nothing else in the feature has meaning.

**Independent Test**: Can be fully tested by opening each of the site's
pages and verifying the stripe (presence, position, bar order), the palette
application, the typography, and the card treatment (border, no shadows),
plus verifying that no font is loaded from an external CDN.

**Acceptance Scenarios**:

1. **Given** any page of the site, **When** it is opened, **Then** the thin
   institutional stripe appears at the very top, above the header, with four
   vertical bars in the order yellow, green, red, blue.
2. **Given** any page, **When** it is inspected, **Then** titles, body text
   and links use the dark institutional green, and fills (including chart
   bars) use the primary institutional green.
3. **Given** any indicator card, **When** it is inspected, **Then** it uses
   the surface color with a 1px border and has no decorative drop shadow.
4. **Given** any page, **When** the text and numbers are inspected, **Then**
   headings and body text render in the Ubuntu family and numbers, indicator
   values and chart axis labels render in the Ubuntu Mono family, with only
   weights 400, 500 and 700 in use (weight 600 never used).
5. **Given** any page, **When** network requests are inspected, **Then** no
   font file is fetched from an external CDN — all fonts are served from the
   site itself.

---

### User Story 2 - Controles de acessibilidade com contraste WCAG AA (Priority: P1)

A visitor can adjust the presentation through accessibility controls
available on every page: theme (light, dark, or automatic — following the
operating system preference), contrast level (normal, high, maximum), and
font size. Every combination of theme × contrast level (including dark mode)
meets WCAG AA — with WCAG AAA required at the maximum level — using the new
palette, and the yellow accent never carries white text on top of it.

**Why this priority**: Accessibility is a hard requirement of the project
constitution (basic quality) and constrains the palette from the start;
implementing it after the palette would force rework.

**Independent Test**: Can be fully tested by toggling each control
combination and running the automated contrast checks across all theme ×
contrast combinations, plus manually verifying the yellow-accent rule and
that choices persist while navigating between pages.

**Acceptance Scenarios**:

1. **Given** any page, **When** it is opened, **Then** the three controls
   (theme, contrast level, font size) are visible in the fixed
   accessibility bar in the header area, operable without opening any
   panel or modal.
2. **Given** the theme set to dark, **When** any page is inspected,
   **Then** every text/background pair meets WCAG AA with the dark palette
   variants.
3. **Given** contrast set to high or maximum, in either light or dark
   theme, **When** any page is inspected, **Then** every text/background
   pair meets WCAG AA — and, at the maximum level, WCAG AAA.
4. **Given** any element on the yellow accent, **When** it is inspected,
   **Then** the text on it is dark (never white).
5. **Given** a visitor changes theme, contrast or font size, **When** they
   navigate to another page of the site, **Then** the choice remains applied.
6. **Given** the font size is increased, **When** any page is viewed at a
   phone-width viewport, **Then** the layout remains usable with no
   horizontal scrolling.

---

### User Story 3 - Registro institucional sóbrio em pt-BR (Priority: P2)

All interface text follows the sober institutional Brazilian Portuguese
register: no marketing adjectives (poderoso, premium, inteligente), no
"stage" verbs (eleve, transforme, potencialize), no emoji in headings or
labels, sentence case instead of Title Case, and numbers presented plainly
with their context (e.g., "534 projetos de pesquisa em 2026") without
evaluative adjectives.

**Why this priority**: The register is what makes the dashboard credible as
an institutional publication; it is a text-audit pass over the redesigned
interface.

**Independent Test**: Can be fully tested by running an automated audit for
forbidden terms/emoji over the rendered interface text and manually
reviewing headings and labels for sentence case and plain-number phrasing.

**Acceptance Scenarios**:

1. **Given** the rendered interface text of every page, **When** the
   automated audit runs, **Then** none of the forbidden marketing adjectives
   or stage verbs appear, and no emoji appears in headings or labels.
2. **Given** any heading or interface label, **When** it is inspected,
   **Then** it uses sentence case (primeira letra maiúscula, demais em
   minúsculas), not Title Case.
3. **Given** any displayed indicator number, **When** it is read, **Then**
   it is presented plainly next to its factual context, with no evaluative
   or promotional wording.

---

### Edge Cases

- What happens if a font file fails to load? → The site falls back to the
  system sans-serif/monospace stacks and remains fully usable; no external
  CDN is ever requested.
- What happens with the automatic theme when the operating system changes
  preference while browsing? → The site follows the OS preference while the
  theme control is in "automático".
- What happens when maximum contrast is combined with dark mode? → The dark
  palette variant with elevated contrast is applied; every pair still meets
  WCAG AAA.
- What happens if a future indicator year equals the "ano em andamento"
  notice logic? → The notice styling follows the new palette without any
  change to its behavior or text.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The site MUST use the institutional Horizon palette with a
  light-mode and a dark-mode variant for each color, per the palette table
  below.
- **FR-002**: Every page MUST display the thin institutional stripe at the
  very top, above the header, composed of four vertical bars in the order
  yellow, green, red, blue.
- **FR-003**: Headings and body text MUST use the Ubuntu font family, and
  numbers, indicator values (KPI) and chart axis labels MUST use the Ubuntu
  Mono family, both self-hosted by the site (no external font CDN). Only
  font weights 400, 500 and 700 MAY be used; weight 600 MUST NOT be used.
- **FR-004**: The site MUST provide accessibility controls on every page —
  in a fixed accessibility bar in the header area, always visible, without
  requiring any panel or modal to reach them: theme (claro / escuro /
  automático), contrast level (normal / alto / máximo), and font size. A
  visitor's choice MUST remain applied while navigating between pages.
- **FR-005**: Every combination of theme × contrast level (including dark
  mode) MUST meet WCAG AA contrast ratios (minimum 4.5:1 for normal text,
  3:1 for large text), and the maximum contrast level MUST additionally
  meet WCAG AAA (minimum 7:1 for normal text, 4.5:1 for large text). The
  yellow accent MUST never carry white text on top of it.
- **FR-006**: Indicator cards MUST use the surface color with a thin 1px
  border; decorative drop shadows MUST NOT be used as card treatment.
- **FR-007**: All interface text MUST follow the sober institutional
  pt-BR register: no marketing adjectives (poderoso, premium, inteligente),
  no stage verbs (eleve, transforme, potencialize), no emoji in headings or
  labels, sentence case instead of Title Case, numbers presented plainly
  with factual context.
- **FR-008**: The redesign MUST NOT change indicator values, the JSON data
  contract, or the set of pages/routes; the values displayed before and
  after the redesign MUST be identical.
- **FR-009**: If a font file cannot be loaded, the site MUST fall back to
  system font stacks and remain fully usable.

### Paleta institucional (valores da marca)

| Papel          | Modo claro | Modo escuro             | Uso                                             |
| -------------- | ---------- | ----------------------- | ----------------------------------------------- |
| Verde primário | `#009640`  | `#12B24A`               | Preenchimentos, barras de gráfico               |
| Verde escuro   | `#006B3F`  | `#1BA94C`               | Texto, títulos, links (WCAG AA)                 |
| Amarelo        | `#FDB913`  | `#FFC73A`               | Destaque com parcimônia; nunca com texto branco |
| Vermelho       | `#E30613`  | `#FF5A4D`               | Acento com parcimônia                           |
| Azul           | `#0072BC`  | `#3BA0E0`               | Acento com parcimônia                           |
| Tinta (texto)  | `#1A2B22`  | `#EAF1EC`               | Texto padrão                                    |
| Fundo          | `#F5F7F5`  | `#0E1512`               | Fundo das páginas                               |
| Superfície     | `#FFFFFF`  | `#16201B`               | Cartões e painéis                               |
| Borda          | `#E1E7E2`  | `rgba(255,255,255,.12)` | Bordas de 1px                                   |

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of text/background color pairs pass WCAG AA in every
  theme × contrast-level combination (including dark mode) and pass WCAG
  AAA at the maximum contrast level, verified by automated contrast tests.
- **SC-002**: The institutional stripe is present, above the header, with
  bars in the correct order, on 100% of the site's pages.
- **SC-003**: Zero font requests to external CDNs across all pages, and
  zero occurrences of font weight 600.
- **SC-004**: 100% of interface text passes the institutional-register
  audit (no forbidden adjectives, no stage verbs, no emoji in headings or
  labels).
- **SC-005**: Indicator values, pages and routes are identical before and
  after the redesign (zero data regression).
- **SC-006**: A visitor can change theme, contrast and font size and observe
  the choice applied on every subsequent page within the same visit.

## Assumptions

- **The current site does not yet have the theme/contrast/font-size
  controls.** The user input describes them as "preserved", but they do not
  exist in the codebase today; per the user's earlier instruction ("extend
  it if needed"), this feature DELIVERS the three controls with the three
  contrast levels (normal/alto/máximo) and dark mode.
- The sibling repository `ifesserra-lab/horizon_dashboard` is not accessible
  from this workspace; the concrete brand values supplied by the user (hex
  palette above, font families, weights, stripe order) are treated as the
  authoritative extract of that repo's BRANDING.md. DESIGN.md is explicitly
  ignored as instructed.
- The automatic theme follows the operating system preference; explicit
  light/dark choices override it.
- Font size control offers discrete steps (padrão, grande, maior —
  approximately 100%/112.5%/125%); the exact steps are a presentation
  detail for planning.
- The chart presentation form (trend view plus the year/value listing) is
  retained in its current form; only its visual style changes.
- Scope boundaries: no changes to indicator values, the JSON data contract,
  or the set of pages/routes; no backend, no new pages.
