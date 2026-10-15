---
description: 'Task list for feature 026-raio-x-indicador'
---

# Tasks: Raio-X do Indicador (Drawer de Auditoria de Micradados)

**Input**: Design documents from `/specs/026-raio-x-indicador/`

**Prerequisites**: plan.md (required), spec.md (required), research.md (D-1..D-11), data-model.md, contracts/fixture-auditoria.md, contracts/dom-raiox.md, quickstart.md

**Tests**: Tests are MANDATORY for this project (constitution Principle II, Test-First Development). Test tasks are marked ⚠️ and MUST be written BEFORE the implementation tasks they cover, and observed to FAIL first (red → green → refactor). Runners: pytest (`tests/etl/`) para o ETL; Vitest (`tests/web/`) para o frontend.

**Organization**: Tasks are grouped by user story. A geração de fixtures no ETL e o portão/governança são FOUNDATIONAL (bloqueiam todas as stories — o drawer não tem conteúdo sem fixture).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Duas camadas no mesmo repositório: ETL Python hexagonal (`etl/`, testes em `tests/etl/`) e frontend Astro/TypeScript (`src/`, testes em `tests/web/` com mocks de DOM em Node puro + asserções de fonte `.astro`).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Baseline verde e insumos de teste compartilhados

- [x] T001 Baseline: executar `make dados` (cadeia etl → etl-listagens → merge-listagens) e `make test` (pytest + vitest) — confirmar suítes 100% verdes antes de qualquer mudança; registrar contagens para comparação
- [x] T002 [P] Criar fixture de teste do frontend `tests/web/fixtures/raiox-fixture.ts`: objeto `FixtureRaixo` sintético (PIES serra 2025: componente NEP contagem com 3 registros de pessoa com campos nome/projeto/papel/matrícula/curso — um com null; NTE contagem com 2 registros; componente `detalhado: false` exemplo OCC; TAFPPI exemplo `soma` com valores R$) conforme contracts/fixture-auditoria.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fixtures de auditoria no ETL, portão estendido e pré-condição de governança — bloqueiam TODAS as stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 ⚠️ [P] Escrever testes que FALHAM em `tests/etl/test_auditoria_flow.py` (usar `mock_export_canonicos`, `criar_zip_canonico_fake`, `mock_sigpesq_projetos_dict` e `criar_listagem_xlsx` de `tests/etl/`): coleta de registros NO MESMO passe das contagens (research D-5) — PRE (iniciativas ativas), SUPP (pesquisadores únicos), NEP (estudantes únicos com nome/projeto/papel; matrícula/curso `null` sem match com listagens — D-3), NTE (matrículas únicas com nome/curso/situação retidos da listagem), NTECPP (interseção por nome normalizado), TAFPPI (soma R$ por projeto), NAPPCT, NPB, NPT, PC; invariante `contagem ⇒ len(registros) == apurado` e `soma ⇒ Σ valor == apurado` (centavos inteiros)
- [x] T004 ⚠️ [P] Escrever testes que FALHAM em `tests/etl/test_auditoria_sink.py`: `data/dist/auditoria/{INDICADOR}_{campus}_{ano}.json` (contrato contracts/fixture-auditoria.md) — chaves/campos, `papel` (numerador/denominador/parcela/unica), `detalhado: false` + `registros: []` para OCC/PA/RM/DI/C/TC/OGM/CT/CL/CC, `apurado` transcrito do canônico, determinismo (mesmos insumos ⇒ mesmos bytes), `fontes[]` + `geradoEm`, `campus` nunca `todos`
- [x] T005 ⚠️ [P] Escrever testes que FALHAM para privacidade (research D-9): re-escopo de `tests/etl/test_privacy.py` — o `indicadores.zip` continua SEM nenhum nome/campo individual (estrito); novos testes: portão fechado ⇒ `public/auditoria/` vazio; fixtures sem padrão CPF e sem campos fora do contrato; logs do novo flow sanitizados (padrão `etl/tracking/tracker.py:75-80`)
- [x] T006 [US1-infra] Implementar coleta de registros no agregador: estender `etl/core/logic/calculators/aggregator.py` (e `pillar2.py`/`pillar3.py` onde contam) para guardar, junto de cada contagem/conjunto, as linhas que a compõem (person_id→nome/projeto/papel; iniciativas; artigos/produções; projetos SIGPESQ com valor) — SEM alterar nenhum valor apurado (GREEN T003; research D-5)
- [x] T007 [US1-infra] Implementar o flow e o sink de fixtures: `etl/flows/auditoria_flow.py` (lê agregados + listagens com retenção nome/curso em `etl/adapters/sources/listagens_xlsx_source.py` — novo modo de retenção, flow de listagens existente intocado — D-3; match NTECPP/NEP por nome normalizado) e `etl/adapters/sinks/json_auditoria_sink.py` (serialização determinística em `data/dist/auditoria/`, espelho de `ZipIndicadoresSink`) (GREEN T004)
- [x] T008 [US1-infra] Estender `etl/scripts/check_governanca.py` (copiar `data/dist/auditoria/*.json` → `public/auditoria/` com portão aberto; limpar com fechado — D-6) e o `Makefile` (alvo `auditoria` após `dados`; integração fail-closed na cadeia) (GREEN T005 — inclui rodar os novos testes de privacidade)
- [x] T009 [P] Pré-condição de governança (FR-012, spec 026): registrar emenda MAJOR do Princípio IV em `.specify/memory/constitution.md` (nova versão + Sync Impact Report no cabeçalho, autorizando renderização de micradados e fixtures derivadas sob o portão fail-closed) e atualizar `docs/revisao-privacidade.md` (base legal, minimização registrada, escopo das fixtures, marcação no drawer) — documentação apenas; a emenda autoriza a publicação, o portão continua sendo quem decide em build

