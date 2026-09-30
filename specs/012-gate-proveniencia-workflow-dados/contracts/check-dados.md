# Contrato de Saída — `check-dados` Etapa 1.5 (cobertura de derivados)

**Feature**: `012-gate-proveniencia-workflow-dados` | **Regido por**:
[spec.md](../spec.md) FR-001..FR-009

**Estende**: [contrato da spec 011](../../011-etl-soft-mode-frescor/contracts/check-dados.md).
As §1 (assinatura), §2 (Etapa 1), §3 (Etapa 2), §3.1 (`INFO:`) e §5
(limitação de `mtime`) **permanecem inalteradas** e não são repetidas aqui. Este
documento define o que é novo e o que muda.

## 1. Posição no fluxo

```text
Etapa 1   — contrato de saída        (existente)  violação ⇒ ERRO + exit 1
Etapa 1.5 — cobertura de derivados  (NOVA)       perda     ⇒ ERRO + exit 1
Etapa 2   — frescor por mtime        (existente)  desordem  ⇒ AVISO + exit 0
```

A Etapa 1.5 fica **entre** a validação de contrato e a de frescor porque é a
única das três que responde "o pacote tem o conteúdo que a origem tinha?". A
Etapa 1 responde "o pacote é bem formado?"; a Etapa 2 responde "o pacote é
recente?". Nenhuma delas responde à pergunta da 1.5.

**Por que antes da Etapa 2, e não depois**: `mtime` é indetectável em clone limpo
(§5 do contrato 011), enquanto cobertura é uma comparação de **conteúdo**, que
sobrevive a qualquer sistema de arquivo. Uma verificação que depende de tempo de
arquivo não pode ser o portão; a cobertura pode.

## 2. Entradas

A Etapa 1.5 lê **dois** conjuntos de registros JSON:

| entrada | flag | caminho padrão |
| --- | --- | --- |
| pacote | `--pacote` | `data/dist/indicadores.zip` |
| origem | `--listagens` | `data/dist/indicadores_listagens.zip` |

`--listagens` **não ganha flag nova**: já existe no contrato 011 com essa
finalidade de frescor. Reutilizar a mesma flag para as duas etapas é o que
mantém a §1 do contrato 011 inalterada.

Se `--listagens` vier vazio, o caminho correspondente é `None` e a Etapa 1.5 não
roda — comportamento coerente com a regra de flags vazias já existente.

## 3. Regra

Para cada registro cujo nome casa com `pilar1_{campus}_{ano}.json`, no conjunto
**origem** e no conjunto **pacote**, extrai-se o par `(campus, ano, campo)` para
cada campo de `CAMPOS_DERIVAVEIS_LISTAGENS` que tenha **valor não nulo**.

```text
perda = cobertura(origem) - cobertura(pacote)
```

Violação = elemento de `perda`.

### 3.0 Origem presente mas ilegível

`--listagens` apontando para um arquivo que existe e **não** é um zip legível é
**erro**, não ausência: `ERRO:` na stderr e **exit 1**.

Tratar como ausência seria o pior dos dois: o `INFO:` de "cobertura não avaliada"
afirmaria que não há como verificar — e o que existe é um insumo corrompido,
verificável e quebrado. O mesmo vale para JSON truncado dentro do zip.

Há teste da spec 011 para zip **do pacote** corrompido; a origem ganha o mesmo
tratamento. A distinção que importa é **presença com erro** versus **ausência**:
a primeira é falha, a segunda é limitação declarada.

Para a guarda da cadeia, o reflexo é o mesmo: zip de listagens ilegível e sem
planilha bruta utilizável **bloqueia** (exit 3), porque a cadeia não tem como
saber o que consegue cobrir.

### 3.1 Os três vereditos

| # | condição | saída | stream | texto |
| --- | --- | --- | --- | --- |
| 1 | `perda` vazia | 0 | — | silêncio, quando as duas entradas existem |
| 2 | `perda` não vazia | **1** | stderr | `ERRO: proveniência: ...` |
| 3 | origem ausente | 0 | stderr | `INFO: cobertura não avaliada: ...` |

