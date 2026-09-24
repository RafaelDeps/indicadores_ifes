# Feature Specification: Pipeline ETL Determinístico de Geração do Pacote de Indicadores

**Feature Branch**: `006-deterministic-etl-pipeline`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Implement deterministic ETL pipeline (Source -> Transform -> Sync) reading `exports_canonical.zip` and outputting `indicadores.zip` conforming to `specs/004-pillars-campi-zip-rework/contracts/ingestion-contract.md`. Context: Replace manual AI processing of `exports_canonical.zip` with automated Node/TS pipeline generating `pilar{N}_{campus}_{year}.json` files packaged into root `indicadores.zip`. [...]"

## Clarifications

### Session 2026-09-23

- Q: Como calcular a categoria `PC` (programas de computador) do indicador `PIPROT`, dado que o export contém 81 produções do tipo `softwares_sem_patente`? → A: Derivar `PC` da contagem de produções do tipo `softwares_sem_patente` (contagem verificada por ano/campus); as demais categorias seguem a regra `0` verificado (`PA`, `DI`) vs `null` (não rastreadas).
- Q: Quais tipos de produção entram na contagem do `NPT` (indicador `PIPRO`)? → A: Todos os 6 tipos de `production_types_canonical.json` contam como produções técnicas/tecnológicas (`NPT`), pois a taxonomia canônica contém exclusivamente categorias técnicas (base de 951 produções).
- Q: Qual regra temporal vincula `NPB`/`NPT` ao ano de referência Y? → A: Contam para o ano Y as produções/artigos com `year = Y` (ano de publicação).
- Q: Qual a regra de atribuição de campus para artigos (`NPB`) e produções (`NPT`)? → A: Campus declarado no próprio registro primeiro; quando ausente, inferir pelos autores vinculados (espelha a regra de resolução das iniciativas, FR-005).
- Q: Quando e onde o pacote `indicadores.zip` é regenerado? → A: Regeneração manual local pelo mantenedor (`npm run etl`) quando o export atualiza, com o `indicadores.zip` regenerado versionado no repositório.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Geração Determinística do Pacote `indicadores.zip` a Partir do Export Canônico (Priority: P1)

Atualmente, os arquivos `pilar{N}_{campus}_{year}.json` empacotados em `indicadores.zip` são produzidos manualmente com auxílio de processamento por IA a partir de `exports_canonical.zip`. Esse processo é lento, não reproduzível e sujeito a inconsistências numéricas entre execuções. Esta entrega substitui o processo manual por um pipeline automatizado que lê o pacote de exportação canônica presente na raiz do repositório (contendo ao menos os conjuntos canônicos de iniciativas, pesquisadores, estudantes, campi, artigos, produções de pesquisa, autores de produções e tipos de produção) e gera, na raiz do repositório, o pacote `indicadores.zip` com todos os arquivos `pilar{N}_{campus}_{year}.json` conformes ao contrato de ingestão da feature 004.

**Why this priority**: O pacote `indicadores.zip` é a única fonte de dados do site público. Sem um processo automatizado e determinístico de geração, cada atualização de dados depende de trabalho manual propenso a erro, comprometendo a credibilidade dos indicadores (Princípio III da Constituição).

**Independent Test**: Pode ser testado executando o pipeline duas vezes consecutivas sobre a mesma entrada e verificando que ambas as execuções produzem o mesmo pacote `indicadores.zip` (conteúdo idêntico, arquivo a arquivo), contendo arquivos nomeados estritamente no padrão `pilar{N}_{campus}_{year}.json`.

**Acceptance Scenarios**:

