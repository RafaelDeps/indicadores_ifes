---

description: 'Task list for feature 012 — gate de proveniência e automação do make dados'
---

# Tasks: Gate de Proveniência do Pacote e Automação do `make dados`

**Input**: Design documents from
`/specs/012-gate-proveniencia-workflow-dados/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md,
contracts/check-dados.md, contracts/dados-workflow.md, quickstart.md,
medidas-de-protecao.md

**Tests**: MANDATÓRIAS por este projeto (constitution, Princípio II). Toda
tarefa de código traz o teste que **falha antes** da implementação.

**Organization**: Tarefas agrupadas por user story, para que cada story possa ser
implementada, testada e entregue de forma independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: qual user story (US1, US2, US3)
- Caminhos exatos em toda tarefa de código

---

## Fase 0: Baseline já medido

O baseline desta feature **não precisa ser reconquistado** — foi executado contra
o código atual e está registrado com saída literal em
[quickstart.md](./quickstart.md) §1, §1.1 e §4. Reexecutar é opcional; o que é
obrigatório é que a implementação **confirme** os três vereditos depois.

| cenário | hoje (verificado 2026-09-30) | depois |
| --- | --- | --- |
| pacote com 12 derivados nulados | `exit 0`, `Sucesso: 18 arquivo(s)` | exit ≠ 0, 6 linhas `ERRO:` |
| guarda com zip parcial, `raw` vazia | `exit 0` | exit 3 |
| guarda com zip parcial + planilha do ano | `exit 0` | exit 0 (não muda) |

**A Fase 1 não é setup de infraestrutura.** A feature não introduz dependência,
framework nem configuração nova, e portanto não há andaime a montar. O que existe
sob o rótulo "setup" é a **extração de um helper de teste compartilhado**,
necessária porque os dois arquivos de teste que a feature altera precisam
construir o mesmo objeto por caminhos diferentes hoje.

---

## Fase 1: Setup (helper de teste compartilhado)

**Purpose**: extrair o construtor de pacotes de teste, hoje duplicado — ou
ausente — entre os dois arquivos de teste que esta feature vai alterar.

**Contexto verificado**: `tests/etl/test_check_dados.py` já tem
`_registro_pilar1()` e `_escrever_zip()` com `date_time` fixo (determinismo).
`tests/etl/test_cadeia_dados.py` **não tem** — o `_cenario()` dele grava
`b"listagens"` e `b"pacote"`, bytes que não são zip. Isso importa: a guarda, ao
passar a ler o zip de listagens, vai encontrar bytes falsos. **T012** trata
disso, e a falha inicial é **informativa**, não um acidente — ela mostra que o
teste nunca exercitou o caminho que a nova regra usa.

- [ ] T001 Criar `tests/etl/factories/pacotes.py` com `registro_pilar1()`,
      `escrever_zip()` e `serializar()`, **movendo** a lógica de
      `tests/etl/test_check_dados.py` sem alterá-la. `date_time=(1980,1,1,0,0,0)`
      e `external_attr` são obrigatórios: sem eles os zips não são byte-idênticos
      e a comparação do grupo B perde sentido
- [ ] T002 Fazer `tests/etl/test_check_dados.py` importar de
      `tests/etl/factories/pacotes.py` e remover as cópias locais. `make check`
      deve continuar com **193 testes verdes** — a extração é rearranjo, não
      mudança

**Checkpoint**: 193 testes verdes com a duplicação removida. Se a contagem mudar,
a extração mexeu em comportamento e deve ser desfeita.

---

## Fase 2: Foundational (bloqueia todas as stories)

**Purpose**: o módulo de cobertura. **Nenhuma story começa antes disto** — os
dois chamadores precisam existir para que o teste do chamador tenha contra o que
falhar.

**⚠️ CRITICAL**: T003 e T004 são o par RED→GREEN do núcleo.

- [ ] T003 RED: criar `tests/etl/test_cobertura_listagens.py` com os casos de
      `tests/etl/factories/pacotes.py`. Casos **obrigatórios**, todos com par e
      campo nomeados: (a) perda vazia; (b) par ausente no pacote; (c) par
      presente com campo nulo — **mesmo veredito de (b)**; (d) escopo agregado
      nulo em ambos os lados — **sem** violação; (e) par no pacote e não na
      origem — **sem** violação; (f) um dos dois derivados presente e o outro
      ausente — violação **só** no ausente; (g) ordem do relatório estável entre
      duas execuções; (h) nenhum nome de escopo, campus ou ano em código —
      verificar por inspeção, não por teste
- [ ] T004 GREEN: criar `etl/core/logic/cobertura_listagens.py` com a cobertura
      de um conjunto de registros e a subtração de perda. Importar `PADRAO_PILAR1`
      de `etl/scripts/merge_listagens_indicadores.py` e
      `CAMPOS_DERIVAVEIS_LISTAGENS` de `etl/flows/listagens_flow.py` — **não**
      redefinir nenhum dos dois. Usar `tests/etl/factories/pacotes.py`

**Checkpoint**: o módulo passa em T003 e `make check` está verde.

---

## Fase 3: User Story 1 — Detectar pacote que perdeu a contribuição (Priority: P1) 🎯 MVP

**Goal**: `check-dados` reprova um pacote em que a origem tem derivado e o
pacote não tem.

**Independent Test**: entregar a `check-dados` o pacote de
[quickstart.md](./quickstart.md) §1 com `--listagens` presente, e ver 6 linhas
`ERRO:` e saída ≠ 0 — **sem que nada mais no repositório tenha mudado**.

### Testes para User Story 1 (MANDATÓRIO — Princípio II) ⚠️

- [ ] T005 RED: em `tests/etl/test_check_dados.py`, caso de perda — pacote com
      um par a menos que a origem ⇒ stderr contém `ERRO:` e `main()` ≠ 0.
      Usar `--canonical ""` e `--raw ""` para isolar a Etapa 1.5 da Etapa 2
- [ ] T006 [P] RED: em `tests/etl/test_check_dados.py`, os três vereditos —
      perda vazia **silencia**; origem ausente (`--listagens ""`) emite `INFO:`
      e sai 0; origem presente e íntegra não emite `ERRO:`
- [ ] T007 [P] RED: em `tests/etl/test_check_dados.py`, origem presente mas
      **ilegível** (bytes que não são zip) ⇒ `ERRO:` e saída ≠ 0. Não pode cair
      no veredito `INFO:`

### Implementação para User Story 1

- [ ] T008 GREEN: Etapa 1.5 em `etl/scripts/check_dados.py`, entre a Etapa 1
      (linha 126) e a Etapa 2 (linha 131). Reaproveitar `_caminho_ou_padrao` e a
      lista `ausentes` — **sem flag nova, sem script novo**. O nome da flag
      `--listagens` **não muda**: já existe com outra finalidade no contrato 011
- [ ] T009 GREEN: mensagens em português de
      [contracts/check-dados.md](./contracts/check-dados.md) §3.2 — uma linha por
      perda, par e campo, ordenação estável por `(campus, ano, campo)`, e a
      distinção entre "arquivo ausente" e "campo nulo"
- [ ] T010 GREEN: a Etapa 1.5 **não** tem variante sob modo tolerante e o
      `check_dados` não define `SOFT`. Não há nada a implementar aqui — a tarefa
      é **verificar por inspeção** que nenhum caminho de código diferente da
      Etapa 1.5 lê `SOFT` ou `os.getenv("SOFT")`
- [ ] T011 GREEN: ponteiro para a Etapa 1.5 em
      `specs/011-etl-soft-mode-frescor/contracts/check-dados.md`, e nota na §5.1
      desse mesmo arquivo registrando que a lacuna que ele nomeia **está fechada**
      e por qual documento. Sem reescrever o texto histórico — a §5.1 é o
      registro do que se sabia, e apagá-la destruiria a evidência

**Checkpoint**: `make check` verde **e** `make check-dados` passando contra o
pacote commitado sem alteração do arquivo. É o critério que impede a feature de
"funcionar" reprovando o pacote bom.

---

## Fase 4: User Story 2 — Impedir que a cadeia comece de uma entrada incompleta (Priority: P2)

**Goal**: a guarda bloqueia quando a cadeia reduziria cobertura que o pacote
publicado hoje tem.

**Independent Test**: com pacote cobrindo 3 anos, zip de listagens cobrindo 1 e
`raw` vazia, a guarda bloqueia com exit **3**; com a planilha do ano perdida
presente, ela libera.

### Correção de fixture — precede os testes desta fase

Esta tarefa vem **primeira** de propósito. `_cenario()` grava bytes que não são
zip, e os testes de cobertura precisam de zip de verdade para exercitar a regra
nova. Sem T012, os testes de T013 a T017 seriam verde sobre o caminho errado.

- [ ] T012 Em `tests/etl/test_cadeia_dados.py`, `_cenario()` passa a escrever
      **zips reais** via `tests/etl/factories/pacotes.py`, e cada teste existente
      passa a montar o pacote e o zip com a cobertura que o nome do teste já
      promete. Etiqueta **FIXTURE**, e não RED/GREEN: não é teste nem
      implementação, é conserto de insumo de teste. `make check` continua verde ao
      final dela

### Testes para User Story 2 (MANDATÓRIO — Princípio II) ⚠️

- [ ] T013 RED: em `tests/etl/test_cadeia_dados.py`, zip de listagens presente
      mas cobrindo menos que o pacote, `raw` vazia ⇒ `main()` == 3 e stderr tem
      `ERRO:` nomeando os pares. **Este é o único cenário do quickstart que muda
      de veredito (0 → 3)**. Cobre a FR-010
- [ ] T014 [P] RED: em `tests/etl/test_cadeia_dados.py`, zip de listagens
      ilegível e `raw` sem planilha ⇒ bloqueia. Zip ilegível é erro, não ausência
- [ ] T015 [P] RED: em `tests/etl/test_cadeia_dados.py`, pacote **sem cobertura
      de derivados** ⇒ libera (não há cobertura a perder). Este caso impede que a
      guarda vire bloqueio permanente depois da primeira execução
- [ ] T016 [P] RED: em `tests/etl/test_cadeia_dados.py`, com o par perdido
      reposto por planilha bruta cujo nome tem o ano correspondente ⇒ libera.
      Guarda de regressão: impede a guarda de ficar restritiva demais
- [ ] T017 RED: em `tests/etl/test_cadeia_dados.py`, modo tolerante com a mesma
      entrada degradada ⇒ `AVISO:` e saída 3, e o arquivo do pacote **inalterado**
      em conteúdo e data de modificação

### Implementação para User Story 2

- [ ] T018 GREEN: `etl/scripts/cadeia_dados.py` — `avaliar_cadeia` passa a chamar
      a cobertura de `etl/core/logic/cobertura_listagens.py` em vez de
      `listagens.exists()` (linha 110). A "entrada capaz de repor" é o conjunto de
      cobertura do zip **unido** ao dos anos com planilha bruta, lidos do nome
      pelo `PADRAO_ARQUIVO` de `etl/adapters/sources/listagens_xlsx_source.py`
- [ ] T019 GREEN: atualizar o docstring de `etl/scripts/cadeia_dados.py`, que hoje
      diz que o zip presente serve "ainda que stale" (linha 111). A frase é a
      descrição do defeito, e deixá-la seria documentar errado
- [ ] T020 GREEN: `CODIGO_BLOQUEADO = 3` **inalterado**, e nenhum código de saída
      novo (FR-012). `tests/etl/test_cadeia_dados.py` já fixa 3; a tarefa é não
      quebrar

**Checkpoint**: US1 e US2 funcionando de forma independente;
`make check` verde; os cenários da §3 e §4 do quickstart com o resultado
esperado.

---

## Fase 5: User Story 3 — Regenerar o pacote sem passos manuais (Priority: P3)

**Goal**: uma ação manual produz um pull request com o pacote regenerado a
partir das entradas oficiais.

**Independent Test**: disparar manualmente em repositório de teste e conferir os
6 itens da §5.4 do quickstart.

> **Depende de US1.** Automatizar antes do portão republicaria em silêncio o
> defeito. A dependência é técnica, não de conveniência.

### Fase 5a: Credencial e insumo (fora do repositório)

> **T021–T038 podem ser executados, mas não podem ser mesclados** antes da
> revisão de privacidade. A constituição exige revisão de privacidade antes do
> merge de feature que trata dado, e ela não pode ocorrer enquanto a §4.1 de
> [medidas-de-protecao.md](./medidas-de-protecao.md) tiver as três caixas
> abertas. Isto difere do bloqueio de T022: ali falta uma **resposta**; aqui
> falta um **requisito que não existe**. Preparar o repositório e o segredo é
> trabalho legítimo e pode ser feito; publicar o workflow não. O grupo A não é
> bloqueado — não toca dado pessoal.

- [ ] T021 Criar o repositório privado `dados-listagens`, publicar a release `v1`
      com os 6 assets anexados. **Arquivo commitado não serve** — commit vira
      objeto no histórico e apagar não apaga (medidas-de-protecao M-4)
- [ ] T022 Emitir, **na conta dona do `dados-listagens`**, um PAT fine-grained
      com `contents: read` sobre **um** repositório e `expires_in: none`.
      **Não** é token clássico: escopo `repo` daria leitura de todos os
      repositórios alcançáveis pela conta. **É** fine-grained justamente porque
      o repositório fica em outra conta: o token precisa nascer lá, e escopo
      restrito é o que impede que ele alcance também esta conta
- [ ] T023 Configurar `DADOS_LEITURA_TOKEN` como segredo **deste** repositório.
      **Único** segredo da feature. Guardar junto, em texto datado, o caminho da
      revogação — *outra conta → Settings → Developer settings → Personal access
      tokens*. Sem esse registro, quem procurar revogar acha o token na lista de
      segredos daqui e não acha onde revogá-lo
- [ ] T024 Obter os `asset_id` por
      `GET /repos/<dono>/dados-listagens/releases/tags/v1` e a revisão de 40
      caracteres do export canônico. Registrar `dono`, `versao`, os 6 pares
      `(nome, asset_id)` e `revisao` em `dados-insumo.yml` na raiz, conforme
      [data-model.md](./data-model.md) §6

> **Condição de T022, não bloqueio**: o `dados-listagens` é de outra conta do
> mantenedor — resposta dada em 2026-09-30, e por isso o PAT **não** vira GitHub
> App (ver research D3: App troca um segredo por três e só se justifica quando
> quem emite não é quem usa). Resta **uma** verificação: se essa conta for
> **organização** em vez de pessoal, é preciso ser proprietário e a política
> dela precisa admitir token de escopo restrito. Se negar, D3 é reavaliada antes
> de emitir — não depois.

### Fase 5b: O workflow

- [ ] T025 RED: verificação manual de que `dados.yml` falha **alto** quando o
      segredo está ausente, com mensagem explícita e sem chegar à cadeia.
      Registrar a saída em [quickstart.md](./quickstart.md) §5.4
- [ ] T026 GREEN: `.github/workflows/dados.yml` com `on:` contendo
      **apenas** `workflow_dispatch`, e `permissions:` explícitos
      (`contents: write`, `pull-requests: write`) — nunca herdados. **Nem**
      `pull_request`, **nem** `pull_request_target`
- [ ] T027 GREEN: passo que confere presença e não-vazio do segredo antes de
      qualquer chamada de rede, falhando com mensagem própria em vez de deixar o
      `curl` devolver 401 genérico
- [ ] T028 GREEN: passo de leitura e validação de `dados-insumo.yml` — `dono`
      não vazio, 6 entradas obrigatórias e `revisao` de 40 caracteres. Manifesto
      incompleto é falha de nome, não de download, e `dono` ausente é falha de
      nome **antes** do download, porque o 404 de dono e o 404 de repositório têm
      a mesma mensagem
- [ ] T029 GREEN: download dos assets com `curl -fsSL`, cabeçalho de
      autorização e barra de progresso silenciada. **Sem** `set -x` no passo: a
      configuração renderizada na página de execução não é mascarada. Nenhum
      passo ecoa nome, matrícula ou nascimento (FR-026, FR-028)
- [ ] T030 GREEN: download do export canônico por `raw.githubusercontent.com` na
      `revisao` do manifesto. **Nunca** `main`
- [ ] T031 GREEN: **conferência de contagem** após o download — 6 planilhas
      esperadas, divergência é falha. `-f` no `curl` impede gravar corpo de erro
      dentro do `.xlsx`; a contagem é a rede de proteção contra o download parcial
- [ ] T032 GREEN: `make dados` em modo **estrito**. O workflow **não** define
      `SOFT`
- [ ] T033 GREEN: `make check-dados` e **conferir que não há `INFO:` de cobertura**
      — no workflow a origem existe, então a ausência do `INFO:` é a prova de que
      a Etapa 1.5 realmente rodou
- [ ] T034 GREEN: comparação byte a byte do pacote regenerado com
      `data/dist/indicadores.zip` versionado; divergir com insumo inalterado
      interrompe. Divergir é quebra de determinismo (spec 006 FR-011), e a falha é
      do gate
- [ ] T035 GREEN: abertura de pull request com o pacote. **Nunca** envio direto —
      o merge passa pelo job `quality`, que é o caminho de publicação de sempre
- [ ] T036 [P] GREEN: `concurrency` para serializar execuções concorrentes, com o
      pacote como chave
- [ ] T037 GREEN: nenhum `upload-artifact` no workflow (FR-028). **Verificar por
      inspeção**, não por configuração: um artifact esquecido é o vetor de
      exposição mais óbvio e mais difícil de perceber depois

### Fase 5c: Registro

- [ ] T038 Preencher
      `specs/012-gate-proveniencia-workflow-dados/medidas-de-protecao.md` §6.1
      com o resultado da **primeira execução bem-sucedida**: a página da
      execução foi aberta, M-2 confirmado e M-5 conferido linha a linha. Uma
      linha por execução, com data e com quem conferiu. O documento nasceu como
      registro de **intenção**; depois da execução é registro de **controle**, e
      a diferença é o que o torna auditável

**Checkpoint**: os 6 itens da §5.4 do quickstart conferidos; nenhum dado
individual nem credencial no log, no PR ou em artifact.

---

## Fase 6: Polish e trabalho transversal

**Purpose**: o que atravessa as três stories, e o que é pequeno e isolado.

### Documentação

- [ ] T039 [P] Comentário em `requirements-etl.txt` explicando por que as
      ferramentas de teste e lint usam `==` e por que `openpyxl` mantém faixa.
      Substitui um teste de fixação, que seria pedágio em cada dependência futura
- [ ] T040 [P] Nota inline em
      `specs/006-deterministic-etl-pipeline/spec.md` registrando que a proibição de
      regeneração automática em CI (FR-013, linha 133) passa a admitir o caminho
      de **disparo manual**, e que agendamento segue não decidido. Não reescrever
      o texto histórico
- [ ] T041 [P] Verificar que o job `quality` de `.github/workflows/deploy.yml`
      exercita a verificação **sem passo novo**. É tarefa de **verificação**, não
      de edição: a FR-020 exige ausência de etapa nova, e a tentação natural ao
      ler "a verificação precisa rodar" é justamente adicionar um passo

### Higiene do dado (independe de D4, de credencial e de execução)

- [ ] T042 [P] **Deduplicar** as 12 cópias das planilhas na máquina: 6 em
      `~/Documents/` e 6 em `data/raw/`, conteúdo idêntico, 6 hashes distintos.
      Escolher uma localização canônica e apagar a outra. Ver
      medidas-de-protecao §4.2
- [ ] T043 [P] Reexecutar `git check-ignore -v data/raw/listagem_*.xlsx` e anexar
      a saída a `medidas-de-protecao.md` §2, linha M-1. **Evidência versionada**,
      não afirmação

### Validação

- [ ] T044 `make check` verde — lint, formatação, `pytest` (193 + novos) e
      `vitest` (151) — e, no mesmo passo, `make check-dados` **passando contra o
      pacote commitado, sem alteração do arquivo** (FR-008). São duas verificações
      distintas: `make check` prova que o código está são, `make check-dados`
      prova que a regra nova não reprova o pacote bom
- [ ] T045 Executar a §1, §1.1, §3 e §4 do [quickstart.md](./quickstart.md) e
      **corrigir o documento** onde o resultado observado divergir do esperado.
      O quickstart tem resultados de "antes" verificados; os de "depois" ainda não
      existem, e esta é a tarefa que os produz
- [ ] T046 `git status --short` mostrando **apenas** os arquivos desta feature.
      Se `data/dist/indicadores.zip` aparecer modificado, algum passo escreveu no
      lugar errado — investigar antes de seguir

---

## Matriz de rastreabilidade: FR → tarefa

Nenhuma tarefa carrega etiqueta de FR. Uma matriz faz o mesmo trabalho sem
transformar 46 tarefas em texto repetido, e deixa visível o caminho inverso:
dada uma FR, qual tarefa a entrega.

| FR | tarefa | FR | tarefa |
|---|---|---|---|
| FR-001 | T003, T004 | FR-016 | T026 |
| FR-002 | T003, T009 | FR-017 | T024, T030 |
| FR-003 | T003 | FR-018 | T027, T028, T031 |
| FR-004 | T006, T008 | FR-019 | T032 |
| FR-005 | T004 | FR-020 | T033, T041 |
| FR-006 | T005, T009, T010 | FR-021 | T034 |
| FR-007 | T017 | FR-022 | T035 |
| FR-008 | T044, T045 | FR-023 | T037 |
| FR-009 | T004, T046 | FR-024 | T026, T040 |
| FR-010 | T013, T018 | FR-025 | T040 |
| FR-011 | T016, T018 | FR-026 | T029, T037, T038 |
| FR-012 | T020 | FR-027 | T038 |
| FR-013 | T021 | FR-028 | T037, T038 |
| FR-014 | T022, T023 | | |
| FR-015 | T024, T028 | | |

### Três FRs verificadas por inspeção, e não por teste

| FR | como se verifica | por que não há teste |
|---|---|---|
| FR-005 (ponto único de decisão) | `grep` dos chamadores: os dois importam a **mesma** função, e a comparação não está duplicada | é uma propriedade de estrutura do repositório; um teste passaria mesmo com a regra duplicada em outro lugar |
| FR-009 (formato do pacote inalterado) | `git status` sem `data/dist/indicadores.zip` modificado (T046) | o pacote é artefato commitado; o teste seria ele próprio |
| FR-020 (sem etapa nova no CI) | inspeção de `.github/workflows/deploy.yml` (T041) | o requisito é a **ausência** de uma edição; não há o que testar |

As três estão listadas aqui como inspecionais justamente para que a matriz não
declare cobertura onde só há conferência visual.

### SC → tarefa

| SC | como se prova | tarefa |
|---|---|---|
| SC-001 | casos (b) e (c) de T003, mais T005 e a mensagem de T009 | T003, T005, T009 |
| SC-002 | caso (d) de T003 — agregado nulo dos dois lados **não** viola — mais a suíte inteira em T044 | T003, T015, T044 |
| SC-003 | `make check-dados` contra o pacote commitado, e `git status` sem o pacote modificado | T044, T046 |
| SC-004 | inspeção de `.github/workflows/deploy.yml`: nenhum passo novo | T041 |
| SC-005 | disparo manual do workflow até o PR aberto, sem comando na máquina | T026, T035 |
| SC-006 | ausência de `upload-artifact`, nenhum passo ecoando dado, e a §6.1 preenchida | T029, T037, T038 |
| SC-007 | comparação byte a byte antes de abrir o PR | T034 |
| SC-008 | segredo ausente falha com mensagem própria; contagem de 6 planilhas falha com outra | T027, T031 |
| SC-009 | **ordem**, não teste: o portão (T033) roda antes do PR (T035), e a tabela de não-paralelismo fixa essa ordem | T033 → T035 |
| SC-010 | as 7 medidas têm responsável e condição na §6; a §6.1 registra o resultado por execução | T038 |

SC-009 é o único que não se prova por teste: é uma propriedade de ordem. Por isso
ele aparece aqui como seta, e não como lista.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Fase 1 (Setup)**: sem dependência — começa imediatamente
- **Fase 2 (Foundational)**: depende da Fase 1 — **BLOQUEIA** todas as stories
- **Fase 3 (US1)**: depende da Fase 2
- **Fase 4 (US2)**: depende da Fase 2. Depende da Fase 3 **na prática** porque a
  Etapa 1.5 precisa existir para os cenários com cobertura serem coerentes — mas
  é verificável isoladamente
- **Fase 5 (US3)**: depende das Fases 3 **e** 4 mergeadas
- **Fase 6 (Polish)**: depende das stories desejadas

### User Story Dependencies

- **US1 (P1)**: começa após a Fase 2. Nenhuma dependência de outra story
- **US2 (P2)**: começa após a Fase 2. Integra com US1, e **deve** ser testável
  isoladamente
- **US3 (P3)**: começa após US1 e US2. A dependência é técnica: sem o portão, a
  automação republica em silêncio o defeito

### Within Each User Story

- Testes **antes** da implementação, e observados **falhando**
- GREEN antes de refactor
- Story completa antes da próxima prioridade

### Parallel Opportunities

- T002 depende de T001 — não é paralelo
- T005, T006 e T007 são paralelas entre si (mesmo arquivo, casos independentes —
  revisar em conjunto, não em paralelo por pessoa)
- T014, T015 e T016 são paralelas entre si
- T036 e T037 são paralelas entre si
- T039, T040, T041, T042 e T043 são paralelas entre si — e **independentes das
  stories**, podem ser feitas a qualquer momento

### O que NÃO pode ser paralelo

| par | por que |
|---|---|
| T003 → T004 | RED antes de GREEN, por construção |
| T012 → T013 | o fixture tem de montar zip real antes de o teste exercitar cobertura |
| T013 → T018 | idem, visto do lado da implementação |
| T021 → T022 → T024 | o repositório e o token existem antes de os identificadores serem obtidos |
| T024 → T028 | o manifesto precisa existir para o workflow validá-lo |
| T032 → T033 → T034 | cadeia, verificação e comparação são ordem, não escolha |
| qualquer coisa → T038 | o registro de controle vem depois do controle existir |

---

## Parallel Example: Fase 2 e US1

```bash
# A cobertura é o núcleo e o primeiro chamador não pode esperar:
Task: "RED: tests/etl/test_cobertura_listagens.py"
Task: "GREEN: etl/core/logic/cobertura_listagens.py"
```

```bash
# Depois, os três casos da Etapa 1.5 de uma vez:
Task: "RED: perda => ERRO + saída != 0 em tests/etl/test_check_dados.py"
Task: "RED: os três vereditos em tests/etl/test_check_dados.py"
Task: "RED: origem ilegível em tests/etl/test_check_dados.py"
```

---

## Parallel Example: Fase 6 (independente de tudo)

```bash
# Estas cinco podem ser feitas em qualquer momento, mesmo antes das stories:
Task: "comentário de fixação em requirements-etl.txt"
Task: "nota de substituição em specs/006-.../spec.md"
Task: "verificar o job quality sem passo novo"
Task: "deduplicar as 12 cópias das planilhas"
Task: "anexar evidência do git check-ignore"
```

---

## Implementation Strategy

### MVP First (US1 apenas)

1. Fase 1: extrair o helper
2. Fase 2: o módulo de cobertura
3. Fase 3: US1
4. **PARAR e VALIDAR**: `make check` verde, `make check-dados` passando contra o
   pacote commitado, e a §1 e a §3 do quickstart com os resultados esperados
5. **Mergear**. O portão sozinho já é entrega com valor — é o ponto: o portão
   **não deve esperar** pela automação que ele protege

### Entrega incremental

1. Fase 1 + 2 → base pronta
2. US1 → validar isoladamente → merge (MVP)
3. US2 → validar isoladamente → merge
4. US3 → validar em execução real → merge
5. Fase 6 por qualquer momento

### Estratégia com uma pessoa

Fases 1 e 2 são curtas. A partir daí, **US1 e US2 são sequenciais e o Grupo B
espera**. A justificativa de sequencial é que T018 toca um arquivo que T012 também
toca, e forçar paralelo ali seria só demonstração.

---

## Notes

- [P] = arquivos diferentes, sem dependência de tarefa incompleta
- [Story] mapeia cada tarefa à sua story, para rastreabilidade
- **Conferir o RED antes do GREEN** — sem isso "test-first" é só intenção
- Commit por tarefa ou por grupo lógico
- Parar em qualquer checkpoint para validar a story isoladamente
- **Tarefas T021–T024 são externas ao repositório** e não aparecem em
  `git status`. São pré-condição do grupo B, não artefato dele
- T022 está condicionada a uma resposta que ainda não foi dada (dono do
  repositório privado). Está escrito como bloqueio, não como suposição
- **Fora do escopo**: agendamento (FR-024 exige histórico de execuções manuais),
  carimbo de proveniência no pacote, teste de fixação de dependências, e a
  robustez de campus inexistente no site — o motivo de cada exclusão está na
  seção "Fora de escopo" do [spec.md](./spec.md)
