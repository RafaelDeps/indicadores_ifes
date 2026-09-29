# Quickstart — Validação end-to-end do Modo Soft, `make check-dados` e `make dados`

**Feature**: `011-etl-soft-mode-frescor` | **Spec**: [spec.md](./spec.md)

Guia de validação manual (não substitui testes; detalhes de contrato em
[contracts/etl-cli.md](./contracts/etl-cli.md) e
[contracts/check-dados.md](./contracts/check-dados.md)).

## Pré-requisitos

- `make check` verde no estado anterior (feature 010 concluída).
- `data/dist/indicadores.zip` existente (commitado no Git, presente em qualquer
  clone).
- Entradas do ETL salvas de lado para os cenários de ausência:
  ```bash
  mv data/canonical/exports_canonical.zip /tmp/   # simular falta do export
  mv data/raw /tmp/data_raw_backup                # simular falta das planilhas
  ```

## Validação 1 — Modo soft preserva o zip (SC-001/SC-002)

```bash
sha256sum data/dist/indicadores.zip > /tmp/antes.sha256
SOFT=1 make dados
sha256sum data/dist/indicadores.zip > /tmp/depois.sha256
diff /tmp/antes.sha256 /tmp/depois.sha256 && echo 'INTOCADO'
```

Esperado:

- exit `0` (o `AVISO:` de cada etapa pulada aparece no stderr);
- `AVISO:` nomeando cada entrada ausente (canônico ausente em `etl`;
  planilhas ausentes em `etl-listagens`; zip de listagens ausente no merge);
- o checksum **não muda** (o pacote não é tocado);
- `data/dist/indicadores_listagens.zip` **não é criado**.

## Validação 2 — Fail-fast continua o default (SC-003)

```bash
make dados        # sem SOFT, com /tmp ainda guardando as entradas
```

Esperado: `ERRO:` + exit `1` na **primeira** etapa com entrada ausente e
**nenhuma** etapa subsequente executada (contrato 006 preservado).

## Validação 3 — `make check-dados` (SC-004)

```bash
make check-dados                # só o zip commitado → 0, INFO: apenas contrato validado
touch data/canonical/exports_canonical.zip  # simular canônico mais novo (mtime atual)
make check-dados                # AVISO: possivelmente desatualizado → 0
```

Esperado:

| Cenário                                                                       | Resultado                                                                          |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Pacote íntegro + **todas** as entradas de frescor ausentes (só o zip)         | exit `0`, sem `AVISO:`, com **uma** linha `INFO:` "apenas o contrato foi validado" |
| Pacote íntegro e em dia (entradas presentes, nenhum mtime anterior ao pacote) | exit `0`, sem avisos e **sem** linha `INFO:` (silêncio)                            |
| Apenas algumas entradas ausentes (ex.: sem zip de listagens)                  | comparação feita só para as presentes; linha `INFO:` lista as ausentes; exit `0`   |
| `exports_canonical.zip` com mtime > pacote                                    | `AVISO:` "possivelmente desatualizado", exit `0`                                   |
| `indicadores_listagens.zip` mais novo que o pacote                            | `AVISO:` de proveniência (merge não reexecutado), exit `0`                         |
| Pacote mais novo que as listagens (ordem normal do `make dados`)              | silêncio — sem `AVISO:` de proveniência                                            |
| Planilha `data/raw/listagem_*.xlsx` mais nova que o pacote                    | `AVISO:` "não incorporada", exit `0`                                               |
| Contrato violado (corromper uma chave de um JSON do zip)                      | `ERRO:` + exit `1`                                                                 |

## Validação 4 — Fluxo completo com entradas presentes

```bash
mv /tmp/exports_canonical.zip data/canonical/
mv /tmp/data_raw_backup data/raw
make dados            # estrito
make check-dados      # deve sair 0, sem avisos (pacote em dia)
```

Esperado: `make dados` exit `0`; `pilar1_serra_2025.json` final com NEP do
canônico + `NTE == 1857` e `NTECPP == 93` (valores medidos da feature 010);
`make check-dados` sem avisos (pacote mais novo que as entradas).

## Validação 5 — CI não roda o ETL, mas valida o contrato

Confirmar em `.github/workflows/deploy.yml` que o job `quality` inclui
`PYTHONPATH=. python -m etl.scripts.check_dados` após o `pytest` e que **não**
existe nenhum `make etl*`/`make dados` no CI (o ETL permanece manual/local; o
zip commitado é a fonte no deploy).

## Suíte completa

```bash
make check   # flake8 + black/isort/prettier + pytest (inclui test_soft_mode, test_check_dados) + vitest
```

Os cenários acima são exercidos pelos testes automatizados
(`tests/etl/test_soft_mode.py`, `tests/etl/test_check_dados.py`); este guia
serve à validação manual.
