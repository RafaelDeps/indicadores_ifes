# Specification Quality Checklist: ETL de Listagens de Matrícula (XLSX) → Dados dos Pilares

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-28 (finalizado após resolução das clarificações)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded (só Pilar 1 / NTE + cotistas é derivável)
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Clarificações resolvidas (2026-09-28), todas com números medidos**:
  - **Q1 (FR-004)**: NTE = matrículas únicas por ano com situação
    "Matriculado" ou "Formado" em pelo menos um semestre, deduplicadas entre
    os dois semestres. Medidos: 2024=1282, 2025=1857, 2026=2121.
  - **Q2 (FR-006)**: NTE + contagem de cotistas em que **ambas** as colunas
    (forma de ingresso E forma de matrícula/cota) sejam de cota, deduplicados.
    Medidos: 2024=438, 2025=616, 2026=775 (análise interna — base do
    cruzamento; confirmado nas Assumptions).
  - **Q3 (FR-008)**: mesmo contrato do pipeline atual —
    `pilar{N}_{campus}_{year}.json` em zip sob `data/dist/`
    (padrão: `indicadores_listagens.zip`, sem sobrescrever o pacote de pesquisa).
  - Slots preenchidos no Pilar 1: `PIES.NTE_total_estudantes_matriculados` e
    `PICOT.NTECPP_cotistas_em_pesquisa` (cruzamento NEP × cotistas por nome
    normalizado, FR-012 — medidos 73/93/96, sempre ≤ NEP; sem export canônico
    ou interseção vazia → `null`, Princípio III). Demais slots `null`.
- Revisão dos pilares confirmada: somente Pilar 1/NTE foi derivável.

**Resultado**: pronto para `/speckit-plan`.
