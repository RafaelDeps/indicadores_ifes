# Contrato de Execução — Workflow de regeneração do pacote (`dados.yml`)

**Feature**: `012-gate-proveniencia-workflow-dados` | **Regido por**:
[spec.md](../spec.md) FR-013..FR-025

Documento de **interface**, não de implementação: define o que a automação
**garante** e **recusa**, para que possa ser conferida sem ler o YAML.

## 1. Gatilhos

```yaml
on:
  workflow_dispatch:
```

**Somente acionamento manual.** Consequências contratuais:

| evento                | permitido            | por que                                                                                                |
| --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------ |
| `workflow_dispatch`   | sim                  | a pessoa escolhe o momento, e o modo é estrito                                                         |
| `schedule`            | **não** nesta versão | automatizaria comportamento nunca observado; FR-024 exige histórico de execuções manuais bem-sucedidas |
| `pull_request`        | **não**              | inacessível a segredos de escrita; e o repositório é público                                           |
| `pull_request_target` | **nunca**            | dá acesso a segredo com código de terceiro. Regra dura, sem exceção                                    |

A ausência de `schedule` **não** é omissão: é a condição de FR-024. Adicionar
cron depois de N execuções manuais é trabalho de outra iteração, com decisão
própria.

## 2. Permissões

```yaml
permissions:
  contents: write # abrir o pull request
  pull-requests: write # criá-lo
```

Duas, e nenhuma mais. A lista completa é curta de propósito: cada permissão não
declarada é negada por padrão no GitHub Actions, e o que não é pedido não é
concedido.

Leitura de repositório **privado** não vem de `permissions` — vem do PAT, que é
`contents: read` sobre um único repositório (spec FR-014).

## 3. Segredos

| nome                  | conteúdo                                          | por que é segredo                                      |
| --------------------- | ------------------------------------------------- | ------------------------------------------------------ |
| `DADOS_LEITURA_TOKEN` | token de escopo restrito, leitura, um repositório | concede acesso a arquivo com nome e data de nascimento |

**Único** segredo da feature. Tudo o mais — repositório, dono do repositório,
versão, identificadores de asset, revisão do export canônico — está em
`dados-insumo.yml`, versionado, e é legível por qualquer pessoa que clones.

O token é emitido pela **conta dona do `indicadores-dados-listagem`**, que é
outra conta. Duas consequências que são contrato, não observação:

- a revogação acontece na tela de _Developer settings_ **da outra conta**. Numa
  tabela de segredos deste repositório, o token aparece e some sem que a tela de
  revogação esteja à vista — quem procurar revogar aqui não acha onde revogar.
- o campo `dono` do manifesto é o que permite montar a URL da API. Erro de
  digitação nesse campo não dá 404 de recurso, dá 404 de dono, que a mensagem
  padrão do GitHub não diferencia.

**A separação de contas é real, mas é mais estreita do que "outra conta" sugere.**
Verificado na API: o repositório privado é de `henriqk0`, este repositório é de
`RafaelDeps`, `henriqk0` tem permissão `write` aqui, e `RafaelDeps` tem
permissão `none` no privado. Portanto o token **não** é emitido na conta dona do
repositório que o consome, e quem controla o consumidor não consegue ler o dado
— mas a pessoa que emite o token e controla o dado é a mesma que escreve o
manifesto e faz _merge_ neste repositório. O âmbito do token é estreito
(`contents: read`, um repositório); a separação de **pessoas** é nula. Isto
aparece em `medidas-de-protecao.md` §4.1 como limitação conhecida, e é a razão de
a revogação estar escrita como passo de manual e não como automação.

O valor do token **nunca** aparece em log: o passo de obtenção usa cabeçalho de
autenticação e o `curl` silencia a barra de progresso; nenhum comando ecoa a
variável de ambiente, e nenhum passo liga `set -x` — a configuração renderizada na
página de execução não é mascarada.

### 3.1 Nome de pessoa no log da cadeia

O token é o único segredo que este documento nomeia, e há um segundo dado
sensível que ele **não** nomeia: o `AVISO: estudante duplicado ignorado (id: N,
nome: <nome completo>)` emitido pela etapa de listagens. Medido numa corrida
real: **5.702 linhas** de log, **2.756 nomes distintos**, todos com nome e
sobrenome de pessoa.

