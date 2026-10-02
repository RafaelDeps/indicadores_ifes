# Especificação de Feature: Pipeline ETL Python (Hexagonal / Ports & Adapters)

**Feature Branch**: `008-python-hexagonal-etl`

**Created**: 2026-09-25

**Status**: Finalizado (implementado)

**Input**: User description: "Implement Python ETL pipeline mirroring the Hexagonal/Ports & Adapters architecture of horizon_etl/src/"

> **Nota de vigência**: esta spec descreve o layout original (artefatos na raiz
> do repositório). A partir da spec 009 as entradas/saídas vivem em
> `data/canonical/` e `data/dist/` (`make etl` → `data/dist/indicadores.zip`).
> O código Python aqui especificado é o **mesmo** pipeline vigente (reorganizado
> de diretório pela 009, estendido pelas 010/011); apenas os caminhos diferem
> do layout atual.

## Clarifications

### Session 2026-09-25

- Q: Onde os módulos Python do ETL devem residir dentro da estrutura do repositório? → A: Diretório `etl/` na raiz do projeto (`etl/core/`, `etl/adapters/`, `etl/flows/`, `etl/main.py`), mantendo `src/` exclusivamente para o frontend Astro.
- Q: O que deve ser feito com o código e testes legados do ETL em TypeScript (`src/etl/` e `tests/etl/*.test.ts`)? → A: Remoção completa de `src/etl/` e dos testes TypeScript `tests/etl/*.test.ts`, substituindo-os pelo código Python em `etl/` e testes Python em `tests/etl/` com `pytest`, e atualizando `package.json` (`"etl": "python3 -m etl.main"`).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Execução do Pipeline Completo e Geração de Indicadores (Priority: P1)

Como mantenedor ou sistema de automação, executo o pipeline de ETL em Python para transformar os dados brutos de `exports_canonical.zip` no pacote final `indicadores.zip`, contendo os arquivos `pilar{N}_{campus}_{year}.json` dos Pilares 1, 2 e 3 para os campi do export e o escopo institucional `todos` (anos 2024–2026; quantidade **variável**, derivada do export), garantindo total compatibilidade com o dashboard público em Astro.

**Why this priority**: É a funcionalidade central e mais crítica do pipeline de dados. Sem ela, o dashboard público não possui indicadores para exibição.

**Independent Test**: Pode ser testado de forma totalmente isolada executando `python3 -m etl.main` e inspecionando se o arquivo `indicadores.zip` gerado contém os arquivos `pilar{N}_{campus}_{year}.json` esperados (quantidade variável, derivada do export) com as métricas CONIF matematicamente corretas e compatíveis com a renderização do Astro.

**Acceptance Scenarios**:

1. **Given** o arquivo `exports_canonical.zip` válido na raiz do repositório, **When** executo o comando `python3 -m etl.main` ou `make etl`, **Then** o arquivo `indicadores.zip` é criado ou substituído atomicamente na raiz com exit code 0, contendo os arquivos JSON `pilar{N}_{campus}_{year}.json` (quantidade variável, derivada do export) rigorosamente aderentes ao schema.
2. **Given** os arquivos gerados pelo pipeline em Python, **When** o frontend Astro executa a validação de dataset (`npm test`), **Then** todos os testes do Astro passam sem falhas e o build estático (`npm run build`) completa com sucesso.
3. **Given** métricas não coletáveis na origem (ex.: `NTE_total_estudantes_matriculados`, `TAFPPI_valor_total_aporte_pesquisa`, `NAPPCT_acordos_parceria_firmados`), **When** os arquivos de indicadores são gerados, **Then** esses campos permanecem estritamente `null` (Princípio III), enquanto contagens comprovadas nulas (ex.: patentes `PA`) registram o numeral `0`.

---

### User Story 2 - Execução Filtrada por Campus Individual com Saída Isolada (Priority: P2)

Como gestor local ou pesquisador de um campus, desejo executar o ETL filtrando exclusivamente os dados de um campus (por exemplo, `Serra` ou `Vitória`) e direcionando a saída para um pacote ZIP dedicado, permitindo análises locais e validações rápidas sem sobrescrever o dataset global `indicadores.zip`.

