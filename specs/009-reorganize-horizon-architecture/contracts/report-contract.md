# Contract: Relatório de Auditoria e Qualidade (`data/reports/etl_run_report.md`)

**Feature**: `009-reorganize-horizon-architecture`
**Date**: 2026-09-26
**Status**: Complete

## 1. Objetivo e Papel na Governança

O arquivo `data/reports/etl_run_report.md` é gerado deterministicamente ao final de cada execução do pipeline de ETL completo. Ele fornece a rastreabilidade pública exigida pela governança institucional, atestando a integridade dos dados que alimentam o dashboard.

---

## 2. Estrutura do Documento Markdown

O relatório deve conter obrigatoriamente as seguintes seções estruturadas:

```markdown
# Relatório de Execução do Pipeline ETL - Indicadores CONIF

**Data/Hora de Execução**: YYYY-MM-DD HH:MM:SS UTC
**Arquivo de Entrada**: data/canonical/exports_canonical.zip
**Arquivo de Saída**: data/dist/indicadores.zip
**Tempo de Execução**: X.XX segundos
**Status**: Sucesso

## 1. Volumetria Geral Processada

| Entidade                                        | Total Carregado |
| :---------------------------------------------- | :-------------: |
| Campi Institucionais                            |       23        |
| Pessoas Registradas (Pesquisadores / Discentes) |        N        |
| Projetos / Iniciativas Totais                   |        N        |
| Produções Técnicas e Bibliográficas             |        N        |

## 2. Iniciativas Ativas por Ano de Referência

| Ano de Referência | Projetos Ativos | Escopos Atendidos |
| :---------------: | :-------------: | :---------------: |
|       2024        |        N        |        24         |
|       2025        |        N        |        24         |
|       2026        |        N        |        24         |

## 3. Resumo por Campus e Pilar

| Campus         | NTPP (2025) | QSPP (2025) | NEP (2025) | NPB (2025) | NPT (2025) |
| :------------- | :---------: | :---------: | :--------: | :--------: | :--------: |
| Serra          |      N      |      N      |     N      |     N      |     N      |
| Vitória        |      N      |      N      |     N      |     N      |     N      |
| ...            |     ...     |     ...     |    ...     |    ...     |    ...     |
| Todos os Campi |      N      |      N      |     N      |     N      |     N      |

## 4. Alertas de Qualidade e Anomalias de Origem

- Total de avisos emitidos: N
- Exemplo de alertas agregados:
  - Iniciativas sem campus declarado resolvidas via líder: N
  - Iniciativas sem campus e sem equipe atribuídas apenas ao escopo 'todos': N
  - Produções com ano nulo desconsideradas: N
```

---

## 3. Regras de Privacidade (LGPD / Princípio IV)

- **Proibição Absoluta**: Nomes próprios de estudantes, matrículas ou CPFs **nunca** devem constar no relatório.
- **Identificação Pública Apenas**: Apenas contagens agregadas, nomes públicos oficiais de campi e identificadores numéricos de projetos públicos podem constar no relatório.
