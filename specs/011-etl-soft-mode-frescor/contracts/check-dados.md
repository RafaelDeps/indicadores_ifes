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

## 3. Etapa 2 — Avisos de frescor por `mtime` (nunca fatais)

Comparação apenas com entradas **presentes**; entrada ausente é ignorada (sem
falso alarme) e entra na linha `INFO:` da §3.1. Avisos em `AVISO:` (stderr),
**exit 0** sempre.

| #   | Condição (mtime)                                                    | Texto do `AVISO:` (semântica)                                                                      |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| a   | `mtime(exports_canonical.zip)` > `mtime(--pacote)`                  | "pacote possivelmente desatualizado — export canônico mais recente que o pacote"                   |
| b   | `mtime(--pacote)` > `mtime(indicadores_listagens.zip)`              | "proveniência: NTE/NTECPP do pacote podem vir de execução anterior (zip de listagens mais antigo)" |
| c   | qualquer `data/raw/listagem_*.xlsx` com `mtime` > `mtime(--pacote)` | "planilha <nome> mais recente que o pacote — não incorporada ao último pacote"                     |

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

## 6. Uso no CI (Princípio VI)

Proposto: `python -m etl.scripts.check_dados` no job `quality` do
`deploy.yml`, após o `pytest`. Em clone o efeito é a validação de contrato do
zip commitado (com a linha `INFO:` das entradas ausentes no log — inofensiva,
exit 0) — um portão barato contra regressão do pacote publicado, sem
alterar a topologia do CI (o ETL continua fora do CI).