**Why this priority**: Permite que desenvolvedores e analistas validem dados específicos de um campus rapidamente, sem o risco de corromper o arquivo `indicadores.zip` necessário para o site público e para a suíte geral de testes.

**Independent Test**: Pode ser testado executando `python3 -m etl.main --campus Serra --saida indicadores_serra.zip` ou `make etl-campus CAMPUS=Serra` e verificando que apenas os 9 arquivos daquele campus são criados no arquivo de destino, com as mesmas métricas da execução global.

**Acceptance Scenarios**:

1. **Given** um campus válido especificado via CLI (ex.: `--campus Serra`), **When** o pipeline é executado, **Then** apenas os 9 arquivos correspondentes àquele campus (3 pilares × 3 anos) são gerados no pacote de saída especificado.
2. **Given** a execução via comando `make etl-campus CAMPUS=Vitória`, **When** a execução conclui, **Then** o arquivo `indicadores_vitoria.zip` é gerado na raiz e o arquivo `indicadores.zip` original permanece inalterado.
3. **Given** um campus com nome acentuado (ex.: `Vitória`) ou com espaços (ex.: `Vila Velha`), **When** o parâmetro é fornecido, **Then** o sistema resolve o campus por nome ou slug insensível a acentuação e maiúsculas/minúsculas.

---

### User Story 3 - Qualidade, Testabilidade e Conformidade (Pytest / Black / Flake8) (Priority: P3)

Como engenheiro de software, quero que o código do ETL siga os mesmos padrões de qualidade e ferramental adotados no `horizon_etl` (`pytest`, `black`, `isort` e `flake8`), com cobertura completa de testes unitários e de integração e integração direta no `Makefile`.

**Why this priority**: Garante manutenibilidade contínua, consistência de estilo com o repositório upstream `horizon_etl` e prevenção de regressões em fórmulas ou resolução de entidades.

**Independent Test**: Pode ser testado executando `pytest tests/etl`, `flake8 etl tests/etl` e `black --check etl tests/etl`.

**Acceptance Scenarios**:

1. **Given** o código em `etl/` e `tests/etl/`, **When** executo `make test-etl`, **Then** todos os testes do `pytest` executam e passam com 100% de sucesso.
2. **Given** o código do pipeline em Python, **When** executo `make lint` e `make format-check`, **Then** `flake8`, `black` e `isort` validam todo o código sem advertências ou erros de estilo.
3. **Given** a execução do comando unificado `make check`, **When** o processo roda, **Then** são validados consecutivamente lint, checagem de formatação e testes tanto da camada Python quanto da camada web/TypeScript.

---

### Edge Cases

