# Contract: CLI `npm run etl`

**Feature**: `006-deterministic-etl-pipeline` | **Date**: 2026-09-23

Interface de linha de comando do pipeline ETL determinístico.

## Comando

```bash
npm run etl
```

- Implementação do script: `tsx src/etl/main.ts` (dev-dependency `tsx`).
- Sem argumentos obrigatórios; sem flags configuráveis nesta entrega (anos fixos 2024–2026).
- Diretório de execução: raiz do repositório (caminhos resolvidos a partir de `process.cwd()`).

## Entradas

| Arquivo                     | Localização   | Obrigatoriedade                                                                                                                                                                                                                 |
| --------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exports_canonical.zip`     | raiz          | Obrigatório; ausente ou corrompido → erro fatal (exit 1)                                                                                                                                                                        |
| Conjuntos internos exigidos | dentro do zip | `initiatives_canonical.json`, `researchers_canonical.json`, `campuses_canonical.json`, `articles_canonical.json`, `research_productions_canonical.json`, `production_authors_canonical.json`, `production_types_canonical.json` |

`students_canonical.json` é esperado como parte do export, mas a identidade/classificação de pessoas é autoritativa em `researchers_canonical.json` (ver data-model.md §1).

## Saída

| Artefato                          | Localização | Comportamento                                                                                       |
| --------------------------------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `indicadores.zip`                 | raiz        | Reescrito atomicamente (temp + rename) apenas se 100% dos arquivos passarem na validação contratual |
| Nenhum outro arquivo é modificado | —           | Falha em qualquer etapa não altera o `indicadores.zip` preexistente                                 |

## Comportamento de Saída de Console

- **stdout** (pt-BR): resumo final, ex. `ETL concluído: 210 arquivos gerados (17 campi + todos), anos 2024–2026.`
- **stderr — avisos** (prefixo `AVISO:`; execução continua): iniciativas sem campus resolvível (lista de ids), registros com datas/anos inválidos, duplicidades de id, pessoas sem classificação.
- **stderr — erros** (prefixo `ERRO:`; execução aborta): entrada ausente/corrompida, conjunto canônico faltante, violação de validação contratual (mensagem identifica arquivo + campo + regra).

## Exit Codes

| Código | Significado                                                            |
| ------ | ---------------------------------------------------------------------- |
| `0`    | Sucesso: `indicadores.zip` gerado e validado                           |
| `1`    | Falha: entrada inválida, erro de transformação ou validação contratual |

## Garantias

1. **Determinismo**: mesma entrada → `indicadores.zip` byte-idêntico (STORE, datas fixas 1980-01-01, ordenação estável).
2. **Atomicidade**: ou o pacote novo substitui integralmente o antigo, ou o antigo permanece intacto.
3. **Fail-fast**: erro em qualquer fase (Source/Transform/Sync) impede o empacotamento.
4. **Privacidade**: nenhum dado individual de pessoa é gravado na saída (verificado por teste de integração).