1. **Given** o pacote `exports_canonical.zip` presente na raiz do repositório, **When** o pipeline é executado, **Then** o arquivo `indicadores.zip` é gerado na raiz contendo arquivos JSON nomeados estritamente no padrão `pilar{N}_{campus}_{year}.json` (pilares 1, 2 e 3).
2. **Given** duas execuções consecutivas do pipeline sobre a mesma entrada imutável, **When** os pacotes `indicadores.zip` resultantes são comparados, **Then** eles são idênticos (mesmos arquivos, mesmos nomes, mesmo conteúdo serializado), sem qualquer variação devida a ordem de processamento ou carimbos de tempo.
3. **Given** a execução do pipeline, **When** cada arquivo gerado é inspecionado, **Then** ele contém o cabeçalho comum exigido pelo contrato (`campus`, `ano_referencia`, `pilar`, `indicadores`) e os 9 indicadores CONIF distribuídos nos 3 pilares.
4. **Given** o pipeline em execução, **When** um conjunto canônico necessário está ausente ou ilegível no pacote de entrada, **Then** o pipeline falha imediatamente com mensagem de erro clara e não produz pacote de saída parcial.

---

### User Story 2 - Fidelidade Estrita dos Valores: `null` versus Zero Verificado (Priority: P1)

Todo valor publicado decorre exclusivamente de contagens verificadas sobre os dados de origem. Métricas sem dados coletados ou não deriváveis do export canônico DEVEM ser serializadas estritamente como `null` ("Dado indisponível" na interface). O valor `0` é reservado exclusivamente para contagens zero verificadas (ex.: zero iniciativas ativas no ano, zero patentes em categoria rastreada e comprovadamente vazia). O pipeline NUNCA converte ausência de dado em zero, nem zero em ausência.

**Why this priority**: A diferenciação entre "sem dado" e "zero verificado" é o pilar da integridade estatística do painel público (Princípio III da Constituição); qualquer coerção indevida invalida a leitura institucional dos indicadores.

**Independent Test**: Pode ser testado inspecionando os arquivos gerados e conferindo, indicador a indicador, que métricas sem fonte de dados no export (ex.: orçamento, censo estudantil, contratos de transferência) estão estritamente `null`, enquanto métricas de contagem calculadas sobre os dados (ex.: total de projetos ativos) apresentam valores numéricos, inclusive `0` quando a contagem verificada resultar em zero.

**Acceptance Scenarios**:

1. **Given** um indicador dependente de dados ausentes no export (ex.: `PINV` sem valores orçamentários, `PIPROTR` sem contratos de transferência), **When** o arquivo correspondente é gerado, **Then** suas métricas não calculáveis são estritamente `null` e nunca `0`, traço ou estimativa.
2. **Given** um campus e ano sem nenhuma iniciativa ativa, **When** o arquivo do pilar 1 é gerado, **Then** `NTPP` apresenta o valor numérico `0` (contagem zero verificada) e não `null`.
3. **Given** os indicadores `PIES` e `PICOT`, **When** os arquivos são gerados, **Then** o número de estudantes envolvidos em pesquisa (`NEP`) é contado a partir dos dados, enquanto o total de matriculados (`NTE`) e os percentuais calculados permanecem `null` por ausência de censo no export.
4. **Given** os componentes de `PIPROT`, **When** o arquivo é gerado, **Then** a categoria `PC` é derivada da contagem de produções `softwares_sem_patente`, categorias comprovadamente rastreadas e vazias na origem (ex.: `PA`, `DI`) recebem `0` verificado, e categorias não rastreadas recebem `null`.

---

### User Story 3 - Resolução de Campus por Iniciativa e Agregação Institucional "todos" (Priority: P2)

Cada iniciativa de pesquisa é atribuída a exatamente um campus: primeiramente pelo campus declarado na própria iniciativa; quando ausente, por inferência a partir da equipe — coordenador e demais membros — resolvida no conjunto canônico de pesquisadores. Com base nessa atribuição, o pipeline produz arquivos por campus individual e, adicionalmente, arquivos dedicados do escopo institucional (`todos`) para os mesmos pilares e anos, calculados diretamente sobre o conjunto completo de dados da instituição — nunca por soma sintética de campi parciais.

