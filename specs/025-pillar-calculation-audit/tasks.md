---
description: 'Task list for feature 025-pillar-calculation-audit'
---

# Tasks: Memória de Cálculo e Auditoria nas Páginas dos Pilares

**Input**: Design documents from `/specs/025-pillar-calculation-audit/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/memoria-dom-ui.md, quickstart.md

**Tests**: Tests are MANDATORY for this project (constitution Principle II, Test-First Development). Test tasks are marked ⚠️ and MUST be written BEFORE the implementation tasks they cover, and observed to FAIL first (red → green → refactor). Runner: Vitest (`npm test` → `vitest run tests/web`).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Projeto Astro único na raiz: `src/lib/`, `src/components/`, `src/pages/pilar-{1,2,3}/`, testes em `tests/web/` (padrão do repositório: mocks de DOM em Node puro + asserções sobre o fonte `.astro`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verde e insumos de teste compartilhados

- [x] T001 Baseline: executar `make etl` (gera `data/dist/indicadores.zip`) e `npm test` — confirmar suíte 100% verde antes de qualquer mudança; registrar contagem de testes para comparação
- [x] T002 [P] Criar fixture de dataset sintético `tests/web/fixtures/dataset-memoria.ts` (campi `serra`+`litoral`, anos 2024–2026, indicadores PIES com componentes NEP/NTE e NTPP com componente PRE, incluindo um ano com `quantidade: null`) para os testes de US1/US2 rodarem sem depender do zip real (research D-7)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Utilitário de formatação compartilhado (proveniência de artefatos) exigido pela US3 e contrato de testes

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 ⚠️ [P] Escrever testes que FALHAM para `formatDataArquivo(Date|null)` (pt-BR/UTC, `Dado indisponível` para null) e `formatBytesLegivel(number|null)` em `tests/web/formatters.test.ts` (research D-6)
- [x] T004 [P] Implementar `formatDataArquivo` e `formatBytesLegivel` em `src/lib/formatters.ts` usando `Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' })`, coerente com `formatDate` existente (GREEN T003)

**Checkpoint**: Foundation pronta — implementação das user stories pode começar

---

## Phase 3: User Story 1 — Ver a memória de cálculo de um indicador no pilar (Priority: P1) 🎯 MVP

**Goal**: Em cada página de pilar, controle "Ver memória de cálculo" por indicador expande tabela estilo planilha com variáveis (símbolo/nome/valor bruto/unidade do contexto ativo), fórmula declarada + substituída e valor final apurado canônico; atualiza junto com os filtros globais sem recarregar (FR-001 a FR-005, FR-012, FR-013, FR-014).

**Independent Test**: Abrir `/pilar-1`, expandir a memória do PIES e conferir NEP/NTE com unidades, fórmula `(valorNEP / valorNTE) × 100` e valor final idêntico ao do cartão para o mesmo contexto; trocar ano/campus com a memória aberta e ver os valores atualizarem sem recarga.

### Tests for User Story 1 (MANDATORY per constitution Principle II) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T005 ⚠️ [P] [US1] Escrever testes de `computarVisaoMemoria` em `tests/web/memoria.test.ts` (fixture T002 + dataset real quando existir): PIES → substituição fração com `formulaSubstituida` contendo valores formatados, `valorFinalFormatado === formatValor(valorCanônico)` (fidelidade, invariantes 1–2 do data-model), `unidadeJaNoValor` para percentuais; NTPP/QSPP/PIPDI → `direta` (texto descritivo vs. sigla de componente, research D-3); PIPRO → soma `NPB + NPT` substituída; variável ausente → `TEXTO_INDISPONIVEL` na célula + `nota` presente, proibido `Infinity`/`NaN`/recálculo; contexto `todos` usa valores consolidados dos cartões
- [x] T006 ⚠️ [P] [US1] Escrever testes de `aplicarMemoria` em `tests/web/aplicar-memoria.test.ts` com mocks de DOM Node puro (padrão `aplicar-visao.test.ts`): preenche hooks `[data-memoria-variavel-valor]`, `[data-memoria-formula-substituida]`, `[data-memoria-valor-final]`, `[data-memoria-valor-final-unidade]`, `[data-memoria-nota]` conforme contract C-3; NÃO altera atributo `open`, foco ou hooks de outros blocos (`data-card-*`)
- [x] T007 ⚠️ [P] [US1] Escrever teste de integração em `tests/web/memoria-integracao.test.ts`: `sincronizarTela` com DOM mockado de página de pilar (`[data-memoria]` + `[data-card-valor]`, pathname `/pilar-1/`) recalcula memórias do pilar e reescreve hooks após troca de contexto; memória aberta permanece aberta (contract C-5)
- [x] T008 ⚠️ [P] [US1] Escrever asserções de fonte em `tests/web/memoria-markup.test.ts` sobre `src/components/MemoriaCalculo.astro` (padrão `pagina-dados.test.ts`): `<details data-memoria="{SIGLA}">` com `<summary>` "Ver memória de cálculo" (pt-BR, FR-001), `<caption>` + `<th scope="col">` na tabela de variáveis, hooks estáticos `data-memoria-formula-declarada`, ausência de controles aninhados no `<summary>` (contract C-4)