**Checkpoint**: Fundação pronta — fixtures geradas em `data/dist/auditoria/`, `public/auditoria/` governado pelo portão, emenda registrada

---

## Phase 3: User Story 1 - Abrir o Raio-X do Indicador no contexto ativo (Priority: P1) 🎯 MVP

**Goal**: Gatilho nos cartões dos pilares e páginas de detalhe abre um drawer modal acessível com abas por componente, tabela de registros do contexto ativo e selo de conferência contra o apurado canônico (FR-001..FR-004, FR-006, FR-011, FR-014).

**Independent Test**: Em `/pilar-1` com contexto selecionado, abrir o Raio-X do PIES: abas rotuladas por papel/símbolo/apurado, registros com campos do contrato, selo "✓ (Conferido)" quando listado == apurado, sem requisição antes do acionamento.

### Tests for User Story 1 (MANDATORY per constitution Principle II) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 ⚠️ [P] [US1] Escrever testes de funções puras em `tests/web/raiox.test.ts` (fixture T002): `construirResumo` — contagem conferida, soma R$ conferida (D-4), divergência transparente, `apurado: null`, `detalhado: false`; `buscarFixture` — 200, 404 (erro "sem fixture"), base com subcaminho (contract E)
- [x] T011 ⚠️ [P] [US1] Escrever testes de integração em `tests/web/raiox-integracao.test.ts` (mocks de DOM Node puro + fetch mockado): gatilho abre drawer; NENHUM fetch antes do acionamento (FR-009); abas por componente rotuladas com papel/símbolo/apurado (FR-003); registros exibidos com células "Dado indisponível" para null; selo conforme `construirResumo`; estados carregando/erro/404/"sem detalhamento" legíveis; `campus=todos` ⇒ explicação sem busca (D-11); troca de contexto com drawer aberto re-busca e nunca mistura contextos (FR-002); ESC/botão Fechar fecham com foco devolvido ao disparador
- [x] T012 ⚠️ [P] [US1] Escrever asserções de fonte em `tests/web/raiox-markup.test.ts` sobre `src/components/RaioXDrawer.astro` e `src/components/BotaoRaioX.astro` (padrão pagina-dados.test.ts): `role="dialog"` + `aria-modal="true"` + `aria-labelledby`; `role="tablist"/tab/tabpanel`; botão Fechar `[data-raiox-fechar]`; gatilho `<button type="button" data-raiox-trigger>` com rótulo pt-BR "Raio-X do Indicador"; nos fontes das páginas de pilar, o gatilho FORA do `<a>` do cartão (`.celula-indicador`, research D-7); gatilho renderizado só com `portaoAberto` (FR-011)