**Why this priority**: A visão multi-campus é requisito central da feature 004; sem atribuição correta de campus e arquivos dedicados de "todos", o site não consegue apresentar as visões individuais e institucional exigidas.

**Independent Test**: Pode ser testado gerando o pacote e verificando que, para cada campus presente no conjunto canônico de campi e para o escopo `todos`, existem arquivos `pilar{N}_{campus}_{year}.json`, e que uma iniciativa sem campus declarado é atribuída ao campus inferido pela equipe quando possível.

**Acceptance Scenarios**:

1. **Given** uma iniciativa com campus declarado, **When** o pipeline atribui a iniciativa, **Then** ela é contada exclusivamente nesse campus.
2. **Given** uma iniciativa sem campus declarado cujo coordenador (ou, na falta deste, os membros da equipe) está vinculado a um campus no conjunto canônico de pesquisadores, **When** o pipeline resolve a iniciativa, **Then** ela é atribuída ao campus inferido.
3. **Given** os anos-alvo (2024, 2025 e 2026), **When** o pipeline conclui, **Then** existem arquivos `pilar{N}_todos_{year}.json` dedicados para os 3 pilares e os 3 anos, calculados sobre a instituição completa com deduplicação global de pessoas.
4. **Given** uma pessoa participante de projetos em mais de um campus, **When** as contagens de participantes únicos são calculadas, **Then** ela é contada uma vez em cada campus em que atua e exatamente uma vez na agregação institucional.

---

### User Story 4 - Validação Contratual e Empacotamento Confiável (Priority: P2)

Antes de empacotar, o pipeline valida cada arquivo gerado contra o contrato de ingestão da feature 004: nomenclatura estrita `pilar{N}_{campus}_{year}.json`, cabeçalho comum, estrutura de indicadores por pilar e regras semânticas (`null` estrito para ausência, `0` apenas para contagem verificada). Qualquer violação interrompe o processo com erro explícito, impedindo a publicação de um pacote inválido. O empacotamento só ocorre com 100% dos arquivos válidos.

**Why this priority**: O contrato de ingestão é a fronteira entre o pipeline e o site; publicar um pacote fora do contrato quebra silenciosamente a renderização pública, e a validação automática é a barreira de qualidade mais barata.

**Independent Test**: Pode ser testado gerando o pacote e validando cada arquivo interno contra o contrato (nomes, cabeçalho, indicadores e tipos), além de simular uma violação deliberada para confirmar que o pipeline falha sem gerar saída.

**Acceptance Scenarios**:

1. **Given** o pacote gerado, **When** cada arquivo interno é validado contra o contrato de ingestão, **Then** 100% dos arquivos passam na validação de nomenclatura, cabeçalho, indicadores por pilar e regras semânticas.
2. **Given** uma regra do contrato violada durante a geração (ex.: uma métrica ausente serializada como `0`), **When** o pipeline executa, **Then** ele falha com mensagem identificando o arquivo e a violação, sem produzir `indicadores.zip`.
3. **Given** o pacote gerado com sucesso, **When** o site ingere o `indicadores.zip` conforme a feature 004, **Then** nenhum arquivo é rejeitado por desvio de esquema.

---

### User Story 5 - Operação por Comando Único com Testes Abrangentes (Priority: P3)

A regeneração do pacote deve exigir um único comando padrão do projeto (`npm run etl`), executável por qualquer mantenedor sem etapas manuais intermediárias. Todos os cálculos de indicadores, regras de atribuição de campus, regra de atividade por ano e regras de fidelidade de dados são cobertos por testes automatizados unitários e de integração, conforme exigência constitucional de desenvolvimento orientado a testes.

**Why this priority**: Automação sem testes não é confiável (Princípio II da Constituição); a operação por comando único é o que elimina de fato o processamento manual.

**Independent Test**: Pode ser testado executando `npm run etl` do zero em um ambiente limpo e confirmando a geração completa do pacote, além de executar a suíte de testes e verificar cobertura dos cálculos de indicadores e das regras de transformação.

