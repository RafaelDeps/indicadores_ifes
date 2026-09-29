# Data Model: Reorganização Arquitetural Inspirada no Horizon ETL

**Feature**: `009-reorganize-horizon-architecture`
**Date**: 2026-09-26
**Status**: Complete

## 1. Visão Geral das Entidades de Dados

O modelo de dados organiza o fluxo completo de informações em três estágios físicos e lógicos:

1. **Entrada Canônica (`data/canonical/`)**: Dados brutos normalizados fornecidos pelo ecossistema upstream `horizon_etl`.
2. **Domínio e Agregação (`etl/core/logic/models/`)**: Estruturas intermediárias em memória estritamente tipadas e segregadas por contexto.
3. **Distribuição e Auditoria (`data/dist/` e `data/reports/`)**: Artefatos persistidos determinísticos consumidos pela aplicação web Astro e auditados por governança.

---

## 2. Camada de Domínio em `etl/core/logic/models/`

Em substituição ao arquivo único monolítico `models.py`, o domínio é particionado em 3 submódulos:

```text
etl/core/logic/models/
├── __init__.py         # Exportações convenientes do pacote
├── canonical.py        # Entidades puras de entrada do ecossistema canônico
├── indicators.py       # Estruturas intermediárias de cálculo e agregação dos Pilares CONIF
└── export.py           # DTOs de formatação de saída e resultados de orquestração
```

### 2.1. Módulo `canonical.py` (Entidades de Entrada)

Representa o contrato fiel dos 8 arquivos JSON extraídos de `data/canonical/exports_canonical.zip`:

| Entidade          | Campos Principais                                                                            | Papel no Domínio                                               |
| :---------------- | :------------------------------------------------------------------------------------------- | :------------------------------------------------------------- |
| `Campus`          | `id: int`, `name: str`, `acronym: str                                                        | None`                                                          | Unidade acadêmica da IFES; base para resolução geográfica. |
| `Pessoa`          | `id: int`, `name: str`, `campus_id: int                                                      | None`, `classification: str`                                   | Servidor ou discente unificado via `PeopleRegistry`.       |
| `MembroEquipe`    | `initiative_id: int`, `person_id: int`, `role: str`                                          | Vínculo de atuação em projeto (líder, pesquisador, estudante). |
| `Iniciativa`      | `id: int`, `title: str`, `start_date: str`, `end_date: str                                   | None`, `campus_id: int                                         | None`, `leader_id: int                                     | None`, `members: list[MembroEquipe]`          | Projeto de pesquisa ou desenvolvimento institucional. |
| `Producao`        | `id: int`, `title: str`, `year: int`, `production_type: str`, `authors: list[AutorProducao]` | Produção bibliográfica, técnica ou patente.                    |
| `Artigo`          | `id: int`, `issn: str                                                                        | None`, `qualis: str                                            | None`                                                      | Detalhe complementar de publicação periódica. |
| `ExportCanonicos` | Coleções de `campi`, `pessoas`, `iniciativas`, `producoes`, `artigos`                        | Agregado raiz retornado pela porta `ISource`.                  |

### 2.2. Módulo `indicators.py` (Agregações dos Pilares)

Representa os cálculos de domínio dos Pilares 1, 2 e 3 do CONIF antes da serialização:

- **`AgregadosCampusAno`**:
  - `campus_slug: str`, `campus_nome: str`, `ano: int`
  - **Pilar 1**: `ntpp: int`, `qspp: int`, `nep: int` (campos matriculados/cotistas = `None`).
  - **Pilar 2**: `pinv: None`, `pipdi: None` (indicadores com campos estritamente `None`).
  - **Pilar 3**: `npb: int`, `npt: int`, `pc: int`, `pa: int = 0` (patentes ausentes comprovadas como 0; PIPROTR = `None`).
- **`AgregadosAno`**:
  - Dicionário mapeando `campus_slug -> AgregadosCampusAno`, contendo cada campus individual do export e o escopo consolidado institucional `"todos"`.

### 2.3. Módulo `export.py` (Transferência e Saída)

- **`RegistroPilarJson`**:
  - `nome: str`: Formato estrito `pilar{1|2|3}_{campus_slug}_{ano}.json` (ex.: `pilar1_serra_2025.json`).
  - `conteudo: str`: JSON serializado e formatado conforme o schema contratual.
