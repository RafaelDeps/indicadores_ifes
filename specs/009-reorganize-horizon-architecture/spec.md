# Feature Specification: Reorganização Arquitetural Inspirada no Horizon ETL

**Feature Branch**: `009-reorganize-horizon-architecture`

**Created**: 2026-09-26

**Status**: Finalizado (implementado)

**Input**: User description: "Reestruturação arquitetural do projeto indicadores_ifes inspirada no horizon_etl. Reorganizar a arquitetura do repositório indicadores_ifes aplicando a disciplina de pastas, separação de responsabilidades e padrões de engenharia de dados do horizon_etl, resolvendo o atrito entre o frontend Astro e o pipeline Python ETL."

## Clarifications

### Session 2026-09-26

- Q: Qual deve ser a localização física definitiva do frontend Astro no repositório? → A: O frontend Astro permanece em `src/` conforme o padrão original do Astro e o Princípio I da Constituição, com `etl/` e `data/` como diretórios irmãos na raiz.
- Q: O que deve ser feito com os arquivos .json legados em src/data/? → A: Remover os arquivos JSON estáticos de `src/data/`, consolidando `data/dist/indicadores.zip` como a única fonte da verdade para o frontend, mantendo apenas definições e metadados TypeScript em `src/data/indicadores.ts`.
- Q: O arquivo gerado data/dist/indicadores.zip deve ser versionado no Git? → A: Sim, `data/dist/indicadores.zip` (tamanho variável, derivado do export) deve ser versionado no Git como artefato de distribuição consumido pelo frontend, enquanto `data/canonical/exports_canonical.zip` (tamanho variável) e zips parciais de campus (`data/dist/indicadores_*.zip`) permanecem estritamente ignorados no `.gitignore`.
- Q: Como o relatório de auditoria em data/reports/ deve ser gerenciado e versionado? → A: O relatório `data/reports/etl_run_report.md` é um arquivo único determinístico, sobrescrito a cada execução do pipeline completo e versionado no Git juntamente com `data/dist/indicadores.zip` como comprovação pública de auditoria da versão publicada.
- Q: Como o pipeline deve resolver o pacote canônico de entrada e lidar com sua ausência? → A: O pipeline busca por padrão em `data/canonical/exports_canonical.zip`, mas aceita override via CLI (`--entrada` / `-i`), variável de ambiente (`ENTRADA`) e `.env`, emitindo mensagem amigável e orientativa de resolução caso o arquivo não seja localizado.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Isolamento e Governança de Dados em Diretório Dedicado (Priority: P1)

Como desenvolvedor ou operador de automação de dados, desejo que todos os arquivos de dados brutos de entrada, pacotes de distribuição gerados e relatórios de auditoria residam sob um diretório segregado `data/` (`data/canonical/`, `data/dist/`, `data/reports/`), impedindo a poluição da raiz do repositório e o versionamento acidental de arquivos binários pesados no Git.

**Why this priority**: A presença de arquivos de dados como `exports_canonical.zip` (tamanho variável) e `indicadores.zip` soltos na raiz viola as boas práticas de engenharia, contamina o controle de versão e confunde a navegação de arquivos do projeto.

**Independent Test**: Pode ser testado de forma independente verificando a inexistência de arquivos `.zip` na raiz do repositório e comprovando que a execução do pipeline consome a entrada de `data/canonical/exports_canonical.zip` e grava o pacote final em `data/dist/indicadores.zip`.

**Acceptance Scenarios**:

1. **Given** o arquivo canônico localizado em `data/canonical/exports_canonical.zip`, **When** o pipeline de ETL é executado via `make etl`, **Then** o arquivo de saída `indicadores.zip` é criado estritamente em `data/dist/` e nenhum arquivo `.zip` é criado ou modificado na raiz do repositório.
2. **Given** a raiz do repositório, **When** verificada a árvore de arquivos e o arquivo `.gitignore`, **Then** a pasta `data/canonical/` (tamanho variável) e zips parciais de campus sob `data/dist/indicadores_*.zip` estão devidamente ignorados, enquanto `data/dist/indicadores.zip` (tamanho variável) é versionado como artefato de produção para viabilizar o deploy do Astro no CI.
3. **Given** uma execução parcial para um campus específico (ex.: `make etl-campus CAMPUS=Serra`), **When** o pipeline finaliza, **Then** o arquivo resultante é gerado como `data/dist/indicadores_serra.zip`.

---

### User Story 2 - Pipeline ETL Modular com Tracking e Relatórios de Auditoria (Priority: P2)

