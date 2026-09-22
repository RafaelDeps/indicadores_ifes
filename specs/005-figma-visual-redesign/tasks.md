# Tasks: Visual Redesign of Frontend Inspired by Figma Mock

**Input**: Design documents from `specs/005-figma-visual-redesign/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/tokens-contract.md](./contracts/tokens-contract.md), [contracts/ui-contract.md](./contracts/ui-contract.md)  
**Tests**: Tests are MANDATORY per Constitution Principle II (Test-First Development). Write tests first and observe them fail before implementing.  
**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2], [US3]...)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Definição de estruturas tipadas para variáveis de fórmula, deltas e ícones dos indicadores

- [x] T001 Atualizar definições de tipos para VariavelFormula, VariavelDelta e ícones temáticos em src/data/indicadores.ts
- [x] T002 [P] Atualizar metadados dos 9 indicadores com fórmulas, variáveis conceituais (símbolo, descrição, unidade) e ícones em src/data/indicadores.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura fundamental de cálculo de deltas e tokens de cores institucionais

**⚠️ CRITICAL**: Nenhuma história de usuário pode ser iniciada até a conclusão desta fase

- [x] T003 [P] Criar testes unitários para cálculo e formatação de variação (delta relativo, absoluto e sem base) em tests/delta.test.ts
- [x] T004 Implementar módulo de cálculo de variação relativa e absoluta em src/lib/delta.ts
- [x] T005 [P] Criar testes para validação dos tokens CSS e conformidade de contraste WCAG AA em tests/tokens.test.ts
- [x] T006 Atualizar variáveis e tokens de cores institucionais em src/styles/tokens.css

**Checkpoint**: Base de tokens e lógica de variação pronta e validada por testes unitários

---

## Phase 3: User Story 1 - Identidade Visual Institucional e Tokens de Design (Priority: P1) 🎯 MVP

**Goal**: Implementar o logotipo oficial do IFES em grade vetorial de 9 blocos (1 círculo vermelho #e6323e e 8 quadrados verdes #178447) e paleta institucional

**Independent Test**: Inspecionar visualmente e programaticamente o cabeçalho confirmando a presença da grade de 9 blocos com proporções e cores oficiais e aplicação da paleta esmeralda/verde

### Tests for User Story 1 (MANDATORY per constitution Principle II) ⚠️

- [x] T007 [P] [US1] Criar testes para o componente de logotipo oficial IFES em grade de 9 blocos em tests/logo.test.ts

### Implementation for User Story 1

- [x] T008 [US1] Implementar logotipo oficial do IFES em grade vetorial de 9 blocos com proporções exatas em src/components/HeaderMarca.astro
- [x] T009 [US1] Integrar logotipo e estilos institucionais globais no layout base em src/layouts/BaseLayout.astro

**Checkpoint**: Logotipo oficial e identidade visual renderizados com conformidade estética e técnica

---

## Phase 4: User Story 2 - Cabeçalho Fixo, Navegação entre Pilares e Seletores de Contexto (Priority: P1)

**Goal**: Cabeçalho fixo no topo da página com abas dos 3 pilares, seletores dinâmicos de Campus e Ano-base, e gaveta móvel (slide-over drawer) responsiva

**Independent Test**: Rolar a página confirmando fixação no topo; alternar abas e seletores confirmando sincronização de parâmetros na URL; testar abertura e fechamento da gaveta móvel em viewport reduzido

### Tests for User Story 2 (MANDATORY per constitution Principle II) ⚠️

- [x] T010 [P] [US2] Criar testes unitários para cabeçalho fixo, abas de navegação e gaveta móvel em tests/header.test.ts

### Implementation for User Story 2

- [x] T011 [US2] Atualizar cabeçalho com abas de pilares CONIF e indicação de aba ativa em src/layouts/BaseLayout.astro
- [x] T012 [US2] Implementar painel de gaveta móvel (slide-over drawer) com backdrop escurecido, bloqueio de rolagem e fechamento por Escape/botão em src/layouts/BaseLayout.astro
- [x] T013 [US2] Estilizar seletores suspensos de Campus e Ano-base no cabeçalho com sincronização em src/components/YearLinks.astro

**Checkpoint**: Navegação global e filtros de contexto perfeitamente operacionais no desktop e mobile

---

## Phase 5: User Story 3 - Cartões de Indicador com Destaque Numérico, Variação e Status (Priority: P2)

**Goal**: Redesenhar o IndicatorCard com ícone temático, grande destaque numérico, badge de "Dado indisponível", variação percentual/absoluta e link de detalhes

**Independent Test**: Visualizar listagem de indicadores confirmando presença do ícone temático, valor formatado ou badge cinza neutro quando nulo, delta contextual e navegação com contexto preservado

### Tests for User Story 3 (MANDATORY per constitution Principle II) ⚠️

- [x] T014 [P] [US3] Criar testes para renderização de cartões, ícones temáticos, badges de nulo e deltas em tests/cartaoIndicador.test.ts

### Implementation for User Story 3

- [x] T015 [US3] Implementar novo design de IndicatorCard.astro com ícone temático, valor em destaque, badge "Dado indisponível", delta e link de detalhes em src/components/IndicatorCard.astro
- [x] T016 [US3] Atualizar apresentação de cartões na página inicial em src/pages/index.astro e nas listagens de pilares em src/pages/pilar-1/index.astro, src/pages/pilar-2/index.astro e src/pages/pilar-3/index.astro

**Checkpoint**: Cartões informativos de alta qualidade visual em todas as páginas de resumo e pilares

---

## Phase 6: User Story 4 - Redesenho da Página de Detalhe com Layout em 2 Colunas e Banner de Destaque (Priority: P2)

**Goal**: Estruturar a página de detalhe com banner superior de resultado destacado e leiaute em 2 colunas (coluna principal com contextualização, fórmula mono e tabela de variáveis; coluna lateral com gráfico, componentes e nota metodológica escura)

**Independent Test**: Acessar /pilar-3/piprot/ e comprovar a caixa de destaque no banner superior, leiaute em 2 colunas com tabela de variáveis em 3 colunas e nota metodológica em cartão verde-escuro

### Tests for User Story 4 (MANDATORY per constitution Principle II) ⚠️

- [x] T017 [P] [US4] Criar testes para a estrutura de 2 colunas, banner de resultado e tabela de variáveis em tests/detalheLayout.test.ts

### Implementation for User Story 4

- [x] T018 [US4] Redesenhar página de detalhe dos indicadores do Pilar 1 em src/pages/pilar-1/[sigla].astro
- [x] T019 [US4] Redesenhar página de detalhe dos indicadores do Pilar 2 em src/pages/pilar-2/[sigla].astro
- [x] T020 [US4] Redesenhar página de detalhe dos indicadores do Pilar 3 em src/pages/pilar-3/[sigla].astro
- [x] T021 [US4] Atualizar apresentação visual de contagem de componentes em src/components/ComponentCount.astro

**Checkpoint**: Páginas de detalhe técnicas, ricas e perfeitamente estruturadas para todos os 9 indicadores

---

## Phase 7: User Story 5 - Fidelidade Estrita, Acessibilidade e Ausência de Elementos Descontinuados (Priority: P3)

**Goal**: Garantir fidelidade estrita de dados (nunca exibir 0 para faltantes), ausência total de botões CSV/JSON e ausência do campo "Fonte dos dados"

**Independent Test**: Executar suíte de auditoria confirmando conformidade de fidelidade, ausência de elementos legados e 100% de aprovação nos testes

### Tests for User Story 5 (MANDATORY per constitution Principle II) ⚠️

- [x] T022 [P] [US5] Atualizar e expandir testes de auditoria de remoção e fidelidade em tests/removals.test.ts e tests/voiceAudit.test.ts

### Implementation for User Story 5

- [x] T023 [US5] Auditar e garantir tratamento estrito de nulos em todos os novos componentes visuais
- [x] T024 [US5] Confirmar ausência de botões de exportação e campo "Fonte dos dados" em todas as telas e templates

**Checkpoint**: Integridade e conformidade de auditoria 100% preservadas

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificação global de qualidade, compilação estática e validação ponta a ponta

- [x] T025 [P] Executar suíte completa de testes via npm test garantindo aprovação de 100% dos testes e zero regressões
- [x] T026 [P] Executar checagem de formatação e linter via npm run lint e npm run format:check
- [x] T027 Executar build de produção via npm run build validando geração estática das 13 páginas em dist/
- [x] T028 Executar validação visual e responsiva seguindo o checklist manual de quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — execução imediata.
- **Foundational (Phase 2)**: Depende da Fase 1 — BLOQUEIA todas as histórias de usuário.
- **User Story 1 (Phase 3)**: Depende da Fase 2 (tokens prontos).
- **User Story 2 (Phase 4)**: Depende da Fase 3 (marca e tokens prontos).
- **User Story 3 (Phase 5)**: Depende da Fase 2 (delta.ts e tokens prontos).
- **User Story 4 (Phase 6)**: Depende das Fases 2, 3 e 5 (IndicatorCard, delta.ts e BaseLayout prontos).
- **User Story 5 (Phase 7)**: Depende das Fases 3 a 6.
- **Polish (Phase 8)**: Depende de todas as fases anteriores concluídas.

### Parallel Opportunities

- **Fase 1**: `T002` pode rodar em paralelo com `T001`.
- **Fase 2**: `T003` e `T005` podem rodar em paralelo.
- **Testes de Histórias**: `T007`, `T010`, `T014`, `T017` e `T022` podem ser preparados em paralelo.
- **Fase 6**: `T018`, `T019` e `T020` podem ser implementados de forma modular uma vez que o padrão de leiaute seja refinado.
