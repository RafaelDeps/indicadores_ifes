# Contrato de Saída — `check-dados` (validação de contrato + frescor)

**Feature**: `011-etl-soft-mode-frescor` | **Regido por**: [spec.md](../spec.md) FR-007..FR-009

## 1. Assinatura CLI

```text
python -m etl.scripts.check_dados
    [--pacote data/dist/indicadores.zip]
    [--canonical data/canonical/exports_canonical.zip]
    [--listagens data/dist/indicadores_listagens.zip]
    [--raw data/raw]
```

Todos os caminhos têm defaults como acima. Flags ausentes/supridas (ex.:
`--canonical ""`) desativam a comparação correspondente e fazem a entrada
constar na linha `INFO:` da §3.1.

## 2. Etapa 1 — Validação de contrato (reuso)

- Lê **todos** os arquivos `pilar{N}_{campus}_{year}.json` de `--pacote` (a
  quantidade é **variável**, derivada do export: nº de campi + escopo `todos`
  × 3 pilares × 3 anos).
- Valida via `validar_arquivos_pilar(registros,
campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS)` — mesma chamada do
  `validate_zip.py` existente: **aceita** NTE/NTECPP preenchidos (`int ≥ 0`,
  pacote pós-merge) e **exige** `null` em qualquer outro campo não coletável.
- Violação ⇒ `ERRO:` + **exit 1** (mensagem com a causa).
- Pacote ausente ⇒ `ERRO:` + exit 1.

> **Etapa 1.5 — cobertura de derivados (posterior a este contrato).** Entre esta
> §2 e a §3 roda uma etapa a mais, definida em
> [contrato da spec 012](../../012-gate-proveniencia-workflow-dados/contracts/check-dados.md)
> §3: ela pergunta se a origem tem derivado e o pacote perdeu. A §1, a §2, a §3 e
> a §3.1 **permanecem como estão escritas aqui** — a 1.5 **não** muda a
> assinatura, **não** acrescenta flag (reusa `--listagens`) e **não** tem
> variante sob modo tolerante. O que a §3.1 ganhou foi mais **uma** linha `INFO:`
> quando a origem está ausente, por camada: ver a nota da §5.1.

## 3. Etapa 2 — Avisos de frescor por `mtime` (nunca fatais)

Comparação apenas com entradas **presentes**; entrada ausente é ignorada (sem
falso alarme) e entra na linha `INFO:` da §3.1. Avisos em `AVISO:` (stderr),
**exit 0** sempre.

| #   | Condição (mtime)                                                    | Texto do `AVISO:` (semântica)                                                                                                                 |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| a   | `mtime(exports_canonical.zip)` > `mtime(--pacote)`                  | "pacote possivelmente desatualizado — export canônico mais recente que o pacote"                                                              |
| b   | `mtime(indicadores_listagens.zip)` > `mtime(--pacote)`              | "proveniência: o zip de listagens é mais recente que o pacote — o merge não foi reexecutado, então NTE/NTECPP podem vir de execução anterior" |
| c   | qualquer `data/raw/listagem_*.xlsx` com `mtime` > `mtime(--pacote)` | "planilha <nome> mais recente que o pacote — não incorporada ao último pacote"                                                                |

> **Sentido da regra b.** O `make dados` roda `etl` → `etl-listagens` →
> `merge-listagens`, e o merge é a última etapa a escrever o pacote. Num fluxo
> bem-sucedido o pacote fica, portanto, **sempre** mais novo que o zip de
> listagens — acusar proveniência nessa ordem seria um falso positivo
> garantido. Só há motivo para suspeitar no sentido inverso: listagens mais
> recente que o pacote significa que o merge não rodou depois da última geração
> das listagens, e os NTE/NTECPP publicados não vêm do zip atual. A condição é
> `>` estrita — mtimes iguais (snapshot sem gap temporal) são silenciosos.

## 3.1 Entradas de frescor ausentes — linha informativa (`INFO:`)

Entradas de frescor consideradas: o arquivo de `--canonical`, o arquivo de
`--listagens` e qualquer planilha `listagem_*.xlsx` encontrada em `--raw`
(`--raw` ausente/desprovido de planilhas conta como ausente).

Para cada entrada de frescor **ausente**, o `check-dados`:

- **não** emite comparação de mtime (nem `AVISO:` — sem falso alarme);
- imprime **uma única linha** `INFO:` no stderr listando os caminhos ausentes,
  no formato:

  ```text
  INFO: frescor não avaliado para: <caminhos separados por vírgula> — apenas o contrato foi validado.
  ```

- não altera o exit (linha informativa, **nunca** `AVISO:`/`ERRO:`).

Regras da linha `INFO:`:

- emitida **somente** quando há **pelo menos uma** entrada de frescor ausente;
- com todas as entradas presentes, **silêncio** (nenhum `INFO:`);
- com entradas parcialmente presentes, lista **apenas as ausentes** (as
  presentes continuam com suas comparações e possíveis `AVISO:` normais).