Como analista de dados ou engenheiro de software, quero que o pipeline ETL em `etl/` adote a separação de responsabilidades do `horizon_etl`, incluindo portas estritas, orquestração modular, observabilidade leve (`tracking/`) e geração automática de relatórios em `data/reports/`, para que cada execução seja auditável e explicável sem depender de leitura manual de logs de terminal.

**Why this priority**: No modelo atual, o pipeline roda em um único arquivo de fluxo monolítico sem emitir relatórios persistidos ou auditoria de volumetria, dificultando a detecção precoce de anomalias em dados de entrada ou campus.

**Independent Test**: Pode ser testado executando o pipeline e inspecionando o arquivo de relatório gerado em `data/reports/` (ex.: `data/reports/etl_run_report.md`), comprovando a contagem correta de projetos, pessoas e iniciativas mapeadas por campus e por pilar.

**Acceptance Scenarios**:

1. **Given** a execução do pipeline de ETL, **When** o processo é concluído com sucesso, **Then** é gerado um relatório de auditoria em `data/reports/etl_run_report.md` contendo: total de projetos ativos processados, servidores classificados por pilar, discentes vinculados e avisos de registros com inconsistências de dados.
2. **Given** os dados sumarizados no relatório de auditoria, **When** inspecionado o conteúdo gerado, **Then** nenhuma informação de identificação pessoal (PII) sensível (como nomes civis de estudantes ou números de CPF) está exposta no relatório, preservando rigorosamente o Princípio IV da Constituição do projeto.
3. **Given** o módulo `etl/core/logic/`, **When** inspecionada a estrutura, **Then** os modelos de dados estão segregados por contexto, os cálculos dos Pilares 1, 2 e 3 estão isolados em submódulos de `calculators/`, e os scripts operacionais de diagnóstico residem sob `etl/scripts/`.

---

### User Story 3 - Segregação Estrita de Testes e Desacoplamento do Frontend (Priority: P3)

Como mantenedor full-stack, quero que os testes da suíte web (Vitest) e os testes do pipeline de dados (Pytest) fiquem organizados em diretórios dedicados (`tests/web/` e `tests/etl/`), e que a aplicação Astro leia de forma unificada e inequívoca o pacote em `data/dist/indicadores.zip`, eliminando ambiguidades entre arquivos JSON mockados e dados reais de produção.

**Why this priority**: A convivência promíscua de testes em TypeScript e testes em Python no mesmo diretório raiz `tests/` gera confusão mental, dificulta comandos de execução de testes por escopo e prejudica a clareza do repositório.

**Independent Test**: Pode ser testado executando separadamente `make test-etl` (que roda exclusivamente os testes Pytest em `tests/etl/`) e `make test-web` (que roda exclusivamente os testes Vitest em `tests/web/`), garantindo 100% de sucesso em ambas as suítes.

**Acceptance Scenarios**:

1. **Given** a estrutura de testes reorganizada em `tests/etl/` e `tests/web/`, **When** executo `make test-etl`, **Then** apenas a suíte Pytest é disparada e valida a fidelidade matemática do pipeline.
2. **Given** a estrutura de testes reorganizada, **When** executo `make test-web`, **Then** apenas a suíte Vitest é disparada e valida a renderização e regras do frontend Astro.
3. **Given** o frontend Astro executando o comando de build (`npm run build`), **When** os dados são carregados para a geração estática, **Then** o leitor de dataset consome o arquivo gerado em `data/dist/indicadores.zip` com fallback seguro e mensagens claras caso o pacote não exista.

---

### User Story 4 - Padronização do Tooling e Comandos de Desenvolvimento (Priority: P4)

Como colaborador do projeto, quero uma interface padronizada de desenvolvimento com `pyproject.toml` para ferramentas Python e um `Makefile` simplificado e intuitivo, para poder preparar o ambiente, rodar o pipeline, formatar o código e validar a integridade completa em um único comando.

**Why this priority**: Facilita a entrada de novos desenvolvedores, previne desvios de estilo de código e garante conformidade contínua nos pipelines de CI/CD.

**Independent Test**: Pode ser testado executando `make check` e verificando que linters (flake8, eslint), formatadores (black, isort, prettier) e testes (pytest, vitest) rodam sequencialmente e passam com êxito.

**Acceptance Scenarios**:

1. **Given** as configurações consolidadas em `pyproject.toml`, **When** executo `make format-check` e `make lint`, **Then** flake8, black, isort e eslint validam todo o código sem erros ou advertências.
2. **Given** o comando unificado `make check`, **When** executado localmente ou no CI, **Then** toda a esteira de validação é executada na ordem correta: linting, checagem de formatação e testes unitários/integrados.

