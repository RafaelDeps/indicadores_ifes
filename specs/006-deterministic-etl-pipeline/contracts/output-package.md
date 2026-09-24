# Contract: Pacote de Saída `indicadores.zip`

**Feature**: `006-deterministic-etl-pipeline` | **Date**: 2026-09-23

Contrato do pacote gerado pelo ETL. **Base normativa**: [`specs/004-pillars-campi-zip-rework/contracts/ingestion-contract.md`](../../004-pillars-campi-zip-rework/contracts/ingestion-contract.md) — este documento especializa o contrato 004 para a geração automatizada e não o contradiz.

## 1. Nomenclatura e Cobertura

- Padrão estrito: `pilar{N}_{campus}_{year}.json`, com `{N}` ∈ {1, 2, 3}.
- `{campus}`: slug de `slugificarCampus(nome_oficial)` — lowercase, sem diacríticos, sem caracteres não `[a-z0-9]` (mesmo algoritmo do site, `src/lib/slugificar.ts`). Escopo institucional: `todos`.
- `{year}`: 2024, 2025, 2026.
- Cobertura obrigatória: para **cada** campus de `campuses_canonical.json` **e** para `todos`, arquivos dos 3 pilares nos 3 anos (campus sem nenhum dado no ano ainda gera arquivos, com zeros verificados/nulls conforme regras).
- O pacote contém **exclusivamente** esses arquivos (nenhum metadado extra, diretório vazio ou arquivo auxiliar).

## 2. Esquema dos Arquivos

Header comum e estruturas por indicador conforme contrato 004 (seções 2.1–2.3), com as seguintes especializações de valores:

| Diferença em relação ao exemplo estático do contrato 004 | Regra vigente (clarificações 2026-09-23)                                       |
| -------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `PIPROT.PC_programas_computador`                         | Contagem verificada de produções `softwares_sem_patente` no ano (não fixo `0`) |
| `PIPRO.NPT_producoes_tecnicas_tecnologicas`              | Todos os 6 tipos de `production_types_canonical.json`                          |
| Pilar 3 por ano                                          | `NPB`/`NPT` contam registros com `year === ano_referencia`                     |

Campos não deriváveis do export permanecem estritamente `null` (ex.: `NTE`, percentuais PIES/PICOT, todos os campos de PINV/PIPDI/PIPROTR, categorias de PI não rastreadas `RM`, `C`, `TC`, `OGM`). `0` apenas para contagens verificadas (ex.: `NTPP` sem projetos ativos no ano; `PA`, `DI`).

## 3. Regras Semânticas

1. **Ausência ≠ zero**: `null` para não coletado; `0` somente contagem zero verificada (contrato 004, regras 1–2).
2. **`todos` dedicado**: arquivos `pilar{N}_todos_{year}.json` sempre presentes, calculados sobre a instituição completa com deduplicação global de pessoas — nunca soma de campi parciais (contrato 004, regra 3).
3. **Fidelidade de cabeçalho**: `campus` no JSON é o nome oficial (ex.: `Serra`, `Vila Velha`); o slug aparece apenas no nome do arquivo.
4. **Valores numéricos**: inteiros não negativos; `NaN`/`undefined` proibidos.

## 4. Determinismo do Artefato

- ZIP em método **STORE**, datas de entrada fixadas em 1980-01-01 00:00:00, CRC32 padrão IEEE.
- Entradas ordenadas: pilar (1→3), slug de campus (alfabético), ano (asc).
- JSON compacto (sem espaços), chaves na ordem do contrato.
- Propriedade verificável: duas execuções sobre a mesma entrada produzem **bytes idênticos** (hash igual).

## 5. Consumo

O pacote é consumido sem alterações pelo ingestor existente do site (`src/lib/dataset.ts` → `carregarDataset`), que valida o regex de nome e extrai `campus`/`pilar`/`ano` de cada entrada. Nenhuma mudança é necessária no site para ingerir a saída do ETL.
