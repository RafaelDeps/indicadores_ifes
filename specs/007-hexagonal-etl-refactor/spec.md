# Feature Specification: Refatoração da Arquitetura Hexagonal do ETL (Ports & Adapters)

**Feature Branch**: `007-hexagonal-etl-refactor`

**Created**: 2026-09-25

**Status**: Finalizado (implementado; arquitetura TS superada pela implementação Python das specs 008/009)

**Input**: User description: "Refactor `src/etl` to mirror the Hexagonal/Ports & Adapters ETL architecture of `horizon_etl/src/` with zero behavioral regressions. Context: Existing ETL logic works and passes tests, but is trapped in a flat procedural directory (`src/etl/*.ts`). Refactor it to follow the exact `adapters`, `core` (ports + logic), and `flows` architecture used in `horizon_etl`. Requirements: 1. ARCHITECTURAL LAYERS (Mirrored from horizon_etl): `src/etl/core/ports/` (`source.ts`, `sink.ts`), `src/etl/core/logic/` (Resolvers, Temporal, Calculators), `src/etl/adapters/` (`sources/zip_canonical_source.ts`, `sinks/json_pilar_sink.ts`, `sinks/zip_indicadores_sink.ts`), `src/etl/flows/` (`indicadores_flow.ts`), `src/etl/main.ts` (CLI entrypoint). 2. CONSTRAINTS: Preserve 100% of existing verified business logic, formulas, date intervals, and strict Principle III fidelity (`null` vs `0`). Zero new runtime dependencies; all 231 existing Vitest tests must continue passing. Reorganize `tests/etl/` to mirror the `adapters/`, `core/`, and `flows/` structure."

## Clarifications

### Session 2026-09-25

- Q: Sincronismo das Interfaces de Porta (`ISource` e `ISink`) → A: Assinaturas estritamente síncronas: `extract(): ExportCanonicos` e `load(dados: RegistroPilarJson[]): void`.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Extração de Dados Isolada por Portas e Adaptadores (Priority: P1)

Como engenheiro de dados e mantenedor do projeto, preciso que a etapa de extração de dados brutos seja desacoplada por meio de uma interface abstrata (`ISource`), para que a origem dos dados canônicos (`exports_canonical.zip`) possa ser lida, validada e substituída sem afetar as regras de negócio ou os cálculos de indicadores.

**Why this priority**: A separação da entrada elimina a confusão semântica do arquivo anterior (`load.ts`), isolando a leitura de I/O e permitindo testar a extração independentemente do processamento analítico.

**Independent Test**: Pode ser testado de forma isolada instanciando o adaptador `ZipCanonicalSource`, fornecendo um arquivo de entrada válido ou simulado, e verificando se as entidades canônicas tipadas são entregues em memória conforme o contrato `ISource`.

**Acceptance Scenarios**:

1. **Given** um pacote `exports_canonical.zip` íntegro na raiz, **When** o método `extract()` do adaptador de fonte for executado, **Then** ele retorna as coleções canônicas tipadas (iniciativas, pessoas, estudantes, campi, artigos, produções) sem expor detalhes de descompactação à camada de domínio.
2. **Given** um pacote ausente ou corrompido, **When** a extração é acionada, **Then** o adaptador lança uma exceção com mensagem de erro clara em português, abortando o fluxo com segurança.

---

### User Story 2 - Lógica de Domínio e Métricas Puras em Memória (Priority: P1)

Como mantenedor do sistema de indicadores, preciso que toda a resolução de relacionamentos, janelas temporais de vigência e fórmulas dos pilares CONIF residam em módulos puros dentro de `core/logic`, para que os cálculos operem estritamente em memória sem qualquer dependência de sistemas de arquivos, formatos de arquivo compactados ou serialização JSON.

**Why this priority**: É o núcleo do sistema; assegura a manutenibilidade, testabilidade unitária e cumprimento rigoroso dos Princípios I (Simplicidade), II (Test-First) e III (Fidelidade aos Dados).

**Independent Test**: Pode ser testado alimentando diretamente as funções de resolução e cálculo com objetos de dados em memória, validando que os agregados de cada pilar e campus são calculados com precisão matemática sem executar operações de I/O.

**Acceptance Scenarios**:

1. **Given** coleções canônicas em memória, **When** o módulo de resolução de campus e classificação de servidores/estudantes for executado, **Then** iniciativas e produções recebem a atribuição correta de campus (hierarquia: declarado → coordenador → membros da equipe) e identificação de vínculo.
2. **Given** um ano de referência `Y`, **When** os cálculos dos Pilares 1, 2 e 3 são acionados, **Then** os agregados numéricos retornam objetos de domínio com as contagens exatas verificadas para métricas populadas (NTPP, QSPP, NEP, NPB, NPT, PC) e valores estritamente `null` para métricas sem cobertura na base (NTE, PICOT, PINV, PIPDI, PIPROTR).
3. **Given** os dados processados para todos os campi individuais, **When** a agregação institucional é chamada, **Then** o escopo `todos` consolida os totais institucionais sem duplicação de pessoas ou projetos.

---

### User Story 3 - Entrega, Validação e Carga de Pacote Isoladas em Sinks (Priority: P2)

Como mantenedor do dashboard, preciso que a formatação dos contratos JSON (`pilar{N}_{campus}_{year}.json`), a validação estrutural de integridade e a persistência atômica no arquivo `indicadores.zip` sejam executadas por adaptadores de saída (`ISink` / `IExportSink`), para que a entrega dos artefatos seja desacoplada das regras de agregação.

**Why this priority**: Garante que o dashboard continue consumindo exatamente os contratos definidos na feature 004, com garantia de validação prévia de esquema antes de gravar o arquivo em disco.

**Independent Test**: Pode ser testado fornecendo agregados de domínio simulados aos adaptadores de saída e verificando se os JSONs gerados respeitam o contrato de ingestão e se o arquivo ZIP final é gravado de forma atômica e determinística.

**Acceptance Scenarios**:

1. **Given** os agregados de domínio calculados pelo núcleo, **When** o formatador de contratos for executado, **Then** ele produz registros JSON com cabeçalho padronizado e valores em estrita conformidade com `specs/004-pillars-campi-zip-rework/contracts/ingestion-contract.md`.
2. **Given** registros formatados, **When** o adaptador `ZipIndicadoresSink` persistir os dados, **Then** o arquivo `indicadores.zip` é gravado atomicamente na raiz do projeto com integridade verificada.
3. **Given** um arquivo JSON que viole as regras de fidelidade (ex.: `0` no lugar de `null` em métrica não coletada), **When** a validação do sink for executada, **Then** ela rejeita o lote e impede a geração de um ZIP inconsistente.

---

### User Story 4 - Orquestração Unificada de Pipeline com Paridade Arquitetural (Priority: P2)

Como mantenedor e operador da CLI, preciso que o comando `npm run etl` acione um fluxo orquestrador (`IndicadoresFlow`) que conecte a fonte, a lógica de domínio e o destino em uma sequência limpa e declarativa (`source.extract() -> core.logic.compute() -> sink.load()`), refletindo fielmente a arquitetura consagrada do projeto `horizon_etl`.

**Why this priority**: Unifica os componentes em uma arquitetura padronizada de engenharia de software (Ports & Adapters), eliminando scripts procedurais planos e facilitando a evolução e manutenção do código entre projetos irmãos.

**Independent Test**: Executar `npm run etl` localmente e rodar a suíte completa de testes (`npm test`), comprovando que todos os 231 testes existentes continuam passando com tempo de execução sob 5 segundos.

**Acceptance Scenarios**:

1. **Given** o comando `npm run etl` acionado no terminal, **When** o fluxo é executado, **Then** a orquestração processa `exports_canonical.zip`, gera `indicadores.zip` e exibe o resumo de execução com código de saída 0.
2. **Given** a reorganização dos arquivos nos pacotes `core/ports`, `core/logic`, `adapters/sources`, `adapters/sinks` e `flows/`, **When** a suíte de testes Vitest for executada, **Then** todos os testes unitários e de integração refletem as novas camadas e passam sem falhas ou regressões.

---

### Edge Cases