- **Pacote canônico ausente ou ilegível**: Se `exports_canonical.zip` não for encontrado ou não for um arquivo ZIP válido, o pipeline deve abortar imediatamente com exit code 1, sem criar ou corromper o arquivo de saída, emitindo erro claro no `stderr`.
- **Arquivo canônico obrigatório ausente no ZIP**: Se algum dos arquivos canônicos essenciais (ex.: `campuses_canonical.json`, `initiatives_canonical.json`, etc.) estiver ausente no ZIP de entrada, o pipeline falha com exit code 1 citando o arquivo faltante.
- **Iniciativa sem `start_date`**: Tratada como nunca ativa, emitindo aviso único (`AVISO: iniciativa {id} sem start_date — tratada como nunca ativa`) e não emitindo aviso redundante de campus.
- **Iniciativa sem campus próprio e sem campus nos membros**: Contabilizada exclusivamente no escopo consolidado institucional `todos`, emitindo aviso se ativa nos anos-alvo (`AVISO: iniciativa {id} sem campus resolvível — contabilizada apenas no escopo "todos"`).
- **Iniciativas e produções históricas antigas**: Registros fora da janela de análise (2024–2026) não devem poluir o terminal com avisos de campus não resolvível.
- **Produção com ano inválido (`0`, negativo ou nulo)**: Excluída das contagens com aviso (`AVISO: produção {id} com ano inválido ({ano}) — excluída das contagens`).
- **Produção em co-autoria entre múltiplos campi**: Creditada para cada um dos campi participantes individualmente, e contabilizada exatamente 1 vez no escopo institucional `todos`.
- **Campus inexistente solicitado na CLI**: Se for passado `--campus Inexistente`, o CLI deve falhar com exit code 1 e listar todos os campi disponíveis.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O pipeline de ETL DEVE ser implementado em Python (>= 3.11/3.12), utilizando exclusivamente a biblioteca padrão do Python para sua execução em tempo de execução (`zipfile`, `json`, `dataclasses`, `pathlib`, `argparse`, `abc`, `typing`).
- **FR-002**: A arquitetura DEVE espelhar rigorosamente o padrão Hexagonal / Ports & Adapters de `horizon_etl/src/`, estruturada sob o diretório `etl/` na raiz do projeto (`etl/core/ports/`, `etl/core/logic/`, `etl/adapters/sources/`, `etl/adapters/sinks/` e `etl/flows/`), mantendo o diretório `src/` exclusivamente dedicado ao frontend Astro.
- **FR-003**: A porta de extração (`etl/core/ports/source.py`) DEVE definir a classe abstrata `ISource(ABC)` com o método abstrato `extract() -> ExportCanonicos`.
- **FR-004**: A porta de carregamento/persistência (`etl/core/ports/sink.py`) DEVE definir a classe abstrata `ISink(ABC)` com o método abstrato `load(arquivos: list[RegistroPilarJson]) -> None`.
- **FR-005**: O adaptador de entrada `etl/adapters/sources/zip_canonical_source.py` DEVE implementar `ISource`, lendo `exports_canonical.zip`, validando os 8 conjuntos canônicos obrigatórios e deduplicando entidades por ID com avisos informativos.
- **FR-006**: A lógica pura de domínio em `etl/core/logic/` DEVE ser completamente desacoplada de I/O em disco, rede ou formatação externa:
  - `models.py`: dataclasses tipadas para entidades canônicas e agregados (`Iniciativa`, `Pessoa`, `Producao`, `Artigo`, `Campus`, `AgregadosAno`, etc.).
  - `resolvers/campus_resolver.py`: resolução hierárquica (campus declarado -> campus do coordenador -> campus do primeiro membro da equipe com campus).
  - `resolvers/people_registry.py`: mapa unificado de pessoas integrando `researchers_canonical.json` e `students_canonical.json`, com precedência para pesquisadores em caso de IDs coincidentes.
  - `temporal/activity_filter.py`: cálculo de vigência no ano civil Y (`start_date <= 31/12/Y` e `end_date is None or end_date >= 01/01/Y`).
  - `calculators/pillar1.py`: métricas NTPP (projetos ativos), QSPP (servidores participantes com `classification == 'researcher'`), NEP (estudantes participantes com role `'Student'`); campos de matriculados/cotistas estritamente `null`.
  - `calculators/pillar2.py`: métricas PINV e PIPDI estritamente `null`.
  - `calculators/pillar3.py`: NPB (artigos), NPT (produções técnicas), PC (softwares sem patente), PA = 0 (patentes ausentes) e PIPROTR com valores `null`.
  - `calculators/aggregator.py`: agregação multi-campus e consolidado `todos`, filtrando avisos para os anos-alvo.
