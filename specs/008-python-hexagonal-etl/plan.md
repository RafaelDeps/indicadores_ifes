# Plano de Implementação: Pipeline ETL Python (Hexagonal / Ports & Adapters)

**Branch**: `008-python-hexagonal-etl` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação de feature em `/specs/008-python-hexagonal-etl/spec.md`

---

## Resumo

Implementar um pipeline ETL em Python de alto desempenho (>= 3.11/3.12) localizado em `etl/`, espelhando exatamente a arquitetura Ports & Adapters (Hexagonal) utilizada em `horizon_etl/src/`. O pipeline processa dados canônicos de `exports_canonical.zip` e gera um `indicadores.zip` determinístico e validado contra os contratos (arquivos `pilar{N}_{campus}_{year}.json` para os campi do export e o escopo institucional `todos` nos anos 2024–2026; quantidade variável, derivada do export). O pipeline em tempo de execução utiliza zero dependências externas (exclusivamente a biblioteca padrão do Python). O código ETL legado em TypeScript em `src/etl/` e os testes em `tests/etl/*.test.ts` são completamente removidos, deixando `src/` dedicado ao dashboard Astro e `tests/etl/` dedicado ao `pytest`.

---

## Contexto Técnico

**Language/Version**: Python >= 3.11 (testado no Python 3.14) + Node.js >= 20 (para o dashboard Astro e o Vitest).

**Primary Dependencies**:

- Runtime: zero dependências externas (uso exclusivo da biblioteca padrão do Python: `zipfile`, `json`, `dataclasses`, `pathlib`, `argparse`, `abc`, `typing`).
- Desenvolvimento e testes: `pytest`, `pytest-cov`, `black`, `isort`, `flake8` gerenciados via `requirements-etl.txt`.

**Storage**: arquivos ZIP em disco (`exports_canonical.zip` como entrada; `indicadores.zip` como saída determinística e atômica).

**Testing**: `pytest` para o ETL Python (`tests/etl/`); `vitest` para o frontend Astro (`tests/*.test.ts`).

**Target Platform**: estações de trabalho e runners de CI/CD em Linux / POSIX.

**Project Type**: pipeline CLI de transformação de dados + dashboard de site estático.

**Performance Goals**: execução completa do pipeline em menos de 5 segundos para todos os arquivos gerados (quantidade variável, derivada do export).

**Constraints**:

- Fidelidade estrita de nulos conforme as diretrizes CONIF (indicadores de censo/orçamento não coletados devem ser `null`, e não `0`).
- Privacidade LGPD estrita conforme o Princípio IV da Constituição (nenhum dado pessoal identificável nos arquivos de saída).
- Geração determinística de ZIP (timestamp DOS 1980-01-01, entradas ordenadas, renomeação atômica).

**Scale/Scope**: campi do export + `todos` consolidado × 3 pilares × 3 anos de referência (2024, 2025, 2026) = arquivos JSON em quantidade variável, derivada do export.

---

## Verificação da Constituição

_PORTÃO: Deve ser aprovado antes da pesquisa da Fase 0. Reverificado após o design da Fase 1._

| Princípio                                       | Status   | Justificativa                                                                                                                                                                                                                                                            |
| :---------------------------------------------- | :------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicity**                               | **PASS** | O ETL em tempo de execução utiliza zero pacotes externos (somente a biblioteca padrão). A arquitetura hexagonal desacopla a lógica de domínio de forma limpa, sem over-engineering nem o custo de frameworks de terceiros. A estrutura Astro em `src/` permanece padrão. |
| **II. Test-First Development**                  | **PASS** | Suíte de testes implementada em `tests/etl/` usando `pytest`, cobrindo a lógica unitária (resolvers, temporal, calculators), os adaptadores, os fluxos e a CLI de ponta a ponta. O Vitest continua cobrindo o frontend Astro.                                            |
| **III. Fidelity to Report Data**                | **PASS** | Os schemas de saída impõem estritamente `null` para métricas não coletadas (`NTE`, `PIES`, `PICOT`, `TAFPPI`, `PINV`, `PIPDI`, `PIPROTR`) e `0` para contagens verificadas iguais a zero (`PA`). Validado automaticamente pelo contrato do sink.                         |
| **IV. Aggregated Data Only (LGPD)**             | **PASS** | Nomes/IDs de `Pessoa` e `MembroEquipe` são usados estritamente em memória durante a agregação e são excluídos de todos os arquivos de indicadores gerados. O validador do sink verifica a conformidade com o schema.                                                     |
| **V. Basic Quality**                            | **PASS** | A qualidade do código é imposta via `flake8`, `black` e `isort` para o Python, e `eslint` + `prettier` para o TypeScript. Texto voltado ao usuário em pt-BR.                                                                                                             |
| **VI. Automated Deployment with Quality Gates** | **PASS** | O `Makefile` fornece alvos unificados: `make check` executa a verificação de formatação, o lint, o pytest do Python e o Vitest do Astro antes de qualquer build ou implantação.                                                                                          |

