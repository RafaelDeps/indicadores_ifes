# Phase 0 — Research

Feature: **016 — Página de Downloads dos Dados e Guia de Instalação**
Date: 2026-10-05

Todos os `NEEDS CLARIFICATION` da spec foram resolvidos nas iterações 1–4 da
fase de especificação (D-01 a D-05). Este documento registra as decisões
**técnicas** tomadas no desenho, e os fatos verificados no repositório que as
sustentam.

---

## R-001 — Como a listagem de downloads é derivada

**Decision**: um módulo `src/lib/downloads.ts` lê o disco em build time e
devolve a listagem, derivada do que existe — nunca de uma lista literal.

**Rationale**: FR-017 exige que a listagem seja verificável automaticamente e
não possa divergir do que existe; FR-016 exige que um artefato ausente apareça
como "indisponível" em vez de link quebrado. Uma lista hardcoded violaria
FR-017. O padrão já existe no repositório: `src/lib/dataset.ts` faz exatamente
isso com `indicadores.zip` (`CAMINHO_PADRAO_ZIP` + `carregarDataset()` +
instância padrão `datasetPadrao` exportada). Reusar a convenção já estabelecida evita
uma segunda convenção para o mesmo problema.

**Alternatives considered**:

- Array literal no `.astro` — rejeitado: pode divergir do disco sem que nada
  note (viola FR-017).
- Gerar um JSON de manifesto no ETL — rejeitado: acopla a page frontend ao
  formato do ETL e exige rodar o pipeline a cada mudança de listagem, para algo
  que é só leitura de filesystem.

---

## R-002 — Como os artefatos chegam ao site publicado

**Decision**: copiar os artefatos para `public/dados/` **no build**, com
`public/dados/` gerado (ignorado pelo Git, com o diretório preservado).

**Rationale**: o Astro copia `public/` verbatim para `dist/`. Como `base` é
`/indicadores_ifes`, o asset é servido em `/indicadores_ifes/dados/<arquivo>`.
O build é o único ponto em que a listagem e o filesystem são vistos juntos —
derive a listagem e copie os arquivos na mesma passagem elimina a janela em que
um arquivo poderia ser listado e não servido.

**Alternatives considered**:

- Apontar `public/dados` por symlink para `data/` — rejeitado: symlink em
  repo não sobrevive a todos os clientes de Windows e confunde o build do Astro.
- Commitar os arquivos em `public/dados/` — rejeitado: duplicaria os blobs no
  repositório (o `.zip` canônico e os 6 `.xlsx` já serão versionados em
  `data/`). Duas cópias do mesmo dado pessoal é pior que uma.
- Servir de `data/` direto — rejeitado: `data/` não é servido; só `public/` e
  `src/pages` são.

---

## R-003 — Onde mora o portão de governança (FR-016)

**Decision**: `etl/scripts/check_governanca.py`, testado com `pytest`, rodando
na esteira `quality` **antes** de `npm run build`.

**Rationale**: o portão precisa ser (a) testável localmente, (b) verificável no
CI, (c) executado antes do build. Shell inline no workflow não é testável com
pytest. O padrão já existe: `etl/scripts/check_dados.py` é exatamente esse
formato (função `criar_argument_parser()`, `main()`, mensagens `ERRO:`/`AVISO:`
com exit code). `check_dados.py` já roda no CI e já tem o hábito de "exit 1 em
violação de contrato" que FR-016 exige.

**Contrato do portão** (ver `contracts/pagina-downloads.md`):

- Emenda do Princípio IV registrada na constitution? Não → não publica.
- Revisão de privacidade registrada? Não → não publica. (Já aprovada por D-03;
  o gate continua fechado até `docs/revisao-privacidade.md` existir, por P-4.)
- Gate fechado → **omite** os insumos brutos da listagem e da cópia, imprime
  `AVISO:` com o motivo, **exit 0** se o agregado estiver íntegro. Gate
  aberto → publica, exit 0.
