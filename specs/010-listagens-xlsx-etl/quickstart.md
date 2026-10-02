# Quickstart — Validação end-to-end do ETL de Listagens

**Feature**: `010-listagens-xlsx-etl` | **Spec**: [spec.md](./spec.md)

Guia de validação (não substitui testes nem implementação; detalhes de contrato
em [contracts/saida_pacote.md](./contracts/saida_pacote.md) e
[contracts/classificacao_cota.md](./contracts/classificacao_cota.md)).

## Pré-requisitos

- Python 3.11+ com ambiente `.venv` e dependências de `requirements-etl.txt`
  (inclui `openpyxl` — adicionado por esta feature).
- Arquivos de entrada em `data/raw/listagem_<AAAA>_<S>.xlsx`
  (6 arquivos: 2024–2026, semestres 1 e 2).
- `data/dist/indicadores.zip` existente **ou** gerado pelo pipeline canônico
  (`make etl`) — necessário apenas para o merge/SC-005.
- `data/canonical/exports_canonical.zip` (export canônico, default do
  `--canonical`) — necessário para o cruzamento NTECPP (FR-012). Sem ele,
  o NTECPP sai como `null`.
- Node 20 (frontend) apenas para validar o consumo pelo site.

## Setup

```bash
make setup          # cria .venv, instala requirements-etl.txt e npm install
make etl-listagens  # executa python -m etl.main_listagens → data/dist/indicadores_listagens.zip
make merge-listagens  # sobrepõe NTE/NTECPP em data/dist/indicadores.zip
```

> **Orquestração recomendada (spec 011 — `etl-soft-mode-frescor`):** use
> `make dados` para executar as etapas na ordem correta (`etl` →
> `etl-listagens` → `merge-listagens`) em um único comando, parando no primeiro
> erro; `SOFT=1 make dados` tolera entradas ausentes (cada etapa faltante é
> pulada com `AVISO:` no stderr, exit 0) preservando o último pacote coerente.
> Depois, `make check-dados` responde "posso confiar neste `indicadores.zip`?"
> (validação de contrato + avisos de frescor por `mtime`).

## Validação 1 — NTE, cotistas (análise interna) e NTECPP (cruzamento)

```bash
PYTHONPATH=. .venv/bin/python -m etl.main_listagens
```

Resultado esperado (com `data/canonical/exports_canonical.zip` disponível):

- Código de saída `0`.
- `data/dist/indicadores_listagens.zip` gerado com
  `pilar1_serra_2025.json` (e demais anos).
- `pilar1_serra_2025.json`:
  - `PIES.NTE_total_estudantes_matriculados == 1857`
  - `PICOT.NTECPP_cotistas_em_pesquisa == 93` (cruzamento NEP × cotistas
    por nome normalizado, FR-012 — ≤ NEP 422)
  - `NTPP.*`, `QSPP.*`, `NEP_*`, `percentual_calculado_*` → `null`
  - `pilar2_*`/`pilar3_*`: shape do contrato atual (P2 só nulls; P3 zeros
    estruturais do contrato).
- `AVISO:` do cruzamento impresso (método + valores por campus/ano); avisos de
  arquivo ausente só se houver falha de entrada.

Conferência manual independente (SC-002): recontar da planilha
`listagem_2025_1.xlsx` + `listagem_2025_2.xlsx` as matrículas únicas com
situação `Matriculado`/`Formado` → 1857; dentre elas as que têm ambas as
colunas "de cota" → 616 (cotistas — **análise interna do relatório**, não o
NTECPP publicado). Conferir o NTECPP cruzando os nomes normalizados dos
estudantes em pesquisa (NEP do export canônico) com os cotistas → **93**.

## Validação 2 — Determinismo (SC-003)

```bash
PYTHONPATH=. .venv/bin/python -m etl.main_listagens --saida /tmp/indicadores_r1.zip
PYTHONPATH=. .venv/bin/python -m etl.main_listagens --saida /tmp/indicadores_r2.zip
sha256sum /tmp/indicadores_r1.zip /tmp/indicadores_r2.zip
```

Esperado: checksums idênticos.

## Validação 3 — Privacidade (SC-004)

```bash
unzip -p data/dist/indicadores_listagens.zip | grep -iE 'nome|matrícula' || echo 'sem PII' ; \
PYTHONPATH=. .venv/bin/python -m etl.scripts.merge_listagens_indicadores
```

Esperado: nenhuma ocorrência de nome/matrícula/valor individual no pacote; o
merge termina com `0` e não altera nenhum campo além de `PIES.NTE` e
`PICOT.NTECPP`.

## Validação 4 — Avisos e falhas

| Cenário              | Comando                                                                    | Esperado                                            |
| -------------------- | -------------------------------------------------------------------------- | --------------------------------------------------- |
| Semestre ausente     | `mv data/raw/listagem_2026_2.xlsx /tmp/`                                   | `AVISO:` nomeando `listagem_2026_2.xlsx`; saída `0` |
| Nenhum arquivo       | `PYTHONPATH=. .venv/bin/python -m etl.main_listagens --entrada /tmp/vazio` | `ERRO:` + saída `1`                                 |
| Cabeçalho corrompido | trocar linha 3 de uma cópia                                                | `ERRO:` + saída `1`, sem saída parcial              |

(Cenários cobertos por testes automatizados em `tests/etl/test_listagens_source.py`.)

## Validação 5 — Site exibe NTE e NTECPP (SC-005)

Após `make etl` + `make etl-listagens` + `make merge-listagens`:

```bash
npm run build
```

Esperado: build `0`, frontend inalterado, card PIES do campus Serra/2025 exibe
1.857 e o componente NTECPP do card PICOT exibe 93 (NEP 422) — antes:
"Dado indisponível". Detalhe do merge em
[contracts/saida_pacote.md](./contracts/saida_pacote.md) §5.

## Suíte completa

```bash
make check    # flake8 + black/isort/prettier + pytest (tests/etl) + vitest (tests/web)
```

Todos os comandos acima também são exercidos nos testes automatizados
(`tests/etl/test_listagens_*.py`); este guia serve à validação manual e ao CI.
