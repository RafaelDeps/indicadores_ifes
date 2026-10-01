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

O token é emitido pela **conta dona do `dados-listagens`**, que é outra conta do
mantenedor. Duas consequências que são contrato, não observação:

- a revogação acontece na tela de _Developer settings_ **da outra conta**. Numa
  tabela de segredos deste repositório, o token aparece e some sem que a tela de
  revogação esteja à vista — quem procurar revogar aqui não acha onde revogar.
- o campo `dono` do manifesto é o que permite montar a URL da API. Erro de
  digitação nesse campo não dá 404 de recurso, dá 404 de dono, que a mensagem
  padrão do GitHub não diferencia.

O valor do token **nunca** aparece em log: o passo de obtenção usa cabeçalho de
autenticação e o `curl` silencia a barra de progresso; nenhum comando ecoa a
variável de ambiente.

## 4. Passos, em ordem, com a falha que cada um pode produzir

| #   | passo                                                            | falha distingue-se de                                                |
| --- | ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1   | conferir presença e não-vazio do segredo                         | segredo ausente → mensagem explícita, não HTTP 401 genérico          |
| 2   | ler manifesto, validar dono, 6 planilhas e a revisão do canônico | manifesto incompleto ou dono errado → falha de nome, não de download |
| 3   | obter planilhas na versão publicada                              | credencial inválida (401/403)                                        |
| 4   | conferir a **contagem** de arquivos baixados                     | entrada incompleta (5 de 6)                                          |
| 5   | obter o export canônico na revisão fixa                          | canônico ausente na revisão                                          |
| 6   | rodar a cadeia em modo estrito                                   | cobertura perdida, contrato violado                                  |
| 7   | conferir o pacote contra o arquivo versionado                    | divergência com insumo inalterado                                    |
| 8   | abrir pull request                                               | nada; é o último passo                                               |

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

Com as entradas inalteradas, o pacote regenerado é **byte a byte igual** ao
arquivo versionado. O passo 7 compara e, havendo divergência sem mudança de
insumo, interrompe.

Isso não é otimização — é **verificação de determinismo**. A spec 006 promete
determinismo; esta é a única automação que o confirma sobre a entrada real, porque
é a única que roda a cadeia inteira com as planilhas presentes. Divergência com
insumo igual significa que a promessa foi quebrada, e a falha é do gate, não do
dado.

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
