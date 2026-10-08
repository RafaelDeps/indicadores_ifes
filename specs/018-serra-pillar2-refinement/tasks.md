# Tasks: Refinamento do Pilar 2 e Consolidação Exclusiva do Campus Serra

**Input**: Design documents from `/specs/018-serra-pillar2-refinement/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/pilar2-contract.md`, `quickstart.md`  
**Tests**: Tests are MANDATORY for this project (constitution Principle II, Test-First Development). Tests MUST be written BEFORE implementation and observed to fail first.  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup & Environment

**Purpose**: Verificação e estruturação inicial dos ambientes de teste e execução

- [x] T001 Verificar integridade dos ambientes de execução Python em `.venv/` e Node.js em `node_modules/`
- [x] T002 [P] Configurar fixtures de projetos SIGPESQ com datas nulas e durações plurianuais em `tests/etl/fixtures/sigpesq_samples.py`

---

## Phase 2: Foundational (Infraestrutura Compartilhada)

**Purpose**: Modelagem e infraestrutura de dados requeridas por múltiplas histórias

- [x] T003 [P] Atualizar modelo de domínio `ProjetoSigpesqFinanciamento` em `etl/core/logic/models/pillar2_models.py` para suportar `ano_fim` projetado e vigência plurianual
- [x] T004 [P] Implementar utilitário de cálculo de ano final projetado a partir de data inicial e duração em meses em `etl/core/logic/temporal/activity_filter.py`

**Checkpoint**: Base de modelos pronta — implementação das histórias de usuário desbloqueada.

---

## Phase 3: User Story 1 - Interface Web Exclusiva para o Campus Serra (Priority: P1) 🎯 MVP

**Goal**: Garantir que o portal de indicadores exiba unicamente o Campus Serra, com a opção "(Todos)" desativada no seletor de campus.

**Independent Test**: Carregar a página inicial e as páginas de pilares; verificar que a opção `(Todos)` está desativada (`disabled`) e que os dados exibidos são estritamente os do Campus Serra.

### Tests for User Story 1 (MANDATORY per constitution Principle II) ⚠️

- [x] T005 [P] [US1] Criar testes unitários no Vitest em `tests/web/seletor-campus-serra.test.ts` verificando atributo `disabled` na opção `(Todos)` e seleção padrão no Campus Serra

### Implementation for User Story 1

- [x] T006 [US1] Atualizar opções dos seletores de cabeçalho e gaveta móvel em `src/layouts/BaseLayout.astro` desativando a opção `todos` e definindo `serra` como valor padrão
- [x] T007 [US1] Ajustar rotina de sincronização do cliente em `src/lib/contexto-cliente.ts` para redirecionar parâmetros nulos, vazios ou `todos` para o Campus Serra

**Checkpoint**: User Story 1 concluída e testável de forma independente no frontend.

---

## Phase 4: User Story 2 - Projeção da Vigência de Projetos Plurianuais no PIPDI (Priority: P1)

**Goal**: Eliminar a subnotificação do PIPDI garantindo que projetos com `datas.fim == None` e `duracao_meses` preenchido permaneçam vigentes nos anos subsequentes do seu ciclo.

**Independent Test**: Ingerir projetos com início em 2025 e duração de 36 meses; verificar que pontuam no PIPDI em 2025, 2026 e 2027.

### Tests for User Story 2 (MANDATORY per constitution Principle II) ⚠️

- [x] T008 [P] [US2] Criar testes unitários em `tests/etl/test_vigencia_plurianual_pipdi.py` para testar o cálculo de `ano_fim` baseado em `duracao_meses` e a contagem no PIPDI

### Implementation for User Story 2

- [x] T009 [US2] Modificar o método `extrair_projetos_sigpesq` em `etl/adapters/sources/zip_canonical_source.py` para projetar `ano_fim` a partir de `ano_inicio`, `mes_inicio` e `duracao_meses` quando `datas.fim` for nulo
- [x] T010 [US2] Atualizar o cálculo de vigência no calculador de PIPDI em `etl/core/logic/calculators/pillar2.py` assegurando que projetos fiquem ativos no intervalo `ano_inicio <= ano <= ano_fim`

**Checkpoint**: User Stories 1 e 2 funcionais e testáveis de forma independente.

---

## Phase 5: User Story 3 - Consolidação Orçamentária do TAFPPI e PINV do Campus Serra (Priority: P2)

**Goal**: Garantir a consolidação dos R$ 25M de fomento federal da FINEP (NOVA-IA) em 2025 e a preservação de OCC nulo no PINV.