> **Exemplo (cenário "só o zip commitado")**: sem `exports_canonical.zip`, sem
> `indicadores_listagens.zip` e sem planilhas → o `check-dados` valida o
> contrato e imprime
> `INFO: frescor não avaliado para: data/canonical/exports_canonical.zip, data/dist/indicadores_listagens.zip, data/raw/listagem_*.xlsx — apenas o contrato foi validado.`
> Com exit 0 — sem falsa impressão de que a frescor foi verificada.

## 4. Códigos de saída

| Exit | Significado                                                                                 |
| ---- | ------------------------------------------------------------------------------------------- |
| `1`  | contrato violado ou pacote ausente (`ERRO:`)                                                |
| `0`  | contrato íntegro — com ou sem `AVISO:` de frescor e com ou sem linha `INFO:` (informativos) |

## 5. Limitação de `mtime` (parte do contrato)

- O Git **não preserva mtimes**: em clone limpo/CI todos os arquivos têm
  ~mtime do checkout, tornando as comparações inócuas.
- Nessas condições o `check-dados` **valida apenas o contrato** (exit 0 se
  íntegro), **não** emite avisos de frescor — definido para nunca gerar falso
  alarme em CI (spec FR-009) — e imprime a linha `INFO:` (§3.1) com as entradas
  ausentes, deixando explícito que apenas o contrato foi avaliado.
- A checagem de frescor **só é significativa na máquina geradora** do pacote.
- `mtime` é sensível a operações de arquivo: `cp` sem `-p`, `rsync` sem
  `--times`, `scp` ou restauração de backup embaralham a ordem sem que o dado
  mude, podendo produzir `AVISO:` espúrio. Consequentemente o aviso **sugere**
  desordem, não a prova.

### 5.1 Cegueira conhecida da regra b

A regra b ordena a última execução do merge contra a última geração das
listagens. Ela **não** detecta o cenário em que o merge deixou de ser executado
no ciclo seguinte:

```text
make dados   → T1 pacote, T2 listagens, T3 pacote   (saudável; b silencia ✓)
make etl     → T4 pacote                            (só canônico; NTE/NTECPP
                                                       voltam a null; b
                                                       silencia ✗)
```

Nesse caso o pacote é o arquivo mais novo de todos e nenhuma regra de frescor
dispara, embora o pacote publicado tenha perdido os NTE/NTECPP. **Nenhuma
ferramenta do repositório pega essa regressão**: `test_fidelity.py` aceita
`None` em NTE/NTECPP (o valor `null` é legítimo pelo Princípio III) e a
suíte web não verifica esses campos — a degradação é visível no site como
"Dado indisponível", não como número incorreto.

Mitigação vigente: é vedado regenerar o pacote público com `make etl` isolado;
o fluxo suportado é `make dados` (ou os três passos na ordem). Detectar o
cenário exigiria comparar o **conteúdo** de NTE/NTECPP entre o pacote e o zip
de listagens — capacidade não coberta por este contrato, e limitada pelo fato
de `indicadores_listagens.zip` ser gitignored (ausente em CI).

### 5.1.1 Lacuna fechada pela spec 012 (nota de 2026-10-01)

O texto acima **permanece como registro do que se sabia**, e não é corrigido:
a mitigação vigente continua valendo, e o que a Etapa 1.5 acrescenta é
**detecção**, não autorização.

A afirmação "nenhuma ferramenta do repositório pega essa regressão" e a razão
"exigiria comparar o **conteúdo** de NTE/NTECPP entre o pacote e o zip de
listagens" descrevem o limite deste contrato. A spec 012 implementa exatamente
essa comparação, como perda de cobertura por campo derivado: a subtração
`origem - pacote`. Ver
[contrato da spec 012](../../012-gate-proveniencia-workflow-dados/contracts/check-dados.md)
§3, §7 e [research.md](../../012-gate-proveniencia-workflow-dados/research.md)
D1.

Duas consequências que este contrato passa a ter:

| o que era verdade aqui                                            | o que passa a valer                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `indicadores_listagens.zip` gitignored limita a verificação em CI | segue ausente em clone limpo, e por isso a ausência é **declarada** (`INFO: cobertura de derivados não avaliada: <caminho> ausente`), nunca tratada como veredito. No workflow, a origem é produzida antes da verificação, e lá a verificação **é** feita |
| a Etapa 2 avisa proveniência só quando o `mtime` denuncia         | a Etapa 1.5 não depende de `mtime` algum: compara **conteúdo**, e por isso pega o caso `make etl` isolado, em que o pacote é o arquivo mais novo e nenhuma regra de frescor dispara                                                                       |

O portão é o mesmo binário e o mesmo código de saída `1` — nenhuma etapa nova no
fluxo de integração contínua (FR-020 da spec 012).

## 6. Uso no CI (Princípio VI)

Proposto: `python -m etl.scripts.check_dados` no job `quality` do
`deploy.yml`, após o `pytest`. Em clone o efeito é a validação de contrato do
zip commitado (com a linha `INFO:` das entradas ausentes no log — inofensiva,
exit 0) — um portão barato contra regressão do pacote publicado, sem
alterar a topologia do CI (o ETL continua fora do CI).