- **FR-007**: O adaptador de formatação `etl/adapters/sinks/json_pilar_sink.py` DEVE gerar arquivos JSON com chaves ordenadas e compactos conforme o contrato `pilar{N}_{campus}_{year}.json`.
- **FR-008**: O adaptador de persistência `etl/adapters/sinks/zip_indicadores_sink.py` DEVE implementar `ISink`, validando os arquivos contra o contrato de schema (cabeçalhos, nomenclaturas, fidelidade a nulls) e gravando atomicamente o pacote ZIP determinístico (timestamp DOS 1980-01-01 e arquivos ordenados alfabeticamente).
- **FR-009**: O orquestrador `etl/flows/indicadores_flow.py` DEVE conectar `source.extract() -> core.compute() -> sink.load()`, registrando log de conclusão com total de arquivos e anos no `stdout`.
- **FR-010**: O entrypoint CLI `etl/main.py` DEVE suportar argumentos de linha de comando com `argparse`: `--campus` / `-c`, `--entrada` / `-i` e `--saida` / `-o`, com suporte adicional à variável de ambiente `CAMPUS`.
- **FR-011**: O arquivo `Makefile` DEVE fornecer comandos de automação unificados:
  - `make etl`: executa o pipeline em Python gerando `indicadores.zip`.
  - `make etl-campus`: executa o pipeline em Python para 1 campus gerando `indicadores_{campus}.zip`.
  - `make test-etl`: executa os testes do ETL com `pytest`.
  - `make lint`: executa `flake8` no Python e `eslint` no frontend.
  - `make format`: formata com `black` e `isort` no Python e `prettier` no frontend.
  - `make check`: executa lint, checagem de formatação e testes de ambas as camadas.
- **FR-012**: O gerenciamento de dependências de desenvolvimento do Python DEVE ser configurado via `requirements-etl.txt` contendo `pytest`, `pytest-cov`, `black`, `isort` e `flake8`.
- **FR-013**: A suíte de testes em `tests/etl/` DEVE ser escrita em `pytest`, cobrindo testes unitários de resolvers, temporal, calculadores, adapters, flows e testes de ponta a ponta da CLI.
- **FR-014**: A implementação legada do ETL em TypeScript (`src/etl/` e os testes TypeScript em `tests/etl/*.test.ts`) DEVE ser completamente removida do repositório, garantindo que `src/` permaneça exclusivo para o frontend Astro, `tests/etl/` seja exclusivo para os testes Python (`pytest`), e o script `"etl"` em `package.json` invoque `"python3 -m etl.main"`.

### Key Entities

- **Iniciativa**: Projeto de pesquisa ou ação acadêmica com datas de início e fim, tipo, campus e equipe vinculada.
- **Pessoa**: Pesquisador ou estudante com identificador único, nome, classificação institucional e campus de vínculo.
- **Produção**: Produção técnica/tecnológica ou bibliográfica vinculada a tipo específico, ano de publicação e lista de autores.
- **Campus**: Unidade do IFES com identificador numérico, nome oficial e slug alfanumérico para arquivos.
- **AgregadosAno**: Estrutura de agregação puramente de domínio contendo contagens anuais de NTPP, QSPP, NEP, NPB, NPT e PC por campus e no escopo global `todos`.
- **RegistroPilarJson**: Entidade de entrega contendo o nome do arquivo JSON e seu conteúdo textual serializado de acordo com o contrato CONIF.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O pipeline em Python processa a base canônica completa e gera todos os arquivos `pilar{N}_{campus}_{year}.json` (quantidade variável, derivada do export) em menos de 5 segundos.
- **SC-002**: Os arquivos JSON contidos em `indicadores.zip` gerados pelo pipeline Python são 100% compatíveis com o frontend Astro, mantendo todos os 267 testes da suíte Vitest e o build estático aprovados com zero erros.
- **SC-003**: 100% dos testes unitários e de integração em Python executados com `pytest` passam com zero falhas.
- **SC-004**: O código Python atinge 100% de conformidade com `black`, `isort` e `flake8` com zero violações.
- **SC-005**: Zero dados pessoais identificáveis (nomes de pesquisadores, CPFs, matrículas) são expostos nos arquivos gerados, em estrito cumprimento da LGPD e do Princípio IV da Constituição.

## Assumptions

- O ambiente de execução possui Python 3.11 ou superior instalado no sistema operacional do usuário.
- O pipeline não requer bibliotecas de terceiros pesadas (como pandas ou numpy) para execução em produção; a biblioteca padrão do Python é plenamente suficiente para o volume de dados e requisitos de performance.
- O frontend Astro continuará consumindo o arquivo `indicadores.zip` da raiz do repositório, garantindo desacoplamento total entre o processamento de dados e a camada de apresentação.