### Implementation for User Story 1

- [x] T013 [US1] Implementar tipos e funções puras em `src/lib/raiox.ts`: `FixtureRaixo`/`ComponenteRaixo`/`ResumoRaixo`, `construirResumo` (contagem vs. soma — D-4), `buscarFixture` (fetch lazy, URL `{base}auditoria/{SIGLA}_{campus}_{ano}.json`), `normalizarBuscaRaiox` (compartilhar normalização de `src/lib/busca.ts` — D-10) (GREEN T010)
- [x] T014 [US1] Implementar `src/components/RaioXDrawer.astro` (diálogo único por página: abas, tabela, selo, rodapé placeholder, marcação de dados pessoais FR-013), `src/lib/aplicar-raiox.ts` (hooks do contract B: título/selo/contador/corpo/estado) e `src/lib/raiox-cliente.ts` (abrir/fechar, foco preso, ESC, fetch sob demanda, contexto via `resolverContextoComAjuste`, re-busca em troca de contexto) (GREEN T011)
- [x] T015 [US1] Implementar `src/components/BotaoRaioX.astro` e integrar nas páginas: `src/pages/pilar-{1,2,3}/index.astro` (célula `.celula-indicador`, fora do `<a>`) e `src/pages/pilar-{N}/[sigla].astro` (área de ações) — gatilho renderizado só com `portaoAberto()` de `src/lib/downloads.ts` (build), drawer no fim do body; importar `raiox-cliente` no script cliente (GREEN T012)
- [x] T016 [US1] Estilizar drawer e gatilho (scoped styles + tokens): slide-over responsivo a partir de 360px sem overflow da página, rolagem própria da tabela, temas claro/escuro, foco visível, badge de estado (carregando/erro/sem-detalhamento)

**Checkpoint**: US1 funcional — Raio-X abre nas 3 páginas de pilar e nos detalhes, com registros reais e selo conferido contra o canônico

---

## Phase 4: User Story 2 - Encontrar registros: busca, ordenação e paginação (Priority: P2)

**Goal**: Dentro de cada aba: busca textual instantânea (acento/caixa-insensível), ordenação por coluna com `aria-sort`, paginação 25/50/100 e contador "Exibindo Y de N registros" (FR-005).

**Independent Test**: Em uma aba com N registros, filtrar por termo com variação de acento, ordenar por coluna e paginar — contador coerente em todas as ações.

### Tests for User Story 2 (MANDATORY per constitution Principle II) ⚠️

- [x] T017 ⚠️ [P] [US2] Escrever testes que FALHAM em `tests/web/raiox.test.ts`: `filtrarRegistros` (qualquer campo textual, acento/caixa-insensível, termo vazio ⇒ tudo), `ordenarRegistros` (asc/desc, estável, null por último, numérico e textual), `paginarRegistros` (25/50/100, `totalPaginas`, página fora do range ⇒ vazia)
- [x] T018 ⚠️ [P] [US2] Escrever testes que FALHAM em `tests/web/raiox-integracao.test.ts`: digitar em `[data-raiox-busca]` filtra instantaneamente e o contador `[data-raiox-contador]` passa a "Exibindo Y de N registros" com o selo preservado; cabeçalho `[data-raiox-coluna]` reordena com `aria-sort`; paginação `[data-raiox-pagina]`/`[data-raiox-por-pagina]` respeita o tamanho; busca sem resultados ⇒ estado vazio orientando limpar (nunca "0" como apurado — Princípio III)

### Implementation for User Story 2

