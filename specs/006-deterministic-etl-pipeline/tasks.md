# Tasks: Pipeline ETL Determinístico de Geração do Pacote de Indicadores

**Input**: Design documents from `/specs/006-deterministic-etl-pipeline/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: Tests are MANDATORY for this project (constitution Principle II, Test-First Development). Test tasks come BEFORE implementation tasks and MUST be observed failing first (red → green → refactor).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Single project: `src/` + `tests/` at repository root (Vitest include: `tests/**/*.test.ts`)
- ETL modules: `src/etl/` | Shared lib: `src/lib/` | ETL tests: `tests/etl/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Habilitar execução de TS no CLI e compartilhar o algoritmo de slug entre site e ETL

- [x] T001 [P] Adicionar dev-dependency `tsx` e script `"etl": "tsx src/etl/main.ts"` em `package.json` (ver plan.md Complexity Tracking)
- [x] T002 [P] Extrair `slugificarCampus` de `src/lib/dataset.ts` para `src/lib/slugificar.ts` (export nomeado), atualizar o import em `src/lib/dataset.ts` e manter `tests/dataset.test.ts` verde sem alterar comportamento

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura usada por TODAS as user stories (escrita ZIP determinística, serialização, leitura do export, registro de pessoas)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Escrever testes do escritor ZIP determinístico em `tests/etl/zipwriter.test.ts`: método STORE, datas de entrada fixas em 1980-01-01, CRC32 IEEE válido, saída byte-idêntica em duas chamadas, arquivo legível por `extrairZip` de `src/lib/zip.ts` — executar e observar FALHA
- [x] T004 [P] Escrever testes de serialização em `tests/etl/serialize.test.ts`: construção de objetos em ordem fixa de chaves (contrato), ordenação estável de registros por `id` asc, `JSON.stringify` compacto sem `undefined` — executar e observar FALHA
- [x] T005 Implementar `src/etl/zipwriter.ts`: escritor ZIP minimalista STORE + datas fixas + CRC32 (tabela IEEE) + escrita atômica (arquivo temporário + `rename`) — implementar o mínimo para T003 passar
- [x] T006 Implementar `src/etl/serialize.ts`: builders com ordem fixa de chaves por pilar (data-model.md §3) e utilitários de ordenação estável — implementar o mínimo para T004 passar
- [x] T007 [P] Escrever testes do loader em `tests/etl/load.test.ts` com fixture zip contendo os 8 conjuntos canônicos: carrega todos, deduplica por `id`, conjunto canônico ausente → `ERRO:` fail-fast, entrada corrompida → erro claro — executar e observar FALHA
- [x] T008 Implementar `src/etl/load.ts`: ler `exports_canonical.zip` via `extrairZip` de `src/lib/zip.ts`, exigir os 8 conjuntos canônicos (`initiatives`, `researchers`, `students`, `campuses`, `articles`, `research_productions`, `production_authors`, `production_types`), deduplicar por id, falhar rápido com mensagens pt-BR — implementar o mínimo para T007 passar
- [x] T009 [P] Escrever testes de pessoas em `tests/etl/people.test.ts`: registro `id → {classification, campus}` a partir de `researchers_canonical.json` (9.635 registros; classes `researcher`/`student`/`outside_ifes`/`null`), ids existentes em ambos pesquisadores/estudantes resolvem pela classificação do arquivo de pesquisadores — executar e observar FALHA
- [x] T010 Implementar `src/etl/people.ts`: registro de pessoas com classificação e campus, acesso por `Map<number, Person>` — implementar o mínimo para T009 passar

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Geração Determinística do Pacote `indicadores.zip` (Priority: P1) 🎯 MVP

**Goal**: `npm run etl` lê `exports_canonical.zip`, calcula os indicadores e gera `indicadores.zip` com arquivos `pilar{N}_{campus}_{year}.json` (anos 2024–2026), byte-idêntico entre execuções

**Independent Test**: Rodar o pipeline duas vezes sobre a mesma entrada e comparar hashes do `indicadores.zip` (iguais); listar o zip e conferir nomenclatura `^pilar[123]_[a-z0-9]+_\d{4}\.json$` e header comum

