# Tasks — speckit 012: gate de proveniência e workflow do `make dados`

Derivado de `data/raw/plano_speckit_012_workflow_dados.md`. Cada tarefa é
verificável por um comando; nenhum item depende de decisão pendente que não
esteja marcada como tal.

Convenção do Princípio II (RED → GREEN → refactor): toda tarefa de código traz o
teste que falha antes da implementação.

---

## Grupo A — o portão

Não altera o pacote publicado. Testável localmente, sem CI e sem segredos.
**Este grupo não espera o grupo B.**

### A1. Função de cobertura NTE/NTECPP

- [ ] T001 **RED**: teste da função nova — pacote com as chaves `(campus, ano)`
  que a fonte tem, mas sem alguns no pacote ⇒ violation com as chaves listadas.
  Casos: tudo coberto; falta uma chave; `todos` com `null` nos dois lados
  (não é violação); fonte ausente (não é violação, mas sim `INFO:`).
- [ ] T002 **GREEN**: implementar a função de comparação de conjuntos de chaves
  `(campus, ano)` com NTE entre pacote e zip de listagens. Reaproveitar o
  leitor de zip e o `PADRAO_PILAR1` que já existem em
  `merge_listagens_indicadores.py`.
- [ ] T003 **RED**: `check_dados` com a Etapa 1.5 — pacote sem uma chave que a
  fonte tem ⇒ `ERRO:` na stderr e exit ≠ 0.
- [ ] T004 **GREEN**: Etapa 1.5 no `check_dados`, entre a Etapa 1 (contrato) e a
  Etapa 2 (frescor). Reaproveitar `_caminho_ou_padrao` (linha 104), o padrão
  `caminho_listagens is not None and .exists()` (linha 144) e a lista
  `ausentes` (linha 133). Sem flag nova, sem script novo.

Por que não "exigir NTE não nulo": `pilar1_todos_*.json` tem `null`
legitimamente (3 de 6 arquivos `pilar1`). Ver §1.3 do plano.

### A2. A guarda passa a bloquear entrada stale

- [ ] T005 **RED**: `avaliar_cadeia` com zip de listagens **presente mas sem
  cobrir** as chaves do canônico, e `data/raw` vazia ⇒ deve bloquear.
  Hoje o docstring diz "ainda que stale" e libera.
- [ ] T006 **GREEN**: `cadeia_dados.avaliar_cadeia` chama a função de A1. Sai o
  "ainda que stale" do docstring (`cadeia_dados.py:111`).
- [ ] T007 **RED**: o caso que hoje passa em silêncio — zip velho + `data/raw`
  vazia — deve bloquear com `ERRO:` em estrito e `AVISO:` em soft, preservando o
  pacote por não-toque.
- [ ] T008 **GREEN**: idem. Exit code inalterado (`CODIGO_BLOQUEADO = 3`).

### A3. Tarefas isoladas

- [ ] T009 **GREEN**: comentário em `requirements-etl.txt` explicando por que as
  ferramentas de teste/lint usam `==` e `openpyxl` mantém faixa. *(Substitui o
  `test_requirements_pins.py`, que foi descartado: um teste de 5 linhas revisadas
  é pedágio em cada dependência futura.)*
- [ ] T010 **GREEN**: spec 006 linhas 19/92/100 — uma nota inline apontando a
  supersessão da linha 170. Não reescrever o texto histórico. *(M6)*

### A4. Opcional, menor gravidade

- [ ] T011 **RED**: `obterAnosDisponiveis` com campus inexistente não deve
  devolver a série completa; e `obterIndicadorCompleto`/`obterIndicadoresDoPilar`
  com `campusSlug = 'serra'` fixo quando `'serra'` não está no pacote.
- [ ] T012 **GREEN**: comportamento explícito. *(M5' — robustness de site, não
  integridade de dado. O M1 já cobre o cenário que a motivou.)*

### Portão do grupo A

- [ ] T013 `make check` verde, com a Etapa 1.5 ativa contra o pacote commitado.
- [ ] T014 o job `quality` do `deploy.yml` passa a exercitar o gate sem passo
  novo — só confirmar, não mudar o workflow.

---

## Grupo B — a automação

Altera o pacote público. **Não começa antes de A1 estar no ar.**

### B1. Credencial

**Bloqueado por D4.** B1 e B2 dependem de D4 (§5bis do plano). As tarefas abaixo
são do desenho com Drive + chave, que serve de referência; ajustar conforme a
plataforma escolhida.

- [ ] T015 Criar service account no GCP, **sem** propriedade dos arquivos:
  compartilhar a pasta do Drive *para* ela, somente leitura.
- [ ] T016 Guardar a config INI do rclone (com a chave embutida) como secret do
  repo. **Um** secret só.
- [ ] T017 Registrar os **IDs** dos arquivos do Drive, não os nomes.

### B1-bis. Higiene do dado — não depende de D4, pode ser feita antes