- Divergência entre listagem e disco → `ERRO:` + exit 1 (falha dura, independe
  do portão).

**Alternatives considered**:

- Bloquear o build inteiro quando o gate está fechado — rejeitado: o site sem
  os insumos brutos ainda é útil (o pacote oficial continua disponível), e
  bloquear tudo transformaria uma pendência de governança em indisponibilidade
  do site inteiro. FR-016 diz "não DEVEM ser publicados", não "o site não pode
  subir".
- Ler a constitution por regex no Python — fragile. A pendência é registrada
  como arquivo/structured record, não por parsing de prosa.

---

## R-004 — Como a pendência de governança é representada

**Decision**: a pendência é um **registro versionado** — um arquivo dedicado
sob `.specify/` (ex.: `governanca/pendencias.yaml`) que o gate lê. A emenda da
constitution (FR-016a) e a revisão de privacidade (FR-016) são as duas entradas
que o gate consulta.

**Rationale**: o gate precisa de um sinal **verificável** e **versionado**, não
de prosa. A constitution exige que a emenda seja registrada "neste arquivo" com
versão e Sync Impact Report — isso continua valendo; o registro em YAML é o que
torna a pendência detectável por máquina, e a constitution continua sendo a
fonte normativa. Um arquivo dedicado também dá lugar a "quem quita o quê".

**Alternatives considered**:

- Derivar de `git log` procurando a mensagem de commit — frágil e acoplada a
  convenção de mensagem.
- Variável de ambiente no CI — rejeitado: não é versionado, e alguém pode
  esquecê-la sem que nada notifique.

---

## R-005 — Marcação de dado pessoal sem depender de cor

**Decision**: a marcação de "contém dado pessoal, não anonimizado" acompanha cada
item de insumo bruto com **ícone + rótulo textual**, e um badge distinto usando
`--color-notice-*` (o par amber já existe em `tokens.css` e já é usado para
avisos). O texto é sempre suficiente sozinho.

**Rationale**: FR-015 e FR-019 exigem identificação explícita que não dependa
de cor; SC-009 verifica isso em ambos os temas. O projeto já tem
`contrast.ts` em `src/lib/` e testes de contraste — a infraestrutura de
acessibilidade existe e deve ser reusada, não paralela.

---

## R-006 — Como o header ganha o botão sem quebrar a largura

**Decision**: o botão entra em `.cabecalho-acoes` (que já abriga `SeletorTema` e
o botão da gaveta), e o item equivalente entra em `.drawer-nav`. O caminho é
sempre um `<a>` com `aria-current="page"` quando ativo, seguindo o padrão de
`.nav-aba`.

**Rationale**: `.cabecalho-acoes` é o único bloco do header que **não** é
escondido em nenhum breakpoint — `display: flex` em todos. `.nav-pilares` só
aparece ≥768 px, o que violaria FR-002 (visível sem abrir menu) em telas
estreitas. `.drawer-nav` é onde a navegação completa já vive, atendendo FR-003.

**Detalhe de largura**: em ≥768 px o header já exibe abas + busca (≥990 px) +
filtros + ações. Adicionar um item pode apertar em ~768–990 px. Mitigação: o
botão usa o mesmo `.nav-aba` com rótulo curto ("Dados"), e a busca já é
condicional a ≥990 px — o espaço disponível na faixa de 768–990 px comporta o
rótulo curto sem wraps.

---

## R-007 — Cobertura e metadados de cada artefato

**Decision**: tamanho e mtime vêm de `fs.statSync` no build. A cobertura (anos e
escopo de campus) do pacote oficial é derivada do próprio
`indicadores.zip` — reusando `carregarDataset()` de `dataset.ts`, que já extrai
anos e campi. Os insumos brutos exibem **período** (2024–2026, dos nomes
`listagem_<ano>_<semestre>.xlsx`) e papel na cadeia, não "cobertura de
indicadores".

**Rationale**: FR-006 exige cobertura (anos e escopo de campus) por artefato.
Para os insumos brutos isso não faz sentido — eles não têm escopo de indicador,
têm período de apuração e etapa que alimenta. Forçar "cobertura" neles exigiria
metadado inventado, o que o Princípio III proíbe.