### Tests for User Story 1 (MANDATORY per constitution Principle II) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T011 [P] [US1] Escrever testes da regra de atividade em `tests/etl/initiatives.test.ts`: iniciativa ativa em Y quando `start_date ≤ 31/12/Y` E (`end_date` nula OU `end_date ≥ 01/01/Y`) com fronteiras exatas, `start_date` nula → nunca ativa + aviso, filtro `initiative_type.name === 'Research Project'`, participação por roles (`Coordinator`/`Researcher` → staff com `classification === 'researcher'`; `Student` → estudantes), Sets deduplicados — executar e observar FALHA
- [x] T012 [P] [US1] Escrever testes de produções em `tests/etl/productions.test.ts`: contagem por `year === Y`, NPT inclui os 6 tipos de `production_types_canonical.json`, PC conta apenas `softwares_sem_patente`, atribuição de campus via registro primeiro e fallback pelos autores (`production_authors` → `people.ts`), produção multi-campus contada uma vez por campus distinto — executar e observar FALHA
- [x] T013 [P] [US1] Escrever testes de montagem em `tests/etl/pillars.test.ts`: para campus×ano e `todos`×ano, Pilar 1 (NTPP/QSPP/PIES/PICOT), Pilar 2 (PINV/PIPDI) e Pilar 3 (PIPRO/PIPROT/PIPROTR) presentes com todas as métricas do data-model.md §3 e nomes de pilar exatos — executar e observar FALHA
- [x] T014 [P] [US1] Escrever teste de integração ponta a ponta em `tests/etl/pipeline.test.ts`: executa o pipeline completo sobre fixture e verifica 2 execuções byte-idênticas (hash), nomenclatura dos arquivos, header (`campus` nome oficial, `ano_referencia`, `pilar`), cobertura 3 pilares × campi + `todos` × 3 anos — executar e observar FALHA

### Implementation for User Story 1

- [x] T015 [US1] Implementar `src/etl/initiatives.ts`: regra de atividade por ano + participation sets (`staffIds`/`studentIds`) por campus×ano e global×ano com deduplicação por id de pessoa (mínimo para T011 passar)
- [x] T016 [US1] Implementar `src/etl/productions.ts`: NPB (artigos `year === Y`), NPT (produções `year === Y`, 6 tipos), PC (`softwares_sem_patente` `year === Y`), atribuição registro→autores (mínimo para T012 passar)
- [x] T017 [US1] Implementar `src/etl/pillars.ts`: montagem dos 9 indicadores por campus×ano e `todos`×ano usando `serialize.ts` (ordem fixa) e slugs de `src/lib/slugificar.ts` (mínimo para T013 passar)
- [x] T018 [US1] Implementar `src/etl/main.ts`: orquestração Source → Transform → Sync (load → initiatives/productions → pillars → serialize → zipwriter) gravando `indicadores.zip` na raiz (mínimo para T014 passar)

**Checkpoint**: User Story 1 funcional e testável de forma independente — MVP alcançado (`npm run etl` gera pacote determinístico)

---

## Phase 4: User Story 2 - Fidelidade Estrita `null` vs Zero Verificado (Priority: P1)

**Goal**: Garantir indicador a indicador que métricas ausentes são `null` e `0` apenas em contagens verificadas (Princípio III)

**Independent Test**: Inspecionar os arquivos gerados e conferir campo a campo contra data-model.md §3: `NTE`/percentuais/PINV/PIPDI/PIPROTR estritamente `null`; `NTPP` sem projetos ativos = `0`; `PA`/`DI` = `0`; `PC` do dado; nenhum `undefined`/`NaN`

### Tests for User Story 2 (MANDATORY per constitution Principle II) ⚠️

- [x] T019 [P] [US2] Escrever testes de fidelidade em `tests/etl/fidelity.test.ts`: NTPP=0 verificado em ano sem projetos; PIES com `NEP` numérico e `NTE_total_estudantes_matriculados`/`percentual_calculado_PIES` `null`; PICOT com `NEP` preservado e `NTECPP`/percentual `null`; PINV (TAFPPI/OCC/percentual) e PIPDI (NAPPCT/total) todos `null`; PIPROTR todos `null`; PIPROT com PA/DI `0`, PC numérico do dado e RM/C/TC/OGM `null`; nenhuma métrica `undefined`/`NaN`/string — executar e observar FALHA

### Implementation for User Story 2

- [x] T020 [US2] Refinar `src/etl/pillars.ts` com a tabela de fidelidade do data-model.md §3 (campos não calculáveis estritamente `null`; total_PIPROT soma apenas categorias numéricas; totais NTPP/QSPP/PIPRO derivados de contagens verificadas) — implementar o mínimo para T019 passar
- [x] T021 [US2] Adicionar varredura de fidelidade em `tests/etl/pipeline.test.ts`: iterar 100% dos arquivos gerados e assegurar zero coerções `null→0` e zero `0→null` (contrato output-package.md §3)

**Checkpoint**: Fidelidade verificada em todos os arquivos do pacote

---

## Phase 5: User Story 3 - Resolução de Campus e Agregação `todos` (Priority: P2)