- **`ResultadoFlow`**:
  - `codigo_saida: int`: 0 para sucesso, 1 para falha.
  - `total_arquivos: int`: variável, derivado do export — (nº de campi + `todos`) × 3 pilares × 3 anos em execução completa, ou 3 pilares × 3 anos por campus em execução parcial.
  - `avisos: list[str]`: Lista de alertas de anomalia de dados (iniciativas sem campus, etc.).
  - `erros: list[str]`: Mensagens de erro em caso de exceção.

---

## 3. Modelo de Observabilidade (`etl/tracking/tracker.py`)

A entidade `ExecutionTracker` acumula métricas durante a passagem dos adaptadores e fluxos:

```python
@dataclass
class ExecutionMetrics:
    timestamp_inicio: str
    timestamp_fim: str
    duracao_segundos: float
    caminho_entrada: str
    caminho_saida: str
    total_campi_processados: int
    total_iniciativas_carregadas: int
    total_iniciativas_ativas_por_ano: dict[int, int]
    total_pessoas_registradas: int
    total_producoes_analisadas: int
    total_arquivos_gerados: int
    avisos_qualidade: list[str]
```

### Regras de Validação e Privacidade (LGPD)

- **Princípio IV**: Nenhuma propriedade de `ExecutionMetrics` armazena ou serializa nomes de pessoas físicas não-públicas, CPFs ou dados cadastrais de estudantes.
- Avisos de inconsistência registram apenas o ID da iniciativa (ex.: `"Iniciativa #1042 sem campus resolúvel"`).

---

## 4. Contrato de Schema de Saída (`pilar{N}_{campus}_{ano}.json`)

Todos os arquivos `pilar{N}_{campus}_{year}.json` gerados obedecem rigorosamente a esta estrutura top-level:

```json
{
  "campus": "Serra",
  "ano_referencia": 2025,
  "pilar": "Engajamento Academico e Inclusao",
  "indicadores": {
    "NTPP": {
      "descricao": "Numero Total de Projetos de Pesquisa",
      "valor": 42
    },
    "QSPP": {
      "descricao": "Quadro de Servidores Participantes em Pesquisa",
      "valor": 35
    },
    "PIES": {
      "descricao": "Percentual de Inclusao de Estudantes em Pesquisa",
      "percentual_calculado_PIES": null,
      "NTE_total_estudantes_matriculados": null,
      "motivo": "Dados de matricula indisponiveis no pacote canonico"
    }
  }
}
```

### Tabela de Nulidades Obrigatórias (Princípio III da Constituição)

|    Pilar    | Campo Contratual                            | Valor Exigido | Motivo                                                   |
| :---------: | :------------------------------------------ | :-----------: | :------------------------------------------------------- |
| **Pilar 1** | `NTE_total_estudantes_matriculados`         |    `null`     | Ausência de censo estudantil na origem.                  |
| **Pilar 1** | `percentual_calculado_PIES`                 |    `null`     | Impossibilidade matemática de divisão por total ausente. |
| **Pilar 1** | `NTECPP_cotistas_em_pesquisa`               |    `null`     | Ausência de identificador de cotas.                      |
| **Pilar 1** | `percentual_calculado_PICOT`                |    `null`     | Impossibilidade de cálculo.                              |
| **Pilar 2** | `TAFPPI_valor_total_aporte_pesquisa`        |    `null`     | Dados orçamentários ausentes no extrator.                |
| **Pilar 2** | `OCC_valor_orcamento_total_capital_custeio` |    `null`     | Orçamento geral não coletado.                            |
| **Pilar 2** | `percentual_calculado_PINV`                 |    `null`     | Métricas financeiras inexistentes.                       |
| **Pilar 2** | `NAPPCT_acordos_parceria_firmados`          |    `null`     | Acordos institucionais fora de escopo.                   |
| **Pilar 2** | `total_acumulado_PIPDI`                     |    `null`     | Acumulado não apurado.                                   |
| **Pilar 3** | `total_transferidos_PIPROTR`                |    `null`     | Transferências de tecnologia não coletadas.              |
| **Pilar 3** | `PA_patentes_concedidas`                    |      `0`      | Contagem comprovada nula nas fontes públicas.            |