Isto é nome em log de workflow, que FR-026 proíbe nominalmente — e o log de
execução é público para quem tem acesso ao repositório. O volume é medido, não
estimado: das 5.704 linhas de uma corrida real, **5.002** casam com o padrão
`nome: <NomePróprio>` e correspondem a **2.756 nomes distintos**.

Os passos da cadeia redigem o parêntese do nome **antes** de imprimir qualquer
byte, e conferem depois da redação que nenhum nome sobreviveu. Três condições
que a redação tem de satisfar, e que a verificação encontrou uma a uma:

- a redação é um `sed` sobre o arquivo bruto, não um filtro de tubulação: um
  filtro que falha deixa passar o log inteiro;
- a conferência de nome residual vem **antes** do `cat`. Conferir depois de
  imprimir é conferir o que já vazou — a execução aborta, mas o nome já está no
  log do runner, e abortar não o desfaz;
- a mensagem de erro da conferência imprime a **contagem** de linhas, nunca a
  linha: repetir a linha seria vazar o nome que o passo existe para não vazar.

O `id` do estudante não é redigido: é chave interna e pseudônima, e não é nome,
matrícula, nascimento nem tipo de cota — as quatro coisas que FR-026 nomeia. O
arquivo bruto fica em `/tmp` do runner, que é descartado com a máquina virtual, e
nenhum `upload-artifact` existe neste workflow (§ 9).

## 4. Passos, em ordem, com a falha que cada um pode produzir

| #   | passo                                                              | falha distingue-se de                                                                                    |
| --- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 1   | conferir presença e não-vazio do segredo                           | segredo ausente → mensagem explícita, não HTTP 401 genérico                                              |
| 2   | ler manifesto, validar dono, 6 planilhas e a revisão do canônico   | manifesto incompleto ou dono errado → falha de nome, não de download                                     |
| 3   | obter planilhas na versão publicada                                | credencial inválida (401/403)                                                                            |
| 4   | conferir a **contagem** de arquivos baixados                       | entrada incompleta (5 de 6)                                                                              |
| 5   | obter o export canônico na revisão fixa e desembrulhar o invólucro | canônico ausente na revisão, `caminho` inexistente na origem, ou invólucro sem os ficheiros obrigatórios |
| 6   | rodar a cadeia em modo estrito                                     | cobertura perdida, contrato violado                                                                      |
| 7   | conferir o contrato e a ausência de `INFO:` de cobertura           | a Etapa 1.5 não rodou                                                                                    |
| 8   | conferir o determinismo: segunda corrida e comparação das saídas   | saída instável com insumo igual                                                                          |
| 9   | conferir se o pacote mudou contra o versionado                     | nada; é uma pergunta, não uma falha                                                                      |
| 10  | abrir pull request, **ou** registrar que não há o que publicar     | nada; é o último passo                                                                                   |

A tabela tem 10 linhas e o workflow tem 15 passos porque os passos 1–5 do
workflow são o desdobramento dos 2–6 aqui: `curl` de planilhas e `curl` do
export canônico são o mesmo acto com credenciais diferentes. A ordem e a
intenção são as mesmas; a contagem não é.

O passo 5 baixa para um ficheiro temporário e só depois o move para
`data/canonical/exports_canonical.zip`. O motivo é duplo e verificado contra o
repositório de origem: o `caminho` do manifesto é o caminho **remoto**, e
reusá-lo como destino dava 404, porque no repositório de origem o ficheiro está
em `data/exports/` e aqui tem de ficar em `data/canonical/`. E um `curl` falhado
que escrevesse direto no destino deixaria um zip truncado no sítio onde a cadeia o
lê — o portão compararia cobertura contra um pacote incompleto, que é o modo de
falhar mais difícil de ver.

O passo 5 desembrulha também, e isso é um segundo facto da mesma origem: o
ficheiro publicado é um **invólucro** com uma única entrada,
`exports_canonical.zip`, e a fonte canônica do ETL exige os ficheiros na raiz. Os
sete ficheiros obrigatórios são conferidos **antes** do `mv`, de modo que um
invólucro de formato inesperado falha no passo 5, por nome, em vez de aparecer
dois passos mais tarde como `'campuses_canonical.json' ausente no pacote ZIP` —
mensagem que não distingue formato errado de revisão errada.