### Implementation for User Story 1

- [x] T009 [US1] Implementar tipos `VisaoMemoria`, `VisaoVariavelMemoria` e `computarVisaoMemoria(dataset, sigla, contexto)` em `src/lib/memoria.ts` — reusar `obterIndicadorCompleto`, `INDICADORES_META`, `decomporFormula`, `formatValor`, `TEXTO_INDISPONIVEL`; substituição textual sem executar divisão (research D-2/D-3); SEM `historico` nesta task (fica para US2) (GREEN T005)
- [x] T010 [US1] Implementar `aplicarMemoria(doc, memorias)` em `src/lib/aplicar-memoria.ts` conforme contract C-2/C-3 (escreve hooks independente do estado `open`; nunca toca `open`/foco) (GREEN T006)
- [x] T011 [US1] Criar `src/components/MemoriaCalculo.astro`: `<details>` recolhido com `<summary>` "Ver memória de cálculo", tabela de variáveis (caption/scope), fórmula declarada + substituída, nota de avaliação não reconstrutível, valor final + unidade; props `indicador`, `contextoInicial` (research D-1) (GREEN T008)
- [x] T012 [US1] Atualizar `src/pages/pilar-1/index.astro`, `src/pages/pilar-2/index.astro` e `src/pages/pilar-3/index.astro`: envolver cada `IndicatorCard` em `<div class="celula-indicador">` seguido de `<MemoriaCalculo>` com contexto inicial build-time (`serra` + ano padrão, mesmo critério do cartão — contract C-6)
- [x] T013 [US1] Integrar despacho em `src/lib/contexto-cliente.ts` (`sincronizarTela`): detectar `[data-memoria]`, computar `computarVisaoMemoria` para os indicadores do pilar (pathname, mesma lógica de `[data-card-valor]`) e chamar `aplicarMemoria` após `aplicarVisaoPilar` e antes de `propagarLinksInternos` (GREEN T007)
- [x] T014 [US1] Estilizar memória em `src/components/MemoriaCalculo.astro` + `src/styles/tokens.css`: tabelas contidas com rolagem horizontal própria (FR-011, 360px), badge "Dado indisponível" nos tokens existentes, temas claro/escuro com contraste AA, aparência recolhida equivalente à atual (FR-012)

**Checkpoint**: US1 funcional e testável isoladamente — memória por indicador nas 3 páginas, atualizando com os filtros globais

---

## Phase 4: User Story 2 — Comparar o histórico multi-anual das variáveis (Priority: P2)

**Goal**: Mini-tabela histórica dentro da memória: linhas por variável, colunas por ano disponível do campus ativo, ano ativo destacado de forma acessível; adapta colunas ao trocar campus (FR-006, SC-007).

**Independent Test**: Com a memória do PIES expandida para o Campus Serra, conferir que a mini-tabela cobre todos os anos disponíveis com valores oficiais e o ano ativo com `aria-current`; trocar o campus e ver colunas/valores refletirem o novo campus.

### Tests for User Story 2 (MANDATORY per constitution Principle II) ⚠️

- [x] T015 ⚠️ [P] [US2] Escrever testes de `historico` em `tests/web/memoria.test.ts`: `historico.anos` contém exatamente os anos do campus ativo (invariante 4 do data-model), `valoresPorAno` formatado ou `TEXTO_INDISPONIVEL`, `anoAtivo === contexto.ano`, troca de campus muda os anos (fixture T002) (RED primeiro)
- [x] T016 ⚠️ [P] [US2] Escrever testes de reconstrução do histórico em `tests/web/aplicar-memoria.test.ts`: `aplicarMemoria` reconstrói `<tbody>` de `[data-memoria-historico-corpo="{SIGLA}"]` (padrão `aplicarVisaoHistorico`), células `[data-memoria-hist-valor]`, `aria-current` no `<th>` do ano ativo, adaptação quando os anos do novo campus diferem dos renderizados no build (contract C-3) (RED primeiro)

### Implementation for User Story 2

