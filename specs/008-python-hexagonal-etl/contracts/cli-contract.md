# Interface Contract: CLI Entrypoint (`etl/main.py`)

**Feature Branch**: `008-python-hexagonal-etl`  
**Date**: 2026-09-25

## Command Line Interface

The Python ETL is executed as a module: `python3 -m etl.main [OPTIONS]`.

### Arguments and Options

| Option      | Flag | Type      | Default                                                       | Description                                                                                                                                             |
| :---------- | :--- | :-------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--entrada` | `-i` | Path      | `exports_canonical.zip`                                       | Path to the canonical source zip package.                                                                                                               |
| `--saida`   | `-o` | Path      | `indicadores.zip` (or `indicadores_<campus>.zip` if filtered) | Path to the generated output zip package.                                                                                                               |
| `--campus`  | `-c` | String    | `None` (processes all 23 campuses + `todos`)                  | Specific campus to process. Accepts official name (e.g. `Serra`, `Vitória`) or slug (e.g. `serra`, `vitoria`). Case-insensitive and accent-insensitive. |
| `--anos`    | `-a` | List[int] | `[2024, 2025, 2026]`                                          | Comma-separated list of target calendar years.                                                                                                          |
| `--help`    | `-h` | Boolean   | -                                                             | Displays usage help and exits with status 0.                                                                                                            |

### Environment Variables

- `CAMPUS`: If set and `--campus` is not provided via CLI, `--campus` defaults to the value of `$CAMPUS`.
- `ENTRADA`: If set and `--entrada` is not provided, defaults to `$ENTRADA`.
- `SAIDA`: If set and `--saida` is not provided, defaults to `$SAIDA`.

### Exit Codes

- `0`: Success. Pipeline executed completely, validated contracts, and generated atomic ZIP.
- `1`: Validation or Execution Error:
  - Input zip file missing or corrupted.
  - Required canonical file missing in zip.
  - Unrecognized campus requested via `--campus`.
  - Sink contract violation detected during validation.

### Standard Output & Error Logging

- **stdout**:
  - Summary logs (e.g., `Carregando dados canônicos de exports_canonical.zip...`).
  - Progress metrics (number of initiatives, persons, productions processed).
  - Success confirmation (e.g., `Pipeline concluído com sucesso: 216 arquivos gerados em indicadores.zip`).
- **stderr**:
  - Warning messages prefixed with `AVISO: ` for non-fatal anomalies (e.g. initiatives without start date, unresolvable campus).
  - Fatal errors prefixed with `ERRO: ` before exiting with status 1.
