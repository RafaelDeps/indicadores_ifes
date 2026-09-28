# Data Model: Python Hexagonal ETL Pipeline

**Feature Branch**: `008-python-hexagonal-etl`  
**Date**: 2026-09-25  
**Spec Reference**: [spec.md](./spec.md)

This document formalizes the canonical data entities, domain objects, intermediate aggregates, and sink delivery structures implemented in `etl/core/logic/models.py`.

---

## 1. Input Canonical Entities (Ports / Ingestion)

These entities represent records extracted from `exports_canonical.zip` via `ZipCanonicalSource`.

```mermaid
classDiagram
    class ExportCanonicos {
        +list[Iniciativa] iniciativas
        +list[Pessoa] pessoas
        +list[Pessoa] estudantes
        +list[Campus] campi
        +list[Artigo] artigos
        +list[Producao] producoes
        +list[AutorProducao] autores_producao
        +list[TipoProducao] tipos_producao
        +list[str] avisos
    }

    class Iniciativa {
        +int id
        +str name
        +str status
        +str start_date
        +str end_date
        +dict initiative_type
        +RefCampus campus
        +list[MembroEquipe] team
    }

    class MembroEquipe {
        +int person_id
        +str person_name
        +list[str] roles
        +str start_date
        +str end_date
    }

    class Pessoa {
        +int id
        +str name
        +str classification
        +RefCampus campus
        +list[dict] articles
    }

    class Campus {
        +int id
        +str name
    }

    class Artigo {
        +int id
        +str title
        +int year
        +str type
        +RefCampus campus
    }

    class Producao {
        +int id
        +str title
        +int year
        +int production_type_id
        +RefCampus campus
    }

    class AutorProducao {
        +int production_id
        +int researcher_id
    }

    ExportCanonicos *-- Iniciativa
    ExportCanonicos *-- Pessoa
    ExportCanonicos *-- Campus
    ExportCanonicos *-- Artigo
    ExportCanonicos *-- Producao
    ExportCanonicos *-- AutorProducao
    Iniciativa *-- MembroEquipe
```

### Entity Specifications

#### `Iniciativa`

- **Fields**:
  - `id: int`: Unique identifier from SIGPESQ/canonical export.
  - `name: str`: Project title.
  - `status: str | None`: Status description (e.g., "EM_EXECUCAO", "CONCLUIDO").
  - `start_date: str | None`: ISO date `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SS`.
  - `end_date: str | None`: ISO date or `None` if ongoing.
  - `initiative_type: dict[str, Any] | None`: Object containing `{"id": int, "name": str}`.
  - `campus: RefCampus | None`: Directly assigned campus.
  - `team: list[MembroEquipe]`: List of team participants.
- **Validation Rules**:
  - If `start_date` is missing or invalid, the initiative is considered never active (`AVISO: iniciativa {id} sem start_date — tratada como nunca ativa`).

#### `Pessoa`

- **Fields**:
  - `id: int`: Unique identifier.
  - `name: str`: Person's name (never exported to public indicator JSONs - Principle IV).
  - `classification: str | None`: Institutional role ("researcher", "student", etc.).
  - `campus: RefCampus | None`: Associated campus.
  - `articles: list[dict[str, Any]] | None`: Optional list of publication references.
- **Validation Rules**:
  - Researchers from `researchers_canonical.json` take precedence over students from `students_canonical.json` upon ID collisions.

#### `Campus`

- **Fields**:
  - `id: int`: Numeric ID (e.g. 1 to 23).
  - `name: str`: Official name (e.g., "Serra", "Vitória", "Cariacica").
- **Slug Generation**:
  - Normalized ASCII lowercase string without accents or spaces (e.g., "Vitória" → "vitoria", "Vila Velha" → "vilavelha").
  - Institutional consolidated slug is `"todos"`.

---

## 2. Core Domain Logic & Resolvers

### Campus Resolution Logic (`CampusResolver`)

Resolves an initiative to its owning campus via a 3-tier hierarchy:

1. **Tier 1 (Direct)**: Declared `iniciativa.campus`.
2. **Tier 2 (Coordinator)**: Campus of the team member with role matching "Coordenador" / "Coordinator".
3. **Tier 3 (First Team Member)**: Campus of the first team member who possesses an associated campus.
4. **Fallback**: If unresolvable, the initiative is not assigned to any individual campus, but is counted in the institutional aggregate `todos` (emitting a warning if active during target years).

### Activity Filter (`ActivityFilter`)

Evaluates whether an entity (initiative or membership) was active during target calendar year `Y` (2024, 2025, 2026):
$$\text{Ativo}(Y) \iff \text{start\_date} \le \text{31/12/}Y \land (\text{end\_date is None} \lor \text{end\_date} \ge \text{01/01/}Y)$$

---

## 3. Domain Aggregates

Pure calculation records computed by `Pillar1Calculator`, `Pillar2Calculator`, and `Pillar3Calculator`.

```mermaid
classDiagram
    class AgregadosAno {
        +dict[str, AgregadosCampus] por_campus
    }

    class AgregadosCampus {
        +AgregadosPilar1 pilar1
        +AgregadosPilar2 pilar2
        +AgregadosPilar3 pilar3
    }

    class AgregadosPilar1 {
        +int ntpp_projetos_pesquisa_ativos
        +int qspp_docentes_pesquisa
        +int nep_estudantes_pesquisa
        +None nte_total_estudantes_matriculados
        +None percentual_calculado_pies
        +None ntecpp_cotistas_pesquisa
        +None percentual_calculado_picot
    }

    class AgregadosPilar2 {
        +None tafppi_valor_total_aporte_pesquisa
        +None occ_valor_orcamento_total_capital_custeio
        +None percentual_calculado_pinv
        +None nappct_acordos_parceria_firmados
        +None total_acumulado_pipdi
    }

    class AgregadosPilar3 {
        +int npb_producao_bibliografica
        +int npb_artigos
        +int npb_livros
        +int npt_producao_tecnica
        +int npt_produtos_tecnologicos
        +int npt_processos_tecnologicos
        +int pc_softwares
        +int pa_patentes
        +None total_transferidos_piprotr
    }

    AgregadosAno *-- AgregadosCampus
    AgregadosCampus *-- AgregadosPilar1
    AgregadosCampus *-- AgregadosPilar2
    AgregadosCampus *-- AgregadosPilar3
```

---

## 4. Delivery & Output Models (Sinks)

### `RegistroPilarJson`

- `nome: str`: File name adhering to pattern `pilar{N}_{campus}_{year}.json` (e.g. `pilar1_serra_2026.json`).
- `conteudo: str`: UTF-8 serialized JSON string.

### Output JSON Structure Specification

#### Header Fields (Common to Pilares 1, 2, 3)

- `campus: str`: Official campus name (or "Todos os Campi").
- `ano_referencia: int`: Reference year (e.g., 2026).
- `pilar: str`:
  - Pilar 1: `"Engajamento Academico e Inclusao"`
  - Pilar 2: `"Fomento e Conexao com o Ecossistema"`
  - Pilar 3: `"Produtividade e Propriedade Intelectual"`
- `indicadores: dict[str, IndicadorDetalhe]`

#### Indicator Schema (`IndicadorDetalhe`)

- `descricao: str`: Human-readable description.
- Metric values: Integers for collected/calculated counts, `null` for uncollected census/budget indicators.
- In Pilar 3, includes `valores_totais_por_tipo: dict[str, int]`.

---

## 5. Invariants & Data Integrity Rules

1. **Principle III Fidelity**: Uncollected indicators (`NTE`, `PIES`, `PICOT`, `TAFPPI`, `PINV`, `PIPDI`, `PIPROTR`) MUST NEVER be set to `0` or estimated; they must strictly serialize as `null`.
2. **Principle IV LGPD Privacy**: No personal names, identification numbers, CPF, email, or individual publication lists may appear in `RegistroPilarJson`.
3. **Idempotence**: Running the ETL pipeline multiple times against the same `exports_canonical.zip` must yield identical, bitwise-reproducible zip bytes.
