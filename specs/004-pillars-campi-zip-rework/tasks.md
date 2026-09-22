# Tasks: Rework do Dashboard com os 3 Pilares CONIF, Multi-Campus e Ingestão Zip

**Input**: Design documents from `/specs/004-pillars-campi-zip-rework/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)  
**Tests**: MANDATÓRIOS conforme Princípio II da Constituição (Desenvolvimento Orientado a Testes - TDD red → green → refactor). Testes em Vitest devem ser escritos antes da implementação correspondente.  
**Organization**: Tarefas agrupadas por histórias de usuário para viabilizar implementação e testes independentes de cada história.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Pode rodar em paralelo (arquivos distintos, sem dependência de tarefas incompletas)
- **[Story]**: Rótulo da história de usuário ([US1], [US2], [US3], [US4], [US5])
- Caminhos absolutos/relativos exatos em todas as descrições

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialização do ambiente e definição de tipos compartilhados dos 3 pilares

- [x] T001 Verificar integridade das dependências e scripts em package.json e vitest.config.ts
- [x] T002 [P] Atualizar definições de tipos e interfaces em src/data/indicadores.ts para suportar os 3 pilares, 9 indicadores e metadados multi-campus conforme data-model.md

---

## Phase 2: Foundational (ZIP Ingestion & Multi-Campus Data Pipeline)

**Purpose**: Pipeline de descompressão e ingestão de `indicadores.zip` que bloqueia todas as histórias

**⚠️ CRITICAL**: A ingestão de dados e contratos de schema devem estar prontos antes das histórias de usuário

- [x] T003 [P] Criar testes unitários para o parser ZIP nativo em tests/zip.test.ts
- [x] T004 Implementar parser ZIP nativo com node:fs e node:zlib em src/lib/zip.ts
- [x] T005 [P] Criar testes unitários para a ingestão e indexação do dataset multi-campus em tests/dataset.test.ts
- [x] T006 Implementar orquestrador de ingestão e carregamento de dados em src/lib/dataset.ts
- [x] T007 [P] Atualizar testes de validação de schemas dos 9 indicadores em tests/data-validation.test.ts

**Checkpoint**: Pipeline de dados pronto e testado — implementação das histórias de usuário pode começar

---

## Phase 3: User Story 1 - Ingestão de Dados Multi-Campus e Contrato Estrito de Fidelidade (Priority: P1) 🎯 MVP

**Goal**: Carregar dados de múltiplos campi e aplicar a regra estrita de fidelidade (nulo = "Dado indisponível", 0 = contagem verificada, "todos" oficial)

**Independent Test**: Carregar `indicadores.zip` contendo campi individuais e dados consolidados, validando que valores não coletados viram "Dado indisponível" e zero permanece numérico "0"

### Tests for User Story 1 (MANDATORY per constitution Principle II) ⚠️

- [x] T008 [P] [US1] Criar testes para formatação de valores nulos e contagens zero verificadas em tests/formatters.test.ts
- [x] T009 [P] [US1] Criar testes para seleção de indicadores por campus e fallback de campus "todos" em tests/selectors.test.ts

### Implementation for User Story 1

- [x] T010 [US1] Atualizar funções de formatação estrita em src/lib/formatters.ts
- [x] T011 [US1] Implementar seletores de indicadores com suporte a campus e pilar em src/lib/selectors.ts
- [x] T012 [P] [US1] Atualizar componente de discriminação de variáveis e tipos em src/components/ComponentCount.astro para indicadores compostos (PIPROT, PIPRO, PIES, PICOT, PINV)

**Checkpoint**: Contrato estrito de fidelidade e modelo multi-campus funcionando de forma independente

---

## Phase 4: User Story 2 - Navegação e Visão Geral dos 3 Pilares CONIF (Priority: P1)

**Goal**: Disponibilizar rotas ativas na Home (`/`), páginas de pilar (`/pilar-1/`, `/pilar-2/`, `/pilar-3/`) e páginas de detalhe dos 9 indicadores

**Independent Test**: Navegar por todas as rotas de pilares e indicadores comprovando que todos os 3 pilares e 9 indicadores estão plenamente funcionais sem selo "em breve"

### Tests for User Story 2 (MANDATORY per constitution Principle II) ⚠️

- [x] T013 [P] [US2] Criar testes para validar rotas ativas dos 3 pilares e dos 9 indicadores em tests/routes.test.ts
- [x] T014 [P] [US2] Atualizar testes do cartão de pilar em tests/cartaoPilar.test.ts para validar ativação dos 3 pilares

### Implementation for User Story 2

- [x] T015 [US2] Atualizar CartaoPilar.astro para ativar os 3 pilares CONIF sem selo "em breve" em src/components/CartaoPilar.astro
- [x] T016 [US2] Atualizar a Home em src/pages/index.astro para apresentar os 3 pilares ativos integrados ao dataset
- [x] T017 [P] [US2] Atualizar rotas do Pilar 1 em src/pages/pilar-1/index.astro e src/pages/pilar-1/[sigla].astro
- [x] T018 [P] [US2] Criar páginas do Pilar 2 em src/pages/pilar-2/index.astro e src/pages/pilar-2/[sigla].astro
- [x] T019 [P] [US2] Criar páginas do Pilar 3 em src/pages/pilar-3/index.astro e src/pages/pilar-3/[sigla].astro
- [x] T020 [US2] Atualizar IndicatorCard.astro para renderizar métricas dos 3 pilares com escopo de campus em src/components/IndicatorCard.astro

**Checkpoint**: Todos os 3 pilares e 9 indicadores navegáveis e integrados ao dataset

---

## Phase 5: User Story 3 - Sincronização de Campus e Ano na URL (Priority: P2)

**Goal**: Sincronizar parâmetros de busca na URL (`?campus=serra&ano=2026`), com suporte a histórico do navegador e propagação em links internos

**Independent Test**: Manipular seletores de campus e ano, verificar atualização imediata da URL, testar botões voltar/avançar e verificar preservação de contexto ao navegar

### Tests for User Story 3 (MANDATORY per constitution Principle II) ⚠️

- [x] T021 [P] [US3] Criar testes para parsing de campus/ano e geração de query params em tests/ano.test.ts

### Implementation for User Story 3

- [x] T022 [US3] Atualizar utilitários de resolução de filtros e URLs em src/lib/ano.ts
- [x] T023 [US3] Criar script de sincronização de URL e histórico do navegador em src/lib/urlSync.ts
- [x] T024 [US3] Atualizar componente de controle de seleção de Campus e Ano em src/components/YearLinks.astro
- [x] T025 [US3] Atualizar BaseLayout.astro para incluir listener de histórico e propagação de query params em links em src/layouts/BaseLayout.astro

**Checkpoint**: Seleção de campus e ano totalmente sincronizada com a URL e histórica

---

## Phase 6: User Story 4 - Visualização em Gráficos com Rótulos Visíveis e Tooltips Contextuais (Priority: P2)

**Goal**: Aprimorar gráficos SVG com rótulos numéricos diretamente visíveis nos pontos, eixos legíveis e tooltips contextuais nas interações

**Independent Test**: Inspecionar gráficos SVG em tela para verificar números impressos nos pontos, eixos claros e tooltips informativos

### Tests for User Story 4 (MANDATORY per constitution Principle II) ⚠️

- [x] T026 [P] [US4] Criar testes para cálculo de coordenadas de rótulos de dados e eixos em tests/chart.test.ts

### Implementation for User Story 4

- [x] T027 [US4] Atualizar helpers de cálculo de pontos, rótulos e eixos SVG em src/lib/chart.ts
- [x] T028 [US4] Atualizar componente de gráfico SVG em src/components/SeriesChart.astro com rótulos visíveis, eixos e tooltips acessíveis
- [x] T029 [US4] Atualizar apresentação de séries temporais em src/components/HistoricalSeries.astro

**Checkpoint**: Gráficos com rótulos numéricos visíveis nos pontos e tooltips operacionais

---

## Phase 7: User Story 5 - Limpeza de Interface e Remoção de Elementos Descontinuados (Priority: P3)

**Goal**: Excluir botões de exportação CSV/JSON, rotas de dados, campo "Fonte dos dados" e garantir ausência de scripts externos

**Independent Test**: Varredura em todas as telas e templates confirmando ausência total de botões de download e campo "Fonte dos dados"

### Tests for User Story 5 (MANDATORY per constitution Principle II) ⚠️

- [x] T030 [P] [US5] Criar teste de auditoria garantindo ausência de CSV/JSON e "Fonte dos dados" em tests/removals.test.ts

### Implementation for User Story 5

- [x] T031 [P] [US5] Excluir endpoints estáticos de exportação src/pages/pilar-1/[sigla]/dados.csv.ts e src/pages/pilar-1/[sigla]/dados.json.ts
- [x] T032 [P] [US5] Excluir componente de exportação src/components/ExportLinks.astro e módulo src/lib/exportacao.ts
- [x] T033 [US5] Remover arquivo de testes descontinuado tests/exportacao.test.ts
- [x] T034 [US5] Remover campo "Fonte dos dados" de todos os cartões e templates em src/components/IndicatorCard.astro e páginas de detalhe
- [x] T035 [US5] Verificar ausência de referências ao script do plugin UserWay em src/layouts/BaseLayout.astro

**Checkpoint**: Interface limpa e enxuta sem elementos legados descontinuados

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificação global de qualidade, compilação estática e validação ponta a ponta

- [x] T036 [P] Executar suíte completa de testes via npm test garantindo aprovação de 100% dos testes
- [x] T037 [P] Executar checagem de formatação e linter via npm run lint e npm run format:check
- [x] T038 Executar build de produção via npm run build validando geração estática em dist/
- [x] T039 Executar validação ponta a ponta seguindo o checklist manual de quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — execução imediata.
- **Foundational (Phase 2)**: Depende da Fase 1 — BLOQUEIA todas as histórias de usuário.
- **User Story 1 (Phase 3)**: Depende da Fase 2 (Foundational) — MVP!
- **User Story 2 (Phase 4)**: Depende da Fase 3 (US1) para os dados dos 3 pilares.
- **User Story 3 (Phase 5)**: Depende da Fase 4 (US2) para vincular parâmetros aos links e rotas.
- **User Story 4 (Phase 6)**: Depende da Fase 3 (US1) para dados e formatação.
- **User Story 5 (Phase 7)**: Pode rodar em paralelo com as histórias de visualização.
- **Polish (Phase 8)**: Depende da conclusão de todas as histórias.

### Parallel Opportunities

- **Fase 1**: T001 e T002 podem rodar em paralelo.
- **Fase 2**: T003, T005 e T007 podem rodar em paralelo (testes independentes).
- **Fase 3**: T008 e T009 podem rodar em paralelo; T012 em paralelo com seletores.
- **Fase 4**: T013 e T014 em paralelo; páginas de pilares T017, T018 e T019 em paralelo.
- **Fase 7**: T030, T031 e T032 podem ser executadas em paralelo.
- **Fase 8**: T036 e T037 em paralelo.

---

## Parallel Example: User Story 2 (Páginas dos Pilares)

```bash
# Implementação paralela das páginas dos 3 pilares:
Task: "Atualizar rotas do Pilar 1 em src/pages/pilar-1/index.astro e src/pages/pilar-1/[sigla].astro"
Task: "Criar páginas do Pilar 2 em src/pages/pilar-2/index.astro e src/pages/pilar-2/[sigla].astro"
Task: "Criar páginas do Pilar 3 em src/pages/pilar-3/index.astro e src/pages/pilar-3/[sigla].astro"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluir Fase 1: Setup
2. Concluir Fase 2: Foundational (Parser ZIP e Ingestão)
3. Concluir Fase 3: User Story 1 (Fidelidade de dados, nulo vs 0, multi-campus)
4. **PARAR e VALIDAR**: Testar ingestão de dados e regras de fidelidade de forma isolada com `npm test`
5. MVP pronto para validação de dados!

### Incremental Delivery

1. Adicionar User Story 2 → Navegação completa pelos 3 pilares e 9 indicadores.
2. Adicionar User Story 3 → Sincronização e histórico na URL (`?campus=...&ano=...`).
3. Adicionar User Story 4 → Gráficos com rótulos numéricos visíveis nos pontos e tooltips.
4. Adicionar User Story 5 → Limpeza dos botões de download e campo de fonte.
5. Fase Final de Polish → Validação de build e quickstart.