---

### Edge Cases

- **Ausência de pacote canônico de entrada**: Se o arquivo canônico de entrada não for encontrado no caminho padrão (`data/canonical/exports_canonical.zip`) nem no caminho customizado via CLI/ENV, o pipeline deve abortar imediatamente com exit code 1, emitindo no `stderr` orientações amigáveis sobre como posicionar o arquivo ou configurar a variável `ENTRADA` / `.env`.
- **Diretórios de destino inexistentes**: Se as pastas `data/dist/` ou `data/reports/` ainda não existirem no momento da execução, o sistema deve criá-las de forma idempotente e automática antes de gravar os arquivos.
- **Inexistência de dados de entrada para um campus solicitado**: Se um campus solicitado via CLI `--campus` não possuir nenhuma atividade registrada no período, o pacote ZIP do campus correspondente deve conter arquivos válidos com contadores nulos e campos exigidos pelo contrato de schema, sem corromper a estrutura.
- **Execução do Astro sem pacote gerado prévio**: Caso o desenvolvedor execute `npm run dev` no frontend sem antes ter gerado `data/dist/indicadores.zip`, o sistema de carregamento do dataset deve emitir um aviso informativo claro no console em vez de quebrar silenciosamente ou com stack trace opaco.
- **Preservação de fidelidade a nulos (Princípio III)**: Campos que não possuem coleta nas fontes canônicas (ex.: discentes matriculados ou cotistas) devem continuar estritamente como `null` no JSON de saída, nunca como `0` ou strings vazias.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE isolar a camada de dados em um diretório de primeiro nível `data/`, contendo obrigatoriamente as pastas:
  - `data/canonical/`: para armazenamento do pacote bruto `exports_canonical.zip`.
  - `data/dist/`: para gravação do pacote principal `indicadores.zip` e pacotes individuais de campus.
  - `data/reports/`: para gravação de relatórios de auditoria e sumários de integridade de dados.
- **FR-002**: O sistema NÃO DEVE gerar, exigir ou manter arquivos binários `.zip` de dados na raiz do repositório.
- **FR-003**: O pipeline de ETL DEVE receber como entrada padrão o caminho `data/canonical/exports_canonical.zip` e como saída padrão `data/dist/indicadores.zip`, com suporte a customização via flags CLI (`--entrada` / `-i`, `--saida` / `-o`), variáveis de ambiente (`ENTRADA`, `SAIDA`) ou `.env` (ex.: apontando diretamente para `../horizon_etl/...`), emitindo mensagem amigável com orientações caso a entrada não seja localizada.
- **FR-004**: O pipeline de ETL DEVE incorporar um módulo de observabilidade e tracking sob `etl/tracking/`, responsável por acumular contadores de execução (entidades lidas, iniciativas filtradas por ano, resoluções de campus bem-sucedidas e anomalias).
- **FR-005**: Ao término de cada execução do pipeline, o sistema DEVE gerar/sobrescrever deterministicamente o arquivo `data/reports/etl_run_report.md` (versionado no Git junto ao `indicadores.zip`), detalhando: data e hora da execução, número de arquivos gerados por pilar, volumetria agregada por campus e lista de alertas de qualidade.
- **FR-006**: Os relatórios de auditoria gerados sob `data/reports/` DEVEM respeitar integralmente a LGPD e o Princípio IV da Constituição do projeto, contendo exclusivamente métricas agregadas e identificadores públicos de projetos, sendo proibida a exposição de nomes de estudantes ou CPFs.
- **FR-007**: A camada `etl/core/` DEVE manter a arquitetura de portas e adaptadores desacoplada:
  - `etl/core/ports/`: interfaces abstratas puras `ISource` e `ISink`.
  - `etl/core/logic/`: lógica de cálculo CONIF pura, isolada de I/O em disco ou rede.
- **FR-008**: Os modelos de dados em `etl/core/logic/` DEVEM ser divididos em arquivos temáticos sob `etl/core/logic/models/` (ex.: modelos canônicos de entrada, agregados de indicadores e modelos de exportação), substituindo o modelo monolítico anterior.
- **FR-009**: O diretório `etl/scripts/` DEVE conter ferramentas operacionais independentes para diagnóstico e validação do dataset (ex.: inspeção de campus, validação de integridade dos JSONs gerados e conferência rápida de métricas).
- **FR-010**: A suíte de testes DEVE ser estritamente segregada em dois escopos no diretório `tests/`:
  - `tests/etl/`: exclusivo para a suíte em Python / Pytest, validando a lógica matemática, adaptadores e orquestração.
  - `tests/web/`: exclusivo para a suíte em TypeScript / Vitest, validando componentes Astro, formatação, rotas e acessibilidade.