- [ ] T031 **Deduplicar as cópias das planilhas.** Hoje há 12 arquivos em dois
  lugares — `~/Documents/` e `data/raw/` — de conteúdo idêntico (6 hashes para
  12 arquivos). Escolher uma localização canônica e apagar a outra. Ver §5.1.
- [ ] T032 Se a escolha for GCS: bucket em `southamerica-east1`, com **Public
  Access Prevention** e lifecycle rule para apagar listagens de semestre
  anterior. Residência (LGPD art. 33) e expurgo viram configuração, não
  bom-vontade.
- [ ] T033 Se a escolha for WIF: condição `attribute.repository` no trust policy
  apontando só para este repositório, e `id-token: write` explícito em
  `permissions:` — nunca herdado. É o único detalhe que, se errado, deixa outro
  repositório muntar token.
- [ ] T034 Nenhum passo do `dados.yml` faz `upload-artifact` do que estiver em
  `data/raw/`. `.gitignore` protege o git e não protege o artifact — que fica
  baixável por 90 dias.

### B2. `dados.yml`

- [ ] T018 RED: teste ou verificação manual de que o workflow falha alto quando o
  secret está ausente (não pode seguir com a pasta vazia).
- [ ] T019 `on: workflow_dispatch` **apenas**. Nunca `pull_request` nem
  `pull_request_target` com essa credencial. `schedule` só em B5.
- [ ] T020 `permissions:` explícitos no próprio workflow, não herdado.
- [ ] T021 Baixar as planilhas: `rclone copy` com config em `$RUNNER_TEMP`,
  `chmod 600`, apagada no fim. **Sem `set -x` no passo** — a config renderizada
  não é mascarada pelo GitHub.
- [ ] T022 Baixar o canônico de `raw.githubusercontent.com` por `export_sha` com
  default fixado no YAML. Nunca `main`.
- [ ] T023 `actions/*` por tag maior, como o `deploy.yml` já faz (`@v4`, `@v5`).

### B3. Execução

- [ ] T024 `make dados` em modo **estrito**. Soft é proibido neste workflow.
- [ ] T025 `make check-dados` — que já inclui a Etapa 1.5 do grupo A. Nenhum
  passo de gate novo.
- [ ] T026 Confirmar que o pacote regenerado é byte-idêntico ao local quando as
  entradas não mudaram. A ETL é determinística; se não for, há bug de
  reprodutibilidade a investigar antes de seguir.

### B4. Publicação

- [ ] T027 Abrir PR com o pacote regenerado, em branch do workflow. PR, não push
  direto: passa pelo `quality` duas vezes (a do PR e a do merge).
- [ ] T028 `--amend`/force-push de commits do bot é aceitável; runs
  concorrentes devem ser serializados por `concurrency`.

### B5. Agendamento (D2 — por último de tudo)

- [ ] T029 `schedule` só depois que o grupo B rodar manual várias vezes sem
  incidente. Bloqueio em soft é invisível num job agendado: "não fez nada, sem
  erro" é o pior resultado possível.
- [ ] T030 Nunca `schedule` com soft; nunca agendar antes de A1.

---

## Fora do escopo do speckit

- **Q `AVISO:` por planilha** (N avisos, um por spreadsheet) — spec 011 está em
  `Draft`; é território de speckit, e o template do contrato já embute `<nome>`.
  Não recomendado mesmo se permitido.
- **Byte-compare "sem diff → sem PR"** — é conveniência, não proteção. Decidir
  depois de ver o job rodando.
- **WIF no lugar da chave da service account** — endurecimento, não bloqueio. A
  chave é a parte que se pode perder.
- **Ingestor do site engole nome fora do regex** — premissa **falsa**; o ETL
  valida o nome antes de escrever e o regex do site é mais permissivo. Ver §3 M5.

---

## Dependências bloqueadas

- **D4 — plataforma das planilhas** (§5bis). Escolha binária: o CI precisa das
  planilhas, ou só do agregado? Se precisar, WIF ou chave. Bloqueia B1 e B2.
  **T031 a T034 não dependem dela** e podem começar já.
- **D3** — o FR-013 da spec 006 (linha 133) diz *"sem regeneração automática em
  CI"*. O grupo B **supersede** essa frase. Precisa ser escrito no `spec.md`,
  não deixado implícito. Bloqueia a redação do spec, não a implementação de A.
- **D2** — `schedule` ou só manual. Recomendação no plano: manual primeiro.
  Bloqueia B5 apenas.

---

## Fora do speckit, por ser local

Os dois documentos deste plano (`plano_speckit_012_workflow_dados.md` e
`tasks_speckit_012.md`) e o `check_prosa.py` estão em `data/raw/`, que é
**ignorado** (`.gitignore:26`). São de trabalho, não versionados — o que também
significa que hook de pre-commit para eles nunca dispararia.

Vale considerar movê-los para `specs/012-*/` quando o speckit começar, onde
seriam rastreados e lidos por outra pessoa.
