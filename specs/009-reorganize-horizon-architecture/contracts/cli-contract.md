# Contract: CLI e Automação de Comandos (Pipeline ETL)

**Feature**: `009-reorganize-horizon-architecture`
**Date**: 2026-09-26
**Status**: Complete

## 1. Entrada de Linha de Comando (`etl/main.py`)

O entrypoint principal do pipeline Python aceita os seguintes parâmetros via `argparse`:

```text
python -m etl.main [-h] [--entrada ENTRADA] [--saida SAIDA] [--campus CAMPUS] [--anos ANOS]
```

### 1.1. Argumentos e Variáveis de Ambiente

| Flag Longa  | Flag Curta | Variável de Ambiente | Valor Padrão                                                                           | Descrição                                                                                                                |
| :---------- | :--------: | :------------------: | :------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| `--entrada` |    `-i`    |      `ENTRADA`       | `data/canonical/exports_canonical.zip`                                                 | Caminho do pacote canônico de entrada. Suporta caminhos relativos ou absolutos (ex.: `../horizon_etl/data/exports/...`). |
| `--saida`   |    `-o`    |       `SAIDA`        | `data/dist/indicadores.zip` (ou `data/dist/indicadores_<slug>.zip` se campus filtrado) | Caminho de gravação do pacote de saída.                                                                                  |
| `--campus`  |    `-c`    |       `CAMPUS`       | `None` (execução global de todos os 23 campi + 'todos')                                | Nome ou slug do campus para execução filtrada.                                                                           |
| `--anos`    |    `-a`    |        `ANOS`        | `2024,2025,2026`                                                                       | Anos civis de apuração separados por vírgula.                                                                            |

### 1.2. Códigos de Saída (Exit Codes)

| Código | Condição                                                                   | Comportamento no `stderr`                                                                                                    |
| :----: | :------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- |
|  `0`   | Sucesso total                                                              | Emite mensagem de conclusão no `stdout` com total de arquivos e caminho de saída.                                            |
|  `1`   | Arquivo canônico não encontrado                                            | Emite erro detalhado no `stderr` com instrução de resolução para posicionar o arquivo ou configurar `--entrada` / `ENTRADA`. |
|  `1`   | Parâmetro inválido (ex.: `--anos` não-numérico ou `--campus` desconhecido) | Emite erro de validação e lista campi disponíveis.                                                                           |
|  `1`   | Erro interno de processamento ou corrupção no zip canônico                 | Emite stack trace formatado ou mensagem amigável no `stderr`.                                                                |

---

## 2. Interface do `Makefile`

O `Makefile` na raiz consolida os fluxos de trabalho do desenvolvedor:

```bash
make setup       # Cria .venv, instala requirements-etl.txt e dependências npm
make etl         # Executa python -m etl.main (consome data/canonical/ e grava em data/dist/)
make etl-campus  # Executa para campus individual (ex: make etl-campus CAMPUS=Serra)
make test        # Executa a suíte completa: make test-etl && make test-web
make test-etl    # Executa exclusivamente os testes Pytest em tests/etl/
make test-web    # Executa exclusivamente os testes Vitest em tests/web/
make lint        # Roda flake8 no código Python e eslint no frontend Astro
make format      # Formata código Python (black, isort) e frontend (prettier)
make format-check# Verifica conformidade sem alterar arquivos
make check       # Pipeline completo de CI local: lint + format-check + test
make clean       # Remove artefatos temporários, caches e zips parciais de campus
```