- [x] T017 [US2] Estender `computarVisaoMemoria` em `src/lib/memoria.ts` com `historico: VisaoMemoriaHistorico` (linhas por variável via `obterIndicadorCompleto`, mesmos anos do campus, research D-8) (GREEN T015)
- [x] T018 [US2] Adicionar mini-tabela histórica ao `src/components/MemoriaCalculo.astro`: `<caption>` próprio, `<th scope="col">` por ano, corpo com `data-memoria-historico-corpo`, destaque visual do ano ativo nunca como única sinalização (contract C-4)
- [x] T019 [US2] Estender `aplicarMemoria` em `src/lib/aplicar-memoria.ts` para reconstruir o corpo do histórico (anos e células) a cada sincronização, com `aria-current` no ano ativo (GREEN T016)

**Checkpoint**: US1 + US2 funcionam independentemente — auditoria pontual + tendência multi-anual

---

## Phase 5: User Story 3 — Baixar os dados de origem e conferir a proveniência (Priority: P3)

**Goal**: Seção de rastreabilidade por pilar (downloads + proveniência, herdando regras/portão fail-closed de `/dados`, sem marcação própria) e citação do arquivo de origem dentro de cada memória com âncora para a seção (FR-007 a FR-009, clarificações Q1=C e Q3=A).

**Independent Test**: A partir da memória expandida de qualquer pilar, chegar ao download do arquivo de origem em ≤ 2 interações via citação + seção `#rastreabilidade-pilar-{N}`; com portão fechado (fixture), insumos brutos sem `<a href>` e com motivo pt-BR, pacote agregado disponível.

### Tests for User Story 3 (MANDATORY per constitution Principle II) ⚠️

- [x] T020 ⚠️ [P] [US3] Escrever testes de `obterRastreabilidadePilar` em `tests/web/rastreabilidade.test.ts` com fixtures de diretório/portão (padrão `downloads.test.ts`): mapa pilar→artefatos (pilar 1 inclui `listagem_*.xlsx`; 2 e 3 só pacote + export canônico — research D-4); portão fechado → `dado-pessoal` indisponível com motivo pt-BR e `avisoPortao` preenchido (fail-closed, invariante 5); arquivo ausente → indisponível com motivo, nunca link; proveniência `origem`/`revisao` de `obterInsumosCadeia` e `atualizadoEmFormatado` via `formatDataArquivo` (RED primeiro)
- [x] T021 ⚠️ [P] [US3] Escrever asserções de fonte em `tests/web/rastreabilidade-markup.test.ts` sobre `src/components/SecaoRastreabilidade.astro` e `src/components/MemoriaCalculo.astro`: `<section aria-labelledby>` + `<h2>` pt-BR; `<a ... download>` SOMENTE para artefatos disponíveis; motivo como texto quando indisponível; aviso do portão com `role="status"`; citação na memória usa rótulo canônico + âncora `#rastreabilidade-pilar-{N}` (contract C-4/C-6) (RED primeiro)

### Implementation for User Story 3

- [x] T022 [US3] Implementar `src/lib/rastreabilidade.ts`: constante `MAPA_PILAR_ARTEFATOS` + `obterRastreabilidadePilar(pilarNumero, raizRepo)` reusando `carregarDownloads`, `descobrirInsumos`, `obterInsumosCadeia`, `portaoAberto`, `avisoVisitante` de `src/lib/downloads.ts` — sem duplicar regras nem marcação (research D-4, invariantes 5 e 7) (GREEN T020)
- [x] T023 [US3] Criar `src/components/SecaoRastreabilidade.astro`: seção por pilar com lista de artefatos (rótulo, download, data, tamanho legível, origem/revisão quando existirem, motivo quando indisponível, aviso do portão) (GREEN T021)
- [x] T024 [US3] Adicionar citação de origem ao `src/components/MemoriaCalculo.astro` (prop `citacoes`): rótulo canônico do artefato + link de âncora `#rastreabilidade-pilar-{N}` (depende de T022/T023)
- [x] T025 [US3] Integrar `<SecaoRastreabilidade>` nas páginas `src/pages/pilar-1/index.astro`, `src/pages/pilar-2/index.astro`, `src/pages/pilar-3/index.astro` (build time, após o grid, `base` de `import.meta.env.BASE_URL` — contract C-6)

**Checkpoint**: Ciclo de auditoria completo — conferir a conta (US1/US2) e ir à fonte (US3)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Qualidade transversal, fidelidade e gates de CI (US4 da spec é verificada aqui por ser transversal)

