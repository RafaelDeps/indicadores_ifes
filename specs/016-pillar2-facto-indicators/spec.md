# Feature Specification: Ingestion and Calculation of Pillar 2 Indicators from FACTO Data

**Feature Branch**: `fix/first-pilar`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "Implement ingestion and calculation of Pillar 2 indicators (Funding and Ecosystem Connection) in the Python ETL pipeline using FACTO data located in data/raw/pilar2/, generating real metrics for the dashboard. Specific requirements: 1. FACTO Data Ingestion: Implement a source adapter for CSV files in data/raw/pilar2/, prioritizing 'projetos.csv' and 'recursos_rubrica.csv'; handle UTF-8, ';' delimiter, Brazilian currency formats. 2. Campus Mapping and Resolution: Identify 'Instituição executora' and map to official IFES campus slugs and Rectorate using campus_resolver; exclude purely external partner institutions; consolidate global 'todos' scope. 3. PIPDI Indicator Calculation: Compute NAPPCT_acordos_parceria_firmados and total_acumulado_PIPDI per campus and 'todos' across 2024-2026; filter eligible partnership instruments and PDeI project types; output verified integer counts or 0. 4. PINV Indicator Calculation: Aggregate TAFPPI_valor_total_aporte_pesquisa in BRL; maintain OCC and percentual_calculado_PINV strictly null per Principle III unless institutional budget is provided. 5. Contracts, Validation, and Testing: Update schemas (pilar2-schema.json) and sink; preserve frontend compatibility; provide automated pytest coverage."

## Clarifications

### Session 2026-10-05

- Q: Campus Attribution for Projects Executed by the Rectorate ("Reitoria") → A: Count "Reitoria" projects in the global "todos" scope, but attribute to a specific campus if the project title/department explicitly identifies a recognized campus (e.g., CEFOR).
- Q: Annual Attribution of Research Funding (TAFPPI) → A: Attribute the full approved funding value (Valor aprovado) to the project's start year (ano de início), reflecting new funding captured in that reference year.
- Q: Project Type Eligibility for PDeI Indicators (PIPDI and TAFPPI) → A: Count projects whose type contains "Pesquisa", "Inovação", or "Desenvolvimento" (including hybrid types like "Pesquisa e Extensão"), strictly excluding "Processo Seletivo", "Concurso Público", pure "Ensino", and pure "Extensão".
- Q: Pipeline Behavior When the Raw FACTO Directory Is Absent → A: Graceful fallback: If data/raw/pilar2/ (or projetos.csv) is missing, emit an informative warning and output Pillar 2 metrics as null, allowing CI and fresh test checkouts to pass cleanly without error.
- Q: Projects with Empty "Instrumento Jurídico" but Legitimate External Partners → A: If Tipo de Projeto is an eligible PDeI type and an external partner/funder is present, count it as a valid partnership in PIPDI even if Instrumento Jurídico is blank.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visualization of R&D&I Partnership Agreements (PIPDI) by Campus and Year (Priority: P1)

As an institutional leader, campus director, or citizen inspecting the IFES institutional indicators dashboard, I want to see the verified number of active partnership agreements and ecosystem collaborations (PIPDI / NAPPCT) for each campus and for the whole institution across 2024, 2025, and 2026, so that the institution's collaboration with the socioeconomic ecosystem is accurately and transparently presented.

**Why this priority**: PIPDI is one of the two core indicators of Pillar 2 ("Fomento e Conexão com o Ecossistema"). Until now, all Pillar 2 metrics were displayed as unavailable (`null`) due to lack of an authoritative data source. Activating verified partnership agreements delivers immediate public value and institutional transparency.

**Independent Test**: Can be fully tested by processing the FACTO dataset in `data/raw/pilar2/` and inspecting the generated indicators package: every IFES campus and the global scope `todos` across 2024–2026 must display integer values for `NAPPCT_acordos_parceria_firmados` and `total_acumulado_PIPDI` (e.g. >= 0, reflecting active partnerships), and 0 for years/campi with verified absence of partnerships, passing dashboard validation.

**Acceptance Scenarios**:

1. **Given** a partnership project active in 2025 executed by Campus Serra (e.g., an agreement or cooperation contract), **When** Pillar 2 indicators are generated for Campus Serra in 2025, **Then** `NAPPCT_acordos_parceria_firmados` and `total_acumulado_PIPDI` are incremented by 1 for Campus Serra and also incremented by 1 in the global `todos` scope.
2. **Given** a project whose legal instrument indicates a partnership (such as "Convênio", "Acordo de Parceria", "Contrato de Parceria", or "Termo de Cooperação") and whose type is focused on Research, Development, and Innovation (PDeI), **When** the project is evaluated for its active timeframe (`Data de início` to `Data de vigência`), **Then** it is counted toward the active agreements of each year within its active span.
3. **Given** a project executed exclusively by an external institution that uses FACTO (such as IFSP, IFFar, or ICMBio), **When** partnership indicators are processed, **Then** this project is NOT attributed to any IFES campus nor to the IFES institutional `todos` scope.
4. **Given** an IFES campus with zero active partnership agreements in a specific reference year (e.g., 2024), **When** metrics are compiled, **Then** `NAPPCT_acordos_parceria_firmados` and `total_acumulado_PIPDI` are populated with `0` (indicating a verified count of zero, rather than `null`).

---

### User Story 2 - Transparent Research Funding Ingestion (TAFPPI in PINV) (Priority: P2)

As an academic researcher, auditor, or government oversight body, I want to view the total funding amount captured for research and innovation (`TAFPPI`) in BRL for each campus and year, while uncollected institutional operational budgets (`OCC`) and the resulting `PINV` ratio remain strictly recorded as unavailable ("Dado indisponível"), so that external funding is disclosed faithfully without fabricating unverified institutional operating budgets.

**Why this priority**: In accordance with Principle III of the IFES Constitution (Fidelity to Report Data), indicator values must never be invented or estimated. The foundation data provides genuine project funding values (`TAFPPI`), but does not contain the IFES global operating budget (`OCC`). Reporting the funding amount while faithfully marking `OCC` and the percentage as unavailable protects institutional credibility.

**Independent Test**: Can be fully tested by checking the generated Pillar 2 indicator records for any reference year: `TAFPPI_valor_total_aporte_pesquisa` contains the monetary sum (or `null` if no project funding exists for that campus/year), while `OCC_valor_orcamento_total_capital_custeio` and `percentual_calculado_PINV` are strictly `null`.

**Acceptance Scenarios**:

1. **Given** FACTO research and innovation projects assigned to an IFES campus with approved funding values, **When** Pillar 2 indicators are aggregated for a reference year, **Then** `TAFPPI_valor_total_aporte_pesquisa` reports the total monetary sum in BRL.
2. **Given** that institutional operational budget data (`OCC`) is absent from the FACTO dataset, **When** PINV metrics are compiled, **Then** `OCC_valor_orcamento_total_capital_custeio` and `percentual_calculado_PINV` remain strictly `null` across all campuses and years, rendering as "Dado indisponível" in the dashboard.
3. **Given** an institutional scope where no external research funding was registered in a given year, **When** TAFPPI is aggregated, **Then** it evaluates to `null` (or `0.0` if specifically documented as an audited zero-funding record), avoiding arbitrary estimation.

---

### User Story 3 - Resilient Ingestion and Provenance Tracking (Priority: P3)

As a data pipeline maintainer, I want the ingestion engine to parse Brazilian tabular CSV files from `data/raw/pilar2/`, robustly resolve campus identities, track execution metadata, and maintain full backward compatibility with the existing dashboard, so that future data updates or refreshes can be deployed reliably.

**Why this priority**: The pipeline must operate deterministically, resist formatting variations (e.g., currency symbols, comma decimals, Latin encodings), and maintain clean separation of concerns without modifying existing Pillar 1 or Pillar 3 calculations.

**Independent Test**: Can be tested by running the full pipeline from raw data to dashboard distribution and asserting that all data schema contracts validate cleanly with zero regression on Pillar 1 and Pillar 3.

**Acceptance Scenarios**:

