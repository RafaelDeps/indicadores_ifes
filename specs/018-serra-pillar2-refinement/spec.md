# Feature Specification: Refinamento do Pilar 2 e Consolidação Exclusiva do Campus Serra

**Feature Branch**: `018-serra-pillar2-refinement`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Refinar as regras do Pilar 2 e consolidar o portal exclusivamente para o Campus Serra: 1. Desativação do escopo 'todos' na interface web, tornando o Campus Serra a única visão ativa; 2. Projeção da vigência de projetos plurianuais no PIPDI utilizando 'duracao_meses' quando 'data_fim' for nula; 3. Consolidação do TAFPPI de 2025 mantendo a soma das propostas FINEP PRÓ-INFRA e Centros Temáticos (PJ 8503 e PJ 8504, totalizando R$ 25M); 4. Preservação do PINV via 'pinv_serra.json' com OCC nulo; 5. Manutenção da regra de NTPP por liderança/coordenação e integridade do Pilar 3; 6. Garantia de testes 100% green e validação via make check-dados."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Interface Web Exclusiva para o Campus Serra (Priority: P1)

Como visitante da plataforma de indicadores de pesquisa, desejo visualizar e navegar unicamente pelos dados do Campus Serra, com o escopo "Todos os Campi" desativado no seletor, para que eu tenha uma experiência clara, focada e sem ambiguidade territorial ou vazamento de indicadores de outros campi.

**Why this priority**: Evita que usuários acessem por padrão uma visão institucional agregada incompleta ou inconsistente para o público local, garantindo que o portal seja uma vitrine dedicada e segura do Campus Serra.

**Independent Test**: Carregar a página inicial e as páginas de pilares sem parâmetros de URL ou com parâmetros inválidos; verificar que a opção "(Todos)" está desativada no seletor de campus e que os dados exibidos são estritamente os do Campus Serra.

**Acceptance Scenarios**:

1. **Given** que o usuário acessa a página inicial sem parâmetros de query na URL, **When** a página é renderizada, **Then** o campus selecionado e exibido é automaticamente o "Campus Serra", e o seletor de campus apresenta a opção "(Todos)" como desativada (`disabled`).
2. **Given** que o usuário tenta alterar o seletor de campus, **When** interage com o dropdown no cabeçalho ou menu móvel, **Then** a opção "(Todos)" não pode ser selecionada, permanecendo o Campus Serra como a única opção ativa.
3. **Given** que o usuário acessa uma URL antiga contendo `?campus=todos`, **When** a página é carregada e sincronizada, **Then** o sistema ajusta a visualização para o Campus Serra e atualiza a URL correspondente.

---

### User Story 2 - Projeção da Vigência de Projetos Plurianuais no PIPDI (Priority: P1)

Como gestor de pesquisa e analista institucional, desejo que os projetos plurianuais que possuem duração informada em meses, mas que não tiveram a data final registrada no documento, continuem sendo contabilizados como parcerias vigentes nos anos subsequentes do seu ciclo, para que o indicador PIPDI reflita com fidelidade os acordos de fomento em andamento.

**Why this priority**: Elimina a subnotificação do PIPDI nos anos de 2025 e 2026 decorrente do truncamento prematuro de projetos de 24 a 60 meses cujo campo de data de encerramento estava ausente na extração do PDF.

**Independent Test**: Executar a extração do SIGPESQ sobre projetos que tenham data de início e duração em meses (mas sem data final); verificar que o ano final é calculado projetando a duração em meses a partir do ano/mês de início e que o projeto pontua no PIPDI em todos os anos em que estiver em execução.

**Acceptance Scenarios**:

1. **Given** um projeto SIGPESQ com início em 01/01/2025, data final ausente (`null`) e duração de 36 meses (`duracao_meses: 36`), **When** o pipeline extrai e resolve a vigência do projeto, **Then** o ano final é determinado como 2028 e o projeto é contabilizado como vigente no PIPDI em 2025, 2026 e 2027.
2. **Given** um projeto SIGPESQ sem data final e sem duração em meses declarada, **When** o pipeline resolve o ano de encerramento, **Then** o sistema adota como salvaguarda o próprio ano de início (`ano_fim = ano_inicio`).

---

### User Story 3 - Consolidação Orçamentária do TAFPPI e PINV do Campus Serra (Priority: P2)