- **FR-011**: O frontend Astro DEVE permanecer localizado em `src/` (em estrita observância ao Princípio I da Constituição) e seu módulo de carregamento de dados (`src/lib/dataset.ts`) DEVE ler o pacote a partir de `data/dist/indicadores.zip`, fornecendo mensagens orientativas claras no console caso o arquivo não seja encontrado.
- **FR-012**: O arquivo `.gitignore` DEVE ser configurado para ignorar `data/canonical/*` (preservando o diretório via `.gitkeep`) e arquivos parciais de campus sob `data/dist/indicadores_*.zip`, enquanto o pacote consolidado de produção `data/dist/indicadores.zip` (212 KB) DEVE ser versionado para viabilizar o build e deploy do Astro no CI sem dependência de runtime Python.
- **FR-013**: Os arquivos gerados no pacote final `indicadores.zip` (3 pilares × (campi do export + `todos`) × 3 anos — quantidade **variável**) DEVEM manter 100% de paridade numérica e conformidade estrita aos schemas `pilar{N}_{campus}_{year}.json` definidos nas especificações dos pilares.
- **FR-014**: O projeto DEVE adotar um arquivo `pyproject.toml` na raiz para unificar as configurações das ferramentas Python (`black`, `isort`, `flake8`, `pytest`).
- **FR-015**: O `Makefile` DEVE fornecer alvos claros e atualizados: `make setup`, `make etl`, `make etl-campus`, `make test`, `make test-etl`, `make test-web`, `make lint`, `make format` e `make check`.
- **FR-016**: Os arquivos JSON legados em `src/data/` (`qspp.json`, `ntpp.json`, `picot.json`, `pies.json`) DEVEM ser removidos, consolidando `data/dist/indicadores.zip` como a única fonte da verdade para o frontend, mantendo apenas metadados e tipagens TypeScript em `src/data/indicadores.ts`.

---

### Key Entities _(include if feature involves data)_

- **DatasetCanônico (`data/canonical/exports_canonical.zip`)**: Coleção de arquivos JSON normalizados de entrada (campuses, initiatives, researchers, students, productions, etc.) fornecidos pelo ecossistema upstream.
- **RelatórioDeExecução (`data/reports/etl_run_report.md`)**: Artefato de auditoria gerado pelo módulo `tracking/`, contendo o sumário de processamento, contadores por campus e avisos de qualidade emitidos durante o pipeline.
- **PacoteDeIndicadores (`data/dist/indicadores.zip`)**: Pacote determinístico contendo a coleção completa de arquivos JSON validados conforme o schema de entrega dos Pilares 1, 2 e 3 do CONIF (quantidade variável, derivada do export).
- **RegistroPilarJson**: Entidade de transferência que encapsula o nome normalizado (`pilar{N}_{campus}_{ano}.json`) e o conteúdo JSON validado contra nulos e tipos estritos.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 0 (zero) arquivos binários `.zip` soltos na raiz do repositório após a execução de qualquer comando do pipeline ou do build.
- **SC-002**: 100% de paridade matemática e contratual nos arquivos gerados sob `data/dist/indicadores.zip` em comparação com os valores canônicos oficiais homologados.
- **SC-003**: 100% dos testes unitários e de integração executam e passam com sucesso tanto no comando `make test-etl` quanto em `make test-web`.
- **SC-004**: Toda execução do comando `make etl` gera automaticamente o arquivo `data/reports/etl_run_report.md` com tempo total de pipeline inferior a 5 segundos para o processamento de todo o conjunto de dados.
- **SC-005**: 0 (zero) erros ou advertências nos linters e checadores estáticos (`make check` conclui com exit code 0).

## Assumptions

- O desenvolvedor ou ambiente de CI/CD possui Python 3.11+ e Node.js 20+ instalados no ambiente de execução.
- O arquivo de entrada `exports_canonical.zip` continuará sendo provido pelo repositório upstream `horizon_etl` ou gerado via pipeline automatizado de integração.
- A aplicação web Astro continuará usando geração estática (SSG), consumindo o pacote de indicadores durante a fase de build para publicação de arquivos estáticos.
- Nenhuma alteração nos cálculos matemáticos dos indicadores ou nas regras de negócio de elegibilidade do CONIF é necessária nesta reorganização estrutural.
