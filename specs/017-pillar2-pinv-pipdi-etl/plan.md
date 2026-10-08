# Implementation Plan: Integração do Cálculo Completo do Pilar 2 (PINV e PIPDI) no ETL

**Branch**: `017-pillar2-pinv-pipdi-etl` | **Date**: 2026-10-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/017-pillar2-pinv-pipdi-etl/spec.md`

## Summary

Esta feature integra o cálculo e a publicação completa dos indicadores do **Pilar 2 (Fomento e Conexão com o Ecossistema)** no pipeline hexagonal de ETL:

1. **PINV por Campus**: Ingestão desacoplada de percentuais via `data/pinv_<campus>.json` (ex.: `data/pinv_serra.json` contendo 2024 = 496,78%, 2025 = 1.111,35%, 2026 = 610,63%) para popular `percentual_calculado_PINV`.
2. **TAFPPI e PIPDI via SIGPESQ**: Extração de dados de financiamento em `project_sigpesq_files_json/` no pacote `exports_canonical.zip` para agregar aportes monetários de novos projetos (`TAFPPI_valor_total_aporte_pesquisa`) e acordos de parceria vigentes com empresas e agências externas (`NAPPCT_acordos_parceria_firmados` / `total_acumulado_PIPDI`).
3. **Harmonização de Schemas e Sinks**: Atualização de `pilar2-schema.json`, calculadores em `pillar2.py`, agregação em `aggregator.py` e validações do sink para aceitar valores numéricos de PINV e PIPDI preservando o estrito `null` de `OCC` per Princípio III.

## Technical Context

**Language/Version**: Python 3.11+ (executado no `.venv` do projeto)
**Primary Dependencies**: Biblioteca padrão Python (`json`, `zipfile`, `pathlib`, `re`, `dataclasses`, `argparse`)
**Storage**: Arquivos JSON compactados em `data/dist/indicadores.zip`
**Testing**: `pytest` para a suíte de testes do ETL (`tests/etl/`)
**Target Platform**: Linux / POSIX (com suporte a execução local e CI GitHub Actions)
**Project Type**: Pipeline de dados em arquitetura hexagonal (ETL)
**Performance Goals**: Execução completa do pipeline em `< 2 segundos`
**Constraints**: Determinismo estrito bit a bit; conformidade LGPD (sem dados pessoais exportados); aderência aos contratos de esquema CONIF
**Scale/Scope**: 1 campus com dados detalhados (Serra) + escopo institucional `todos` em 3 anos de referência (2024, 2025, 2026)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design._

| Princípio Constitucional         |  Status  | Avaliação e Conformidade                                                                                                                                                                        |
| :------------------------------- | :------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicity**                | **PASS** | Reuso estrito das camadas existentes do pipeline hexagonal (`sources`, `calculators`, `sinks`); sem bibliotecas externas pesadas adicionadas.                                                   |
| **II. Test-First Development**   | **PASS** | Testes automatizados em pytest (`tests/etl/test_pinv_source.py`, `tests/etl/test_sigpesq_funding.py`, `tests/etl/test_pillar2_calculation.py`) serão escritos antes do código de implementação. |
| **III. Fidelity to Report Data** | **PASS** | `OCC` permanece estritamente `null` (_"Dado indisponível"_); `percentual_calculado_PINV` reflete exatamente os dados do JSON fornecido; `TAFPPI` soma apenas aportes documentados nos projetos. |
| **IV. Aggregated Data Only**     | **PASS** | Apenas valores numéricos consolidados de aportes, quantidades de parcerias e percentuais são emitidos; nenhum nome de pesquisador, bolsista ou CPF trafega para o pacote de distribuição.       |
| **V. Basic Quality**             | **PASS** | Todo o código formatado com black/isort, compatível com flake8, mensagens e descrições em português do Brasil (pt-BR).                                                                          |
| **VI. Automated Deployment**     | **PASS** | Validação automatizada por meio de `make check-dados` e `make test-etl` garantindo portões de qualidade antes de qualquer publicação.                                                           |

## Project Structure

### Documentation (this feature)

```text
specs/017-pillar2-pinv-pipdi-etl/
├── plan.md              # Este plano de implementação
├── research.md          # Decisões técnicas e arquiteturais (Fase 0)
├── data-model.md        # Modelagem de entidades e regras de transformação (Fase 1)
├── quickstart.md        # Roteiro prático de validação ponta a ponta (Fase 1)
├── contracts/           # Contratos de interface e schemas JSON (Fase 1)
│   ├── pilar2-schema.json
│   └── pinv-json-contract.md
└── tasks.md             # Tarefas de implementação (gerado pelo /speckit-tasks)
```

### Source Code (repository root)

```text
etl/
├── adapters/
│   ├── sinks/
│   │   ├── json_pilar_sink.py           # Serialização do Pilar 2 com percentual PINV numérico ou null
│   │   └── zip_indicadores_sink.py      # Autorização de percentual_calculado_PINV como campo derivável
│   └── sources/
│       ├── pinv_json_source.py          # Leitor de data/pinv_<campus>.json
│       └── zip_canonical_source.py      # Extração de project_sigpesq_files_json/ do ZIP canônico
├── core/
│   └── logic/
│       ├── calculators/
│       │   ├── aggregator.py            # Orquestração da agregação dos 3 pilares
│       │   └── pillar2.py               # Funções de cálculo de PINV, TAFPPI e PIPDI
│       └── models/
│           ├── facto.py                 # Entidades FACTO existentes
│           └── indicators.py            # Atualização da dataclass AgregadosPilar2
└── scripts/
    └── check_dados.py                   # Validação de conformidade CONIF do pacote gerado

tests/
└── etl/
    ├── test_pinv_source.py              # Testes unitários do leitor de pinv_<campus>.json
    ├── test_sigpesq_funding.py          # Testes unitários do extrator de fomento SIGPESQ
    └── test_pillar2_full.py             # Testes de integração do cálculo e agregação do Pilar 2
```

## Complexity Tracking

> Nenhuma violação constitucional identificada; arquitetura segue o padrão hexagonal estabelecido.

| Violação  | Justificativa | Alternativa Rejeitada |
| :-------- | :------------ | :-------------------- |
| _Nenhuma_ | —             | —                     |