Como cidadão ou órgão fiscalizador, desejo consultar o total de fomento captado (TAFPPI) e o percentual de investimento (PINV) do Campus Serra com rastreabilidade formal e fidelidade aos editais cadastrados no SIGPESQ e FACTO.

**Why this priority**: Garante consistência matemática entre os projetos de grande porte aprovados (como o NOVA-IA) e os indicadores publicados no portal, preservando o Princípio III (fidelidade aos dados sem estimativas artificiais).

**Independent Test**: Executar o cálculo do Pilar 2 e verificar que o TAFPPI de 2025 totaliza R$ 25.954.326,84 (incluindo as duas propostas FINEP de R$ 10M e R$ 15M) e que o PINV reproduz com exatidão os percentuais oficiais do arquivo do campus com o campo OCC nulo.

**Acceptance Scenarios**:

1. **Given** os projetos `PJ 8503` (MCTI/FINEP PRÓ-INFRA 2024, R$ 10.000.000,00) e `PJ 8504` (MCTI/FINEP Centros Temáticos 2024, R$ 15.000.000,00) iniciados em 2025 no Campus Serra, **When** o cálculo do TAFPPI de 2025 é executado, **Then** ambos os projetos são somados no aporte de fomento, totalizando R$ 25.000.000,00 de fomento federal nessa linha.
2. **Given** a inexistência de fonte de dados sobre o Orçamento de Capital e Custeio (OCC) nos sistemas ingeridos, **When** o Pilar 2 é gerado para o Campus Serra, **Then** o valor de `OCC_valor_orcamento_total_capital_custeio` é mantido estritamente como nulo (`null`), e o campo `percentual_calculado_PINV` é populado a partir de `pinv_serra.json`.

---

### User Story 4 - Integridade dos Pilares 1 e 3 e Manutenção do Pacote Canônico (Priority: P3)

Como mantenedor técnico do sistema, desejo que a lógica dos Pilares 1 e 3 e a integridade de empacotamento dos artefatos canônicos sejam preservadas, de forma que o pipeline continue passando em todos os testes unitários e de integração sem quebras de contrato.

**Why this priority**: Garante que o foco no Campus Serra não quebre a compatibilidade com comandos de validação automatizada (`make check-dados`, `pytest` e `npm test`).

**Independent Test**: Executar `pytest tests/etl`, `npm run test:web` e `make check-dados`, verificando que todos os 244 testes do ETL e 212 testes web permanecem verdes.

**Acceptance Scenarios**:

1. **Given** um projeto de pesquisa com múltiplos participantes institucionais cuja coordenação geral pertence a outro campus (ex.: IntegraCAR coordenado por docente do Campus Vitória), **When** o NTPP do Campus Serra é calculado, **Then** o projeto não pontua no NTPP de Serra, garantindo a regra de liderança institucional.
2. **Given** os dados de produções intelectuais da base canônica, **When** o Pilar 3 é calculado para o Campus Serra, **Then** os registros de software pontuam em `PC`, patentes e modelos de utilidade permanecem como `0` e o total de ativos transferidos permanece como `null`.
3. **Given** a geração do arquivo de distribuição `indicadores.zip`, **When** o pipeline do ETL conclui sua execução, **Then** os artefatos de todos os campi continuam sendo empacotados em background para manter a conformidade dos contratos de dados e testes legados.

---

### Edge Cases

