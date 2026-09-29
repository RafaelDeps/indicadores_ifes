# Implementation Plan: Modo Soft (SOFT=1), Verificação de Frescor e Target Único do ETL

**Branch**: `011-etl-soft-mode-frescor` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-etl-soft-mode-frescor/spec.md`

## Summary

Orquestração e resiliência do ETL existente (features 006/010), sem novos
dados, sem nova dependência e sem mudar o contrato de saída:

1. **Modo soft opt-in** (`--soft` / `SOFT=1`) nas três CLIs do pipeline.
   Quando a entrada de uma etapa está ausente, a etapa é pulada com `AVISO:`
   no stderr (exit 0), **preservando por não-toque** o último snapshot coerente
   (`data/dist/indicadores.zip`). O fail-fast atual (spec 006) permanece o
   default. Invariantes: nunca fabricar (campo não apurado ⇒ `null`), nunca
   deletar, nunca misturar execuções.
2. **`make check-dados`** → `etl/scripts/check_dados.py`: valida o contrato do
   pacote (reusa `validar_arquivos_pilar` + `CAMPOS_DERIVAVEIS_LISTAGENS`;
   violação ⇒ `ERRO:` + exit 1) e emite `AVISO:` de frescor por `mtime` (exit
   0): canônico mais novo que o pacote; `indicadores_listagens.zip` mais antigo
   que o pacote (proveniência NTE/NTECPP); planilha `data/raw/listagem_*.xlsx`
   mais nova que o pacote. Entradas ausentes não geram comparação.
3. **`make dados`** (target único): `etl` → `etl-listagens` →
   `merge-listagens` em sequência, parando no primeiro erro, repassando o soft
   via `SOFT=1`.

**Restrição técnica central** (ver `research.md` §2): o zip público tem apenas
agregados — sem nomes — portanto o NTECPP **não é recomputável** a partir do
zip; o "reuso do último pacote" é alcançado por **não tocar no arquivo**, nunca
por sobrepor valores antigos (opção C recusada por misturar execuções).

## Technical Context

**Language/Version**: Python 3.11+ (Black `target-version = ['py311']`);
mesmo toolchain do `etl/` atual. **Sem novas dependências.**

**Primary Dependencies**: nenhuma nova. Reuso integral de
`etl/scripts/validate_zip.py` (ainda assim, `check_dados.py` importa
`validar_arquivos_pilar` e `CAMPOS_DERIVAVEIS_LISTAGENS` diretamente, sem
dependência do script CLI); parsers `argparse` padrão (padrão já usado em
`main.py`/`main_listagens.py`).

**Storage**: filesystem. Entradas gitignored (`data/canonical/`,
`data/raw/`), artefato intermediário `data/dist/indicadores_listagens.zip` e
pacote público `data/dist/indicadores.zip`. Nenhuma base de dados.

**Testing**: pytest para `tests/etl` (convenção do repositório, desvio
documentado em Complexity Tracking); Vitest permanece o runner do frontend.
Dois arquivos de teste novos: `tests/etl/test_soft_mode.py` e
`tests/etl/test_check_dados.py` (red→green, Princípio II).

**Target Platform**: Linux (CI GitHub Actions, runner ubuntu-latest);
Makefile/GNU make.

**Project Type**: orquestração/CLI sobre pipeline de dados existente; sem mudar
o pacote hexagonal.

**Performance Goals**: os novos testes terminam em segundos; `make check-dados`
< 5 s (validação de todos os JSON do pacote — quantidade variável, derivada do
export — + 3 stat de mtime).

**Constraints**: mensagens de console em pt-BR; `AVISO:`/`ERRO:` no stderr;
determinismo e atomicidade do pipeline preservados; modo soft **opt-in** (o
contrato 006 de fail-fast não muda); zero PII (nenhuma mudança de dados);
nenhuma mudança no contrato de saída (o shape do pacote da 010 fica intocado).

**Scale/Scope**: 3 CLIs + 1 script novo + 2 alvos Makefile + 2 suítes de
teste; sem impacto no frontend e sem mudança de dados.

## Constitution Check

_GATE: aprovado antes da Fase 0. Reavaliado após o design (Fase 1) — mantido._

| Princípio              | Status | Justificativa                                                                                                                                                                              |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| I. Simplicidade        | ✅     | Zero dependências novas; só flags em parsers existentes, um script de verificação e dois alvos Makefile; reuso da validação já existente.                                                  |
| II. Test-first         | ✅     | `test_soft_mode.py` e `test_check_dados.py` escritos e observados falhar (red) antes da implementação (pytest, convenção do ETL).                                                          |
| III. Fidelidade        | ✅     | O soft nunca fabrica nem sobrepõe valores: campo não apurado ⇒ `null`; preservação do zip por não-toque (sha256 igual); fail-fast default do contrato 006 intacto.                          |
| IV. Agregado apenas    | ✅     | Nenhum dado novo; o universo de nomes vive apenas no export gitignored; nada de PII em qualquer artefato ou teste.                                                                         |
| V. Qualidade           | ✅     | flake8/black/isort nos módulos novos; mensagens pt-BR; sem mudança de frontend.                                                                                                            |
| VI. Deploy com portões | ✅     | CI ganha validação de contrato do pacote commitado (`check_dados` no job `quality`); topologia inalterada (o CI continua sem rodar o ETL).                                                 |

## Project Structure

### Documentation (this feature)

```text
specs/011-etl-soft-mode-frescor/
├── plan.md              # este arquivo (/speckit.plan)
├── research.md          # Fase 0 — decisões e alternativas
├── data-model.md        # Fase 1 — artefatos e invariantes de frescor
├── quickstart.md        # Fase 1 — guia de validação end-to-end
├── contracts/           # Fase 1 — contratos de CLI e de check-dados
│   ├── etl-cli.md
│   └── check-dados.md
└── tasks.md             # Fase 2 (/speckit.tasks — não criado pelo plan)
```

### Source Code (repository root)

```text
etl/
├── main.py                              # AJUSTE: flag --soft + env SOFT=1 (guarda antes do ERRO de entrada ausente)
├── main_listagens.py                    # AJUSTE: flag --soft + env SOFT=1 (planilhas ausentes ⇒ pulo; AVISO NTECPP não recalculável)
├── adapters/sources/
│   └── zip_canonical_source.py          # (inalterado: ausência de arquivo tratada na CLI)
└── scripts/
    ├── merge_listagens_indicadores.py   # AJUSTE: flag --soft + env SOFT=1 (zip de listagens ausente ⇒ pulo)
    ├── validate_zip.py                  # (inalterado — fonte do código de validação reusado)
    └── check_dados.py                   # NOVO: valida contrato (reuso validar_arquivos_pilar) + 3 avisos de frescor por mtime

