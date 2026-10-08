# Data Model: Integração do Cálculo Completo do Pilar 2 (PINV e PIPDI) no ETL

**Feature**: `017-pillar2-pinv-pipdi-etl` | **Data**: 2026-10-07

## 1. Entidades de Domínio

### 1.1 `ProjetoSigpesqFinanciamento`

Representa um projeto acadêmico extraído dos arquivos `project_sigpesq_files_json/PJ_<codigo>.json`.

| Campo         | Tipo                       | Descrição                                                      |
| :------------ | :------------------------- | :------------------------------------------------------------- |
| `codigo`      | `str`                      | Código do projeto (ex.: "PJ 7875" ou "7875")                   |
| `titulo`      | `str \| None`              | Título do projeto de pesquisa                                  |
| `campus_slug` | `str`                      | Slug do campus normalizado (ex.: "serra")                      |
| `ano_inicio`  | `int \| None`              | Ano de início do projeto extraído de `datas.inicio`            |
| `ano_fim`     | `int \| None`              | Ano de término/encerramento do projeto extraído de `datas.fim` |
| `valor_total` | `float`                    | Valor total em R$ (direto ou soma das fontes)                  |
| `fontes`      | `list[FonteFinanciamento]` | Lista de fontes pagadoras e seus aportes                       |

### 1.2 `FonteFinanciamento`

Discrimina uma fonte pagadora dentro do financiamento do projeto.

| Campo   | Tipo            | Descrição                                                            |
| :------ | :-------------- | :------------------------------------------------------------------- |
| `fonte` | `str`           | Nome da instituição pagadora (ex.: "FAPES", "CNPq", "ArcelorMittal") |
| `tipo`  | `str \| None`   | Modalidade do fomento (ex.: "Bolsa", "Subvenção", "Contrapartida")   |
| `valor` | `float \| None` | Montante em R$ aportado por esta fonte específica                    |

### 1.3 `DadosPinvCampus`

Representa o arquivo JSON externo contendo os percentuais de PINV apurados por campus.

| Campo             | Tipo               | Descrição                                                 |
| :---------------- | :----------------- | :-------------------------------------------------------- |
| `indicador`       | `str`              | Identificador do indicador (sempre "PINV")                |
| `campus`          | `str`              | Nome oficial do campus (ex.: "Serra")                     |
| `campus_slug`     | `str`              | Slug normalizado do campus (ex.: "serra")                 |
| `unidade`         | `str`              | Unidade de medida (sempre "%")                            |
| `valores_por_ano` | `dict[int, float]` | Dicionário mapeando ano (`int`) para percentual (`float`) |

### 1.4 `AgregadosPilar2` (Entidade Atualizada)

Métricas agregadas do Pilar 2 que são persistidas no pacote `indicadores.zip`.

| Campo                                       | Tipo                   | Validação / Regra                                                         |
| :------------------------------------------ | :--------------------- | :------------------------------------------------------------------------ |
| `tafppi_valor_total_aporte_pesquisa`        | `float \| None`        | Soma dos valores em R$ dos projetos iniciados no ano (`>= 0.0` ou `None`) |
| `occ_valor_orcamento_total_capital_custeio` | `None`                 | Estritamente `None` (Princípio III da Constituição)                       |
| `percentual_calculado_pinv`                 | `float \| int \| None` | Percentual derivado de `DadosPinvCampus` (`>= 0.0` ou `None`)             |
| `nappct_acordos_parceria_firmados`          | `int \| None`          | Total de parcerias com fontes externas ativas no ano (`>= 0` ou `None`)   |
| `total_acumulado_pipdi`                     | `int \| None`          | Espelha o valor de `nappct_acordos_parceria_firmados`                     |

---

## 2. Regras de Transformação e Agregação

### 2.1 Cálculo de `TAFPPI`

$$\text{TAFPPI}(S, Y) = \sum \{ P.\text{valor\_total} \mid P \in \text{Projetos}, S \in P.\text{campus\_slugs}, P.\text{ano\_inicio} == Y \}$$

- Se não houver projetos com aporte no ano $Y$ para o campus $S$, o resultado é `None`.
- Para o escopo institucional `todos`, soma todos os projetos dos campi do IFES iniciados em $Y$.

### 2.2 Cálculo de `PIPDI` (`NAPPCT`)

$$\text{NAPPCT}(S, Y) = \text{count}(\{ P \mid P \in \text{Projetos}, S \in P.\text{campus\_slugs}, P.\text{eh\_parceria\_externa}, P.\text{ativo\_em\_ano}(Y) \})$$

- Critério para `eh_parceria_externa`:
  - Projeto possui ao menos uma fonte em `fontes` que não seja classificada como voluntária pura.
  - Entidades reconhecidas: CNPq, FAPES, FINEP, CAPES, empresas privadas (ArcelorMittal, Samarco, Mogai, Intelliway, etc.), ministérios e órgãos conveniados.

### 2.3 Atribuição do `percentual_calculado_PINV`

$$\text{PINV}(S, Y) = \text{DadosPinvCampus}[S].\text{valores\_por\_ano}.get(Y, None)$$

- Se `data/pinv_<slug>.json` existir, o percentual correspondente ao ano $Y$ é atribuído.
- Se o arquivo ou o ano não existir, atribui `None`.
