# Tasks: Reformulação e Correção Abrangente do Frontend

**Input**: Design documents from `specs/014-frontend-ux-overhaul/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`)

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are MANDATORY for this project (constitution Principle II, Test-First Development). Tests MUST be written BEFORE implementation and observed to fail first (Red → Green → Refactor).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Tipagens compartilhadas e fixtures de teste para suporte a todas as histórias de usuário.

- [x] T001 [P] Criar fixtures e mocks complementares de teste para detalhamento reativo e temas em `tests/web/fixtures/detalhe-fixtures.ts`
- [x] T002 [P] Adicionar os novos tipos de dados (`VisaoGraficoDetalhe`, `PontoGraficoDetalhe`, `LinhaHistorico`, `ItemBuscaIndicador`, `DeltaFormatadoAcessivel`) em `src/lib/visao.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Módulos utilitários puros essenciais que bloqueiam as histórias de usuário.

**⚠️ CRITICAL**: Nenhuma história de usuário deve ser iniciada antes da conclusão desta fase.

- [x] T003 [P] Implementar módulo utilitário de cálculo de deltas acessíveis e símbolos direcionais em `src/lib/delta.ts`
- [x] T004 [P] Implementar funções puras de geração de modelo de gráfico detalhado (`computarVisaoGraficoDetalhe`) e tabela histórica (`computarVisaoHistoricoDetalhe`) em `src/lib/visao.ts`
- [x] T005 [P] Implementar módulo de índice e correspondência de busca rápida de indicadores em `src/lib/busca.ts`

**Checkpoint**: Base matemática e utilitária consolidada — implementação das histórias de usuário desbloqueada.

---

## Phase 3: User Story 1 - Atualização Reativa Completa nos Detalhes do Indicador (Priority: P1) 🎯 MVP

**Goal**: Garantir que a página de detalhe (`/pilar-[1-3]/[sigla]`) responda de forma 100% reativa à escolha de Campus e Ano, atualizando o gráfico SVG, a tabela histórica e o histórico de componentes sem travar em dados de outro campus.

**Independent Test**: Acessar `/pilar-1/ntpp/` e `/pilar-1/pies/`, alterar o campus no topo e verificar atualização instantânea do gráfico SVG, da tabela histórica e das contagens anuais de componentes.

### Tests for User Story 1 (MANDATORY per constitution Principle II) ⚠️

> **NOTE: Escreva estes testes PRIMEIRO e confirme que falham antes da implementação.**

- [x] T006 [P] [US1] Escrever testes unitários em `tests/web/aplicar-visao-detalhe.test.ts` para validação de `aplicarVisaoGrafico` e `aplicarVisaoHistorico`
- [x] T007 [P] [US1] Escrever testes unitários em `tests/web/component-count-integridade.test.ts` para chave composta de componentes por sigla e ano

### Implementation for User Story 1

- [x] T008 [US1] Implementar funções `aplicarVisaoGrafico`, `aplicarVisaoHistorico` e atualizar `aplicarVisaoDetalhe` em `src/lib/aplicar-visao.ts`
- [x] T009 [P] [US1] Atualizar `src/components/SeriesChart.astro` adicionando atributos `data-*`, suporte a classe `.ponto-ativo` e marcação visual de ano ativo
- [x] T010 [P] [US1] Atualizar `src/components/HistoricalSeries.astro` adicionando atributos `data-*` e classe `.linha-ativa` para o ano ativo
- [x] T011 [P] [US1] Atualizar `src/components/ComponentCount.astro` vinculando chaves compostas `data-componente-qtd` e `data-componente-ano`
- [x] T012 [US1] Integrar o despacho de atualização do gráfico e tabela em `sincronizarTela` em `src/lib/contexto-cliente.ts`

**Checkpoint**: User Story 1 funcional e testável de forma independente (MVP entregue!).

---

## Phase 4: User Story 2 - Desduplicação de Controles e Coerência Visual (Priority: P2)

**Goal**: Remover os seletores redundantes de campus e ano no miolo da página e unificar a estrutura das páginas de pilares com um componente compartilhado reutilizável (DRY).

**Independent Test**: Navegar nas páginas de detalhe e pilares e confirmar a presença exclusiva de seletores no cabeçalho fixo / gaveta móvel, com layout padronizado.

### Tests for User Story 2 (MANDATORY per constitution Principle II) ⚠️

- [x] T013 [P] [US2] Escrever testes em `tests/web/controles-desduplicados.test.ts` garantindo que não existem seletores de campus/ano no miolo de páginas de detalhe

### Implementation for User Story 2

- [x] T014 [US2] Refatorar `src/components/YearLinks.astro` removendo os seletores duplicados de campus e ano
- [x] T015 [P] [US2] Criar componente compartilhado `src/components/IndicadorDetalhe.astro` extraindo o layout em 2 colunas e estilos idênticos
- [x] T016 [US2] Refatorar páginas `src/pages/pilar-1/[sigla].astro`, `src/pages/pilar-2/[sigla].astro` e `src/pages/pilar-3/[sigla].astro` para consumir `IndicadorDetalhe.astro`

**Checkpoint**: Controles limpos e código desduplicado nos três pilares.

---

## Phase 5: User Story 3 - Acessibilidade Inclusiva e Navegação Assistiva WCAG AA (Priority: P3)

**Goal**: Adicionar símbolos visuais inequívocos (▲, ▼, =) e rótulos assistivos aos deltas, link de salto "Pular para o conteúdo principal" e rolagem horizontal segura em tabelas.

**Independent Test**: Navegar por teclado a partir da carga da página acionando o skip link; inspecionar o leitor de tela nos deltas de variação percentual; testar tabelas em viewport móvel de 360px.

### Tests for User Story 3 (MANDATORY per constitution Principle II) ⚠️

- [x] T017 [P] [US3] Escrever testes de acessibilidade para deltas e atributos ARIA em `tests/web/acessibilidade-delta.test.ts`

### Implementation for User Story 3

- [x] T018 [P] [US3] Atualizar `src/components/IndicatorCard.astro` e `src/components/CartaoPilar.astro` para renderizar símbolos visuais explícitos e rótulos `aria-label`
- [x] T019 [US3] Atualizar `src/lib/aplicar-visao.ts` para manter símbolos e textos assistivos ao atualizar deltas no cliente
- [x] T020 [P] [US3] Adicionar link "Pular para o conteúdo principal" e âncora `id="conteudo-principal"` no `src/layouts/BaseLayout.astro`
- [x] T021 [P] [US3] Adicionar wrapper com rolagem horizontal e acessibilidade para tabelas de variáveis matemáticas em `src/components/IndicadorDetalhe.astro`

**Checkpoint**: Dashboard 100% aderente às diretrizes de acessibilidade WCAG AA.

---

## Phase 6: User Story 4 - Alternância de Tema Claro, Escuro e Automático (Priority: P4)

**Goal**: Permitir alternância de tema no cabeçalho com persistência no `localStorage` e prevenção de FOUC, aproveitando a paleta completa já declarada em `tokens.css`.

**Independent Test**: Clicar no botão de alternância de tema no cabeçalho, alternar entre os modos, recarregar a página e confirmar a permanência da escolha.

### Tests for User Story 4 (MANDATORY per constitution Principle II) ⚠️

- [x] T022 [P] [US4] Escrever testes unitários em `tests/web/tema.test.ts` para validação de alternância de tema e persistência

### Implementation for User Story 4

- [x] T023 [P] [US4] Criar componente `src/components/SeletorTema.astro` com botão acessível e ícones SVG de sol/lua/sistema
- [x] T024 [US4] Inserir script inline anti-FOUC no `<head>` e incluir `SeletorTema.astro` no cabeçalho de `src/layouts/BaseLayout.astro`
- [x] T025 [US4] Adicionar lógica de alternância e persistência em `src/lib/contexto-cliente.ts`

**Checkpoint**: Modo escuro funcional e persistente em todo o site.

---

## Phase 7: User Story 5 - Otimização de Performance e Assets Institucionais (Priority: P5)

**Goal**: Otimizar a entrega visual substituindo o logotipo pesado por vetor SVG oficial leve e postergar scripts analíticos externos para proteção dos Core Web Vitals.

**Independent Test**: Inspecionar tamanho de download da marca (<25KB) e verificar que scripts de telemetria não bloqueiam a renderização da página.

### Tests for User Story 5 (MANDATORY per constitution Principle II) ⚠️

- [x] T026 [P] [US5] Atualizar `tests/web/logo.test.ts` validando formato SVG vetorial e dimensões adequadas

### Implementation for User Story 5

- [x] T027 [P] [US5] Criar/adicionar logotipo oficial em formato SVG vetorial `public/ifes-horizontal.svg`
- [x] T028 [US5] Atualizar `src/components/HeaderMarca.astro` para utilizar o novo logotipo vetorial SVG
- [x] T029 [US5] Otimizar o carregamento dos scripts analíticos de terceiros (Clarity, UserWay, GA) no `<head>` de `src/layouts/BaseLayout.astro` com `defer`

**Checkpoint**: Carregamento otimizado e peso de assets reduzido.

---

## Phase 8: User Story 6 - Localização e Busca Rápida de Indicadores (Priority: P6)

**Goal**: Adicionar caixa de busca rápida na barra de navegação com autocompletar e navegação por teclado para localizar indicadores transversalmente.

**Independent Test**: Digitar termos como "bolsas", "patente" ou "QSPP", navegar com as setas do teclado e selecionar um indicador para ser direcionado preservando campus e ano.

### Tests for User Story 6 (MANDATORY per constitution Principle II) ⚠️

- [x] T030 [P] [US6] Escrever testes unitários para a busca em `tests/web/busca.test.ts`

### Implementation for User Story 6

- [x] T031 [P] [US6] Criar componente `src/components/BuscaRapida.astro` com markup semântico e papéis ARIA (`combobox`, `listbox`)
- [x] T032 [US6] Integrar `BuscaRapida.astro` no cabeçalho e na gaveta móvel de `src/layouts/BaseLayout.astro`
- [x] T033 [US6] Adicionar lógica de eventos de teclado (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`) e redirecionamento preservando parâmetros de URL em `src/lib/contexto-cliente.ts`

