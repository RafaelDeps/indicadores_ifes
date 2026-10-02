# Data Model: Pipeline ETL Determinístico de Indicadores

**Feature**: `006-deterministic-etl-pipeline` | **Date**: 2026-09-23

Modelo de dados do pipeline: entidades de entrada (conforme o export real), entidades derivadas da transformação e entidades de saída (contrato 004).

---

## 1. Entidades de Entrada (`exports_canonical.zip`)

### Campus (de `campuses_canonical.json` — 18+ registros)

| Campo  | Tipo     | Regras                                    |
| ------ | -------- | ----------------------------------------- |
| `id`   | `number` | Identificador canônico                    |
| `name` | `string` | Nome oficial (ex.: `Serra`, `Vila Velha`) |

Registros aninhados `campus: {id, name}` repetem o par em outras entidades.

### Initiative (de `initiatives_canonical.json` — 4.095 registros)

| Campo             | Tipo                 | Regras                                                                           |
| ----------------- | -------------------- | -------------------------------------------------------------------------------- |
| `id`              | `number`             | Identificador canônico; deduplicação por este campo                              |
| `name`            | `string`             | —                                                                                |
| `status`          | `string`             | `Active` \| `Concluded` \| `In Progress` \| `Cancelled` \| `Unknown`             |
| `start_date`      | `string ISO \| null` | Nula em 11 registros → iniciativa nunca ativa (aviso)                            |
| `end_date`        | `string ISO \| null` | Nula em 330 registros → considerada em andamento                                 |
| `initiative_type` | `{id, name}`         | `Research Project` (3.666) \| `Advisorship` (429) — NTPP usa só Research Project |
| `campus`          | `{id, name} \| null` | Presente em todos, mas **null em 4.026** → inferência obrigatória                |
| `team`            | `TeamMember[]`       | Ordem da lista é estável e faz parte da resolução determinística                 |

**TeamMember**: `{ person_id: number, person_name: string, roles: Array<'Coordinator' | 'Researcher' | 'Student'>, start_date, end_date }`.

### Person (registro único: `researchers_canonical.json` — 9.635 registros)

| Campo            | Tipo                 | Regras                                                                            |
| ---------------- | -------------------- | --------------------------------------------------------------------------------- |
| `id`             | `number`             | Identidade canônica da pessoa (usada em todos os Sets)                            |
| `classification` | `string \| null`     | `researcher` (2.511) \| `student` (6.280) \| `outside_ifes` (669) \| `null` (175) |
| `campus`         | `{id, name} \| null` | Campus de vínculo — base da inferência (não nulo em 6.637)                        |

`students_canonical.json` (6.280) é subconjunto dos `classification === 'student'` — não é fonte separada de identidade. IDs 2.486 pessoas aparecem em ambos os arquivos; a classificação em `researchers_canonical.json` é a autoridade.

### Article (de `articles_canonical.json` — 2.027 registros)

| Campo    | Tipo                 | Regras                                                  |
| -------- | -------------------- | ------------------------------------------------------- |
| `id`     | `number`             | Deduplicação                                            |
| `year`   | `number`             | Ano de publicação (`NPB` usa `year === Y`)              |
| `type`   | `string`             | `Journal` \| `Conference` \| ... (todos bibliográficos) |
| `campus` | `{id, name} \| null` | Decladaro em quase todos (3/314 nulos em 2024–2026)     |

### ResearchProduction (de `research_productions_canonical.json` — 951 registros)

| Campo                | Tipo                 | Regras                                                                   |
| -------------------- | -------------------- | ------------------------------------------------------------------------ |
| `id`                 | `number`             | Deduplicação                                                             |
| `year`               | `number`             | Inclui valores inválidos (ex.: `0`) → excluídos + aviso                  |
| `production_type_id` | `number`             | FK para ProductionType (6 tipos, todos técnicos)                         |
| `campus`             | `{id, name} \| null` | **Nulo em 100% dos registros 2024–2026** → atribuição sempre via autores |

### ProductionAuthor (de `production_authors_canonical.json` — 969 registros)

| Campo           | Tipo     | Regras                               |
| --------------- | -------- | ------------------------------------ |
| `production_id` | `number` | FK ResearchProduction                |
| `researcher_id` | `number` | FK Person (todos resolvem em Person) |

### ProductionType (de `production_types_canonical.json` — 6 registros)

| Campo  | Tipo     | Regras                                                                                                                                                                                                                               |
| ------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`   | `number` | —                                                                                                                                                                                                                                    |
| `name` | `string` | `trabalhos_tecnicos`, `outras_producoes_tecnicas`, `softwares_sem_patente`, `entrevistas`, `produtos_tecnologicos`, `processos_tecnicas` — **todos contam como NPT** (Q2); `softwares_sem_patente` alimenta adicionalmente `PC` (Q1) |

---

## 2. Entidades Derivadas (Transform)

### CampusResolution (por iniciativa)

```
campus_efetivo = initiative.campus.name
              ?? campus(do 1º Coordinator com Person.campus)
              ?? campus(do 1º team member com Person.campus, na ordem da lista)
              ?? null   → entra somente em `todos` + aviso