Makefile                                 # AJUSTE: variável SOFT; alvos dados e check-dados; .PHONY; help
.github/workflows/deploy.yml             # AJUSTE: job quality roda check_dados (validação de contrato do zip commitado)

tests/etl/
├── test_soft_mode.py                    # NOVO: 8 cenários (FR-002..FR-005)
├── test_check_dados.py                  # NOVO: 6 cenários (FR-007..FR-009)
└── conftest.py                          # AJUSTE: helpers p/ dirs sem entrada + pacote base (se necessário)
README.md                                # AJUSTE: tabela de comandos (dados, check-dados, SOFT)
```

**Structure Decision**: nenhuma mudança arquitetural — as alterações são
pontuais nas CLIs existentes (parser + guarda de ausência), um script de
verificação novo no já existente `etl/scripts/`, e orquestração no Makefile
(que já é o orquestrador documentado do repo). O pacote hexagonal e o contrato
de saída ficam intocados.

## Phase 0: Research

Ver [research.md](./research.md). Decisões-chave:

- **Soft via flag + env**: `--soft` (argparse) com fallback `SOFT=1` nas três
  CLIs; Makefile converge `SOFT=1` → `--soft`.
- **Preservação por não-toque**: a etapa pulada não escreve nada; o "reuso do
  último zip" é não-alterar o snapshot coerente; opção C (sobrepor valores
  antigos) rejeitada por mistura de execuções.
- **Canônico novo + listagens pulado ⇒ NTE/NTECPP `null`** (Princípio III),
  nunca valor antigo.
- **`check-dados` reusa a validação** (`validar_arquivos_pilar` +
  `CAMPOS_DERIVAVEIS_LISTAGENS`) e adiciona 3 avisos de mtime; limitação de
  mtime (Git não preserva) documentada como contrato; em clone/CI vale só a
  validação.
- **`make dados`**: encadeamento `&&` explícito; sem regras de dependência GNU
  make (regeneração é sempre obrigatória quando solicitada).
- **CI**: `check_dados` no job `quality` como portão de contrato do zip
  commitado (sem rodar o ETL).

## Phase 1: Design & Contracts

Ver [data-model.md](./data-model.md), [contracts/*](./contracts/) e
[quickstart.md](./quickstart.md).

Contratos gerados:

- `contracts/etl-cli.md` — flags `--soft`/env `SOFT` por CLI, matriz de
  comportamento por etapa (presente/ausente × soft/estrito), códigos de saída
  e formatos de mensagem, e o contrato de orquestração do `make dados`.
- `contracts/check-dados.md` — assinatura CLI, etapa de validação (reuso do
  contrato), as três regras de frescor com textos de `AVISO:`, códigos de
  saída e a limitação de mtime (clone/CI ⇒ só contrato).

Reavaliação pós-design da Constitution Check: **mantida aprovada** — nenhuma
mudança de escopo; reuso máximo do código existente.

## Complexity Tracking

> Violações de constituição justificadas (nenhuma viola Princípio I–VI; são
> desvios de _convenções detalhadas_, já praticados no repositório).

| Violação                                                             | Por que é necessária                                                                                                                                | Alternativa mais simples rejeitada                                                                                   |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| pytest (e não apenas Vitest) para os testes do ETL                   | Prática consolidada do repo desde o ETL Python (c0f118a); constituição ratificada antes da existência do ETL Python                                  | Rejeitada: portar a suíte ETL para Vitest reconstruiria o pipeline já aprovado (Princípio I)                        |
| `check_dados` duplica a chamada de validação do `validate_zip.py`    | O script CLI existente imprime e retorna; importar `validar_arquivos_pilar` é a forma testável de reusar o contrato sem subprocess                                                  | Rejeitada: invocar `validate_zip` como subprocess tornaria o teste frágil e o contrato não importável                |
| CI roda `check_dados` (Python) mesmo o deploy sendo Node-only        | O zip commitado é o dado publicado (Princípio VI); validar seu contrato em cada PR é um portão barato que o CI Node-only não cobriria                | Rejeitada: rodar o ETL no CI exigiria entradas gitignored que o CI não possui                                        |