### 4.1 Por que a ordem é esta

A ordem é **impossibilitar o prosseguimento com entrada parcial**. Os passos 1–4
são todos sobre a mesma pergunta — "tenho o insumo completo?" — e cada um fecha
uma forma diferente de "pareço ter mas não tenho":

- passo 1 fecha "token ausente", que sem checagem viraria 401 no passo 3;
- passo 2 fecha "manifesto desatualizado" **e** "dono digitado errado", que sem
  checagem virariam 404 no passo 3 — e o 404 de dono e o 404 de repositório são
  a mesma mensagem, então o erro aponta para o lugar errado;
- passo 3 fecha "credencial revogada ou sem permissão";
- passo 4 fecha "download parcial" — a forma que **não** se manifesta por erro.

O passo 4 é o mais importante e o mais barato. Sem ele, a pasta fica com 5 das 6
planilhas, a cadeia roda, e o pacote sai sem a cobertura do semestre faltante —
que é precisamente o defeito que a feature existe para fechar. A verificação de
cobertura (§6) **não** pega esse caso, porque a perda é na origem e não no
pacote: o portão mede perda origem → pacote, e aqui as duas pontas concordam em
ser incompletas.

### 4.2 O `curl` e suas duas flags

```bash
curl -fsSL -H "Authorization: Bearer $TOKEN" -o destino.zip URL
```

| flag | o que evita                                                                     |
| ---- | ------------------------------------------------------------------------------- |
| `-f` | gravar o corpo de erro HTTP dentro do `.xlsx` — arquivo que "existe" e não abre |
| `-L` | seguir o redirecionamento que a API faz para a URL assinada do asset            |

Sem `-L`, o arquivo baixado é o redirecionamento. Sem `-f`, é o corpo do erro.
Os dois juntos produzem um `.xlsx` de tamanho plausível e conteúdo inválido — e
só o passo 4 com `unzip -t` ou contagem de bytes detectaria.

## 5. Modo de execução

```bash
make dados          # estrito: SOFT ausente
```

O modo tolerante **não** é usado, e o workflow **não** define `SOFT`. Não é
omissão por esquecimento: sob modo tolerante, uma etapa pulada produz "não fez
nada, sem erro", e num job agendado isso é indistinguível de saúde (research D5).
O modo tolerante continua **opt-in** e continua sendo ferramenta de máquina
local.

## 6. Verificação, sem etapa nova no CI

O job `quality` do `deploy.yml` já roda `make check`, e o `check-dados` já está
ligado a ele. O workflow **não** adiciona passo de CI: ele roda a cadeia e
chama a verificação de cobertura explicitamente, porque o clone de CI não tem a
origem e portanto não poderia afirmá-la.

| ambiente              | tem origem?                | o que o portão faz     |
| --------------------- | -------------------------- | ---------------------- |
| workflow              | sim — a etapa 2 a produziu | **verifica e reprova** |
| CI do repositório     | não — gitignored           | `INFO:`, exit 0        |
| máquina do mantenedor | depende do disco           | verifica quando houver |

É o terceiro veredito do data-model aplicado aos três ambientes. A ETAPA 1.5 é
exata onde pode ser, e declarada como não avaliada onde não pode.

## 7. Publicação

Abre **pull request** com o pacote. Nunca envia direto para a branch
principal.

Motivo duplo: é a consequência do Princípio VI (publicar só depois de testes e
build passarem) e é o que dá revisão humana ao único artefato que alimenta o
site. O merge do pull request passa pelo `quality` existente — o caminho de
publicação é o de sempre, sem atalho.

O corpo do pull request é preenchido com o resultado da verificação, e **não**
contém listagem de arquivos de entrada, nem nome, nem matrícula.

## 8. Idempotência e reprodutibilidade

### 8.1 Determinismo: duas corridas, uma entrada

A spec 006 promete que insumo igual produz pacote byte a byte igual (FR-011). A
única forma de verificar isso em automação é rodar a cadeia **duas vezes** com o
mesmo insumo e comparar as duas saídas. Uma única corrida não distingue "o
resultado mudou" de "o resultado é instável" — e é exatamente essa distinção que
a promessa cobre.

O insumo é o mesmo por construção, não por suposição: `etl.main` lê sempre de
`data/canonical/exports_canonical.zip` e a etapa de listagens sempre de
`data/raw/`. Nada entre as duas corridas muda nenhum dos dois caminhos.