1. **Given** raw CSV files formatted with semicolon delimiters (`;`), UTF-8 or ISO encodings, and Brazilian currency strings (e.g. `"1.256.355,65"`), **When** the ingestion engine reads the files, **Then** numeric values are parsed into floating-point numbers without precision corruption or runtime exceptions.
2. **Given** project records with slight variations in the campus naming string (e.g., `"Instituto Federal De Educacao Ciencia E Tecnologia Do Espirito Santo - Campus Vila Velha"` vs `"Campus Vila Velha"`), **When** resolving the executing campus, **Then** the resolver accurately maps each to its canonical IFES campus slug (e.g., `vila-velha`).
3. **Given** network projects executed at the Rectorate level with multi-campus impact, **When** resolving scope, **Then** the projects are accounted for under the Rectorate / institutional scope without falsely attributing them to a single local campus.

---

### Edge Cases

- **Project with missing or malformed start/end dates**: If a project record has an invalid or missing `Data de início`, the system logs a descriptive warning and excludes it from temporal aggregations rather than crashing.
- **Plurianual projects spanning multiple reference years**: A project starting in 2022 and ending in 2026 must be recognized as active in 2024, 2025, and 2026.
- **Projects with zero approved funding or empty funding fields**: Empty or non-numeric funding fields must default to `0.0` or be omitted from the sum without causing parser failures.
- **Non-IFES project executions**: Records where the executing institution is an external entity (e.g. IFSP, IFFar, INMA, ICMBio) must be cleanly isolated and omitted from IFES metrics.
- **Missing optional tables**: If supplementary files (such as `recursos_rubrica.csv`) are absent, the ingestion should gracefully fall back to the primary `projetos.csv` file.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST ingest foundation project data from `data/raw/pilar2/projetos.csv` using UTF-8 encoding and semicolon (`;`) delimiters.
- **FR-002**: The system MUST parse Brazilian currency representations (e.g., `"1.256.355,65"` or `"R$ 1.256.355,65"`) into standard numeric float values.
- **FR-003**: The system MUST resolve the `Instituição executora` of each project into canonical IFES campus slugs (`alegre`, `aracruz`, `cachoeiro-de-itapemirim`, `cariacica`, `itapina`, `linhares`, `montanha`, `piuma`, `santa-teresa`, `serra`, `venda-nova-do-imigrante`, `vila-velha`, `vitoria`, `cefor`, `todos`) using canonical slug normalizers. Projects executed by the Rectorate ('Reitoria') MUST be accounted for in the institutional global scope `todos`, and ALSO attributed to a specific campus if the project title/department explicitly identifies a recognized campus (e.g., CEFOR).
- **FR-004**: The system MUST filter and exclude projects whose executing institution belongs to external entities outside IFES.
- **FR-005**: The system MUST filter projects eligible for the PIPDI and TAFPPI indicators by validating that their `Tipo de Projeto` contains "Pesquisa", "Inovação", or "Desenvolvimento" (including hybrid types such as "Pesquisa e Extensão" or "Pesquisa e Ensino"), strictly excluding administrative exam projects ("Processo Seletivo", "Concurso Público"), pure "Ensino", and pure "Extensão". For PIPDI, the `Instrumento Jurídico` MUST represent a formal partnership (including "Convênio", "Acordo de Parceria", "Contrato de Parceria", "Termo de Cooperação", or explicit partnership contracts); if `Instrumento Jurídico` was left blank in the foundation record but an external partner/funder (`Financiadora`) is present on an eligible PDeI project, it MUST also be counted as a valid partnership agreement.
- **FR-006**: The system MUST determine project activity across target reference years (2024, 2025, 2026) based on project start date (`Data de início`) and validity/end dates (`Data de vigência` / `Data de encerramento`).
- **FR-007**: The system MUST compute `NAPPCT_acordos_parceria_firmados` and `total_acumulado_PIPDI` as non-negative integers for each campus and the `todos` scope in each reference year.
- **FR-008**: The system MUST aggregate `TAFPPI_valor_total_aporte_pesquisa` as the sum of approved funding values (`Valor aprovado`) for R&D&I projects whose start year (`Data de início`) matches the reference year, per campus and in the `todos` scope. For years where a campus has no newly captured project funding, TAFPPI MUST be reported as `null` (or `0.0` if configured).
- **FR-009**: In compliance with Principle III of the IFES Constitution, the system MUST preserve `OCC_valor_orcamento_total_capital_custeio` and `percentual_calculado_PINV` as strictly `null` (not 0, not empty string) to indicate unavailable institutional operational budget data.
- **FR-010**: The contract schema for Pillar 2 (`pilar2-schema.json`) MUST be updated to accept non-negative integer numbers or `null` for PIPDI metrics (`NAPPCT_acordos_parceria_firmados`, `total_acumulado_PIPDI`) and numeric float or `null` for `TAFPPI_valor_total_aporte_pesquisa`.
- **FR-011**: Output JSON formatting in `json_pilar_sink.py` MUST serialize calculated Pillar 2 metrics adhering to the updated schema without regressing Pillar 1 or Pillar 3 outputs.
- **FR-012**: In compliance with Principle IV of the IFES Constitution, the system MUST ONLY export aggregated numeric and institutional data; individual personal data, CPF numbers, and individual payment details MUST NOT be output into indicator packages.
- **FR-013**: In compliance with Principle II of the IFES Constitution, automated unit tests in `pytest` MUST be written before implementation to test parser rules, campus mapping, temporal eligibility, and metric aggregation.
- **FR-014**: If the raw data directory `data/raw/pilar2/` or `projetos.csv` is absent (such as in fresh checkouts or CI environments where raw files are not committed), the system MUST gracefully log an informative warning and output Pillar 2 metrics as `null`, allowing automated test suites and existing pipeline flows to pass cleanly.

