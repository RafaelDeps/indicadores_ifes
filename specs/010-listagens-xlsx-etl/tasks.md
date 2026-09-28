# Tasks: ETL de Listagens de Matrícula (XLSX) → Dados dos Pilares

**Input**: Design documents from `/specs/010-listagens-xlsx-etl/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are **MANDATORY** (constitution Principle II — Test-First). Cada
teste deste arquivo DEVE ser escrito primeiro, rodado e observado FALHAR (red)
antes da implementação que o faz passar (green). Rode `make test-etl`
(`PYTHONPATH=. .venv/bin/python -m pytest -q tests/etl`).

**Organization**: Tasks grouped by user story (US1 P1→MVP, US2 P2, US3 P3).
Contratos: [saida_pacote.md](./contracts/saida_pacote.md) e
[classificacao_cota.md](./contracts/classificacao_cota.md). Valores esperados
(Serra, medidos): NTE 2025=1857; cotistas 2025=616 (análise interna); NTECPP
2025=93 (cruzamento NEP × cotistas — Fase 7).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência)
- **[Story]**: [US1]/[US2]/[US3]
- Sempre com caminho exato de arquivo.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependência e infraestrutura de teste mínimas.

- [x] T001 Add `openpyxl>=3.1.0` to `requirements-etl.txt` (leitura XLSX, justificada no plan.md)
- [x] T002 [P] Create synthetic xlsx builder in `tests/etl/factories/listagens_factories.py` (openpyxl: escreve `.xlsx` com linha 1 título "Campus <X> – Todos os Cursos - Semestres letivo: <AAAA>/<S>", linha 2 vazia, linha 3 cabeçalho com as 8 colunas exatas; helpers p/ linhas típicas: matriculado, formado, concluído, cancelado, cotista/ampla)
- [x] T003 [P] Add fixtures in `tests/etl/conftest.py` (tmp_dir de entrada, caminhos de saída `indicadores_listagens.zip`, caminho do pacote canônico)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: classificações, modelos e o ajuste do sink que TODO o fluxo usa.

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

- [x] T004 Create classification constants in `etl/core/logic/classificacoes_listagens.py` (`SITUACOES_NTE = frozenset({"Matriculado","Formado"})`, `NAO_COTA_MATRICULA` e `NAO_COTA_INGRESSO` conforme `contracts/classificacao_cota.md` §2.1/§2.2, + helper `ser_coluna_de_cota(coluna, valor)` = valor não-vazio fora da lista negativa da coluna)
- [x] T005 Create listagens models in `etl/core/logic/models/listagens.py` (`EstudanteListagem` com `matricula`, `situacao`, `forma_ingresso`, `forma_matricula_cota`; `ListagensExtraidas` com agrupamento `(campus_slug, ano) → {semestre: list[EstudanteListagem]}` e `avisos: list[str]`) e exportar em `etl/core/logic/models/__init__.py`
- [x] T006 Update `etl/core/logic/models/indicators.py` — anotações `nte_total_estudantes_matriculados` e `ntecpp_cotistas_pesquisa` para `int | None = None` (sem mudar defaults/uso do pipeline canônico)
- [x] T007 [P] Write sink parametrization tests in `tests/etl/test_adapters.py` (default `campos_derivaveis=∅` continua rejeitando NTE/NTECPP não-null; com `campos_derivaveis={"NTE_total_estudantes_matriculados","NTECPP_cotistas_em_pesquisa"}` os aceita mas continua rejeitando qualquer outro campo da lista de nulos preenchido) — **observar falhar (red)**
- [x] T008 Implement sink parametrization in `etl/adapters/sinks/zip_indicadores_sink.py` (parâmetro `campos_derivaveis: frozenset[str] = frozenset()` na validação e no construtor `ZipIndicadoresSink`; campo em `CAMPOS_QUE_DEVEM_SER_NULOS` && em `campos_derivaveis` deixa de ser exigido nulo) — **green**

**Checkpoint**: Fundação pronta — classificações, modelos e sink capazes de
receber NTE/NTECPP sem enfraquecer a fidelidade do fluxo canônico.

---

## Phase 3: User Story 1 - NTE anual por campus a partir das listagens (Priority: P1) 🎯 MVP

**Goal**: O fluxo lê `data/raw/listagem_<AAAA>_<S>.xlsx`, valida o contrato de 8
colunas, computa NTE (matrículas únicas com situação Matriculado/Formado em
pelo menos um semestre) e emite `pilar{N}_{campus}_{year}.json` em
`data/dist/indicadores_listagens.zip` preenchendo somente
`PIES.NTE_total_estudantes_matriculados` e `PICOT.NTECPP_cotistas_em_pesquisa`
(cruzamento FR-012, Fase 7 — os cotistas desta story são a análise interna
base do cruzamento); demais slots `null`.

**Independent Test**: em dados sintéticos de 2025 (dois semestres, campus
Serra), o zip contém `pilar1_serra_2025.json` com `NTE == 1857` e
`NTECPP == 93` (dados reais; em sintético, o valor declarado do cruzamento),
demais campos `null`, pilar2/3 no shape do contrato; duas
execuções ⇒ checksums idênticos.

### Tests for User Story 1 (MANDATORY — escrever/rodar em red antes) ⚠️

- [x] T009 [P] [US1] Write source tests in `tests/etl/test_listagens_source.py` — contrato exato (8 colunas, linha 3), cabeçalho divergente ⇒ `ERRO`, arquivo ausente registrado como aviso/anomalia; leitura de linhas típicas
- [x] T010 [P] [US1] Write calculator tests in `tests/etl/test_listagens_calculator.py` — NTE: matriculado nos 2 semestres conta 1×; formado conta; Concluído/Cancelado/Trancado não contam; dedup por matrícula; e contagem de cotistas na regra de conjunção (casos de `classificacao_cota.md` §3)
- [x] T011 [P] [US1] Write flow tests in `tests/etl/test_listagens_flow.py` — fim-a-fim sintético 2025 → zip; conteúdo do `pilar1_serra_2025.json`; demais slots `null`; determinismo (2 execuções, sha256 iguais)

### Implementation for User Story 1

- [x] T012 [US1] Implement `etl/adapters/sources/listagens_xlsx_source.py` (openpyxl read-only; extrai campus/ano/semestre; valida contrato; retorna `ListagensExtraidas`) — green p/ T009
- [x] T013 [US1] Implement `etl/core/logic/calculators/listagens.py` (`calcular_nte_por_campus_ano`, `calcular_cotistas_por_campus_ano`, funções puras) — green p/ T010
- [x] T014 [US1] Implement `etl/flows/listagens_flow.py` (espelha `IndicadoresFlow`: extrai → calcula → monta `AgregadosPilar1` com `None` explícito em ntpp/qspp/nep e NTE/cotistas preenchidos → `formatar_arquivos_pilar` → sink com `campos_derivaveis`) e `etl/adapters/sinks/` — green p/ T011
- [x] T015 [US1] Implement CLI `etl/main_listagens.py` (args `--entrada` padrão `data/raw`, `--saida` padrão `data/dist/indicadores_listagens.zip`, `--anos` opcional [auto-descobre anos], `--campus` opcional; `ERRO:`+1 e `AVISO:` corrigidos)
- [x] T016 [US1] Wire exports e caminhos: `etl/__init__.py`/`flows/__init__.py` conforme importável por `python -m etl.main_listagens`; rodar `python -m etl.main_listagens` nos dados reais e conferir stdout/resumo e `pilar1_serra_2025.json` (1857/93)

**Checkpoint**: US1 completa e testável isoladamente (MVP). Ver relatório do
CLI e os números medidos.

---

## Phase 4: User Story 2 - Fidelidade das dimensões ingresso × matrícula (Priority: P2)

**Goal**: garantir que "cotista" exige **ambas** as colunas "de cota", com a
classificação exata de `contracts/classificacao_cota.md` (incluindo strip/None e
os casos-limite dos 118 cruzados e do rótulo M9).

**Independent Test**: cenário sintético de 4 estudantes (spec US2) ⇒ cotistas ==
2; aluno Ampla×Escola Pública não conta; aluno PS Ação Afirmativa×Não possui
não conta.

### Tests for User Story 2 (MANDATORY — red antes) ⚠️

- [x] T017 [P] [US2] Extend `tests/etl/test_listagens_calculator.py` — 4 casos da spec; aluno ingresso "Ampla Concorrência" (ou "Pós-Graduação - Ampla Concorrência") × cota de reserva NÃO é cotista; rótulo "M9 - Enem - Ampla Concorrência" com coluna cota "Ampla Concorrência" NÃO é cotista; "PS - Ação Afirmativa 1 - PPI" × cota cota É cotista 1×; None/vazio em qualquer coluna não é cotista
- [x] T018 [P] [US2] Extend `tests/etl/test_listagens_source.py` — `strip()` em textos; linha sem `Matrícula` registra aviso e não entra nas contagens; célula numérica de matrícula normalizada para str

### Implementation for User Story 2

- [x] T019 [US2] Ensure calculators/classificação aplicam a conjunção exata (strip, None) usando `classificacoes_listagens.py` e o contrato §2/§3 — green p/ T017 e T018 (nenhum outro campo afetado; revalidar T010)

**Checkpoint**: US1 e US2 funcionam de forma independente e consistente.

---

## Phase 5: User Story 3 - Auditoria, avisos e privacidade (Priority: P3)

**Goal**: `AVISO:` para semestre/título/campus divergente e linha sem matrícula;
`ERRO:`+1 e sem saída parcial para falhas fatais; zero PII no pacote.

**Independent Test**: pacote não contém nenhum Nome/Matrícula/valor individual
das planilhas; remover `listagem_2026_2.xlsx` produz `AVISO:` nomeando o arquivo
sem falhar; ambos os semestres ausentes ou cabeçalho corrompido ⇒ `ERRO:`+1.

### Tests for User Story 3 (MANDATORY — red antes) ⚠️

- [x] T020 [P] [US3] Extend `tests/etl/test_listagens_flow.py` — AVISO semestre ausente (pacote ainda gerado, exit 0); ERRO ambos semestres ausentes (exit 1, sem pacote); ERRO cabeçalho corrompido (exit 1, sem saída parcial); AVISO título divergente do nome do arquivo (ano/semestre/campus)
- [x] T021 [P] [US3] Write privacy test in `tests/etl/test_listagens_flow.py` (ou `test_listagens_privacy.py`) — string do zip não contém nenhum `Nome`/`Matrícula` nem valor de cota/ingresso individual dos dados sintéticos

### Implementation for User Story 3

- [x] T022 [US3] Implement emissão de avisos/erros no source/flow/CLI: semestre ausente (aviso), ambos ausentes/anomalia de contrato (falha → `ERRO:`+1), divergência título × nome de arquivo, campus divergente entre semestres, linha sem matrícula (`AVISO:`) — green p/ T020
- [x] T023 [US3] Assegurar privacidade na serialização (somente contagens; modelos nunca expõem Nome/Matrícula; caso necessário, restringir campos serializados) — green p/ T021

**Checkpoint**: US1–US3 independentes; `make check` (pytest + lint + vitest)
verde.

---

## Phase 7: NTECPP = cruzamento NEP × cotistas por nome (Priority: P1) 🎯

**Contexto (decisão de 2026-09-28)**: o export canônico não carrega
`matrícula`/`identification_id` (verificado por 3 métodos), então o único
cruzamento possível entre estudantes em pesquisa (NEP) e cotistas das listagens
é **por nome normalizado**. Publicar `NTECPP` = |NEP ∩ cotistas| por nome
normalizado (FR-012). Por construção NTECPP ≤ NEP; interseção vazia ⇒ `null`
(Princípio III); sem export canônico ⇒ `null` + `AVISO:`. Medidos:
2024=73, 2025=93, 2026=96 (sempre ≤ NEP 349/422/391). A classificação "em
pesquisa" foi extraída para `papeis.py` e reutilizada pelo `aggregator` para o
match nunca divergir do NEP publicado.

### Tests for NTECPP match (MANDATORY — red antes) ⚠️

- [x] T030 [P] Write `tests/etl/test_ntecpp_match.py` — interseção entre conjuntos; dedup; interseção vazia ⇒ `None`; normalização feita antes do match (entrada já normalizada); chave ausente ⇒ `None`; invariante NTECPP ≤ NEP
- [x] T031 [P] Write `tests/etl/test_estudantes_pesquisa.py` — nomes dos estudantes em pesquisa por `(campus/"todos", ano)` com o mesmo critério do `aggregator` (membership com `roles` que inclui "Student"); membro sem `person_name`/sem pessoa registrada ⇒ descartado
- [x] T032 Extend `tests/etl/test_listagens_flow.py` — fim-a-fim com `fonte_canonica` (NTECPP==2 do match sintético); sem fonte canônica ⇒ NTECPP `None`; teste de privacidade com nome de cotista coletado em memória (não vaza ao zip)

### Implementation for NTECPP match

- [x] T033 Implement `etl/core/logic/normalizacao_nomes.py` (`normalizar_nome`: minúsculas, NFKD deaccent, espaços colapsados) — green p/ T030
- [x] T034 Implement `etl/core/logic/calculators/papeis.py` (`eh_estudante_em_pesquisa`, `eh_pesquisador_em_pesquisa`) e refatorar `aggregator.py` para reutilizar (comportamento idêntico); implementar `etl/core/logic/calculators/estudantes_pesquisa.py` (`nomes_estudantes_pesquisa_por_escopo_ano`) e `ntecpp.py` (`calcular_ntecpp_match`) — green p/ T030–T032
- [x] T035 Implement captura de `ListagensExtraidas.nomes_cotistas` no `listagens_xlsx_source.py` (só cotistas, normalizados, em memória — Princípio IV) e o cruzamento no `listagens_flow.py` (`fonte_canonica` opcional via `ZipCanonicalSource`) + CLI `--canonical` (default `data/canonical/exports_canonical.zip`; ausente ⇒ NTECPP `null` + `AVISO:`) — green p/ T032
- [x] T036 Atualizar docs (spec FR-012/US1/SC-002, contracts/`saida_pacote.md` §2/§5, data-model §5b, quickstart, plan, tasks, checklists) com o método, valores medidos (73/93/96) e pedido de dados (`matrícula`/`identification_id`) para a correção exata; regenerar `make etl-listagens` + `make merge-listagens`; validar NTECPP ≤ NEP no zip e `make check` verde

**Checkpoint**: `pilar1_serra_{ano}.json` publica NTECPP = 73/93/96 sempre ≤ NEP;
o site exibe NTECPP 93 (2025) onde o antigo proxy mostrava 616 (> NEP 422).

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: integração com o site (SC-005), automação e validação final.

- [x] T024 [P] Write merge tests in `tests/etl/test_listagens_merge.py` — sobrepõe APENAS `PIES.NTE` e `PICOT.NTECPP`; idempotente; determinístico; arquivo só-listagens acrescentado — red antes
- [x] T025 [P] Implement `etl/scripts/merge_listagens_indicadores.py` (CLI `--listagens --canonical --saida`; valida diff de chaves; escrita determinística atômica) — green p/ T024
- [x] T026 [P] Add `Makefile` targets `etl-listagens` e `merge-listagens` (e incluir em `check`/docs de help)
- [x] T027 [P] Update `.github/workflows/deploy.yml` — job `quality` adiciona `setup-python` + `pip install -r requirements-etl.txt` + `pytest -q tests/etl` + `flake8 etl tests/etl` + `black --check` + `isort --check` antes do build (Princípio VI)
- [x] T028 [P] Run `quickstart.md` validações nos dados reais: NTE=1857; cotistas=616 (análise interna); NTECPP=93; determinismo (sha256); grep de PII; `make etl` + `etl-listagens` + `merge-listagens` + `npm run build` e conferir card PIES exibindo 1.857 e NTECPP 93 (SC-005)
- [x] T029 Run `make format` e `make check` completos (black/isort/flake8; pytest legado + novos; vitest) — tudo verde, sem regressão do pipeline canônico (`tests/etl/test_fidelity.py`, `test_adapters.py`, `test_flow.py`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — começa imediato
- **Foundational (Phase 2)**: depende do Setup; **bloqueia** US1–US3
- **US1 (P3)**: depende da Fundação; nenhuma dependência de outras stories
- **US2 (P4)**: depende da Fundação (e read of US1 infra); testável isolado
- **US3 (P5)**: depende da Fundação e do fluxo US1 (aviso/erro ocorrem no source/flow)
- **Polish (P6)**: depende de US1–US3

### User Story Dependencies

- **US1**: testes T009–T011 antes do código T012–T016 (ciclo TDD por teste)
- **US2**: estende testes; T019 revalida T010 (não duplicar código)
- **US3**: ferramentas de aviso/ERRO e privacidade usam o source/flow de US1
- **Merge/CI/Polimento**: aplicam-se depois de US1 (merge usa os pacotes)

### Within Each User Story

1. Escrever/rodar testes → observar FALHAR (red)
2. Implementar mínimo para passar (green)
3. Refatorar mantendo `make check` verde

### Parallel Opportunities

- T002/T003 (Setup); T007 (teste sink); T009–T011 (testes US1); T017/T018 (testes
  US2); T020/T021 (testes US3); T024 (teste merge) — arquivos distintos
- T026/T027 (Makefile × deploy.yml) podem rodar em paralelo com T024/T025

---

## Parallel Example: User Story 1 (MVP)

```bash
# 1) Testes primeiro (red):
PYTHONPATH=. .venv/bin/python -m pytest tests/etl/test_listagens_source.py -q -x
# ver T009 a falhar por ausência do módulo — depois implementar T012 …
```

---

## Implementation Strategy

### MVP First (apenas US1)

1. Setup → 2. Foundational → 3. US1 (T009–T016) → **STOP & VALIDATE**:
   `python -m etl.main_listagens` nos dados reais → `pilar1_serra_2025.json`
   (1857/93 — NTE 1857, NTECPP cruzamento 93); rodar determinismo e se
   necessário merge `npm run build`.

### Incremental Delivery

1. Fundação pronta → US1 demonstravel (MVP)
2. US2 (fidelidade de dimensões) → garante regra de cota, sem quebrar US1
3. US3 (avisos/privacidade) → robustez e LGPD
4. Fase 7 (cruzamento NTECPP) → NTECPP = NEP ∩ cotistas por nome (FR-012),
   sempre ≤ NEP
5. Polish (merge + CI + validação quickstart) → site exibe NTE e NTECPP (SC-005)

### Notes

- [P] = arquivos diferentes, sem dependência.
- Configurar `.venv` com openpyxl (T001) antes de qualquer teste.
- Nunca commitar `data/raw/` (fora do Git); pacotes em `data/dist/` seguem o
  padrão atual do repositório.
- Confirmada a Questão 2 (spec Assumptions): os cotistas são subconjunto do
  NTE pela regra das duas colunas (forma de ingresso E forma de matrícula/cota).
- **NTECPP (Fase 7)**: publicado pelo cruzamento NEP × cotistas por nome
  normalizado (FR-012); 73/93/96 medidos, sempre ≤ NEP; sem export canônico ou
  interseção vazia ⇒ `null` (nunca `0`). O pedido de dados à plataforma
  (`matrícula`/`identification_id` no export canônico) permite a correção exata.
