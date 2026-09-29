# Implementation Plan: Reorganização Arquitetural Inspirada no Horizon ETL

**Branch**: `009-reorganize-horizon-architecture` | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/009-reorganize-horizon-architecture/spec.md`

## Summary

Reorganizar o repositório `indicadores_ifes` aplicando a disciplina de pastas, separação de responsabilidades e padrões de engenharia de dados do `horizon_etl`. O projeto passará a contar com uma camada de dados isolada sob `data/` (`canonical/`, `dist/`, `reports/`), retirando arquivos `.zip` soltos na raiz; um pipeline ETL em `etl/` refinado com portas, adaptadores, orquestração modular, observabilidade (`tracking/`) e scripts operacionais (`scripts/`); testes estritamente segregados em `tests/etl/` (Pytest) e `tests/web/` (Vitest); consumo limpo do pacote pelo frontend em `src/lib/dataset.ts` com remoção de JSONs legados; e automação centralizada via `pyproject.toml` e `Makefile`.

---

## Technical Context

**Language/Version**: Python >= 3.11 (pipeline ETL utilizando estritamente a biblioteca padrão para execução em tempo de execução) e TypeScript 5 / Node.js 20+ (frontend Astro).

**Primary Dependencies**: Astro 5, Vitest, Pytest, Black, Isort, Flake8, Prettier, ESLint.

**Storage**: Arquivos locais em disco:

- Entrada canônica: `data/canonical/exports_canonical.zip`
- Distribuição final: `data/dist/indicadores.zip`
- Auditoria de execução: `data/reports/etl_run_report.md`

**Testing**: Pytest (para testes de engenharia de dados sob `tests/etl/`) e Vitest (para testes web/componentes sob `tests/web/`).

**Target Platform**: Linux, macOS, GitHub Actions (Ubuntu) e deploy estático para GitHub Pages.

**Project Type**: Dashboard web estático com pipeline de engenharia de dados embarcado e desacoplado.

**Performance Goals**: Execução completa do pipeline de ETL em menos de 5 segundos; build estático completo do Astro em menos de 10 segundos.

**Constraints**:

- Zero dependências externas de runtime Python (apenas `zipfile`, `json`, `dataclasses`, `pathlib`, `argparse`, `typing`).
- Conformidade estrita com LGPD (Princípio IV): zero PII em arquivos versionados.
- Paridade matemática total: exatamente todos os arquivos derivados do export (nº de campi + `todos`) × 3 pilares × 3 anos gerados com os mesmos valores numéricos e campos nulos homologados.

**Scale/Scope**: (campi do export + 'todos') × 3 anos (2024, 2025, 2026) × 3 pilares = arquivos JSON gerados deterministicamente (quantidade variável, derivada do export).

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                        | Descrição                                              | Status  | Justificativa                                                                                                                          |
| :------------------------------- | :----------------------------------------------------- | :-----: | :------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicity**                | Estrutura Astro padrão em `src/`, dependências mínimas | ✅ PASS | Frontend preservado integralmente em `src/`; zero bibliotecas extras de runtime no Python ou Astro.                                    |
| **II. Test-First**               | Vitest para web; testes cobrem regras e formatação     | ✅ PASS | Suíte dividida em `tests/web/` e `tests/etl/`; testes de contrato e fidelidade pré-existentes são mantidos e adaptados às novas rotas. |
| **III. Fidelity to Report Data** | Valores fiéis; campos ausentes estritamente nulos      | ✅ PASS | O validador do sink garante nulidade estrita em métricas não coletadas; paridade de 100% em todos os arquivos (quantidade variável).                             |
| **IV. Aggregated Data Only**     | LGPD rigorosa; sem nomes de alunos ou CPFs             | ✅ PASS | `data/reports/` e `data/dist/` contêm apenas métricas agregadas e IDs públicos de projetos.                                            |
| **V. Basic Quality**             | Zero erros de ESLint/Prettier/Flake8/Black; pt-BR      | ✅ PASS | Validação consolidada no comando `make check` através de `pyproject.toml`.                                                             |
| **VI. Automated Deployment**     | Deploy automático via GitHub Actions após gates        | ✅ PASS | `data/dist/indicadores.zip` é versionado no Git, permitindo que o CI web continue rodando puramente com Node 20 sem requerer Python.   |

---

## Project Structure

### Documentation (this feature)

```text
specs/009-reorganize-horizon-architecture/
├── plan.md              # Este plano de implementação
├── research.md          # Decisões de arquitetura e padrões (Fase 0)
├── data-model.md        # Modelagem de entidades e contratos de dados (Fase 1)
├── quickstart.md        # Guia de validação ponta a ponta (Fase 1)
├── contracts/           # Contratos formais de CLI, dados e relatórios (Fase 1)
│   ├── cli-contract.md
│   ├── data-layout-contract.md
│   └── report-contract.md
└── checklists/
    └── requirements.md  # Checklist de conformidade e qualidade