- [x] T026 Pass de acessibilidade e responsividade conforme `specs/025-pillar-calculation-audit/quickstart.md` C7: navegação só teclado (details/summary, foco visível), leitor de tela (caption/scope/aria-current), viewport 360px sem overflow de página, temas claro/escuro com contraste AA (usar padrão de `tests/web/contrast.test.ts` se extensão for necessária)
- [x] T027 Verificar valores exibidos contra o relatório oficial em `/pilar-1`, `/pilar-2`, `/pilar-3` (passo 4 do workflow de qualidade da constituição — Princípio III): cada valor final, cada variável e o histórico conferem com o dataset canônico
- [x] T028 [P] Rodar `npm run lint` e `npm run format:check` — zero erros (Princípio V), ajustar formatação se necessário
- [x] T029 Rodar `npm test` completo e `npm run build` — suíte verde e build de produção OK (gates da constituição, Princípio VI)
- [x] T030 Executar validação ponta a ponta dos cenários C1–C7 de `specs/025-pillar-calculation-audit/quickstart.md` (inclui C6 via testes automatizados com fixture de portão fechado) e registrar resultado

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — iniciar imediatamente (T001 baseline deve ficar verde antes de qualquer mudança)
- **Foundational (Phase 2)**: depende de T001; T003→T004 (red→green); bloqueia US3 (usa `formatDataArquivo`) e serve de aquecimento do fluxo TDD
- **US1 (Phase 3)**: depende de Phase 1/2; ordem interna: testes T005–T008 (paralelos) → T009 → T010/T011 (T011 depende de T009; T010 independente de T009) → T012/T013/T014
- **US2 (Phase 4)**: depende de T009–T011 (memória existe); testes T015/T016 → T017 → T018 → T019
- **US3 (Phase 5)**: depende de Phase 2 (T004) e T011 (citação na memória); testes T020/T021 → T022 → T023 → T024 → T025
- **Polish (Phase 6)**: depende de todas as stories desejadas estarem completas

### User Story Dependencies

- **US1 (P1)**: independente — MVP completo sozinho (memória por indicador + atualização dinâmica)
- **US2 (P2)**: estende a memória da US1; sem dependência de US3
- **US3 (P3)**: citações dependem do componente de memória (T011); a seção de rastreabilidade (T022/T023) é independente e pode ser desenvolvida em paralelo com US2

### Within Each User Story

- Testes ⚠️ primeiro, observados FALHANDO (Princípio II), depois implementação mínima para verde
- Módulo de visão puro (`memoria.ts`/`rastreabilidade.ts`) antes do componente/aplicador
- Integração nas páginas por último na story
- Checkpoint: validar a story isoladamente antes de avançar

### Parallel Opportunities

- T002, T003 (Phase 1/2) em paralelo com T001
- T005–T008: quatro suítes de teste da US1 em paralelo (arquivos distintos)
- T015+T016 (US2) em paralelo; T020+T021 (US3) em paralelo
- US2 e US3 em paralelo entre si após US1 (arquivos distintos, exceto T024 que depende de T022/T023)
- T028 em paralelo com revisões manuais

---

## Parallel Example: User Story 1

```bash
# Suítes de teste da US1 em paralelo (arquivos distintos, todos RED primeiro):
Task: "T005 tests/web/memoria.test.ts"
Task: "T006 tests/web/aplicar-memoria.test.ts"
Task: "T007 tests/web/memoria-integracao.test.ts"
Task: "T008 tests/web/memoria-markup.test.ts"

# Implementação em paralelo onde não há dependência:
Task: "T009 src/lib/memoria.ts"        # desbloqueia T011
Task: "T010 src/lib/aplicar-memoria.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (baseline verde + fixture)
2. Phase 2: Foundational (formatadores de artefato, red→green)
3. Phase 3: US1 completa (testes red → implementação green → integração nas páginas)
4. **STOP and VALIDATE**: quickstart C1 + C2 + C3; memória por indicador nas 3 páginas atualizando com os filtros
5. Deploy/demo se pronto

### Incremental Delivery

1. Setup + Foundational → fundação pronta
2. US1 → validar isoladamente (MVP de auditoria)
3. US2 → histórico multi-anual → validar (C4)
4. US3 → rastreabilidade + downloads → validar (C5, C6)
5. Polish → C7 + verificação de fidelidade + gates de CI

### Parallel Team Strategy

1. Time completa Setup + Foundational juntos
2. Com a fundação pronta e US1 fechada:
   - Dev A: US2 (histórico)
   - Dev B: US3 (rastreabilidade)
3. Merge sequencial: US2 e US3 tocam arquivos distintos (exceto citação T024, depois de T022/T023)

---

## Notes

- [P] = arquivos distintos, sem dependência pendente
- [Story] mapeia a task à user story da spec (US1/US2/US3; US4 é transversal na Phase 6)
- Testes ⚠️ DEVEM falhar antes da implementação correspondente (red → green → refactor)
- Commit após cada task ou grupo lógico
- Parar em qualquer checkpoint para validar a story isoladamente
- Evitar: tasks vagas, conflito de mesmo arquivo entre tasks paralelas, dependências entre stories que quebrem independência
