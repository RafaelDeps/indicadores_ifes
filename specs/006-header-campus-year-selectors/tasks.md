---
description: 'Task list for implementing Campus and Year selectors in the header'
---

# Tasks: Seletores de Campus e Ano no Cabeçalho

**Input**: Design documents from `/specs/006-header-campus-year-selectors/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui-contract.md](./contracts/ui-contract.md)  
**Tests**: Tests are MANDATORY for this project (Constitution Principle II, Test-First Development). Tests MUST be written BEFORE implementation and observed to fail first.  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- All descriptions include exact file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verificação do ambiente de testes e validação da linha de base de dependências.

- [x] T001 Verify test environment and dataset baseline with Vitest via `npm test`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Estruturas de dados e funções utilitárias em `src/lib/` que fundamentam ambos os seletores.

**⚠️ CRITICAL**: Nenhuma tarefa das histórias de usuário pode iniciar antes da conclusão desta fase.

- [x] T002 [P] Define `CampusOpcao`, `AnoOpcao`, and `ContextoFiltro` types in `src/lib/dataset.ts`
- [x] T003 Write failing tests for `obterCampiParaSelect` (asserting `(Todos)` at index 0 and strict pt-BR alphabetical order) in `tests/dataset.test.ts`
- [x] T004 Implement `obterCampiParaSelect` in `src/lib/dataset.ts` to make tests pass
- [x] T005 Write failing tests for `obterAnosParaSelect` (asserting descending order `b - a`) in `tests/dataset.test.ts`
- [x] T006 Implement `obterAnosParaSelect` in `src/lib/dataset.ts` to make tests pass
- [x] T007 Write failing tests for `resolverContextoFiltro` (fallback to `todos` and most recent year) in `tests/ano.test.ts`
- [x] T008 Implement `resolverContextoFiltro` in `src/lib/ano.ts` to make tests pass

**Checkpoint**: Camada de dados e funções auxiliares prontas e testadas com 100% de aprovação.

---

## Phase 3: User Story 1 - Seleção de Campus no Cabeçalho (Priority: P1) 🎯 MVP

**Goal**: Permitir a seleção de um campus específico ou "(Todos)" no cabeçalho, com ordenação alfabética e atualização de contexto.

**Independent Test**: Acessar qualquer página do site, verificar se o dropdown de campus exibe `(Todos)` como primeira opção e os demais campi em ordem alfabética sem duplicidades, e selecionar um campus verificando a atualização da URL `?campus=...`.

### Tests for User Story 1 (MANDATORY per Constitution Principle II) ⚠️

- [x] T009 [P] [US1] Write failing test for desktop campus selector markup, accessible labels, and alphabetical ordering in `tests/header.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Implement desktop campus dropdown markup (`.cabecalho-filtros`) and styling in `src/layouts/BaseLayout.astro`
- [x] T011 [US1] Implement client-side change event handler to synchronize selected campus in URL search params in `src/layouts/BaseLayout.astro`

**Checkpoint**: User Story 1 totalmente funcional e testável de forma autônoma como MVP.

---

## Phase 4: User Story 2 - Seleção de Ano de Referência no Cabeçalho (Priority: P2)

**Goal**: Permitir a seleção do ano de referência no cabeçalho em ordem decrescente, com o ano mais recente pré-selecionado por padrão.

**Independent Test**: Alterar o ano selecionado no cabeçalho e verificar se os indicadores da página refletem os valores correspondentes ao ano selecionado e sincronizam `?ano=` na URL.

### Tests for User Story 2 (MANDATORY per Constitution Principle II) ⚠️

- [x] T012 [P] [US2] Write failing test for desktop year selector markup, descending order, and default selection in `tests/header.test.ts`

### Implementation for User Story 2

- [x] T013 [US2] Implement desktop year dropdown markup and styling in `src/layouts/BaseLayout.astro`
- [x] T014 [US2] Implement client-side change event handler to synchronize selected year in URL search params in `src/layouts/BaseLayout.astro`

