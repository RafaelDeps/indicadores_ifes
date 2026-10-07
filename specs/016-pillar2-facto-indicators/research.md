# Research & Architecture Decisions: Pillar 2 FACTO Indicators Integration

**Feature**: `016-pillar2-facto-indicators`
**Date**: 2026-10-05

## 1. Technical Context & Unknowns

The objective is to ingest project and funding data from the FACTO foundation (`data/raw/pilar2/projetos.csv`) into the Python hexagonal ETL pipeline, calculating real values for Pillar 2 (`PIPDI` / `NAPPCT` and `PINV` / `TAFPPI`) across the 2024–2026 reference window for all IFES campuses and the institutional `todos` scope.

---

## 2. Architectural Decisions & Rationales

### Decision 1: Source Adapter (`FactoCsvSource`)

- **Decision**: Create an adapter `etl/adapters/sources/facto_csv_source.py` implementing ingestion of tabular CSV data from `data/raw/pilar2/projetos.csv`.
- **Format Handling**: The files use UTF-8 (support `utf-8-sig` for BOM handling) and semicolon (`;`) delimiters. Currency numbers formatted as Brazilian strings (e.g., `"1.256.355,65"` or `"R$ 1.256.355,65"`) are sanitized by stripping dots and converting comma decimals to standard Python `float`.
- **Fallback**: If `data/raw/pilar2/projetos.csv` does not exist (such as on CI environments or fresh checkouts where `data/raw/` is Git-ignored), the source yields an empty list with an informative `AVISO` rather than raising an unhandled exception.
- **Alternatives Considered**: Direct Pandas dependency was rejected in accordance with Principle I (Simplicity / minimal dependencies — standard library `csv` module is fast and requires zero third-party dependencies).

### Decision 2: Spatial Campus Attribution & Rectorate Allocation

- **Decision**:
  1. If `Instituição executora` directly names an IFES campus (e.g., `"Campus Serra"`, `"Campus Venda Nova do Imigrante"`, `"Campus Vila Velha"`), normalize using `normalizar_slug()` and map to the official campus slug.
  2. If `Instituição executora` is `Instituto Federal De Educação Ciencia E Tecnologia Do Espirito Santo - Reitoria`:
     - Inspect the project title/department (`Referência do projeto`, `Objetivo / Objeto / Título`, `Departamento`): if it explicitly identifies a recognized campus (e.g., `"CEFOR"`), attribute the project to that campus AND to the global `todos` scope.
     - Otherwise, attribute the project strictly to the global institutional `todos` scope.
  3. Projects where `Instituição executora` belongs to external institutions (e.g., IFSP, IFFar, IFAL, ICMBio, INMA) are excluded from IFES campus metrics.
- **Rationale**: Reitoria manages systemic, multi-campus, or network-level projects. Attributing them to `todos` prevents misleadingly inflating a single local campus while maintaining accurate institutional accounting. Explicit campus references (like CEFOR EAD) ensure specialized educational centers receive their proper attribution.
- **Alternatives Considered**: Attributing by the coordinator's personal campus was rejected because centrally administered institutional contracts are not localized to the coordinator's workplace.

### Decision 3: Annual Funding Allocation (`TAFPPI`)

- **Decision**: Attribute the total approved grant funding (`Valor aprovado`) to the project's **start year** (`ano de início`).
- **Rationale**: In CONIF guidelines, annual funding metrics measure newly captured/awarded resources in that reference year (_recursos captados no ano de concessão_). Attributing the total award to the start year reflects true annual fundraising without multiplying multi-year awards across several annual balance sheets.
- **Alternatives Considered**: Uniform annual pro-rating was rejected because foundation contracts are committed upon grant approval, and multi-year installment breakdowns are not consistently available across all project types without speculative interpolation (which would violate Constitution Principle III).

### Decision 4: Project Type and Partnership Eligibility for `PIPDI`

- **Decision**:
  - **Project Type Filter**: Count projects whose `Tipo de Projeto` contains any of the case-insensitive keywords: `"Pesquisa"`, `"Inovação"`, or `"Desenvolvimento"`. Strictly exclude non-research operations: `"Processo Seletivo"`, `"Concurso Público"`, pure `"Ensino"`, and pure `"Extensão"`.
  - **Legal Instrument Filter**: Include partnership legal instruments (`"Convênio"`, `"Acordo de Parceria"`, `"Contrato de Parceria"`, `"Termo de Cooperação"`, `"Contrato"`). If `Instrumento Jurídico` is blank in the foundation record but an external partner/funder (`Financiadora`) is present on an eligible PDeI project, count it as a valid partnership agreement.
  - **Temporal Filter**: A partnership is counted in any reference year $Y \in [2024, 2026]$ where $\text{start\_year} \le Y \le \text{end\_year}$ (or ongoing if end date is unspecified/future).
- **Rationale**: Maximizes fidelity to CONIF's intent (measuring formal collaboration with the ecosystem) while discarding civil service exam contracts and accommodating administrative portal omissions.

### Decision 5: Principle III Compliance for `PINV` (`OCC`)

- **Decision**: Keep `OCC_valor_orcamento_total_capital_custeio` and `percentual_calculado_PINV` as strictly `null`.
- **Rationale**: Institutional operational budget (`OCC`) is not captured in the foundation data. Estimating or inventing institutional budgets would directly violate Principle III of the IFES Constitution. The Astro frontend already renders `null` as "Dado indisponível".

### Decision 6: Contract Schema & Sink Update

- **Decision**: Update `specs/008-python-hexagonal-etl/contracts/pilar2-schema.json` and `specs/016-pillar2-facto-indicators/contracts/pilar2-schema.json`:
  - `NAPPCT_acordos_parceria_firmados`: `{"type": ["integer", "null"], "minimum": 0}`
  - `total_acumulado_PIPDI`: `{"type": ["integer", "null"], "minimum": 0}`
  - `TAFPPI_valor_total_aporte_pesquisa`: `{"type": ["number", "null"], "minimum": 0}`
  - `OCC_valor_orcamento_total_capital_custeio`: `{"type": "null"}`
  - `percentual_calculado_PINV`: `{"type": "null"}`
- Update `json_pilar_sink.py` to format the dictionary using actual values from `agregados.pilar2`.
