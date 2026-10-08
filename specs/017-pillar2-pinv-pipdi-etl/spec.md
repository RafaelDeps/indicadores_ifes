# Feature Specification: Integração do Cálculo Completo do Pilar 2 (PINV e PIPDI) no ETL

**Feature Branch**: `017-pillar2-pinv-pipdi-etl`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "Integrar o cálculo completo do Pilar 2 (PINV e PIPDI) no ETL: 1. Ingestão de PINV por Campus: ler os arquivos 'data/pinv_<campus>.json' (ex.: data/pinv_serra.json) para preencher o indicador PINV com 'percentual_calculado_PINV' por ano e campus. 2. Ingestão de Fomento e Parcerias SIGPESQ: ler os dados de financiamento de 'project_sigpesq_files_json/' no pacote canônico ('data/canonical/exports_canonical.zip') correlacionando quem pagou (agências CNPq/FAPES/FINEP e empresas parceiras privadas) para alimentar: (a) 'TAFPPI_valor_total_aporte_pesquisa' no PINV com os valores em R$ dos projetos iniciados no ano; (b) 'NAPPCT_acordos_parceria_firmados' e 'total_acumulado_PIPDI' no PIPDI considerando projetos vigentes no ano com financiamento/parceiro externo. 3. Adaptação do Pipeline: atualizar os calculadores em 'etl/core/logic/calculators/pillar2.py', o 'aggregator.py', os schemas em 'pilar2-schema.json' e os sinks; 4. Garantir testes unitários em pytest, fidelidade ao Princípio III e validação via 'make check-dados'."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ingestão do Percentual Calculado de PINV por Campus (Priority: P1)

Como gestor, pesquisador ou cidadão navegando no painel de indicadores, quero visualizar o percentual efetivo de investimento em pesquisa e inovação (`PINV`) por campus e ano de referência, para que a proporção de investimento seja reportada com base nas apurações orçamentárias institucionais consolidadas.

**Why this priority**: O indicador PINV vinha sendo exibido estritamente como "Dado indisponível" devido à ausência da despesa orçamentária geral na base de projetos. Permitir a ingestão do arquivo desacoplado por campus (`pinv_<campus>.json`) viabiliza a publicação do percentual sem violar o Princípio III (Fidelidade aos Dados).

**Independent Test**: Pode ser testado de forma isolada fornecendo um arquivo `data/pinv_serra.json` contendo os percentuais de 2024 (496,78%), 2025 (1.111,35%) e 2026 (610,63%), executando o ETL e conferindo que os arquivos `pilar2_serra_<ano>.json` serializam `percentual_calculado_PINV` com esses valores numéricos exatos, enquanto outros campi sem arquivo mantêm `null`.

**Acceptance Scenarios**:

1. **Given** a existência do arquivo `data/pinv_serra.json` com os percentuais anuais, **When** o pipeline de ETL processa o campus Serra, **Then** `percentual_calculado_PINV` é preenchido com o valor numérico (float com duas casas decimais ou arredondado conforme convenção do contrato) para 2024, 2025 e 2026.
2. **Given** um campus que não possui arquivo `pinv_<campus>.json` correspondente, **When** o pipeline de ETL compila seus indicadores, **Then** `percentual_calculado_PINV` permanece estritamente `null` ("Dado indisponível"), sem substituição por zero ou estimativa arbitrária.
3. **Given** a consolidação institucional ("todos"), **When** os arquivos de campus são carregados, **Then** o escopo `todos` consolida os valores institucionais se disponíveis ou mantém `null` se não houver arquivo para o escopo global.

---

### User Story 2 - Ingestão de Aporte Financeiro em Pesquisa SIGPESQ (TAFPPI em PINV) (Priority: P1)

Como pesquisador, auditor ou coordenador institucional, quero que o montante total de recursos captados/aportados em projetos de pesquisa (`TAFPPI_valor_total_aporte_pesquisa`) seja extraído diretamente dos dados de financiamento dos projetos do SIGPESQ, refletindo os valores reais captados junto a agências de fomento e parceiros privados em cada ano.

**Why this priority**: O TAFPPI é o numerador em reais do PINV. Atualmente, os projetos acadêmicos e seus financiamentos estão documentados nos arquivos detalhados do SIGPESQ (`project_sigpesq_files_json/`); consolidar esses valores em R$ permite apresentar com precisão o volume financeiro atraído para a pesquisa no IFES.