**Acceptance Scenarios**:

1. **Given** um repositório com `exports_canonical.zip` atualizado, **When** o mantenedor executa o comando único `npm run etl`, **Then** o pacote `indicadores.zip` é regenerado integralmente sem qualquer etapa manual intermediária.
2. **Given** a suíte de testes do projeto, **When** ela é executada, **Then** os cálculos de cada indicador, a regra de atividade por ano, a resolução de campus, a agregação "todos" e as regras de fidelidade (`null`/`0`) possuem testes automatizados que falham ante qualquer regressão numérica.

---

### Edge Cases

- **Iniciativa sem campus e sem equipe resolvível**: A iniciativa não é atribuída a nenhum campus individual, mas permanece contabilizada no escopo institucional `todos` (calculado diretamente sobre o conjunto completo), e o pipeline registra aviso listando os identificadores não resolvidos.
- **Datas inválidas ou invertidas** (`start_date` posterior a `end_date`): A iniciativa é tratada como nunca ativa e excluída das contagens, com aviso registrado.
- **Fronteiras de período**: Iniciativa que termina exatamente em 31/12 do ano Y é considerada ativa em Y; iniciativa que inicia exatamente em 01/01 do ano Y também é considerada ativa em Y (regra de interseção com o ano civil).
- **Pessoa participante de múltiplos campi**: Contada uma vez por campus em que participa; na agregação institucional, contada exatamente uma vez (deduplicação global por identificador de pessoa).
- **Registros duplicados na origem**: Registros com o mesmo identificador canônico são deduplicados antes do cálculo, e a duplicidade é registrada como aviso.
- **Produção ou artigo sem autor vinculável a um campus**: Excluído das contagens por campus, permanece no escopo `todos` quando atribuível à instituição, com aviso registrado.
- **Ano-alvo sem nenhum dado**: Os arquivos são gerados normalmente, com métricas de contagem em `0` verificado e métricas dependentes de dados ausentes em `null`.
- **Anos inválidos na origem** (ex.: produções/artigos com ano `0`): registros com ano de referência inválido são excluídos das contagens por ano e registrados como aviso, sem interromper o pipeline.
- **Pacote de entrada ausente ou corrompido**: O pipeline falha imediatamente com mensagem clara, sem alterar nenhum arquivo existente no repositório.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O pipeline DEVE ler o pacote `exports_canonical.zip` da raiz do repositório, exigindo ao menos os conjuntos canônicos de iniciativas, pesquisadores, estudantes, campi, artigos, produções de pesquisa, autores de produções e tipos de produção.
- **FR-002**: O pipeline DEVE gerar, na raiz do repositório, o pacote `indicadores.zip` contendo exclusivamente arquivos JSON nomeados no padrão estrito `pilar{N}_{campus}_{year}.json`, com `N` ∈ {1, 2, 3}.
- **FR-003**: O pipeline DEVE processar os anos de referência 2024, 2025 e 2026.
- **FR-004**: O pipeline DEVE gerar arquivos para cada campus presente no conjunto canônico de campi e para o escopo institucional agregado `todos`, por meio de arquivos dedicados `pilar{N}_todos_{year}.json`.
- **FR-005**: O pipeline DEVE atribuir cada iniciativa a exatamente um campus, usando primeiro o campus declarado na iniciativa e, na sua ausência, inferindo pelo coordenador e demais membros da equipe resolvidos no conjunto canônico de pesquisadores. Artigos e produções de pesquisa seguem a mesma regra: campus declarado no próprio registro primeiro; na ausência, inferido pelos autores vinculados (autores de produção).
- **FR-006**: O pipeline DEVE considerar uma iniciativa ativa no ano Y quando `start_date ≤ 31/12/Y` E (`end_date` ausente OU `end_date ≥ 01/01/Y`).
- **FR-007**: O pipeline DEVE calcular o Pilar 1 (Engajamento Acadêmico e Inclusão): `NTPP` = total de iniciativas ativas do tipo "projeto de pesquisa" no campus/ano; `QSPP` = quantidade de servidores participantes únicos em projetos ativos; `PIES` com `NEP` (estudantes únicos envolvidos em pesquisa) calculado e `NTE`/percentual estritamente `null`; `PICOT` com `NEP` preservado e `NTECPP`/percentual estritamente `null`.
- **FR-008**: O pipeline DEVE calcular o Pilar 2 (Fomento e Conexão com o Ecossistema) com todas as métricas (`TAFPPI`, `OCC`, percentual de `PINV`, `NAPPCT`, total de `PIPDI`) estritamente `null`, por ausência de dados de fomento no export canônico.
- **FR-009**: O pipeline DEVE calcular o Pilar 3 (Produtividade e Propriedade Intelectual): `PIPRO` com `NPB` (produções acadêmicas bibliográficas, a partir dos artigos) e `NPT` (produções técnicas/tecnológicas — todos os tipos de `production_types_canonical.json` — a partir das produções de pesquisa mapeadas por autores de produção), contadas no ano de referência Y pela regra de ano de publicação (`year = Y`), e o total correspondente; `PIPROT` com a categoria `PC` (programas de computador) derivada da contagem de produções do tipo `softwares_sem_patente` (contagem verificada por ano/campus), categorias comprovadamente rastreadas e vazias em `0` verificado (`PA`, `DI`) e categorias não rastreadas em `null`; `PIPROTR` com todas as métricas estritamente `null`.
- **FR-010**: O pipeline DEVE aplicar estritamente a regra de fidelidade (Princípio III): métrica ausente ou não derivável é serializada como `null`; o valor `0` é usado exclusivamente para contagens zero verificadas; nenhuma coerção de `null` para `0` (ou o inverso) é permitida.
- **FR-011**: O pipeline DEVE ser determinístico: a mesma entrada produz exatamente a mesma saída (ordenação estável de registros e chaves e serialização estável), sem dependência de ordem de leitura, horário ou ambiente.
- **FR-012**: O pipeline DEVE validar cada arquivo gerado contra o contrato de ingestão da feature 004 (nomenclatura, cabeçalho comum, estrutura de indicadores por pilar e regras semânticas `null`/`0`) antes do empacotamento, e DEVE falhar com erro explícito identificando arquivo e violação, sem gerar pacote parcial, caso qualquer validação falhe.
- **FR-013**: A regeneração completa do pacote DEVE ser executável por um único comando padrão do projeto (`npm run etl`), executado localmente pelo mantenedor sempre que o export canônico for atualizado; o `indicadores.zip` regenerado DEVE ser versionado no repositório, sem regeneração automática em CI.
- **FR-014**: Os cálculos de indicadores, regras de transformação e regras de fidelidade DEVEM estar cobertos por testes automatizados unitários e de integração escritos antes da implementação, conforme o Princípio II da Constituição.
- **FR-015**: Os arquivos gerados DEVEM conter apenas dados agregados: nenhum nome, CPF, número de matrícula ou dado individual de pessoa pode aparecer nos JSONs de saída (Princípio IV da Constituição).
- **FR-016**: O pipeline DEVE registrar avisos (identificadores não resolvidos, datas inválidas, duplicidades, registros sem campus atribuível) sem interromper a execução, preservando a rastreabilidade das decisões de transformação.