**Risco de parsing**: o ano e o semestre dos `.xlsx` vêm do nome do arquivo
(`listagem_2024_1.xlsx` → 2024, semestre 1). O ETL já usa o nome como
autoridade (a guarda da cadeia lê o ano do nome, e um nome divergente é
simplesmente ignorado — comportamento já documentado na spec 012). Parsear o
mesmo campo do mesmo lugar é consistente com o que o pipeline já considera
verdade.

---

## R-008 — O `.gitignore` já foi alterado em outra branch

**Decision**: **não** editar o `.gitignore` como se nada tivesse acontecido.
Verificar primeiro se `fb53e8f` será trazido por merge para esta branch.

**Rationale**: `fb53e8f` ("unignore raw/canonical by institutional decision")
já existe em `012-gate-proveniencia-workflow-dados` e **versionou os 8
arquivos** — `git ls-tree` confirma os blobs de `listagem_2024_1.xlsx` …
`listagem_2026_2.xlsx` e `exports_canonical.zip`. Ele **não é ancestral** de
`016-download-data-files` (base `fix/first-pilar`, 29489f7), confirmado por
`git merge-base --is-ancestor`. Editar o `.gitignore` aqui criaria uma segunda
via para o mesmo efeito, e o comentário no `.gitignore` da spec 012 já explica
que a decisão é "versionado é permanente".

**Alternatives considered**:

- Editar o `.gitignore` agora — rejeitado: duplica uma decisão já documentada e
  pode conflitar no merge com a outra branch.
- Mergear `012-gate-proveniencia-workflow-dados` nesta branch — é a via
  provavelmente correta, mas é decisão de sequência de branches, não de desenho
  técnico. Registrado como verificação para a Phase 2.

---

## R-009 — Texto de interface e nomes

**Decision**: rótulos e textos em pt-BR (identificadores em inglês, conforme a
política de linguagem da constitution). Rótulo do botão: **"Dados"**. Seção da
página: **"Instalação dos dados brutos"**. Badge: **"Contém dados pessoais —
não anonimizado"**.

**Rationale**: Princípio V + FR-023. "Dados" é curto o bastante para o header em
768 px (R-006) e inequívoco ao lado de "Visão geral", "Pilar 1/2/3".

---

## Fatos verificados no repositório

| Fato                                                          | Verificação                                                                                         |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Header compartilhado, `.cabecalho-acoes` nunca é ocultado     | `src/layouts/BaseLayout.astro` — `.cabecalho-acoes { display: flex }` sem media query que o esconda |
| `.nav-pilares` só ≥768 px                                     | `BaseLayout.astro` — `.nav-pilares { display: none }` + `@media (min-width: 768px)`                 |
| Site publicado sob `/indicadores_ifes`                        | `astro.config.mjs` — `base: '/indicadores_ifes'`                                                    |
| CI já roda `check_dados.py` antes do build                    | `.github/workflows/deploy.yml` — `quality` job, antes de `npm run build`                            |
| Deploy depende de `quality`                                   | `deploy.yml` — `needs: quality`                                                                     |
| 18 arquivos no pacote oficial, 3 pilares × 3 anos × 2 escopos | `unzip -l data/dist/indicadores.zip`                                                                |
| Insumos já versionados em outra branch                        | `git ls-tree 012-... data/raw/` — 8 blobs                                                           |
| Insumos **não** versionados nesta branch                      | `git ls-files data/` → só `.gitkeep` e `indicadores.zip`                                            |
| `data/dist/indicadores_*.zip` segue ignorado                  | `.gitignore` linha 31 — coerente com D-05                                                           |
| Tokens de aviso amber já existem                              | `src/styles/tokens.css` — `--color-notice-*`                                                        |
| Base legal já declarada na spec 012                           | `medidas-de-protecao.md` §3 — art. 7º II LGPD                                                       |