**Independent Test**: Pode ser testado processando os arquivos `project_sigpesq_files_json/` do pacote `exports_canonical.zip` e verificando que a soma dos projetos iniciados em 2024, 2025 e 2026 bate exatamente com os valores totais identificados (ex.: R$ 12.067.095,28 em 2024, R$ 28.270.178,52 em 2025 e R$ 17.842.650,00 em 2026 para Serra).

**Acceptance Scenarios**:

1. **Given** projetos do SIGPESQ com campos de financiamento (`valor_total` ou soma dos itens em `fontes`), **When** o indicador PINV é compilado para um campus e ano, **Then** `TAFPPI_valor_total_aporte_pesquisa` registra a soma dos valores aprovados dos projetos cujo ano de início coincide com o ano de referência.
2. **Given** um projeto com valor monetário e fontes discriminadas (ex.: FAPES, CNPq, FINEP, ArcelorMittal, Samarco), **When** o TAFPPI é calculado, **Then** o montante financeiro total do projeto é atribuído integralmente ao campus executor no seu ano de início.
3. **Given** um ano de referência sem novos projetos com aporte financeiro para determinado campus, **When** o cálculo é executado, **Then** TAFPPI avalia para `null` (ou `0.0` se configurado como contagem auditada).

---

### User Story 3 - Ingestão de Acordos de Parceria para PDeI (PIPDI / NAPPCT) do SIGPESQ (Priority: P2)

Como gestor de inovação ou comunidade externa, quero que a quantidade de acordos de parceria vigentes (`PIPDI` / `NAPPCT`) incorpore os projetos de pesquisa do SIGPESQ que possuem cooperação formal com entidades externas (empresas privadas ou agências governamentais/fomento), para que o ecossistema de inovação institucional seja retratado com fidelidade.

**Why this priority**: Projetos com empresas (ex.: ArcelorMittal, Samarco, Mogai, Intelliway) e com agências externas com contrapartida configuram parcerias formais de PDeI. Incorporar essas parcerias do SIGPESQ expande a cobertura do indicador para além das parcerias registradas exclusivamente na fundação de apoio.

**Independent Test**: Pode ser testado avaliando os projetos do SIGPESQ vigentes em cada ano de referência (ano_inicio <= ano <= ano_fim) que possuem fontes de financiamento externas não-voluntárias, conferindo o incremento no contador `NAPPCT_acordos_parceria_firmados` e `total_acumulado_PIPDI`.

**Acceptance Scenarios**:

1. **Given** um projeto do SIGPESQ com vigência ativa no ano de referência que possui fonte externa de financiamento (empresa privada ou agência de fomento externa), **When** o indicador PIPDI é compilado, **Then** o projeto é contabilizado como acordo de parceria ativo (`NAPPCT_acordos_parceria_firmados` incrementado).
2. **Given** um projeto categorizado como voluntário sem financiamento institucional ou externo, **When** o PIPDI é avaliado, **Then** o projeto não pontua como acordo de parceria externa.
3. **Given** a integração com os projetos da FACTO, **When** o PIPDI é gerado, **Then** as fontes (FACTO e SIGPESQ) são consolidadas sem duplicidade de acordos vinculados ao mesmo projeto.

---

### User Story 4 - Validação de Contrato e Conformidade CONIF (Priority: P3)

Como mantenedor do pipeline, quero que os esquemas de validação (`pilar2-schema.json`), o validador `check_dados.py` e os testes unitários em pytest aceitem os novos campos numéricos de PINV e PIPDI, garantindo que o pacote público de distribuição permaneça estável, sem dados pessoais (LGPD) e compatível com o frontend Astro.

**Why this priority**: A credibilidade e a estabilidade da automação de CI/CD exigem que novos valores numéricos passem pelas portas de governança sem quebrar contratos estabelecidos.

**Independent Test**: Executar `make check-dados` e `pytest tests/etl/` garantindo 100% de aprovação e integridade estrutural em `data/dist/indicadores.zip`.

**Acceptance Scenarios**:

1. **Given** a execução do pipeline de ETL, **When** o sink serializa `pilar2_<campus>_<ano>.json`, **Then** a estrutura JSON obedece ao esquema CONIF com tipos numéricos válidos (`float` ou `int`) ou `null`.
2. **Given** a execução de `make check-dados`, **When** inspeciona o pacote gerado, **Then** nenhum erro de contrato é emitido para os campos de Pilar 2.

---

### Edge Cases