**Independent Test**: Executar o cálculo do Pilar 2 para Serra em 2025; confirmar TAFPPI de R$ 25.954.326,84 e PINV de 1.111,35% com OCC nulo.

### Tests for User Story 3 (MANDATORY per constitution Principle II) ⚠️

- [x] T011 [P] [US3] Criar testes unitários em `tests/etl/test_tafppi_pinv_consolidados.py` para validar o fomento consolidado do NOVA-IA em 2025 e a preservação do OCC nulo

### Implementation for User Story 3

- [x] T012 [US3] Assegurar em `etl/core/logic/calculators/pillar2.py` que o somatório do TAFPPI de 2025 inclua integralmente as propostas `PJ 8503` e `PJ 8504`
- [x] T013 [US3] Validar em `etl/core/logic/calculators/pillar2.py` e sinks que o PINV do Campus Serra continue sendo injetado de `data/pinv_serra.json` mantendo `OCC_valor_orcamento_total_capital_custeio: None`

**Checkpoint**: User Stories 1, 2 e 3 integradas e testadas.

---

## Phase 6: User Story 4 - Integridade dos Pilares 1 e 3 e Empacotamento Canônico (Priority: P3)

**Goal**: Preservar as regras de liderança institucional no NTPP e manter a geração hermética do escopo `todos` em background para satisfazer `make check-dados`.

**Independent Test**: Executar `make check-dados` e verificar que 100% dos arquivos do zip cumprem os schemas e que o IntegraCAR permanece atribuído ao Campus Vitória.

### Tests for User Story 4 (MANDATORY per constitution Principle II) ⚠️

- [x] T014 [P] [US4] Criar testes unitários em `tests/etl/test_integridade_pilares1_3.py` validando que projetos multicampi de outros campi não pontuam no NTPP do Campus Serra e que o Pilar 3 preserva contagens de software e patentes nulas

### Implementation for User Story 4

- [x] T015 [US4] Validar e manter em `etl/core/logic/calculators/aggregator.py` a regra de liderança do NTPP atribuindo projetos pelo campus do coordenador
- [x] T016 [US4] Assegurar no pipeline `etl/main.py` e `etl/flows/indicadores_flow.py` que os artefatos de `todos` continuem sendo empacotados em `data/dist/indicadores.zip` para garantir conformidade estrita

**Checkpoint**: Todas as 4 User Stories implementadas e testáveis.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Execução dos testes integrados, builds e validação de ponta a ponta

- [x] T017 [P] Executar suíte completa de testes do ETL com `.venv/bin/pytest tests/etl`
- [x] T018 [P] Executar suíte completa de testes do frontend com `npm run test:web`
- [x] T019 Executar compilação estática do Astro com `npm run build`
- [x] T020 Executar validação contratual da cadeia de dados com `make check-dados`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências.
- **Foundational (Phase 2)**: Depende da Fase 1; bloqueia as fases das histórias.
- **User Stories (Phases 3 a 6)**: Podem ser executadas em sequência ordenada por prioridade (P1 $\rightarrow$ P2 $\rightarrow$ P3).
- **Polish (Phase 7)**: Depende da conclusão de todas as histórias.

### User Story Dependencies

- **User Story 1 (P1)**: Frontend — Pode ser testada e entregue como MVP inicial.
- **User Story 2 (P1)**: Backend ETL — Requer Fase 2 (helpers de vigência).
- **User Story 3 (P2)**: Backend ETL — Requer Fases 2 e 4.
- **User Story 4 (P3)**: Orquestração — Requer Fases 2, 4 e 5.

### Parallel Opportunities

- Tarefas marcadas com **[P]** (ex.: T002, T003, T004, T005, T008, T011, T014, T017, T018) podem ser desenvolvidas em paralelo por atuarem em arquivos independentes.

---

## Implementation Strategy: MVP First

1. **MVP**: Fase 1 + Fase 2 + Fase 3 (User Story 1) $\rightarrow$ Garante que a interface web apresente imediatamente apenas o Campus Serra sem opção `(Todos)` selecionável.
2. **Incremento 2**: Fase 4 (User Story 2) $\rightarrow$ Estende a vigência dos projetos plurianuais no PIPDI.
3. **Incremento 3**: Fases 5 e 6 (User Stories 3 e 4) $\rightarrow$ Consolidação orçamentária e integridade de ponta a ponta.
4. **Finalização**: Fase 7 $\rightarrow$ Gates de qualidade com `pytest`, `vitest` e `make check-dados`.