O veredito 3 é **obrigatório** e é o que impede falso positivo em CI limpo: em
clone, `data/dist/indicadores_listagens.zip` não existe. Reportar violação ali
seria afirmar cobertura sobre uma fonte inexistente. A ausência da origem
também entra na linha `INFO:` da §3.1 do contrato 011 — uma entrada, uma linha.

### 3.2 Mensagens

**Veredito 2**, uma linha por perda, depois uma linha de resumo:

```text
ERRO: proveniência: <campus>/<ano> sem <campo> — <forma>.
ERRO: proveniência: <campus>/<ano> tem <campo> nulo — a integração não escreveu.
ERRO: proveniência: 3 par(es) campus/ano com derivado perdido — a integração das
listagens não foi aplicada a este pacote (Sucesso: N arquivo(s) acima refere-se
apenas à forma, não à proveniência).
```

`<forma>` assume um de dois valores, porque a **ação corretiva** difere:

| forma | mensagem | indício |
| --- | --- | --- |
| arquivo ausente no pacote | `sem <campo> — arquivo ausente no pacote` | integração não rodou |
| arquivo presente, campo nulo | `tem <campo> nulo` | integração rodou e não escreveu |

Ordenação estável por `(campus, ano, campo)`. Um relatório que embaralha a ordem
a cada execução não pode ser comparado entre logs.

**Veredito 3**:

```text
INFO: cobertura de derivados não avaliada: data/dist/indicadores_listagens.zip
ausente — apenas o contrato foi validado.
```

## 4. Relação com o modo tolerante

A Etapa 1.5 **não tem** variante tolerante. Ela não pula, não avisa em vez de
errar, e não é suprimível por `SOFT=1`.

Motivo: o modo tolerante da spec 011 existe para tratar **insumo ausente** —
a entrada faltou, a etapa é pulada e o snapshot anterior fica intacto. A perda de
cobertura é a **consequência** desse estado, e detectá-la é precisamente o que o
portão existe para fazer. Um portão que o modo tolerante desliga é um portão
desligado no único cenário em que seria acionado.

Consequência de projeto: sob modo tolerante com a etapa 3 pulada, o `check-dados`
**não** é a etapa que avisa — quem avisa é a Etapa 3, e quem reprova a cobertura,
se a origem estiver disponível, é a 1.5. São mensagens de camadas diferentes e
isso é intencional.

## 5. Códigos de saída

| Exit | Significado |
| --- | --- |
| `1` | contrato violado **ou** cobertura perdida **ou** pacote ausente (`ERRO:`) |
| `0` | contrato íntegro e cobertura preservada — com ou sem `AVISO:` de frescor e com ou sem linha `INFO:` |

**Nenhum código novo.** O `1` já existe e já é o que o job `quality` do CI
trata como falha. Acrescentar um código exigiria mudar o job para conhecer um
código novo, o que violaria FR-020 (sem etapa nova no fluxo de integração
contínua).

## 6. Não é verificação de valor

A Etapa 1.5 responde *"a integração aconteceu?"*. Não responde *"a integração
usou a planilha certa?"*.

Se a origem e o pacote cobrem as mesmas chaves mas com **números diferentes**, a
Etapa 1.5 **aprova**. Detectar isso exigiria comparar identidade do insumo — um
carimbo de proveniência dentro do pacote — rejeitado por mudar o contrato do
dado publicado (FR-009, research D1). Registrado aqui para que ninguém leia o
portão como verificação de integridade numérica.

## 7. Fecha a lacuna registrada no contrato 011 §5.1

O contrato 011 §5.1 nomeia o cenário sem cobertura e registra duas razões pelas
quais ele não era detectável:

| razão registrada na spec 011 | situação com esta feature |
| --- | --- |
| exigiria comparar o **conteúdo** de NTE/NTECPP entre pacote e zip de listagens | é exatamente o que a Etapa 1.5 faz |
| `indicadores_listagens.zip` é gitignored, logo ausente em CI | segue ausente em CI, e por isso o veredito 3 reporta `INFO:` em vez de falhar; no workflow a etapa 2 o produz antes da verificação, e lá a verificação **é** feita |

A segunda linha é a consequência de design mais importante deste contrato: a
Etapa 1.5 **não** exige mudar o que é versionado. Ela é exata quando a origem
existe, e declarada como não avaliada quando não existe.