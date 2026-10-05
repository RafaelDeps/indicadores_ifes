# Implementation Plan: Restrição do QSPP aos Servidores com Lotação no Próprio Campus

**Branch**: `fix/first-pilar` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/015-qspp-lotacao-campus/spec.md`

## Summary

Corrigir a sobrecontagem no indicador QSPP (Quantitativo de Servidores Desenvolvendo Projetos) para que ele reflita fidedignamente o quadro funcional do próprio campus avaliado (em especial o Campus Serra, onde o número caía na faixa de ~350 devido à inclusão indevida de pesquisadores externos `outside_ifes`, estudantes bolsistas e servidores lotados em outros campi que colaboram em projetos locais). A solução aplica classificação estrita de pesquisador (`classification == 'researcher'`) e exige a dupla vinculação (projeto sediado no campus E lotação institucional da pessoa coincidente com o campus) para o cálculo do QSPP local, mantendo o consolidado sistêmico no escopo global `"todos"`.

## Technical Context

**Language/Version**: Python 3.10+ (pipeline ETL) / TypeScript 5+ (Frontend Astro)

**Primary Dependencies**: openpyxl, pytest, flake8, black, isort

**Storage**: Arquivos JSON compactados em ZIP (`data/dist/indicadores.zip`)

**Testing**: pytest para o pipeline ETL (`tests/etl/`) e Vitest para o frontend (`tests/web/`)

**Target Platform**: Linux / GitHub Actions / GitHub Pages

**Project Type**: ETL pipeline + site estático (Astro)

**Performance Goals**: Execução completa do pipeline de agregação em < 2 segundos

**Constraints**: Fidelidade estrita aos dados, conformidade com a LGPD (sem PII no repositório), TDD não-negociável (Princípio II)

**Scale/Scope**: 23 campi do IFES, 3 pilares CONIF, anos de referência 2024–2026

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- [x] **Principle I (Simplicity)**: Alterações pontuais nas funções puras de classificação e agregação em `papeis.py`, `pillar1.py` e `aggregator.py`, sem novas dependências nem camadas adicionais.
- [x] **Principle II (Test-First Development)**: Testes automatizados escritos em `tests/etl/` antes de qualquer alteração de código.
- [x] **Principle III (Fidelity to Report Data)**: Respeito à definição metodológica do QSPP; valores não inventados.
- [x] **Principle IV (Aggregated Data Only)**: Nenhum dado nominal ou sensível é exposto ou persistido no pacote final.
- [x] **Principle V (Basic Quality)**: Interface em pt-BR, código em inglês, zero erros de linter.
- [x] **Principle VI (Automated Deployment)**: Pipeline e testes passando para garantir gates do GitHub Actions.

## Project Structure

### Documentation (this feature)

```text
specs/015-qspp-lotacao-campus/
├── plan.md              # Este plano de implementação
├── research.md          # Pesquisa e decisões de design (Phase 0)
├── data-model.md        # Modelo de dados e regras de pertinência (Phase 1)
├── quickstart.md        # Guia de validação e testes rápidos (Phase 1)
├── contracts/           # Contratos de cálculo e schema (Phase 1)
│   └── qspp-calculation-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Tarefas de implementação (Phase 2 - speckit-tasks)
```

### Source Code (repository root)

```text
etl/
├── core/
│   └── logic/
│       ├── calculators/
│       │   ├── aggregator.py       # Lógica de agregação por campus (filtragem de campus da pessoa)
│       │   ├── papeis.py           # Classificação estrita eh_pesquisador_em_pesquisa
│       │   └── pillar1.py          # Classificação no cálculo isolado do Pilar 1
tests/
└── etl/
    ├── test_calculators.py         # Testes unitários de classificação de papéis
    ├── test_aggregator.py          # Testes de pertinência por campus de lotação
    └── test_fidelity.py           # Invariantes e consistência dos pacotes
```

## Complexity Tracking

Nenhuma complexidade adicional introduzida. Apenas refinamento das regras booleanas existentes para eliminar falsos positivos na contagem de servidores.