**Goal**: Iniciativa atribuída a exatamente um campus (declarado → coordenador → membros); `todos` calculado globalmente com dedup de pessoas

**Independent Test**: Iniciativa sem campus declarado com coordenador vinculado é atribuída ao campus do coordenador; pessoa em projetos de 2 campi conta 1× em cada e 1× no `todos`; `staffIds` do `todos` ≠ soma dos tamanhos por campus

### Tests for User Story 3 (MANDATORY per constitution Principle II) ⚠️

- [x] T022 [P] [US3] Escrever testes de resolução em `tests/etl/campus-resolution.test.ts`: campus declarado vence; fallback coordenador (1º com campus); fallback membros na ordem da lista `team`; sem resolução → iniciativa só no `todos`; dedup global de pessoas em `todos`; `todos` ≠ soma por campus — executar e observar FALHA

### Implementation for User Story 3

- [x] T023 [US3] Estender `src/etl/initiatives.ts` com a cadeia de resolução (declarado → coordenador → membros, research.md D5) e `src/etl/pillars.ts` com dedup global em `todos` (Set global de ids) — implementar o mínimo para T022 passar
- [x] T024 [US3] Propagar em `src/etl/main.ts` os avisos `AVISO:` de ids de iniciativas não resolvidos (lista de ids) e registros com datas inválidas no stderr

**Checkpoint**: Visões por campus e institucional corretas e determinísticas

---

## Phase 6: User Story 4 - Validação Contratual e Empacotamento Confiável (Priority: P2)

**Goal**: Nenhum pacote inválido é publicado: validação completa antes do empacotamento, falha sem gerar zip, escrita atômica

**Independent Test**: Simular violação deliberada (ex.: métrica ausente serializada como `0`) → pipeline falha com `ERRO:` citando arquivo + campo + regra e NÃO gera zip; pacote válido passa 100% na validação

### Tests for User Story 4 (MANDATORY per constitution Principle II) ⚠️

- [x] T025 [P] [US4] Escrever testes do validador em `tests/etl/validate.test.ts`: nome casa `^pilar[123]_[a-z0-9]+_\d{4}\.json$`; header completo (`campus`, `ano_referencia`, `pilar` exato); siglas por pilar (P1: NTPP/QSPP/PIES/PICOT; P2: PINV/PIPDI; P3: PIPRO/PIPROT/PIPROTR); toda métrica `number` ou `null`; campos não calculáveis `null`; violação → erro com arquivo + campo + regra — executar e observar FALHA

### Implementation for User Story 4

- [x] T026 [US4] Implementar `src/etl/validate.ts` (validadores hand-rolled conforme contracts/output-package.md, sem dependências) — implementar o mínimo para T025 passar
- [x] T027 [US4] Integrar em `src/etl/main.ts`: validar 100% dos arquivos antes do empacotamento; violação → `ERRO:` + exit 1 sem gerar `indicadores.zip`; entrada ausente/corrompida → exit 1 sem alterar zip preexistente (casos em `tests/etl/pipeline.test.ts`)

**Checkpoint**: Pacote só é publicado se 100% válido; falhas preservam o zip anterior

---

## Phase 7: User Story 5 - Operação por Comando Único com Testes Abrangentes (Priority: P3)

**Goal**: `npm run etl` funciona do zero com UX de CLI em pt-BR conforme contracts/etl-cli.md; cobertura completa dos cálculos

**Independent Test**: Em estado limpo, `npm run etl` regenera o pacote integralmente (exit 0, resumo no stdout, avisos no stderr); `npm test` cobre os 9 indicadores e todas as regras de transformação

### Tests for User Story 5 (MANDATORY per constitution Principle II) ⚠️

- [x] T028 [P] [US5] Escrever testes de CLI em `tests/etl/cli.test.ts`: exit 0 com resumo pt-BR no stdout (`ETL concluído: N arquivos gerados (...)`), avisos com prefixo `AVISO:` e erros com `ERRO:` no stderr, exit 1 em falha — executar e observar FALHA

### Implementation for User Story 5

- [x] T029 [US5] Finalizar UX do CLI em `src/etl/main.ts` conforme contracts/etl-cli.md (resumo final no stdout, AVISO/ERRO no stderr, exit codes 0/1) — implementar o mínimo para T028 passar
- [x] T030 [US5] Revisão de cobertura em `tests/etl/`: mapear cada FR (FR-005…FR-012, FR-016) e cada indicador (NTPP/QSPP/PIES/PICOT/PINV/PIPDI/PIPRO/PIPROT/PIPROTR) a pelo menos um teste que detecte regressão numérica; preencher lacunas encontradas

**Checkpoint**: Pipeline operável por 1 comando, com suíte verde e cobertura dos cálculos

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Privacidade, qualidade de código e validação final