**Checkpoint**: Todas as 6 histórias de usuário implementadas e funcionais.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Verificação integral de qualidade, cobertura de testes e homologação do build.

- [x] T034 [P] Executar suite completa de validação `npm test` garantindo 100% de sucesso em todos os testes novos e existentes
- [x] T035 [P] Executar checagem de qualidade `npm run lint` e `npm run format:check` com zero erros
- [x] T036 Compilar e validar build de produção `npm run build`
- [x] T037 Executar roteiro de validação manual descrito em `specs/014-frontend-ux-overhaul/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode começar imediatamente.
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA todas as histórias de usuário.
- **User Stories (Phases 3 a 8)**: Todas dependem da Fase Foundational concluída.
  - Ordem sequencial prioritária recomendada: US1 (P1 - MVP) → US2 (P2) → US3 (P3) → US4 (P4) → US5 (P5) → US6 (P6).
- **Polish (Phase 9)**: Depende de todas as histórias desejadas estarem concluídas.

### Parallel Opportunities

- As tarefas marcadas com `[P]` (como T001, T002, T003, T004, T005, T006, T007, T009, T010, T011, etc.) operam em arquivos isolados e podem ser desenvolvidas em paralelo.
- Todos os testes de cada história devem ser executados primeiro e observados a falhar antes da respectiva implementação.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Concluir Phase 1 (Setup) e Phase 2 (Foundational).
2. Concluir Phase 3 (User Story 1 - Reatividade do SVG e Integridade de Componentes).
3. **VALIDAR**: Executar `npm test` e verificar se a troca de campus na página de detalhe funciona perfeitamente sem erros.
4. Entregar o MVP com as inconsistências críticas de dados corrigidas.

### Entrega Incremental

1. Após o MVP, implementar US2 (remoção de controles duplicados e unificação de layouts).
2. Implementar US3 (acessibilidade de deltas e skip links).
3. Implementar US4 (modo escuro com persistência).
4. Implementar US5 (otimização de imagens e scripts).
5. Implementar US6 (busca rápida no cabeçalho).
6. Executar Polish e validação do build final.