- **Projetos com duração em meses que não é múltiplo de 12**: A projeção do ano final deve converter os meses para anos somando `ceil(duracao_meses / 12) - 1` ou calculando a data de término a partir do mês/ano de início.
- **Projetos com string de data mal formatada no SIGPESQ** (ex.: `"2023-MM-DD"`): O parser de data deve extrair com segurança o ano base (2023) via expressão regular e ignorar os marcadores de máscara pendentes.
- **Navegação do usuário por link direto com parâmetro de campus inexistente ou desativado**: O cliente web deve normalizar imediatamente o estado do filtro para `campus=serra`.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema web DEVE desativar a opção `(Todos)` (`slug: 'todos'`) nos seletores de campus da interface (`filtro-campus-topo` e `filtro-campus-drawer`), impedindo que o usuário selecione a visão consolidada.
- **FR-002**: O sistema web DEVE adotar o `Campus Serra` (`slug: 'serra'`) como valor padrão inicial de visualização e navegação em todas as páginas e rotas caso nenhum parâmetro seja informado ou caso um parâmetro desativado/inválido seja recebido.
- **FR-003**: O extrator de dados do SIGPESQ DEVE projetar o `ano_fim` dos projetos de pesquisa que não possuam data de encerramento explícita (`datas.fim == None`), somando a `duracao_meses` à data/ano de início do projeto.
- **FR-004**: O calculador do indicador PIPDI DEVE considerar o projeto como vigente em todos os anos de referência contidos no intervalo entre `ano_inicio` e `ano_fim` projetado.
- **FR-005**: O cálculo do TAFPPI para o ano de 2025 no Campus Serra DEVE somar integralmente os valores dos projetos `PJ 8503` (R$ 10.000.000,00) e `PJ 8504` (R$ 15.000.000,00), totalizando R$ 25.000.000,00 referentes ao complexo NOVA-IA da FINEP.
- **FR-006**: O cálculo do PINV para o Campus Serra DEVE manter a ingestão dos percentuais oficiais do arquivo `data/pinv_serra.json`, preservando o campo `OCC_valor_orcamento_total_capital_custeio` como `null` em estrita observância ao Princípio III.
- **FR-007**: O calculador do NTPP DEVE manter a atribuição de projetos ao campus segundo a regra de coordenação/liderança, não pontuando no NTPP de Serra projetos coordenados por outros campi mesmo havendo servidores de Serra como colaboradores.
- **FR-008**: O calculador do Pilar 3 DEVE manter a contabilização fiel dos softwares registrados (`PC`), manter a contagem de patentes (`PA`) e desenhos industriais (`DI`) como 0 (ausentes do catálogo canônico) e manter ativos transferidos (`PIPROTR`) como nulo (`null`).
- **FR-009**: O pipeline do ETL DEVE manter a geração em background dos arquivos de todos os campi dentro de `data/dist/indicadores.zip` para garantir conformidade estrita com o contrato validado pelo comando `make check-dados`.
- **FR-010**: A suíte de testes unitários e de integração DEVE permanecer 100% aprovada tanto no runner Python (`pytest tests/etl`) quanto no runner web (`npm run test:web`).

### Key Entities

- **Projeto de Pesquisa com Financiamento (SIGPESQ)**: Representa uma iniciativa com apoio financeiro externo; possui código (ex.: PJ 8503), título, campus de execução, data/ano de início, data/ano de encerramento projetado, valor total e fontes de financiamento.
- **Acordo de Parceria Vigente (PIPDI)**: Representa um convênio ou acordo de PDeI formalmente ativo durante um ano de referência, com vigência estendida baseada na sua duração temporal declarada.
- **Contexto de Visualização Territorial**: Representa o escopo ativo selecionado na interface do usuário, fixado exclusivamente no Campus Serra para fins de exibição pública.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos acessos ao portal público sem parâmetros ou com parâmetros de outros campi exibem diretamente a visão do Campus Serra.
- **SC-002**: A opção "(Todos)" permanece inacessível e não-selecionável em 100% dos testes de interação nos seletores de campus (desktop e mobile).
- **SC-003**: 100% dos projetos plurianuais de fomento do SIGPESQ com duração em meses preenchida são contabilizados no PIPDI em todos os anos de sua vigência projetada.
- **SC-004**: O valor do TAFPPI de 2025 do Campus Serra reflete exatamente R$ 25.954.326,84, com rastreabilidade integral a todas as fontes oficiais cadastradas.
- **SC-005**: 100% dos testes automatizados (`pytest` e `vitest`) e comandos de verificação de dados (`make check-dados`) são executados com sucesso e sem avisos de regressão.

## Assumptions

- A decisão de unificar o portal exclusivamente no Campus Serra é uma definição de escopo de entrega atual, mantendo a arquitetura pronta para futura reativação dos demais campi caso novos dados sejam adicionados.
- Os 32 projetos do SIGPESQ que possuem `datas.duracao_meses` representam execuções contínuas durante o número de meses declarado na proposta técnica original.
- A presença das propostas `PJ 8503` e `PJ 8504` no SIGPESQ com datas ativas em 2025 reflete a captação combinada de infraestrutura e de centro temático junto aos editais FINEP 2024.
