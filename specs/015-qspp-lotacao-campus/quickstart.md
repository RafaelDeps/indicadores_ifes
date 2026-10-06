# Quickstart: Validação da Restrição do QSPP por Lotação

**Branch**: `fix/first-pilar` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

## 1. Pré-requisitos

- Ambiente virtual Python configurado (`.venv/bin/python`).
- Dependências instaladas (`pip install -r requirements-etl.txt`).

## 2. Execução dos Testes Automatizados

Executar os testes unitários do ETL focados na classificação e agregação de pesquisadores:

```bash
.venv/bin/python -m pytest tests/etl/test_calculators.py tests/etl/test_aggregator.py -v
```

Executar a suíte completa de testes do ETL e do Frontend:

```bash
make test
```

## 3. Verificação do Comportamento

1. **Classificação Estrita**:
   Verificar que uma pessoa com `classification == 'outside_ifes'` ou `classification == 'student'` portando papel `"Researcher"` retorna `False` em `eh_pesquisador_em_pesquisa()`.
2. **Agregação por Lotação**:
   Verificar que um pesquisador lotado em Vitória participando de um projeto em Serra NÃO pontua no QSPP de Serra, mas pontua no escopo `todos`.
3. **Consolidação do Pacote**:
   Verificar que o pacote gerado cumpre as regras de integridade e fidelidade com `make check-dados`.