### Key Entities _(include if feature involves data)_

- **Pacote de Exportação Canônica (`exports_canonical.zip`)**: Entrada do pipeline; arquivo na raiz contendo conjuntos JSON canônicos (iniciativas, pesquisadores, estudantes, campi, artigos, produções de pesquisa, autores de produções, tipos de produção, entre outros).
- **Iniciativa**: Projeto ou atividade de pesquisa com datas de início/fim, tipo (ex.: "projeto de pesquisa"), campus declarado (opcional) e equipe (coordenador e membros referenciando pesquisadores).
- **Pesquisador**: Servidor docente/técnico vinculado a um campus, participante de iniciativas e autor de produções; base para inferência de campus e contagem de participantes únicos.
- **Estudante**: Pessoa estudantil participante de iniciativas; base para a contagem `NEP`.
- **Campus**: Unidade acadêmica com identificador em minúsculas usado nos nomes de arquivo (ex.: `serra`); inclui o escopo agregado `todos`.
- **Produção**: Artigo bibliográfico ou produção técnica/tecnológica, vinculada a autores (pesquisadores/estudantes) por meio das relações de autoria; base para `NPB`, `NPT` e `PIPRO`.
- **Registro de Indicador**: Estado calculado de um indicador para um campus e ano: componentes numéricos verificados ou `null`, total quando derivável, e descrição institucional.
- **Pacote de Indicadores (`indicadores.zip`)**: Saída do pipeline; contém os arquivos `pilar{N}_{campus}_{year}.json` conformes ao contrato de ingestão da feature 004.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos arquivos esperados (3 pilares × campi disponíveis + `todos` × 3 anos-alvo) estão presentes no `indicadores.zip` gerado, com nomenclatura estritamente conforme ao contrato.
- **SC-002**: Duas execuções consecutivas sobre a mesma entrada produzem pacotes 100% idênticos (0 diferenças de conteúdo, nome ou serialização).
- **SC-003**: 0 ocorrências de métrica ausente serializada como `0` e 0 ocorrências de contagem zero verificada serializada como `null` em qualquer arquivo gerado.
- **SC-004**: 100% dos arquivos gerados passam na validação contra o contrato de ingestão da feature 004.
- **SC-005**: A regeneração completa do pacote conclui em menos de 5 minutos em uma máquina de desenvolvimento padrão.
- **SC-006**: A regeneração do pacote exige exatamente 1 comando do mantenedor e 0 etapas manuais intermediárias (contra horas de processamento manual assistido por IA hoje).
- **SC-007**: 0 registros de dados individuais (nomes, CPF, matrículas) presentes nos arquivos JSON gerados.
- **SC-008**: 100% dos cálculos de indicadores e regras de transformação cobertos por testes automatizados que detectam regressões numéricas.