- [x] T019 [US2] Implementar `filtrarRegistros`, `ordenarRegistros`, `paginarRegistros` em `src/lib/raiox.ts` (GREEN T017)
- [x] T020 [US2] Implementar controles no drawer/aplicador (`src/components/RaioXDrawer.astro` + `src/lib/aplicar-raiox.ts`): campo de busca, cabeçalhos ordenáveis com `aria-sort`, seletor 25/50/100, navegação de páginas, contador e estado vazio (GREEN T018)

**Checkpoint**: US1 + US2 funcionam — auditoria utilizável em escala (NTE ~2.400 registros)

---

## Phase 5: User Story 3 - Exportar o recorte e conferir a conta (Priority: P3)

**Goal**: "Exportar lista" baixa o recorte atual (CSV nativo — D-8); rodapé com fórmula substituída + valor final publicado (FR-007) e proveniência (fontes + `geradoEm`).

**Independent Test**: Com um filtro aplicado, exportar ⇒ CSV com exatamente os registros visíveis e os mesmos campos; rodapé mostra a fórmula com valores substituídos e o valor oficial governando.

### Tests for User Story 3 (MANDATORY per constitution Principle II) ⚠️

- [x] T021 ⚠️ [P] [US3] Escrever testes que FALHAM em `tests/web/raiox.test.ts`: `gerarCsvRaiox` (recorte filtrado ou completo; mesmos campos da tabela; escape de vírgula/aspas/quebra de linha; BOM UTF-8 para Excel) e `construirRodapeRaiox` (fórmula declarada de `INDICADORES_META.formula` com valores apurados substituídos — reusar `decomporFormula` de `src/lib/formula.ts`; valor final publicado governa; nota quando a aritmética não reproduz o publicado — FR-007/Princípio III)
- [x] T022 ⚠️ [P] [US3] Escrever testes que FALHAM em `tests/web/raiox-integracao.test.ts`: botão `[data-raiox-exportar]` dispara download do recorte atual (URL.createObjectURL mockado) com nome `raio-x_{SIGLA}_{campus}_{ano}.csv`; `[data-raiox-proveniencia]` exibe fontes + data (US3); `[data-raiox-aviso-dados]` presente quando o componente exibe pessoas (FR-013)

### Implementation for User Story 3

- [x] T023 [US3] Implementar `gerarCsvRaiox` + `construirRodapeRaiox` em `src/lib/raiox.ts` e integrar export/rodapé/proveniência/marcação no drawer (`src/components/RaioXDrawer.astro` + `src/lib/aplicar-raiox.ts`) (GREEN T021/T022)

**Checkpoint**: Ciclo completo — conferir registro a registro, levar o recorte, ver a conta

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Acessibilidade fim a fim, fidelidade e gates de CI (US4 da spec é transversal)

- [x] T024 Pass de acessibilidade e responsividade conforme `specs/026-raio-x-indicador/quickstart.md` R6: foco preso/visível, ESC, devolução ao disparador, navegação de abas por setas, 360px sem overflow, temas claro/escuro com contraste AA (estender `tests/web/contrast.test.ts` se necessário)
- [x] T025 Verificar fidelidade dos valores contra o relatório oficial e o `indicadores.zip` (quickstart R1/R7, Princípio III): `apurado` de cada fixture === valor canônico; selo "✓ (Conferido)" em todos os contextos com fonte detalhada; "sem detalhamento" apenas nos componentes sem fonte (D-2)
- [x] T026 [P] Rodar `make lint` (flake8 + eslint) e formatação (black/isort/prettier) — zero erros (Princípio V)
- [x] T027 Rodar `make test` completo e `npm run build` (check_governanca → astro build) — suítes verdes e build OK (gates da constituição, Princípio VI)
- [x] T028 Executar a validação ponta a ponta dos cenários R1–R8 de `specs/026-raio-x-indicador/quickstart.md` e registrar resultado (inclui conferir `public/auditoria/` com o portão aberto e a ausência de requisições pré-abertura)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências (T001 baseline; T002 fixture frontend [P])
- **Foundational (Phase 2)**: depende de T001; testes T003–T005 (paralelos, red) → T006 → T007 → T008; T009 [P] independente (documentação), DEVE estar concluída antes do merge de publicação (FR-012)
- **US1 (Phase 3)**: depende de Phase 2 completa (fixture + portão); testes T010–T012 (paralelos) → T013 → T014 → T015 → T016
- **US2 (Phase 4)**: depende de US1 (drawer existe); testes T017/T018 (paralelos) → T019 → T020
- **US3 (Phase 5)**: depende de US1 (e usa o recorte da US2 para o caso filtrado); testes T021/T022 (paralelos) → T023
- **Polish (Phase 6)**: depende das stories desejadas