- **Arquivo `pinv_<campus>.json` inexistente ou malformado**: Se o arquivo não existir para o campus, o ETL emite aviso informativo e mantém `percentual_calculado_PINV` como `null`. Se o JSON estiver corrompido, emite erro descritivo.
- **Projetos plurianuais com vigência indeterminada**: Projetos sem data de término explícita utilizam a data de encerramento prevista ou o ano de início como fallback para evitar parcerias ativas em anos não documentados.
- **Projetos com `valor_total` ausente mas lista de `fontes` preenchida**: O sistema soma os valores das fontes individuais para compor o aporte total.
- **Projetos voluntários**: Registros com fonte "Voluntariado" ou "Sem financiamento" são contabilizados com aporte R$ 0,00 e não entram na contagem de parcerias com entidades externas.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE ler arquivos de percentual PINV por campus sob o padrão `data/pinv_<campus>.json` (ou `data/raw/pilar2/pinv_<campus>.json`).
- **FR-002**: O sistema DEVE preencher o campo `percentual_calculado_PINV` com o percentual anual correspondente para os campi que possuem o arquivo de entrada.
- **FR-003**: O sistema DEVE extrair os dados de financiamento contidos em `project_sigpesq_files_json/` do pacote canônico `exports_canonical.zip`.
- **FR-004**: O sistema DEVE calcular `TAFPPI_valor_total_aporte_pesquisa` somando os valores em R$ (`valor_total` ou soma de `fontes`) dos projetos iniciados no ano de referência (`ano_inicio == ano`).
- **FR-005**: O sistema DEVE identificar como parcerias elegíveis para o **PIPDI** (`NAPPCT_acordos_parceria_firmados` e `total_acumulado_PIPDI`) os projetos ativos no ano que possuam fontes de financiamento externas (empresas privadas, fundações ou agências de fomento como CNPq, FAPES, FINEP, etc.).
- **FR-006**: O sistema DEVE atribuir os projetos aos campi correspondentes (ex.: Serra) e consolidar os totais no escopo global institucional `todos`.
- **FR-007**: Em conformidade com o Princípio III, o campo `OCC_valor_orcamento_total_capital_custeio` DEVE permanecer estritamente `null` quando não houver fonte orçamentária oficial detalhando o orçamento de custeio/capital.
- **FR-008**: O sistema DEVE atualizar os esquemas de validação do Pilar 2 (`pilar2-schema.json`), os adaptadores de sink e os calculadores de domínio em `etl/core/logic/calculators/pillar2.py`.
- **FR-009**: O sistema DEVE garantir que nenhum dado pessoal (nomes de bolsistas, CPF ou dados sensíveis) seja exportado para o pacote público de distribuição (Princípio IV / LGPD).
- **FR-010**: A suíte de testes automatizados com `pytest` DEVE cobrir todos os cálculos de PINV e PIPDI antes da finalização da feature (Princípio II).

### Key Entities

- **DadosPinvCampus**: Entidade contendo o mapeamento de percentuais anuais de PINV por campus (ano -> percentual).
- **FinanciamentoProjeto**: Informações de aporte financeiro do projeto SIGPESQ, contendo valor total, moeda e fontes detalhadas (fonte, valor, tipo).
- **AgregadosPilar2**: Estrutura de métricas agregadas do Pilar 2 contendo `tafppi_valor_total_aporte_pesquisa`, `occ_valor_orcamento_total_capital_custeio`, `percentual_calculado_pinv`, `nappct_acordos_parceria_firmados` e `total_acumulado_pipdi`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O arquivo `pilar2_serra_<ano>.json` serializa `percentual_calculado_PINV` com os percentuais definidos para 2024 (496.78), 2025 (1111.35) e 2026 (610.63).
- **SC-002**: `TAFPPI_valor_total_aporte_pesquisa` reporta a soma monetária exata em reais dos novos projetos iniciados no ano para o campus Serra e para o escopo consolidado `todos`.
- **SC-003**: `NAPPCT_acordos_parceria_firmados` e `total_acumulado_PIPDI` reportam números inteiros não-negativos refletindo as parcerias ativas com entes externos em cada ano.
- **SC-004**: O comando `make check-dados` valida 100% dos arquivos do pacote `data/dist/indicadores.zip` sem violações de contrato CONIF.
- **SC-005**: 100% dos testes do pipeline ETL executados via `make test-etl` passam com sucesso.

## Assumptions

- O arquivo `data/pinv_serra.json` é a fonte autoritativa primária para os percentuais de PINV do campus Serra enquanto a integração orçamentária geral (OCC) não for disponibilizada via sistema corporativo.
- Projetos com agências de fomento (CNPq, FAPES, FINEP) e empresas privadas representam parcerias formais válidas para o ecossistema de PDeI (PIPDI).
- O ano de início (`Data de início` do projeto) é a data de corte para a alocação de novos aportes financeiros captados (`TAFPPI`).