Custo medido nesta base: **2,5 s** por corrida. O preço é irrelevante para um
workflow de disparo manual, e a alternativa — não verificar — deixaria a promessa
de FR-011 sem nenhuma automação que a confirme sobre a entrada real.

### 8.2 Mudança contra o versionado: pergunta separada

Depois de confirmado o determinismo, sobra uma pergunta distinta: o pacote
resultante difere do arquivo versionado?

Divergir **é** o caminho normal — é insumo novo. E a consequência é abrir pull
request. Insumo inalterado dá pacote igual ao versionado, e aí não há o que
publicar: o passo registra isso e termina com sucesso.

A redação anterior do contrato tratava as duas perguntas como uma ("divergir
interrompe") e mantinha, no mesmo documento, a abertura de pull request. As duas
instruções juntas produziam um workflow que **nunca podia terminar com sucesso**:
insumo igual não tinha o que ser commitado, e insumo diferente era interrompido
antes do pull request. A separação das duas perguntas é o que torna os passos
coerentes entre si.

A ordem importa para o diagnóstico: primeiro o determinismo, depois a mudança.
Invertidas, uma saída instável com insumo novo apareceria como "mudança de dado" e
seria publicada como se fosse conteúdo legítimo.

## 9. O que este workflow não faz

| não faz                                                            | por que                                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| não agenda execução                                                | FR-024; depende de histórico manual                                      |
| não anexa artefato de execução com `data/raw/`                     | o passo nunca envia nada; nenhum `upload-artifact` existe neste workflow |
| não escreve em `data/raw/` fora da pasta da execução               | entradas são efêmeras e somem com o runner                               |
| não usa `SOFT`                                                     | §5                                                                       |
| não abre PR se a verificação reprovar                              | §6, §7                                                                   |
| não compartilha a credencial com nenhum passo que não precise dela | princípio do menor privilégio, dentro do próprio workflow                |

O único `upload-artifact` do repositório é o do GitHub Pages, em `deploy.yml`.
Este workflow **não** adiciona nenhum — e a ausência é verificada por inspeção,
porque um `upload-artifact` esquecido seria o vetor de exposição mais óbvio e
mais difícil de perceber depois.

## 10. Autenticação do `gh`, e onde ela falha se faltar

Qualquer passo cujo `run:` invoque `gh` tem de declarar `GH_TOKEN` ou
`GITHUB_TOKEN` no **seu próprio** `env:`.

Não é convenção, é a diferença entre um passo que funciona e um que falha. O
`git push` do mesmo passo não precisa de nada: o `actions/checkout` persiste as
credenciais em `.git/config` por omissão. O `gh` **não** lê esse ficheiro — a
documentação do `gh` diz que `GH_TOKEN` ou `GITHUB_TOKEN` no ambiente é o que o
autentica, e que sem isso pede autenticação interactiva, coisa que num runner não
existe. Duas ferramentas, mesmo repositório, mesmo passo, dois mecanismos.

O token que se declara é `secrets.GITHUB_TOKEN`, o do **workflow**, com o âmbito
que `permissions:` dá a este job. **Não** é `DADOS_LEITURA_TOKEN`, cujo âmbito é
o repositório privado de insumo e que não escreve em lado nenhum.

Quando isto esteve em falta, a falha apareceria no **último** passo: o insumo
pessoal já teria sido descarregado e a cadeia já teria corrido duas vezes, com o
resultado à vista, e o pull request nunca seria aberto. É o pior sítio possível
para uma falha de autenticação — e nenhuma das verificações anteriores a
denuncia, porque todas elas correm antes do `gh`.

**Honestidade sobre a verificação**: isto foi apanhado por inspecção do `env:` de
cada passo, com um guião de verificação descartável. Não há teste no `quality` que
o guarde, porque isso exigiria `PyYAML` em `requirements-etl.txt` — dependência
nova, que o Princípio I da Constituição obriga a justificar no plano — e o lado
Node não serve: o `js-yaml` instalado é **transitivo**, não declarado em
`package.json`, e um teste que dependesse dele partiria num bump de dependência
qualquer, em silêncio. A guarda durável é uma decisão em aberto, não um
esquecimento.