---

## Estrutura do Projeto

### Documentação (esta feature)

```text
specs/008-python-hexagonal-etl/
├── spec.md              # Especificação da feature
├── plan.md              # Este plano de implementação
├── research.md          # Decisões técnicas e fundamentação arquitetural
├── data-model.md        # Entidades canônicas, objetos de domínio e schemas agregados
├── quickstart.md        # Guia de execução e validação ponta a ponta
├── contracts/           # Contratos de interface e schemas JSON
│   ├── cli-contract.md
│   ├── canonical-source-contract.md
│   ├── pilar1-schema.json
│   ├── pilar2-schema.json
│   └── pilar3-schema.json
└── checklists/
    └── requirements.md  # Checklist de qualidade da especificação
```

### Código-Fonte (raiz do repositório)

```text
etl/
├── core/
│   ├── ports/
│   │   ├── __init__.py
│   │   ├── source.py                 # contrato ISource(ABC)
│   │   └── sink.py                   # contrato ISink(ABC)
│   └── logic/
│       ├── __init__.py
│       ├── models.py                 # dataclasses de domínio e agregados
│       ├── resolvers/
│       │   ├── __init__.py
│       │   ├── campus_resolver.py    # resolução hierárquica de campus
│       │   └── people_registry.py    # pesquisadores e estudantes unificados
│       ├── temporal/
│       │   ├── __init__.py
│       │   └── activity_filter.py    # verificação da janela do ano civil
│       └── calculators/
│           ├── __init__.py
│           ├── pillar1.py            # cálculos de NTPP, QSPP, NEP
│           ├── pillar2.py            # PINV, PIPDI com nulos estritos
│           ├── pillar3.py            # NPB, NPT, PC software, PA=0
│           └── aggregator.py         # agregação multi-campus e 'todos'
├── adapters/
│   ├── __init__.py
│   ├── sources/
│   │   ├── __init__.py
│   │   └── zip_canonical_source.py   # ISource: lê exports_canonical.zip
│   └── sinks/
│       ├── __init__.py
│       ├── json_pilar_sink.py        # formata pilar{N}_{campus}_{year}.json
│       └── zip_indicadores_sink.py   # ISink: escritor ZIP atômico determinístico
├── flows/
│   ├── __init__.py
│   └── indicadores_flow.py           # orquestrador do pipeline
├── __init__.py
└── main.py                           # entrypoint da CLI (argparse)

tests/
├── etl/                              # suíte de testes Python (pytest)
│   ├── __init__.py
│   ├── conftest.py                   # fixtures e ZIPs canônicos sintéticos
│   ├── test_resolvers.py             # resolução de campus e registro de pessoas
│   ├── test_temporal.py              # lógica do filtro de atividade
│   ├── test_calculators.py           # fórmulas e nulos dos Pilares 1, 2 e 3
│   ├── test_aggregator.py            # agregação multi-campus e institucional 'todos'
│   ├── test_adapters.py              # ZipCanonicalSource, JsonPilarSink, ZipIndicadoresSink
│   ├── test_flow.py                  # integração do IndicadoresFlow
│   ├── test_cli.py                   # opções, argumentos e códigos de saída da CLI
│   ├── test_fidelity.py              # conformidade com contrato e schema
│   └── test_privacy.py               # verificação de ausência de dados pessoais
├── ano.test.ts                       # suítes de testes Astro/Vitest (frontend)
├── dataset.test.ts
├── zip.test.ts
└── ... (outros testes Astro)

src/                                  # SOMENTE frontend Astro (componentes, layouts, páginas, lib)
Makefile                              # alvos de automação (make etl, make check, etc.)
requirements-etl.txt                  # dependências de desenvolvimento Python (pytest, black, flake8, isort)
package.json                          # configuração Node (com "etl": "python3 -m etl.main" atualizado)
```

---

## Rastreamento de Complexidade

| Violação                                                                  | Motivo da Necessidade                                                                                                                                                                                                                          | Alternativa Mais Simples Rejeitada Porque                                                                                                                                       |
| :------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stack de Duas Linguagens** (Python para o ETL, TypeScript para o Astro) | A ingestão e a geração da fonte canônica (`horizon_etl`) já são em Python. Implementar a transformação CONIF em Python espelha o modelo de domínio upstream e permite que engenheiros de dados mantenham os dois pipelines na mesma linguagem. | Manter o ETL em TypeScript exigiria duplicar padrões de engenharia de dados, não gera sinergia com `horizon_etl` e esbarra em peculiaridades de serialização ZIP do JavaScript. |
| **Arquitetura Hexagonal** (Ports & Adapters em `etl/`)                    | Desacopla a lógica de cálculo pura do CONIF do formato de armazenamento (ZIP vs diretório vs banco de dados) e permite 100% de cobertura de teste das regras de domínio sem I/O de arquivos.                                                   | Um script plano mistura parsing de arquivos, validação e matemática de domínio em um único arquivo, dificultando testes de regressão e violando o FR-002.                       |