- [x] T031 [P] Escrever teste de privacidade em `tests/etl/privacy.test.ts` (Princípio IV): varrer todos os JSONs gerados procurando nomes do registro de pessoas (amostra) e campos não previstos pelo contrato — executar e observar FALHA, depois implementar correções se necessário
- [x] T032 [P] Ajustar `src/etl/` e `tests/etl/` para ESLint + Prettier zero erros (`npm run lint`, `npm run format:check`) e identificadores em inglês / mensagens pt-BR (Princípio V)
- [x] T033 Executar validação ponta a ponta do `specs/006-deterministic-etl-pipeline/quickstart.md`: `npm run etl`, hash determinístico (2 execuções), `npm test`, `npm run build` (site ingere o novo pacote sem alterações)
- [x] T034 Conferência final contra os Success Criteria SC-001…SC-008 da spec (cobertura de arquivos, determinismo, fidelidade, contrato, < 5 min, 1 comando, 0 PII, cobertura de testes) e marcar `tasks.md` concluído

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — inicia imediatamente (T001 e T002 em paralelo)
- **Foundational (Phase 2)**: depende do Setup; BLOQUEIA todas as stories (T005/T006 após T003/T004; T008 após T007; T010 após T009; T017 usa T002)
- **US1 (Phase 3)**: depende da Foundational (testes T011–T014 em paralelo, depois implementação T015–T018 em ordem)
- **US2 (Phase 4)**: depende de US1 (refina `pillars.ts`); testes T019 em paralelo com leitura, implementação T020–T021
- **US3 (Phase 5)**: depende de US1 (estende `initiatives.ts`); paralelizável com US2 (arquivos distintos)
- **US4 (Phase 6)**: depende de US1–US3 (valida o pacote completo)
- **US5 (Phase 7)**: depende de US4 (CLI final sobre pipeline validado)
- **Polish (Phase 8)**: depende de todas as stories

### User Story Dependencies

- **US1 (P1)**: após Foundational — nenhuma dependência entre stories
- **US2 (P1)**: após US1; independente de US3/US4
- **US3 (P2)**: após US1; paralelizável com US2
- **US4 (P2)**: após US2 e US3
- **US5 (P3)**: após US4

### Within Each User Story

- Testes primeiro (FALHANDO), depois implementação mínima (red → green → refactor)
- Models/funções puras antes de orquestração (`main.ts` por último em cada fase)
- Story completa antes da próxima prioridade

### Parallel Opportunities

- T001 ∥ T002 (arquivos distintos)
- T003 ∥ T004 ∥ T007 ∥ T009 (testes de módulos distintos)
- T011 ∥ T012 ∥ T013 ∥ T014 (testes da US1)
- T019 (US2) ∥ T022 (US3) — stories paralelas
- T025 (US4) e T028 (US5) preparáveis enquanto a fase anterior implementa
- T031 ∥ T032

---

## Parallel Example: User Story 1

```bash
# Lançar todos os testes da US1 juntos (test-first):
Task: "tests/etl/initiatives.test.ts (T011)"
Task: "tests/etl/productions.test.ts (T012)"
Task: "tests/etl/pillars.test.ts (T013)"
Task: "tests/etl/pipeline.test.ts (T014)"

# Depois implementar em ordem:
Task: "src/etl/initiatives.ts (T015)" → "src/etl/productions.ts (T016)" → "src/etl/pillars.ts (T017)" → "src/etl/main.ts (T018)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completes Phase 1: Setup (T001–T002)
2. Completes Phase 2: Foundational (T003–T010) — CRÍTICO, bloqueia tudo
3. Completes Phase 3: US1 (T011–T018)
4. **STOP and VALIDATE**: `npm run etl` ×2 → hashes idênticos, zip conforme
5. MVP entregue: pacote determinístico gerado ponta a ponta

### Incremental Delivery

1. Setup + Foundational → fundação pronta
2. US1 → validar determinismo (MVP!)
3. US2 → fidelidade `null`/`0` verificada campo a campo
4. US3 → resolução de campus + `todos` corretos
5. US4 → validação contratual e atomicidade
6. US5 → CLI polido e cobertura integral
7. Polish → privacidade, lint, quickstart, SC-001…SC-008

---

## Notes

- [P] tasks = arquivos distintos, sem dependências
- [Story] label mapeia a tarefa à user story para rastreabilidade
- Verificar que cada teste FALHA antes de implementar (Princípio II)
- Commit após cada tarefa ou grupo lógico
- Parar em qualquer checkpoint para validar a story de forma independente
- Evitar: tarefas vagas, conflito de mesmo arquivo entre [P], dependências entre stories que quebrem independência
