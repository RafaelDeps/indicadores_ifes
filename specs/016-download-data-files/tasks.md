---
description: 'Task list for 016 — Página de Downloads dos Dados e Guia de Instalação'
---

# Tasks: Página de Downloads dos Dados e Guia de Instalação

**Input**: Design documents from `/specs/016-download-data-files/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/pagina-downloads.md, quickstart.md

**Tests**: Tests are MANDATORY for this project (constitution Principle II, Test-First Development). Tests MUST be written BEFORE implementation and observed to fail first.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single project: `src/`, `tests/`, `etl/` at repository root.

## Decisões que restringem a execução

| Decisão   | Efeito nas tasks                                                                                                              |
| --------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **D-01**  | Insumos brutos passam a ser versionados e publicados. Depende de `.gitignore` (T007)                                          |
| **D-05**  | Só `indicadores.zip` é agregado. **Não** tocar em `data/dist/indicadores_*.zip`                                               |
| **R-002** | Artefatos copiados para `public/dados/` no build; `public/dados/` **não** é versionado                                        |
| **R-003** | Gate em Python (`pytest`), não shell no workflow                                                                              |
| **R-008** | `.gitignore` já foi alterado em `fb53e8f` (branch `012-…`) — **não** ancestral desta branch. Verificar antes de editar (T004) |

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar o ambiente e confirmar o estado de partida antes de escrever qualquer código.

- [x] T001 Instalar dependências do frontend e do Python com `make setup` (cria `.venv` e roda `npm install`)
- [x] T002 Confirmar que `data/dist/indicadores.zip` existe e descompactar para conferir os 18 arquivos (`unzip -l data/dist/indicadores.zip`)
- [x] T003 [P] Confirmar a presença dos insumos brutos com `ls data/canonical/exports_canonical.zip data/raw/listagem_*.xlsx` e registrar quais existem (T004 depende deste resultado)
- [x] T004 **Verificar** se `fb53e8f` deve ser trazido por merge: rodar `git merge-base --is-ancestor 012-gate-proveniencia-workflow-dados HEAD`. Se for ancestral, T007 é dispensável. Se não for, decidir entre merge da branch `012-…` ou edição direta do `.gitignore` — **não** fazer as duas coisas (R-008)
- [x] T005 Criar o diretório de destino dos artefatos com `public/dados/.gitkeep`
- [x] T006 Adicionar `public/dados/*` e `!public/dados/.gitkeep` ao `.gitignore` (conteúdo gerado, não versionado — R-002)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tipos, portão de governança e tokens que qualquer user story depende.

**⚠️ CRITICAL**: Nenhum trabalho de user story começa antes desta fase.

- [x] T007 Criar os tipos `ArtefatoDownload`, `NaturezaArtefato`, `Cobertura`, `InsumoCadeia`, `EtapaCadeia` e `OpcoesCarregamento` em `src/lib/downloads.ts`, conforme `data-model.md`
- [x] T008 [P] Criar `.specify/governanca/pendencias.yaml` com as três pendências (`emenda-principio-iv`, `revisao-privacidade`, `base-legal`) conforme o formato de `contracts/pagina-downloads.md` C-5
- [x] T009 [P] Adicionar os tokens de aviso de dado pessoal em `src/styles/tokens.css` (par `--color-notice-*`, já existente — reaproveitar, não duplicar; adicionar o que faltar para o badge e para o aviso de gate fechado)
- [x] T010 [P] Escrever `tests/etl/test_check_governanca.py` cobrindo P-1 a P-5 de `contracts/pagina-downloads.md` C-2 — **rodar e confirmar que falha** antes de T011
- [x] T011 Implementar `etl/scripts/check_governanca.py` no formato de `etl/scripts/check_dados.py`: ler o YAML, resolver `registro` contra o disco, emitir `OK:`/`AVISO:`/`ERRO:` com os exit codes de C-2 (depende de T010)
- [x] T012 [P] Adicionar o alvo `check-governanca` ao `Makefile` seguindo o padrão de `check-dados` (PYTHONPATH, `.DEFAULT_GOAL`, linha `##` para o `help`)
- [x] T013 [P] Escrever `tests/web/downloads.test.ts` com os testes de contrato de C-1: L-1 (disponível só se existe), L-2 (motivo preenchido quando indisponível), L-3 (gate fechado omite brutos mas mantém agregado), L-4 (sem path traversal), L-5 (listagem determinística) e L-6 (glob dos `.xlsx`) — **rodar e confirmar que falha** antes de T014
- [x] T014 Implementar `carregarDownloads()` em `src/lib/downloads.ts`: derivar a listagem do disco, derivar cobertura de `indicadores.zip` reusando `carregarDataset()` de `src/lib/dataset.ts`, descobrir `.xlsx` por glob, copiar disponíveis para `public/dados/` quando `copiarParaPublic` (depende de T013)
- [x] T015 [P] Adicionar o passo `check_governanca` ao job `quality` do `.github/workflows/deploy.yml`, **antes** de `npm run build` (Princípio VI)

**Checkpoint**: Fundação pronta — tipos, portão e listagem testáveis. US1 pode começar.

---

## Phase 3: User Story 1 - Encontrar o caminho para os dados a partir do header (Priority: P1) 🎯 MVP

**Goal**: Botão "Dados" no header compartilhado, visível em viewport largo e estreito, com item na gaveta móvel, levando a `/dados/`.

**Independent Test**: Abrir o site em viewport largo e estreito, localizar o botão, ativá-lo e chegar à página de downloads. Funciona mesmo que a página ainda não liste nada.

> **Nota**: US1 **não** depende de `src/lib/downloads.ts` nem do portão. Só do layout e de uma rota que exista. É o MVP e pode correr em paralelo com US2/US3.

### Tests for User Story 1 (MANDATORY per constitution Principle II) ⚠️

> **Escreva primeiro e confirme que FALHA**

- [x] T016 [P] [US1] Escrever `tests/web/header-dados.test.ts` com as garantias H-1 a H-7 de `contracts/pagina-downloads.md` C-3 (dois `href="/dados/"`, rótulo `Dados`, `aria-current` só na rota, classe em bloco não ocultado) — **rodar e confirmar que falha**
- [x] T017 [P] [US1] Escrever `tests/web/routes.test.ts` — acrescentar `src/pages/dados/index.astro` à lista `PAGINAS` e um caso de que a rota é acessível por URL — **rodar e confirmar que falha**

### Implementation for User Story 1

- [x] T018 [US1] Criar `src/pages/dados/index.astro` com o esqueleto mínimo: `BaseLayout`, `<h1>` em pt-BR e o esqueleto das seções que os outros stories vão preencher (depende de T017)
- [x] T019 [US1] Adicionar o link "Dados" em `.cabecalho-acoes` do `src/layouts/BaseLayout.astro`, com `class:list={['nav-aba', { ativa: isDados }]}` e `aria-current` conforme FR-004 (depende de T016, T018)
- [x] T020 [US1] Calcular `isDados` a partir de `Astro.url.pathname.startsWith('/dados')` em `src/layouts/BaseLayout.astro`, no mesmo padrão de `isPilar1`/`isPilar2`
- [x] T021 [US1] Adicionar o item correspondente em `.drawer-nav` do `src/layouts/BaseLayout.astro`, com `class="drawer-link"` e o mesmo `aria-current`
- [x] T022 [US1] Verificar o espelhamento de breakpoints: confirmar que `.cabecalho-acoes` não é ocultado em nenhum media query e que o cabeçalho não quebra na faixa 768–990 px (R-006)
- [x] T023 [US1] Rodar `npm run test:web -- header-dados routes` e confirmar que passa

**Checkpoint**: US1 completo e testável isoladamente. A página `/dados/` existe e é alcançável por URL e pelo header.

---

## Phase 4: User Story 2 - Baixar os dados e os insumos que os produzem (Priority: P2)

**Goal**: Listagem com metadados, download em uma ação, marcação de dado pessoal e estado "indisponível" em vez de link quebrado.

**Independent Test**: Abrir `/dados/` diretamente pela URL, baixar o pacote oficial e um insumo bruto em uma ação cada, sem autenticação.

### Tests for User Story 2 (MANDATORY per constitution Principle II) ⚠️

> **Escreva primeiro e confirme que FALHA**

- [x] T024 [P] [US2] Acrescentar a `tests/web/downloads.test.ts` os testes de renderização de C-4: rótulo, formato, tamanho, cobertura e data de atualização por item (depende de T013)
- [x] T025 [P] [US2] Acrescentar os testes de marcação: todo item de natureza `dado-pessoal` renderiza o texto "Contém dados pessoais — não anonimizado", legível sem cor (A-2)
- [x] T026 [P] [US2] Acrescentar os testes de proibições de C-4: Pg-1 (nenhum segredo na página), Pg-2 (nenhum link para arquivo ausente), Pg-3 (nenhum pacote parcial ou intermediário), Pg-5 (sem rolagem horizontal — asserção sobre ausência de larguras fixas)
- [x] T027 [P] [US2] Escrever o caso de estado Parcial: com `gateAberto: false`, a página lista o agregado e mostra os brutos como indisponíveis **com motivo** (depende de T010)

### Implementation for User Story 2

- [x] T028 [P] [US2] Criar `src/components/CartaoDownload.astro` com os props de `data-model.md`, renderizando rótulo, descrição, metadados, badge por `natureza` e a ação de download condicional a `disponivel`
- [x] T029 [US2] Renderizar o badge de dado pessoal com ícone **e** texto, usando os tokens de T009 — a marcação não pode depender de cor (A-2, FR-015)
- [x] T030 [US2] Renderizar o estado indisponível com `motivoIndisponivel` e **sem** `<a href>` (depende de T028, Pg-2)
- [x] T031 [US2] Montar em `src/pages/dados/index.astro` o grupo "Pacote oficial" a partir de `carregarDownloads()` filtrando `natureza === 'agregado'` (depende de T018, T028)
- [x] T032 [US2] Montar em `src/pages/dados/index.astro` o grupo "Insumos brutos" filtrando `natureza === 'dado-pessoal'` (depende de T031)
- [x] T033 [US2] Adicionar a declaração de fidelidade no cabeçalho da página: valores transcritos do relatório oficial, nenhum valor estimado (FR-025), alinhada ao texto do rodapé existente
- [x] T034 [US2] Exibir o aviso de governança quando o gate estiver fechado, traduzindo a pendência para o visitante sem expor identificadores internos (depende de T030)
- [x] T035 [US2] Rodar `npm run test:web -- downloads` e confirmar que passa (depende de T024 a T027)

**Checkpoint**: US2 completo. A página baixa o agregado e os brutos com marcação correta.

---

## Phase 5: User Story 3 - Saber como instalar os dados brutos (Priority: P3)

**Goal**: Seção de instalação com todos os insumos, origem, revisão e passos ordenados de posicionamento, execução e verificação.

**Independent Test**: Responder "de onde vem cada insumo e onde ele deve ficar" apenas com a informação da página; ou seguir o guia do início ao fim e produzir o pacote oficial.

### Tests for User Story 3 (MANDATORY per constitution Principle II) ⚠️

> **Escreva primeiro e confirme que FALHA**

- [x] T036 [P] [US3] Acrescentar a `tests/web/downloads.test.ts` os testes de cobertura do guia: 100% dos insumos de `data/raw/` e `data/canonical/` aparecem na tabela com caminho, etapa, finalidade, origem e revisão (FR-009, FR-024)
- [x] T037 [P] [US3] Acrescentar os testes de prohibitions do guia: nenhum segredo, credencial ou token na página (Pg-1) e comandos em bloco único (FR-012)
- [x] T038 [P] [US3] Acrescentar o teste do aviso de versionamento: a página alerta que versionar os insumos em repositório próprio os expõe a terceiros

### Implementation for User Story 3

- [x] T039 [P] [US3] Exportar a lista de `InsumoCadeia` de `src/lib/downloads.ts`, com `caminho`, `etapa`, `finalidade`, `origem`, `revisao`, `natureza` e `obtendoPublico`
- [x] T040 [US3] Renderizar em `src/pages/dados/index.astro` a seção "Instalação dos dados brutos" com a tabela de insumos a partir de T039 (depende de T039, T036)
- [x] T041 [US3] Escrever em `src/pages/dados/index.astro` os passos ordenados: posicionar insumos nos caminhos esperados, executar a cadeia (`make dados`), verificar o pacote (`make check-dados`) (FR-010)
- [x] T042 [US3] Renderizar os comandos em bloco único, copiável, em pt-BR, sem depender de formatação visual (FR-012, depende de T041)
- [x] T043 [US3] Renderizar o aviso de versionamento dos insumos em repositório próprio (depende de T038)
- [x] T044 [US3] Informar a origem e a revisão de cada insumo, reusando `dados-insumo.yml` como fonte da revisão do export canônico (FR-024, depende de T040)
- [x] T045 [US3] Rodar `npm run test:web -- downloads` e confirmar que passa

**Checkpoint**: Todas as três stories completas e testáveis isoladamente.

---

## Phase 6: Governança e gate de publicação

**Purpose**: Registrar as pendências de D-01 e fechar a divergência documental. **A publicação dos insumos brutos fica bloqueada até T048 e T049.**

- [x] T046 Rodar `PYTHONPATH=. python -m etl.scripts.check_governanca` e confirmar que o gate está fechado, com `AVISO:` nomeando as pendências e `exit=0` (QS-05)
- [x] T047 Confirmar que `public/dados/` contém apenas `indicadores.zip` e nenhum `.xlsx` nem `exports_canonical.zip` com o gate fechado
- [x] T048 **G-1**: registrar a emenda MAJOR do Princípio IV em `.specify/memory/constitution.md` — versão 1.1.0 → 2.0.0, data de emenda, Sync Impact Report no cabeçalho do arquivo, lista de templates revisados (FR-016a). Requer o registro de onde a base legal (D-03) fica referenciada na constitution
- [x] T049 **G-2 — registrar a aprovação já concedida** em `docs/revisao-privacidade.md`: transcrever a autorização de Paulo Sérgio dos Santos Júnior, Diretor de Extensão e Pesquisa do Campus Serra (data 2026-10-05), que cobre a base legal de tratar e publicar (art. 7º, II da LGPD) **e** a transferência internacional (art. 33), como registro versionado que satisfaz P-1. Atualizar `specs/012-gate-proveniencia-workflow-dados/medidas-de-protecao.md` §4.1 para registrar que as três verificações abertas estão cobertas pela autorização, em vez de "decisão institucional pendente" (a task T052 cobre o mesmo arquivo por outro ângulo — fazer as duas edições em conjunto)
- [x] T050 [P] **G-3**: alinhar `README.md` — atualizar a seção "Governança de Dados, Fidelidade e LGPD" para refletir D-01 e remover a afirmação de que a fonte canônica é "permanentemente ignorada pelo Git" (FR-016b, SC-010)
- [x] T051 [P] **G-3**: alinhar `specs/012-gate-proveniencia-workflow-dados/spec.md` — revisar FR-026/FR-028 para que não contradigam D-01 (FR-016b)
- [x] T052 [P] **G-3**: alinhar `specs/012-gate-proveniencia-workflow-dados/medidas-de-protecao.md` §3 — registrar que a base legal cobre publicação de dado **pessoal** (não sensível), conforme D-04, e **depende de T049**: as edições em §3 e §4.1 do mesmo arquivo devem ser feitas em conjunto para não deixar o documento internamente contraditório
- [x] T053 Rodar `PYTHONPATH=. python -m etl.scripts.check_governanca` e confirmar gate **aberto**, com os insumos copiados para `public/dados/` (QS-06)
- [x] T054 Confirmar que `npm run build` gera `dist/dados/` com o agregado e os brutos, e que os links usam o subendereço `/indicadores_ifes/` (QS-01, QS-12)

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T055 Rodar `npm run lint && npm run format:check && npm run test` e corrigir até zerar erros (Princípio V)
- [x] T056 Rodar `PYTHONPATH=. python -m flake8 etl tests/etl && PYTHONPATH=. python -m isort --check etl tests/etl && PYTHONPATH=. python -m black --check etl tests/etl && PYTHONPATH=. python -m pytest -q tests/etl`
- [ ] T057 **PARCIAL** — a parte automatizada de `quickstart.md` QS-10 passa (largura fixa, marcação de dado pessoal, `aria-current` só em `/dados/`, nome acessível dos links, e o contraste verificado por cálculo WCAG: 6,65:1 no claro e 9,23:1 no escuro). **A parte manual continua aberta**: ordem real de foco, contorno visível sobre cada fundo, a pastilha do badge a 320 px, e o anúncio em leitor de tela. Não marquei como concluída porque nenhum `grep` cobre esses quatro, e um item marcado `[X]` por inferência é pior do que um item marcado `[ ]`
- [x] T058 Rodar QS-11 (nenhum texto de interface em inglês) e QS-13 (nenhum pacote parcial ou intermediário na página)
- [x] T059 Rodar o cenário de QS-04 (arquivo ausente vira indisponível, não link quebrado) e restaurar o arquivo ao final
- [x] T060 [P] Atualizar o README com a seção da nova página de downloads, caso o mantenedor queira documentá-la para visitantes
- [x] T061 **Não se aplica** — `tests/web/propagacao-links.test.ts` não enumera rotas; ele exercita `normalizarDestinoLink()` com literais. A cobertura de rotas está em `tests/web/routes.test.ts`, que recebeu `/dados/` em T017

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all user stories**
- **US1 (Phase 3)**: Depends on Phase 2. **No dependency on US2/US3**
- **US2 (Phase 4)**: Depends on Phase 2 (T013, T014, T010, T011) e T018 de US1
- **US3 (Phase 5)**: Depends on Phase 2 e T018 de US1
- **Governança (Phase 6)**: Depends on T011 (gate) e T048/T049 para destravar a publicação
- **Polish (Phase 7)**: Depends on the stories being implemented

### Pendências G-1, G-2 e G-3 — resolvidas em 2026-10-05

As três pendências que mantinham a publicação fechada foram resolvidas durante a
implementação. O portão está **aberto**: os insumos brutos são publicados.

| Pendência | O que a resolve                                                    | Task      |
| :-------- | :----------------------------------------------------------------- | :-------- |
| G-1       | `.specify/memory/constitution.md` em 2.0.0, Princípio IV reescrito | T048      |
| G-2       | `docs/revisao-privacidade.md` com a autorização transcrita         | T049      |
| G-3       | README, spec 012 FR-026/FR-028 e `medidas-de-protecao.md` §3/§4.1  | T050–T052 |

**Fechar o portão de novo** é apagar (ou esvaziar) o `registro` de qualquer uma
das pendências em `.specify/governanca/pendencias.yaml`. O portão resolve contra
o disco, nunca contra um booleano — foi essa escolha que permitiu escrever as
pendências sem um campo `resolvida` capaz de divergir do que existe.

### Uma pendência que apareceu durante a implementação

Não estava na lista e não é um item dela — é uma **decisão de sequência** que a
lista de tarefas sugeria errada.

**T048 (a emenda da constitution) era uma decisão institucional, não uma tarefa
de implementação.** O plano a tratava como task a executar junto com o código.
Ela foi executada no fim, depois que a revisão de privacidade estava escrita,
porque é a segunda metade do mesmo ato: a autorização cobre a base legal, e a
emenda do princípio é o que autoriza a publicação no site público. Emitir a
emenda antes do registro da autorização teria deixado a constitution autorizando
uma publicação sem base legal documentada — o inverso da ordem em que as duas
metades fazem sentido.

### Achados de implementação que mudaram o contrato

Nenhum destes estava previsto no plano; todos apareceram ao rodar o build real.

| #   | Achado                                                                                                                                                  | Correção                                                                                    |
| :-- | :------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------ |
| 1   | Nenhuma aba do cabeçalho marcava a própria página: no build estático `Astro.url.pathname` vem **com o base**, e todo `startsWith('/pilar-1')` era falso | `src/lib/rota.ts` compara por segmento sobre a rota normalizada (T020)                      |
| 2   | O portão recusava copiar os brutos com o gate fechado, mas a cópia da execução anterior continuava em `public/dados/` — e o Astro a servia              | `limparSaidaPublica` (TS) e `_limpar_saida` (Python) esvaziam o diretório antes de repovoar |
| 3   | A coluna "Revisão" do export canônico mostrava `v1` — a versão do **esquema** do manifesto, não a revisão do arquivo                                    | `lerRevisaoCanonica` passou a ser escopada ao bloco `export_canonico:`                      |
| 4   | A `constitution` declarava a versão em dois lugares; o cabeçalho dizia 2.0.0 e o rodapé 1.1.0                                                           | Versão só no rodapé; o cabeçalho aponta para lá                                             |
| 5   | Um insumo apagado do disco sumia da tabela de instalação (o glob só enxerga o que existe)                                                               | `obterInsumosCadeia` declara o export canônico incondicionalmente                           |

Os quatro primeiros passaram a ter teste antes da correção.

---

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational. No dependencies on other stories — **é o MVP**
- **US2 (P2)**: Can start after Foundational. Needs only the empty page shell from T018
- **US3 (P3)**: Can start after Foundational. Needs only the empty page shell from T018

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Models/types before services before components before page assembly
- Story complete before moving to next priority

### Parallel Opportunities

- T003, T005, T008, T009, T010, T012, T013, T015 in Phase 2 (arquivos distintos)
- T016, T017 in US1; T024–T027 in US2; T036–T038 in US3
- T050, T051, T052 in Phase 6 (documentos distintos)
- **US1, US2 e US3 podem correr em paralelo** depois de Foundational, com T018 (o esqueleto da página) como única sobreposição — é o gargalo real

---

## Parallel Example: User Story 1

```bash
# Tests primeiro (falham), em paralelo:
Task: "T016 [P] [US1] Escrever tests/web/header-dados.test.ts — H-1 a H-7"
Task: "T017 [P] [US1] Escrever tests/web/routes.test.ts — rota /dados/"

# Depois a implementação, sequencial (mesmo arquivo):
Task: "T018 [US1] Criar src/pages/dados/index.astro (esqueleto)"
Task: "T019 [US1] Link no .cabecalho-acoes de BaseLayout.astro"
Task: "T020 [US1] Calcular isDados"
Task: "T021 [US1] Item em .drawer-nav"
```

## Parallel Example: User Story 2

```bash
# Todos os testes em paralelo (mesmo arquivo, mas casos distintos):
Task: "T024 [P] [US2] Metadados por item"
Task: "T025 [P] [US2] Marcação de dado pessoal"
Task: "T026 [P] [US2] Proibições de C-4"
Task: "T027 [P] [US2] Estado Parcial (gate fechado)"

# Componentes e página (dependências reais):
Task: "T028 [P] [US2] CartaoDownload.astro"
Task: "T029 [US2] Badge com ícone + texto"
Task: "T030 [US2] Estado indisponível sem href"
Task: "T031 [US2] Grupo Pacote oficial"
Task: "T032 [US2] Grupo Insumos brutos"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: `/dados/` existe, alcançável pelo header em viewport largo e estreito, testável isoladamente
5. Deploy/demo if ready — a página vazia já entrega o valor de US1

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → botão no header → **Deploy** (MVP, site no ar com página em branco)
3. US2 → listagem e downloads → Deploy
4. US3 → guia de instalação → Deploy
5. Phase 6 → governança registrada → **só aqui os insumos brutos passam a ser publicados**

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Then, in parallel:
   - Developer A: US1 (header + esqueleto da página)
   - Developer B: US2 (listagem, componente, página) — após T018
   - Developer C: US3 (guia) — após T018
3. Developer D takes Phase 6 (governança), que is independent of the code and gates publication

---

## Notes

- **[P]** tasks = arquivos diferentes, sem dependências
- **[Story]** label maps task to specific user story for traceability
- Each user story is independently completable and testable
- **Verify tests fail before implementing** — Princípio II é NON-NEGOTIABLE
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **T018 é o gargalo**: US2 e US3 dependem dele. Se houver um só desenvolvedor, T018 deve ser feito antes de abrir as duas stories
- **O portão de T011 é o que impede a publicação dos dados pessoais.** Não remover, não contornar, não tornar opcional
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