**Checkpoint**: Histórias de usuário 1 e 2 funcionando de forma independente e integrada no cabeçalho desktop.

---

## Phase 5: User Story 3 - Persistência de Contexto na Navegação e Responsividade (Priority: P3)

**Goal**: Manter filtros ativos durante a navegação entre pilares e disponibilizar os seletores na gaveta móvel (_Slide-Over Drawer_).

**Independent Test**: Selecionar campus e ano na página inicial, navegar para o Pilar 1 conferindo preservação na URL e nos seletores; em viewport móvel (< 768px), abrir o drawer e verificar que os seletores estão posicionados logo acima dos links dos pilares.

### Tests for User Story 3 (MANDATORY per Constitution Principle II) ⚠️

- [x] T015 [P] [US3] Write failing test for mobile drawer filters positioning, touch targets, and link parameter propagation in `tests/header.test.ts`

### Implementation for User Story 3

- [x] T016 [US3] Implement mobile drawer filter selectors container (`.drawer-filtros`) positioned above `.drawer-nav` in `src/layouts/BaseLayout.astro`
- [x] T017 [US3] Implement bidirectional synchronization between desktop and mobile drawer selectors in `src/layouts/BaseLayout.astro`
- [x] T018 [US3] Ensure parameter propagation preserves both campus and ano on all internal page links in `src/layouts/BaseLayout.astro`

**Checkpoint**: Todos os fluxos de usuário concluídos, responsivos e acessíveis.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificação de qualidade transversal, formatação, integridade do build e conformidade.

- [x] T019 [P] Run code formatting and linting checks across modified files with ESLint and Prettier
- [x] T020 Run full test suite with `npm test` ensuring zero regressions across all 145+ tests
- [x] T021 Validate static production build with `npm run build` and verify output in `dist/`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — execução imediata.
- **Foundational (Phase 2)**: Depende do Setup — bloqueia todas as histórias de usuário.
- **User Story 1 (Phase 3)**: Depende da Fase Foundational — entrega o MVP.
- **User Story 2 (Phase 4)**: Depende da Fase Foundational e integra com o container do cabeçalho da US1.
- **User Story 3 (Phase 5)**: Depende da conclusão de US1 e US2 para replicar os seletores no Drawer e propagar ambos os parâmetros.
- **Polish (Phase 6)**: Depende da conclusão de todas as histórias de usuário.

### Within Each User Story

- Testes DEVEM ser escritos e falhar antes da implementação (Princípio II).
- Funções de dados antes de componentes de interface.
- Marcação estática antes de eventos interativos de cliente.

### Parallel Opportunities

- `T002`, `T003`, `T005`, `T007` podem ser desenvolvidos em paralelo na Fase Foundational.
- `T009`, `T012`, `T015` (tarefas de teste) podem ser iniciadas assim que a Fase Foundational for concluída.
- `T019` (linter/format) pode rodar em paralelo com os testes finais de integração.

---

## Parallel Example: User Story 1 & Foundational

```bash
# Executar testes da camada de dados em paralelo:
Task: "Write failing tests for obterCampiParaSelect in tests/dataset.test.ts"
Task: "Write failing tests for obterAnosParaSelect in tests/dataset.test.ts"

# Executar testes do cabeçalho de US1 e US2:
Task: "Write failing test for desktop campus selector markup in tests/header.test.ts"
Task: "Write failing test for desktop year selector markup in tests/header.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluir Fase 1 (Setup) e Fase 2 (Foundational).
2. Concluir Fase 3 (User Story 1).
3. **Validar MVP**: Abrir o cabeçalho, conferir a lista com `(Todos)` no topo e ordem alfabética dos campi.

### Incremental Delivery

1. Setup + Foundational → Base de dados consolidada.
2. User Story 1 → Seletor de Campus funcional (MVP).
3. User Story 2 → Seletor de Ano decrescente integrado.
4. User Story 3 → Gaveta móvel responsiva e propagação total de parâmetros.
5. Polish → Verificação completa de linter, build estático e suíte de testes.