- O que acontece se o arquivo `exports_canonical.zip` estiver corrompido ou incompleto? O adaptador de entrada (`ZipCanonicalSource`) falha imediatamente com mensagem em pt-BR e o pipeline é interrompido sem alterar o `indicadores.zip` existente.
- Como o sistema lida com ausência de campus em iniciativas ou produções? O módulo `core/logic/resolvers` aplica a regra estrita de fallback em cascata: campus declarado na entidade → campus do coordenador → campus dos membros da equipe. Se nenhum vínculo existir, contabiliza exclusivamente no escopo agregado `todos`.
- O que acontece se uma métrica não rastreada receber o numeral 0? O validador da camada de sink detecta a violação do Princípio III e aborta o empacotamento com erro descritivo.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE organizar a base de código do ETL em três camadas arquiteturais hexagonais explícitas: `core/` (ports e logic), `adapters/` (sources e sinks) e `flows/` (orquestração).
- **FR-002**: A camada `src/etl/core/ports/` DEVE definir a interface `ISource` (contrato de extração de dados brutos com método síncrono `extract(): ExportCanonicos`) e a interface `ISink` (contrato de carga e persistência com método síncrono `load(dados: RegistroPilarJson[]): void`).
- **FR-003**: A camada `src/etl/core/logic/` DEVE conter lógica de domínio pura (sem I/O de disco, sem descompressão de ZIP e sem formatação de strings JSON), abrangendo:
  - Resolvers relacionais (resolução hierárquica de campus e classificação de pessoas).
  - Filtros de janela temporal (verificação de atividade de iniciativas e publicações no ano-calendário $Y$).
  - Calculadores analíticos para o Pilar 1 (NTPP, QSPP, NEP), Pilar 2 (PINV, PIPDI) e Pilar 3 (PIPRO, PIPROT, PIPROTR).
  - Agregador institucional para o escopo `todos`.
- **FR-004**: A camada `src/etl/adapters/sources/` DEVE implementar o leitor canônico (`ZipCanonicalSource`) compatível com `ISource`, lendo `exports_canonical.zip` e entregando entidades canônicas tipadas em memória.
- **FR-005**: A camada `src/etl/adapters/sinks/` DEVE conter os formatadores de contrato (`JsonPilarSink`) e o escritor do pacote compactado (`ZipIndicadoresSink`), implementando a validação contra o contrato 004 e a gravação atômica em `indicadores.zip`.
- **FR-006**: A camada `src/etl/flows/` DEVE conter o orquestrador `IndicadoresFlow`, responsável por coordenar a sequência `source.extract() -> core.compute() -> sink.load()`.
- **FR-007**: O arquivo `etl/main.py` DEVE atuar exclusivamente como ponto de entrada da CLI (`make etl`), delegando a execução ao `IndicadoresFlow`. _(Redação original de 2026-09-25 referia `src/etl/main.ts` / `npm run etl` — superada pelas specs 008/009.)_
- **FR-008**: O pipeline DEVE preservar 100% dos resultados numéricos e a fidelidade aos dados de origem (Princípio III): métricas não coletadas DEVEM ser estritamente `null` e o numeral `0` DEVE ser restrito a contagens nulas comprovadas.
- **FR-009**: A suíte de testes Vitest em `tests/etl/` DEVE ser reorganizada para espelhar as pastas da arquitetura (`core/`, `adapters/`, `flows/`), mantendo todos os 231 testes existentes com status verde.
- **FR-010**: A refatoração NÃO DEVE introduzir nenhuma nova dependência de produção em `package.json`.

### Key Entities _(include if feature involves data)_

- **ISource**: Interface que define o contrato para extração de entidades canônicas a partir de um meio de armazenamento.
- **ISink**: Interface que define o contrato para persistência e validação do pacote de arquivos de saída do dashboard.
- **DomainAggregates**: Estrutura de dados em memória contendo as métricas computadas por campus e por ano, independente de representação serializada.
- **IndicadoresFlow**: Fluxo de trabalho que coordena a extração, computação de domínio e entrega de resultados.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos testes existentes (231 testes unitários e de integração no Vitest) continuam passando com sucesso após a reestruturação.
- **SC-002**: O pacote gerado `indicadores.zip` gerado pela nova arquitetura permanece 100% compatível com o leitor do site (`src/lib/dataset.ts`), sem nenhuma divergência funcional no build estático do Astro.
- **SC-003**: 100% dos módulos em `src/etl/core/logic/` possuem zero dependências de bibliotecas de I/O de arquivos (`node:fs`, `node:zlib`) ou de serialização de strings.
- **SC-004**: O tempo total de execução do comando `make etl` permanece inferior a 5 segundos para a base de dados canônica integral. _(Redação original referia `npm run etl`.)_

## Assumptions

- O formato do arquivo de entrada `exports_canonical.zip` permanece inalterado em relação ao export canônico atual do `horizon_etl`.
- O contrato de saída do dashboard (`specs/004-pillars-campi-zip-rework/contracts/ingestion-contract.md`) permanece como a fonte de verdade para a nomenclatura e o esquema JSON dos pilares.
- A ferramenta `tsx` continua sendo utilizada para execução do comando CLI em TypeScript no ambiente Node.js.
