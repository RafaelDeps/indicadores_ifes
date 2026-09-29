# Tasks: Modo Soft (SOFT=1), Verificação de Frescor e Target Único do ETL

**Input**: Design documents from `/specs/011-etl-soft-mode-frescor/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Tests are **MANDATORY** (constitution Principle II — Test-First). Cada
teste deste arquivo DEVE ser escrito primeiro, rodado e observado FALHAR (red)
antes da implementação que o faz passar (green). Rode `make test-etl`
(`PYTHONPATH=. .venv/bin/python -m pytest -q tests/etl`).

**Organization**: Tasks grouped by user story (US1 P1, US2 P1, US3 P2).
Contratos: [etl-cli.md](./contracts/etl-cli.md) e
[check-dados.md](./contracts/check-dados.md). Nenhuma mudança de dados nem de
contrato de saída (shape da 010 intocado).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência)
- **[Story]**: [US1]/[US2]/[US3]
- Sempre com caminho exato de arquivo.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: fixtures/helpers para simular entradas ausentes e pacotes de saída.

- [x] T001 [P] Add helpers in `tests/etl/conftest.py` — fixture `dir_raw_vazio`
      (dir de entrada sem planilhas), fixture `zip_existente` (zip de saída
      pré-criado com conteúdo conhecido p/ comparação sha256), fixture
      `canonical_ausente` (monkeypatch/tmp sem `exports_canonical.zip`)

---

## Phase 2: User Story 1 - Pipeline tolerante a entradas ausentes (Priority: P1) 🎯 MVP

**Goal**: modo soft opt-in (`--soft` / `SOFT=1`) nas três CLIs que **pula com
`AVISO:`** a etapa cuja entrada falta, preservando por não-toque o último
snapshot coerente; fail-fast (contrato 006) mantido como default (FR-002..FR-005).

**Independent Test**: `SOFT=1` sem export + zip existente ⇒ exit 0, sha256
inalterado, `AVISO:` no stderr; sem `SOFT` ⇒ `ERRO:` + exit 1.

### Tests for User Story 1 (MANDATORY — escrever/rodar em red antes) ⚠️

- [x] T002 [P] [US1] Write `tests/etl/test_soft_mode.py` — 8 cenários: 1. `etl.main` soft + canônico ausente + saída existe → exit 0, AVISO no
      stderr, zip byte-idêntico (sha256) 2. `etl.main` soft + canônico ausente + saída não existe → exit 1 (ERRO) 3. `etl.main` **sem soft** + canônico ausente → exit 1 (regressão contrato 006) 4. `etl.main_listagens` soft + `data/raw` sem planilhas → exit 0, AVISO,
      zip de listagens não criado (nem sobrescrito se preexistente) 5. `etl.main_listagens` soft + canônico ausente → exit 0, NTECPP `null`
      (never `0`), AVISO explícito "não recalculável a partir do zip" 6. `etl.main_listagens` **sem soft** + sem planilhas → exit 1 (ERRO) 7. `merge_listagens_indicadores` soft + zip de listagens ausente → exit 0,
      AVISO, `indicadores.zip` byte-idêntico 8. `merge_listagens_indicadores` **sem soft** + zip ausente → exit 1 (ERRO)

### Implementation for User Story 1

- [x] T003 [US1] Implement `--soft` + env `SOFT=1` em `etl/main.py` (parser +
      guarda antes do ERRO de entrada ausente: se soft e saída existe → AVISO +
      return 0; se soft e saída não existe → ERRO + return 1) — green p/ T002 (c1-c3)
- [x] T004 [US1] Implement `--soft` + env `SOFT=1` em `etl/main_listagens.py`
      (se soft e nenhuma planilha encontrada → AVISO + exit 0 sem gerar zip;
      manter degradação do `--canonical` ausente + AVISO "não recalculável") —
      green p/ T002 (c4-c6)
- [x] T005 [US1] Implement `--soft` + env `SOFT=1` em
      `etl/scripts/merge_listagens_indicadores.py` (se soft e zip de listagens
      ausente → AVISO + exit 0 sem tocar `indicadores.zip`) — green p/ T002 (c7-c8)

**Checkpoint**: US1 completa — `SOFT=1` roda a sequência inteira com entradas
ausentes preservando o pacote; estrito continua quebrando ruidosamente.

---

## Phase 3: User Story 3 - Confiar no pacote publicado: `make check-dados` (Priority: P2)

**Goal**: `etl/scripts/check_dados.py` valida o contrato do pacote (reuso de
`validar_arquivos_pilar` + `CAMPOS_DERIVAVEIS_LISTAGENS`) e emite `AVISO:` de
frescor por `mtime`, com entradas ausentes ignoradas e limitação de clone/CI
documentada (FR-007..FR-009).

**Independent Test**: contrato violado ⇒ exit 1; canônico mais novo que o
pacote ⇒ `AVISO:` + exit 0; pacote em dia ⇒ exit 0 sem avisos.

### Tests for User Story 3 (MANDATORY — red antes) ⚠️

- [x] T006 [P] [US3] Write `tests/etl/test_check_dados.py` — 9 cenários: 1. contrato violado (chave removida de um JSON do zip) → exit 1 (`ERRO:`) 2. pacote em dia (zip mais novo que todas as entradas presentes) → exit
      0, sem aviso de frescor e **sem** linha `INFO:` 3. `exports_canonical.zip` mais novo que o pacote → exit 0 com `AVISO:`
      "possivelmente desatualizado" 4. `indicadores_listagens.zip` mais novo que o pacote → exit 0 com
      `AVISO:` de proveniência (merge não reexecutado) 5. `data/raw/listagem_*.xlsx` mais nova que o pacote → exit 0 com `AVISO:` 6. **todas** as entradas de frescor ausentes (só o zip) → exit 0, nenhuma
      comparação, **uma única** linha `INFO:` listando os caminhos ausentes
      ("apenas o contrato foi validado") — sem falso alarme e sem silêncio
      ambíguo 7. **parcialmente** presentes (ex.: só `--canonical`) → comparação feita
      apenas para as presentes; linha `INFO:` lista somente as ausentes;
      exit 0 8. `--raw` sem planilhas conta como ausente (entra na linha `INFO:`);
      `--raw` com planilhas presentes é comparado 9. `--canonical ""` suprime a comparação e faz a entrada constar na
      linha `INFO:` 10. pacote mais novo que as listagens (a ordem saudável do `make dados`, em que o merge
      escreve por último) → exit 0 e **silêncio total**: trava contra o falso positivo de proveniência.

### Implementation for User Story 3

- [x] T007 [US3] Implement `etl/scripts/check_dados.py` — CLI com
      `--pacote`, `--canonical`, `--listagens` e `--raw`; validação por
      `validar_arquivos_pilar` + `CAMPOS_DERIVAVEIS_LISTAGENS` → ERRO+1;
      frescor por `stat().st_mtime` conforme `contracts/check-dados.md` §3
      (entradas ausentes ignoradas) — green p/ T006

**Checkpoint**: US3 completa — um comando diz "posso confiar neste zip?".

---

## Phase 4: User Story 2 - Pacote completo com um único comando: `make dados` (Priority: P1)

**Goal**: alvo único `make dados` (etl → etl-listagens → merge-listagens),
parando no primeiro erro, repassando o soft via `SOFT=1`; alvo `make
check-dados` no Makefile (FR-006, FR-007).

**Independent Test**: `SOFT=1 make dados` sem entradas (com zip commitado) ⇒
exit 0 com AVISOs e zip byte-idêntico; `make dados` sem soft ⇒ aborta na 1ª
etapa com exit 1.

### Tests for User Story 2

> A orquestração em si não é coberta por pytest (é shell/Make); a validação é
> automatizada por T008 no `deploy.yml`? **não** — o CI não roda o ETL. Cobertura
> via validação manual do quickstart + um teste de "contrato de orquestração" se
> viável (ex.: `make -n dados` dry-run listando as 3 etapas em ordem).

- [x] T008 [US2] Add `Makefile` targets: `dados` e `check-dados`, variável
      `SOFT` (`SOFT_ARGS = $(if $(SOFT),--soft,)`), `.PHONY` e `help` (FR-006/FR-007)
- [x] T009 [P] [US2] Update `.github/workflows/deploy.yml` — job `quality`
      adiciona `PYTHONPATH=. python -m etl.scripts.check_dados` após o `pytest`
      (portão de contrato do zip commitado; **sem** adicionar `make dados`/ETL
      ao CI) — Princípio VI

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: documentação e validação final.

- [x] T010 [P] Update `README.md` (tabela de comandos: `make dados`,
      `make check-dados`, variável `SOFT`; nota "ETL é manual/local; o pacote
      é commitado e o CI valida o contrato via check-dados")
- [x] T011 [P] Update `specs/010-listagens-xlsx-etl/quickstart.md` (se
      necessário) apontando para o target único `make dados` como a forma
      recomendada de orquestração das etapas 010
- [x] T012 Run `quickstart.md` validações (modo soft preserva sha256; fail-fast
      default; check-dados nos 4 cenários; fluxo completo com entradas
      presentes ⇒ NTE 1857 / NTECPP 93) e `make format` + `make check` completos
      (flake8/black/isort; pytest legado + novos; vitest) — tudo verde, sem
      regressão do pipeline canônico (`test_fidelity.py`, `test_adapters.py`,
      `test_flow.py`, `test_listagens_*.py`, `test_privacy.py`)
- [x] T013 Inverter a condição da regra b de frescor em `check_dados.py`
      (`mtime(listagens) > mtime(pacote)`) — a condição original acusava
      proveniência na **ordem saudável** do `make dados`, em que o merge escreve
      o pacote por último: falso positivo garantido em toda execução completa.
      Atualizar contrato §3 (+ bloco de sentido da regra), FR-008, SC-004,
      `data-model.md`, `quickstart.md`, `research.md`, `plan.md`, T006 e o
      cabeçalho de cenários dos testes; registrar a cegueira decorrente em
      `check-dados.md` §5.1 e mitigá-la no README (não regenerar o pacote
      público com `make etl` isolado)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências — começa imediato
- **US1 (Phase 2)**: depende do Setup
- **US3 (Phase 3)**: depende do Setup; paralela à US1 (arquivos de teste
  distintos)
- **US2 (Phase 4)**: T008/T009 podem rodar em paralelo com T002–T007
- **Polish (Phase 5)**: depende de US1 + US2 + US3

### Within Each User Story

1. Escrever/rodar testes → observar FALHAR (red)
2. Implementar mínimo para passar (green)
3. Refatorar mantendo `make check` verde

### Parallel Opportunities

- T001 (Setup); T002 (testes US1) × T006 (testes US3); T008/T009 (Makefile ×
  deploy.yml) — arquivos distintos

---

## Implementation Strategy

### MVP First (apenas US1)

1. Setup → 2. US1 (T002 testes red → T003–T005) → **STOP & VALIDATE**:
   `SOFT=1 make dados` com entradas ausentes → exit 0, sha256 do zip inalterado.

### Incremental Delivery

1. Fundação pronta → US1 (soft) demonstravel (MVP)
2. US3 (check-dados) → confiabilidade do pacote publicado
3. US2 (make dados + CI gate) → orquestração e portão de contrato
4. Polish → docs + validação final (`make check` verde)

### Notes

- [P] = arquivos diferentes, sem dependência.
- Nenhuma dependência Python nova; nenhuma mudança no contrato de saída.
- Nunca commitar `data/raw/`, `data/canonical/` ou `indicadores_listagens.zip`;
  `data/dist/indicadores.zip` (agregados) segue o padrão atual (commitado).
- **Regressão crítica**: `test_fidelity.py` e `test_adapters.py` devem
  continuar verdes — o modo soft não pode alterar o caminho de sucesso do
  pipeline (especialmente: soft + entradas presentes ⇒ saída idêntica à
  execução normal).