```

### Source Code (repository root)

```text
indicadores_ifes/
├── data/                               # Camada de governança de dados (padrão Horizon)
│   ├── canonical/                      # Pacote canônico de entrada (ignorado no git)
│   │   ├── .gitkeep
│   │   └── exports_canonical.zip       # (local apenas, tamanho variável)
│   ├── dist/                           # Pacotes gerados para distribuição
│   │   ├── indicadores.zip             # Pacote consolidado oficial (versionado no git, 212 KB)
│   │   └── indicadores_*.zip           # Pacotes parciais por campus (ignorados no git)
│   └── reports/                        # Relatórios de auditoria e métricas
│       └── etl_run_report.md           # Relatório da última execução (versionado no git)
│
├── etl/                                # Pipeline de Dados Python (espelhando horizon_etl/src/)
│   ├── __init__.py
│   ├── main.py                         # CLI entrypoint com caminhos data/ padrão e flags
│   ├── core/
│   │   ├── __init__.py
│   │   ├── ports/                      # Interfaces abstratas puras
│   │   │   ├── __init__.py
│   │   │   ├── source.py               # ISource(ABC)
│   │   │   └── sink.py                 # ISink(ABC)
│   │   └── logic/
│   │       ├── __init__.py
│   │       ├── models/                 # Dataclasses de domínio contextuais
│   │       │   ├── __init__.py
│   │       │   ├── canonical.py        # Modelos canônicos de entrada
│   │       │   ├── indicators.py       # Modelos de cálculo e agregados
│   │       │   └── export.py           # Modelos de formatação e entrega
│   │       ├── calculators/            # Lógica de cálculo puro CONIF
│   │       │   ├── __init__.py
│   │       │   ├── pillar1.py          # NTPP, QSPP, NEP, etc.
│   │       │   ├── pillar2.py          # PINV, PIPDI
│   │       │   ├── pillar3.py          # PIPRO, PIPROT, PIPROTR
│   │       │   └── aggregator.py       # Agregador multi-campus e consolidado "todos"
│   │       ├── resolvers/              # Resolução determinística
│   │       │   ├── __init__.py
│   │       │   ├── campus_resolver.py  # Resolução hierárquica de campus
│   │       │   └── people_registry.py  # Registro unificado de pessoas
│   │       └── temporal/               # Filtros temporais
│   │           ├── __init__.py
│   │           └── activity_filter.py  # Vigência no ano civil
│   ├── adapters/                       # Adaptadores de entrada e saída
│   │   ├── __init__.py
│   │   ├── sources/
│   │   │   ├── __init__.py
│   │   │   └── zip_canonical_source.py # Extração de data/canonical/
│   │   └── sinks/
│   │       ├── __init__.py
│   │       ├── json_pilar_sink.py      # Serialização compacta JSON
│   │       └── zip_indicadores_sink.py # Validação e escrita determinística em data/dist/
│   ├── flows/                          # Orquestração do pipeline
│   │   ├── __init__.py
│   │   └── indicadores_flow.py         # Orquestrador desacoplado integrado ao tracker
│   ├── tracking/                       # Observabilidade e contadores de auditoria
│   │   ├── __init__.py
│   │   └── tracker.py                  # Acumulador de métricas e gerador de etl_run_report.md
│   └── scripts/                        # Scripts operacionais e diagnósticos
│       ├── __init__.py
│       ├── inspect_campuses.py         # Inspeciona lista de campi resolvidos
│       └── validate_zip.py             # Validador independente de integridade do zip
│
├── src/                                # Frontend Astro (preservado conforme Princípio I)
│   ├── components/                     # Componentes de UI
│   ├── data/                           # Apenas metadados e tipagens TypeScript
│   │   └── indicadores.ts              # (removidos os arquivos legados qspp.json, etc.)
│   ├── layouts/                        # BaseLayout
│   ├── lib/                            # Lógica cliente e carregador de dataset
│   │   ├── dataset.ts                  # Atualizado para ler data/dist/indicadores.zip
│   │   └── ...
│   ├── pages/                          # Rotas estáticas
│   └── styles/                         # Design tokens
│
├── tests/                              # Suíte de testes segregada
│   ├── etl/                            # 100% Pytest (Pipeline de Dados)
│   │   ├── conftest.py                 # Fixtures canônicas mockadas
│   │   ├── test_adapters.py
│   │   ├── test_aggregator.py
│   │   ├── test_calculators.py
│   │   ├── test_cli.py
│   │   ├── test_fidelity.py            # Adaptado para data/dist/indicadores.zip
│   │   ├── test_flow.py
│   │   ├── test_privacy.py
│   │   ├── test_resolvers.py
│   │   ├── test_temporal.py
│   │   └── test_tracking.py            # Novo teste da camada de tracking e relatórios
│   └── web/                            # 100% Vitest (Frontend Astro)
│       ├── helpers/                    # Helpers de teste TS
│       ├── dataset.test.ts             # Adaptado para data/dist/indicadores.zip
│       ├── chart.test.ts
│       └── ... (*.test.ts movidos da raiz de tests/)
│
├── .gitignore                          # data/canonical/* e data/dist/indicadores_*.zip ignorados
├── Makefile                            # Comandos atualizados para as novas rotas
├── pyproject.toml                      # Configuração centralizada Python (black, isort, pytest)
├── package.json                        # Scripts npm atualizados
└── vitest.config.ts                    # Configurado para tests/web/**/*.test.ts
```

**Structure Decision**: Aprovada a estrutura com módulo `data/` segregado, pipeline `etl/` modular alinhado ao `horizon_etl`, e isolamento rígido de testes em `tests/etl/` e `tests/web/`, mantendo `src/` em estrita conformidade com o Princípio I da Constituição.

---

## Complexity Tracking

> Nenhuma violação aos princípios da Constituição detectada. Não há exceções ou complexidades anômalas a justificar.
