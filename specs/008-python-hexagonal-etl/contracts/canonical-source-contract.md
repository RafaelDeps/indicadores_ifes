# Interface Contract: Canonical Source Package (`exports_canonical.zip`)

**Feature Branch**: `008-python-hexagonal-etl`  
**Date**: 2026-09-25

## Mandatory Canonical Files

The input ZIP package (`exports_canonical.zip`) must contain the following 8 canonical JSON datasets in its root:

| Canonical File                      | Description                                            | Key Identifier | Mandatory Fields                                                   |
| :---------------------------------- | :----------------------------------------------------- | :------------- | :----------------------------------------------------------------- |
| `campuses_canonical.json`           | List of all campuses of the institution.               | `id`           | `id`, `name`                                                       |
| `initiatives_canonical.json`        | Institutional research initiatives and projects.       | `id`           | `id`, `name`, `status`, `start_date`, `end_date`, `campus`, `team` |
| `researchers_canonical.json`        | Canonical records of researchers/professors.           | `id`           | `id`, `name`, `classification`, `campus`                           |
| `students_canonical.json`           | Canonical records of student researchers.              | `id`           | `id`, `name`, `classification`, `campus`                           |
| `articles_canonical.json`           | Bibliographic publications (journal articles, papers). | `id`           | `id`, `title`, `year`, `type`, `campus`                            |
| `productions_canonical.json`        | Technical and technological productions.               | `id`           | `id`, `title`, `year`, `production_type_id`, `campus`              |
| `production_authors_canonical.json` | Relational join table mapping productions to authors.  | N/A            | `production_id`, `researcher_id`                                   |
| `production_types_canonical.json`   | Lookup table of production type categories.            | `id`           | `id`, `name`                                                       |

## Deduplication and Ingestion Rules

1. **Entity Deduplication**:
   - Entities (`initiatives`, `researchers`, `students`, `campuses`, `articles`, `productions`) must be deduplicated by `id`.
   - If duplicate IDs are encountered, the first occurrence is kept, and a warning is emitted to `stderr`: `AVISO: {entidade} duplicada ignorada (id: {id})`.
2. **People Registry Merge**:
   - Researchers from `researchers_canonical.json` and students from `students_canonical.json` are merged into a unified people registry.
   - If an ID appears in both files, the researcher record takes precedence: `AVISO: ID {id} presente em pesquisadores e estudantes — mantido como pesquisador`.
3. **Missing Canonical File**:
   - If any of the 8 canonical files is absent in the ZIP, the pipeline aborts immediately with exit code 1: `ERRO: Arquivo canônico obrigatório ausente no pacote ZIP: {arquivo}`.