## Assumptions

- O export canônico (`exports_canonical.zip`) é produzido e atualizado por processo upstream de canonicalização já existente; o pipeline o consome como entrada imutável, sem modificá-lo.
- As categorias de ativos de PI `PA` (patentes e modelos de utilidade) e `DI` (desenhos industriais) são tratadas como rastreadas e comprovadamente vazias no export atual (recebem `0` verificado), enquanto `RM`, `C`, `TC` e `OGM` não são rastreadas (recebem `null`), seguindo o exemplo do contrato de ingestão da feature 004; a categoria `PC` (programas de computador) é derivada da contagem de produções do tipo `softwares_sem_patente`, conforme clarificação da sessão de 2026-09-23.
- Na agregação institucional `todos`, contagens baseadas em pessoas (ex.: `QSPP`, `NEP`) são calculadas globalmente com deduplicação por identificador de pessoa — nunca pela soma das contagens por campus, que superestimaria pessoas atuantes em mais de um campus.
- Artigos e produções seguem a regra de atribuição esclarecida (campus do próprio registro primeiro; autores vinculados como fallback), com a mesma produção contada uma vez por campus distinto envolvido e exatamente uma vez no escopo `todos`.
- O ano civil é a unidade de análise: a regra de atividade considera a interseção do intervalo `[start_date, end_date]` com o ano de referência.
- Os anos-alvo (2024–2026) são fixos nesta entrega; a configuração de outros períodos pode ser introduzida em iteração futura.
- O uso de Node/TypeScript, do comando `npm run etl` e do Vitest é requisito explícito do solicitante e está alinhado à Constituição do projeto (Astro + TypeScript + Vitest).
- O `indicadores.zip` atualmente presente na raiz (produzido manualmente) será substituído pela saída do pipeline a partir desta entrega.