### User Story Dependencies

- **US1 (P1)**: independente após Foundational — MVP completo sozinho (abas, registros, selo)
- **US2 (P2)**: estende o drawer da US1; sem dependência de US3
- **US3 (P3)**: depende de US1 (drawer/fixture) e usa o filtro da US2 para o caso "recorte filtrado"

### Within Each User Story

- Testes ⚠️ primeiro, observados FALHANDO (Princípio II), depois implementação mínima
- Funções puras antes do DOM; integração nas páginas por último
- Checkpoint: validar a story isoladamente antes de avançar

### Parallel Opportunities

- T002, T003, T004, T005, T009 em paralelo (arquivos distintos)
- T010–T012 (US1) em paralelo; T017+T018 (US2) em paralelo; T021+T022 (US3) em paralelo
- ETL (Phase 2) e frontend (Phase 3+) podem avançar em paralelo após o contrato congelado (contracts/fixture-auditoria.md), com o frontend usando a fixture sintética T002 até T007 existir
- T026 em paralelo com revisões manuais

---

## Parallel Example: User Story 1

```bash
# Suítes de teste da US1 em paralelo (arquivos distintos, todas RED primeiro):
Task: "T010 tests/web/raiox.test.ts"
Task: "T011 tests/web/raiox-integracao.test.ts"
Task: "T012 tests/web/raiox-markup.test.ts"

# Implementação com dependências explícitas:
Task: "T013 src/lib/raiox.ts"           # desbloqueia T014
Task: "T014 RaioXDrawer + aplicar + cliente"
Task: "T015 BotaoRaioX + páginas"       # depende de T014
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup (baseline + fixture sintética)
2. Phase 2: Foundational (fixtures ETL + portão + emenda — **bloqueia publicação sem FR-012**)
3. Phase 3: US1 completa (testes red → green; drawer nas páginas)
4. **STOP and VALIDATE**: quickstart R1 + R2 + R5 + R7 + R8
5. Deploy/demo se pronto (emenda + revisão registradas — FR-012)

### Incremental Delivery

1. Setup + Foundational → fixtures publicáveis sob o portão
2. US1 → validar isoladamente (MVP de microauditoria)
3. US2 → busca/ordenação/paginação → validar (R3)
4. US3 → export + rodapé → validar (R4)
5. Polish → R6 + fidelidade + gates de CI

### Parallel Team Strategy

1. Time completa Setup + Foundational juntos
2. Com US1 fechada:
   - Dev A: US2 (busca/paginação)
   - Dev B: US3 (export/rodapé)
3. Merge sequencial: US2 e US3 tocam arquivos distintos (raiox.ts compartilhado — coordenar ordem)

---

## Notes

- [P] = arquivos distintos, sem dependência pendente
- [Story] mapeia à user story da spec; tarefas `[US1-infra]` na Phase 2 servem a US1 diretamente mas são foundational (bloqueiam todas)
- Testes ⚠️ DEVEM falhar antes da implementação correspondente (red → green → refactor)
- **Governaça**: sem a emenda do Princípio IV (T009) e a revisão de privacidade, o portão NÃO publica fixtures — o comportamento fail-closed é o esperado e testado (FR-011/FR-012)
- Commit após cada task ou grupo lógico
- Evitar: tasks vagas, mesmo arquivo em tasks paralelas, dependências entre stories que quebrem independência