### Key Entities _(include if feature involves data)_

- **ProjetoFacto**: Represents an individual project managed by FACTO, with attributes: project ID/reference, coordinator name, funding agency, start date, validity date, closing date, project type, legal instrument, executing institution, and approved funding amount.
- **AgregadosPilar2**: Domain entity encapsulating aggregated metrics for a given campus and reference year: `tafppi_valor_total_aporte_pesquisa` (float | None), `occ_valor_orcamento_total_capital_custeio` (None), `percentual_calculado_pinv` (None), `nappct_acordos_parceria_firmados` (int | None), and `total_acumulado_pipdi` (int | None).
- **IndicadorPilar2Json**: Contract payload representing `pilar2_{campus}_{year}.json` containing campus metadata, reference year, pilar designation ("Fomento e Conexao com o Ecossistema"), and nested indicator objects for `PINV` and `PIPDI`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of the 76 IFES-affiliated project records from `projetos.csv` are deterministically resolved to their correct IFES campus or institutional scope without unhandled errors.
- **SC-002**: Generated indicator files `pilar2_{campus}_{year}.json` for all evaluated campuses and target reference years (2024–2026) validate against `pilar2-schema.json` with zero schema violations.
- **SC-003**: The ETL pipeline processes the foundation dataset and generates all updated Pillar 2 indicators in under 2 seconds.
- **SC-004**: The Astro frontend dashboard successfully renders the updated Pillar 2 metrics without layout breakage, displaying integer counts for PIPDI, monetary values for TAFPPI, and "Dado indisponível" for OCC/PINV.
- **SC-005**: 100% test pass rate in automated test suites (`pytest` for ETL and `npm test` for frontend) with zero regressions on existing Pillar 1 and Pillar 3 metrics.

## Assumptions

- The raw foundation files reside in `data/raw/pilar2/` and are tracked by `.gitignore` to prevent raw external data dumps from polluting Git version control history.
- The primary data source for agreements and funding values is `data/raw/pilar2/projetos.csv`. Supplementary detail from `recursos_rubrica.csv` is optional and secondary.
- Projects whose `Tipo de Projeto` contains "Pesquisa", "Inovação", or "Desenvolvimento" (including hybrid types) are eligible for R&D&I indicator consideration, while exam and purely non-research projects are excluded.
- Institutional operating budget (`OCC`) remains uncollected for now; therefore, `PINV` cannot be mathematically calculated as a percentage and must display as unavailable until an official budget data source is integrated.
- Legal instruments matching "Convênio", "Acordo de Parceria", "Contrato de Parceria", "Termo de Cooperação", and "Contrato" represent valid institutional partnerships for the PIPDI count; projects with an eligible PDeI type and a registered external partner/funder are also counted even if the instrument field is blank.
