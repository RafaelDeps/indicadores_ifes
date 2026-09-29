# Research: Reorganização Arquitetural Inspirada no Horizon ETL

**Feature**: `009-reorganize-horizon-architecture`
**Date**: 2026-09-26
**Status**: Completed

## Executive Summary

Este documento consolida as decisões técnicas e padrões de arquitetura para reorganizar o repositório `indicadores_ifes`. O objetivo é adotar a maturidade, governança de dados e padrão Hexagonal (Portas e Adaptadores) do `horizon_etl`, preservando a simplicidade do frontend Astro (Princípio I da Constituição) e a independência do workflow de CI/CD no GitHub Pages.

---

## Technical Decisions

### Decision 1: Governança e Ciclo de Vida do Diretório `data/`

- **Decisão**: Criar o diretório de dados em primeiro nível `data/` com três subpastas bem delimitadas:
  - `data/canonical/`: hospeda o arquivo de entrada `exports_canonical.zip` (tamanho variável) fornecido pelo `horizon_etl`. Ignorado no Git (preservando apenas `.gitkeep`).
  - `data/dist/`: hospeda o pacote determinístico final `indicadores.zip` (212 KB) e arquivos parciais de campus (`indicadores_<campus>.zip`). `indicadores.zip` é **versionado no Git** como artefato oficial de distribuição.
  - `data/reports/`: hospeda o relatório determinístico de integridade e auditoria `etl_run_report.md`, também **versionado no Git**.
- **Justificativa**: Elimina a poluição da raiz por binários pesados e separa claramente o ciclo de vida do dado bruto (não versionado) do artefato de produção (versionado para viabilizar deploy estático rápido).
- **Alternativas consideradas**:
  - _Manter zips na raiz_: Rejeitado categoricamente; polui a navegação e o controle de versão.
  - _Ignorar `indicadores.zip` no Git_: Rejeitado porque forçaria a inclusão de um runtime Python completo no workflow do GitHub Pages (`.github/workflows/deploy.yml`), tornando o deploy mais lento e frágil.

### Decision 2: Refatoração Modular do Pipeline `etl/` (Espelhando `horizon_etl`)

- **Decisão**: Estruturar o diretório `etl/` no padrão de camadas:
  - `etl/core/ports/`: interfaces abstratas `ISource(ABC)` e `ISink(ABC)`.
  - `etl/core/logic/`:
    - `models/`: divisão do antigo `models.py` monolítico em módulos temáticos (`canonical.py`, `indicators.py`, `export.py`).
    - `calculators/`: submódulos dedicados para cada pilar CONIF (`pillar1.py`, `pillar2.py`, `pillar3.py`, `aggregator.py`).
    - `resolvers/`: resolução determinística de campus (`campus_resolver.py`) e registros de pessoas (`people_registry.py`).
    - `temporal/`: filtros de vigência e anos de referência (`activity_filter.py`).
  - `etl/adapters/`:
    - `sources/zip_canonical_source.py`: extração e validação do zip canônico sob `data/canonical/` (ou caminho via CLI/ENV).
    - `sinks/zip_indicadores_sink.py`: persistência determinística com timestamp DOS fixo (1980-01-01) sob `data/dist/`.
    - `sinks/json_pilar_sink.py`: serialização JSON compacta com ordenação de chaves.
  - `etl/flows/`: orquestração modular da execução (`indicadores_flow.py`).
  - `etl/tracking/`: observabilidade leve (`tracker.py`) que acumula contadores e emite o relatório Markdown em `data/reports/etl_run_report.md`.
  - `etl/scripts/`: utilitários de diagnóstico e inspeção de dados (`inspect_campuses.py`, `validate_zip.py`).
- **Justificativa**: Garante desacoplamento pleno entre I/O e regras de negócio, aumenta a testabilidade unitária e introduz rastreabilidade auditável sem adicionar dependências pesadas de terceiros (usando apenas biblioteca padrão Python).
- **Alternativas consideradas**:
  - _Adicionar Prefect_: Rejeitado para este repositório por violar o Princípio I da Constituição (Simplicidade); a orquestração via classes padrão Python é suficiente e muito mais leve.

### Decision 3: Segregação Estrita da Suíte de Testes (`tests/`)

- **Decisão**: Dividir `tests/` em dois diretórios isolados:
  - `tests/etl/`: suíte de testes em Python executada exclusivamente via `pytest`.
  - `tests/web/`: suíte de testes em TypeScript executada exclusivamente via `vitest`.
- **Configuração**:
  - `vitest.config.ts`: configurado com `include: ['tests/web/**/*.test.ts']`.
  - `pyproject.toml` / `pytest.ini`: configurado com `testpaths = ["tests/etl"]`.
- **Justificativa**: Evita conflito entre runners de teste e permite execução independente (`make test-etl`, `make test-web`) ou unificada (`make test`).
- **Alternativas consideradas**:
  - _Colocar testes Python em `etl/tests/`_: Rejeitado para manter toda a suíte de testes do repositório sob a raiz `tests/`.

### Decision 4: Desacoplamento do Frontend e Fonte Única da Verdade

- **Decisão**: Atualizar [`src/lib/dataset.ts`](file:///home/rafael/indicadores_ifes/src/lib/dataset.ts) para ler por padrão `data/dist/indicadores.zip`. Remover definitivamente os arquivos JSON mockados em `src/data/*.json` (`qspp.json`, `ntpp.json`, `picot.json`, `pies.json`), preservando apenas [`src/data/indicadores.ts`](file:///home/rafael/indicadores_ifes/src/data/indicadores.ts) para tipagens e metadados.
- **Justificativa**: Elimina a duplicidade de fontes e previne inconsistências visuais na interface pública.

### Decision 5: Padronização de Ferramentas e Configurações

- **Decisão**: Adotar `pyproject.toml` na raiz como arquivo canônico de configuração para `black`, `isort` e `pytest`, mantendo `setup.cfg` para compatibilidade com `flake8`.
- **Makefile**: Atualizar alvos para refletir as novas rotas (`make etl` consome `data/canonical/` e gera `data/dist/`, `make check` roda linters e testes segregados).

---

## Constitution Alignment & Compliance Matrix

| Princípio                        | Requisito da Constituição                              | Como o Design Garante                                                                                                                     |
| :------------------------------- | :----------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicity**                | Estrutura padrão Astro em `src/`, dependências mínimas | Frontend permanece intacto em `src/`; ETL usa apenas biblioteca padrão Python em tempo de execução.                                       |
| **II. Test-First**               | Vitest para web; testes antes da implementação         | Separação em `tests/web/` e `tests/etl/` com 100% de cobertura prévia e comandos dedicados.                                               |
| **III. Fidelity to Report Data** | Fidelidade estrita a nulos; nada inventado ou estimado | Validador do sink garante nulls estritos para métricas não coletadas; todos os arquivos JSON (quantidade variável) mantêm paridade exata. |
| **IV. Aggregated Data Only**     | LGPD rigorosa; sem nomes de alunos ou CPFs no Git      | Relatórios em `data/reports/` e JSONs em `data/dist/` contêm estritamente dados agregados e contagens numéricas.                          |
| **V. Basic Quality**             | Zero erros de lint e formatação; pt-BR                 | `pyproject.toml` e linters unificados em `make check` (flake8, eslint, black, prettier).                                                  |
| **VI. Automated Deployment**     | Deploy automático via GitHub Actions após gates        | `data/dist/indicadores.zip` versionado permite que o workflow do GitHub Pages execute puramente com Node.js 20.                           |