```

### ActiveInitiative (por ano Y)

- `start_date ≤ Y-12-31` E (`end_date` nula OU `end_date ≥ Y-01-01`), comparando apenas a parte da data.
- Escopo: apenas `initiative_type.name === 'Research Project'`.

### ParticipationSets (por campus × ano, e global × ano)

| Conjunto     | Critério de inclusão                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------- |
| `staffIds`   | person_id com role `Coordinator`/`Researcher` em RP ativa **E** `classification === 'researcher'` |
| `studentIds` | person_id com role `Student` em RP ativa                                                          |

Estrutura: `Set<number>` por escopo — deduplicação é inerente. `todos` usa um Set global (nunca soma de Sets por campus).

### ProductionCounts (por campus × ano, e global × ano)

| Métrica | Fonte                                                                                  |
| ------- | -------------------------------------------------------------------------------------- |
| `NPB`   | Articles com `year === Y` e campus (do registro, senão dos autores via Person.campus)  |
| `NPT`   | ResearchProductions com `year === Y` (todos os tipos), campus via autores              |
| `PC`    | ResearchProductions tipo `softwares_sem_patente` com `year === Y` (subconjunto do NPT) |

Atribuição multi-campus: produção/artigo conta **uma vez por campus distinto** envolvido; no `todos`, exatamente uma vez.

### IndicatorRecord (por pilar × campus × ano)

Valores calculados + `null` obrigatório onde não derivável (tabela completa de campos na seção 3). Estado: sempre "montado" — nunca há registro parcial: todo arquivo contém os 9 indicadores do seu pilar com todas as métricas.

---

## 3. Entidades de Saída (`indicadores.zip`)

### PilarPackageFile — `pilar{N}_{campus}_{year}.json`

`{N}` ∈ {1,2,3} · `{campus}` = slug (`slugificarCampus`) · `{year}` ∈ {2024, 2025, 2026} · header `campus` = nome oficial · serialização JSON compacta, chaves em ordem fixa.

**Pilar 1 — Engajamento Academico e Inclusao**:

| Indicador | Campo                                    | Tipo     | Fonte/Regra                    |
| --------- | ---------------------------------------- | -------- | ------------------------------ |
| NTPP      | `projetos_pesquisa_registrados_execucao` | `number` | RP ativas no campus/ano        |
| NTPP      | `total_projetos_NTPP`                    | `number` | Igual ao anterior (verificado) |
| QSPP      | `SUPP_servidores_unicos_participantes`   | `number` | `staffIds.size`                |
| QSPP      | `total_servidores_QSPP`                  | `number` | Igual ao anterior              |
| PIES      | `NEP_estudantes_em_pesquisa`             | `number` | `studentIds.size`              |
| PIES      | `NTE_total_estudantes_matriculados`      | `null`   | Sem censo no export            |
| PIES      | `percentual_calculado_PIES`              | `null`   | Deriva de NTE                  |
| PICOT     | `NTECPP_cotistas_em_pesquisa`            | `null`   | Sem dado de cotistas           |
| PICOT     | `NEP_total_estudantes_em_pesquisa`       | `number` | Mesmo NEP de PIES (preservado) |
| PICOT     | `percentual_calculado_PICOT`             | `null`   | Deriva de NTECPP               |

**Pilar 2 — Fomento e Conexao com o Ecossistema**: `TAFPPI_valor_total_aporte_pesquisa`, `OCC_valor_orcamento_total_capital_custeio`, `percentual_calculado_PINV`, `NAPPCT_acordos_parceria_firmados`, `total_acumulado_PIPDI` — **todos `null`** (sem dados de fomento no export).

**Pilar 3 — Produtividade e Propriedade Intelectual**:

| Indicador | Campo                                      | Tipo         | Fonte/Regra                                        |
| --------- | ------------------------------------------ | ------------ | -------------------------------------------------- |
| PIPRO     | `NPB_producoes_academicas_bibliograficas`  | `number`     | Articles `year === Y`                              |
| PIPRO     | `NPT_producoes_tecnicas_tecnologicas`      | `number`     | Productions `year === Y` (6 tipos)                 |
| PIPRO     | `total_producao_PIPRO`                     | `number`     | NPB + NPT                                          |
| PIPROT    | `PA_patentes_e_modelos_utilidade`          | `number` (0) | Rastreada e comprovadamente vazia                  |
| PIPROT    | `RM_registros_marca`                       | `null`       | Não rastreada                                      |
| PIPROT    | `DI_desenhos_industriais`                  | `number` (0) | Rastreada e comprovadamente vazia                  |
| PIPROT    | `C_cultivares`                             | `null`       | Não rastreada                                      |
| PIPROT    | `TC_topografia_circuitos`                  | `null`       | Não rastreada                                      |
| PIPROT    | `PC_programas_computador`                  | `number`     | Contagem `softwares_sem_patente` `year === Y` (Q1) |
| PIPROT    | `OGM_organismos_geneticamente_modificados` | `null`       | Não rastreada                                      |
| PIPROT    | `total_acumulado_PIPROT`                   | `number`     | Soma das categorias com valor numérico             |
| PIPROTR   | `CT_contratos_transferencia_tecnologia`    | `null`       | Sem dado                                           |
| PIPROTR   | `CL_contratos_licenciamento`               | `null`       | Sem dado                                           |
| PIPROTR   | `CC_contratos_cessao`                      | `null`       | Sem dado                                           |
| PIPROTR   | `total_transferidos_PIPROTR`               | `null`       | Sem dado                                           |

### Regras de Validação (aplicadas antes do empacotamento)

1. Nome de arquivo casa com `^pilar[123]_[a-z0-9]+_\d{4}\.json$`.
2. Header completo (`campus`, `ano_referencia`, `pilar` com nome exato do pilar).
3. Siglas de indicadores exatas por pilar (P1: NTPP/QSPP/PIES/PICOT; P2: PINV/PIPDI; P3: PIPRO/PIPROT/PIPROT).
4. Toda métrica é `number` ou `null` — jamais `undefined`, string ou NaN.
5. Campos não calculáveis estritamente `null` (tabela acima); `0` apenas em contagens verificadas.
6. Qualquer violação → erro com arquivo + campo + regra; exit 1; nenhum zip gerado.
