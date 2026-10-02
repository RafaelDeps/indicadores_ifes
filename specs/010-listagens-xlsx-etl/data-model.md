# Data Model: ETL de Listagens de Matrícula (XLSX) → Dados dos Pilares

**Branch**: `010-listagens-xlsx-etl` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

## Contexto

Este ETL transforma planilhas de matrícula (dados internos, fora do Git) em
duas contagens agregadas do Pilar 1, dentro do pacote JSON consumido pelo site.
Nenhum dado individual é persistido ou emitido (Princípio IV).

## Entidades

### 1. ListagemDeMatricula (arquivo)

Fonte de entrada mais externa.

| Campo          | Tipo             | Regras / Validação                                                   |
| -------------- | ---------------- | -------------------------------------------------------------------- |
| `arquivo`      | `Path`           | Regex `^listagem_(\d{4})_([12])\.xlsx$`                              |
| `ano`          | `int`            | Do nome do arquivo (grupo 1); conferido com o título da planilha     |
| `semestre`     | `int` ∈ {1,2}    | Do nome do arquivo (grupo 2); conferido com o título                 |
| `campus_nome`  | `str`            | Extraído do título da linha 1 (`Campus <nome>` até separador)        |
| `campus_slug`  | `str`            | `normalizar_slug(campus_nome)`                                       |
| `linha_titulo` | `str \| None`    | Linha 1; ausência ⇒ `ERRO:` fatal                                    |
| `cabecalho`    | `tuple[str,...]` | Linha 3; deve ser exatamente as 8 colunas do contrato (ordem rígida) |

**Validação de contrato (FR-002)**: as 8 colunas exatas
(`Matrícula`, `Nome`, `Curso`, `Situação Matrícula`, `Sexo`, `Nascimento`,
`Desc_Forma_Ingresso_Matricula`, `Desc_Cota`), cabeçalho na linha 3. Divergência
⇒ `ERRO:` + código 1.

**Divergências não fatais (AVISO)**: título sem `Semestres letivo: <AAAA>/<S>`
ou sem campus; campus divergente entre os dois semestres do mesmo ano.

### 2. EstudanteListagem (linha da planilha)

Representação mínima, agregável, sem PII em qualquer artefato persistido.

| Campo                  | Tipo          | Origem                                    | Uso                     |
| ---------------------- | ------------- | ----------------------------------------- | ----------------------- |
| `matricula`            | `str`         | célula `Matrícula` (normalizada para str) | chave de deduplicação   |
| `situacao`             | `str \| None` | `Situação Matrícula`                      | filtro NTE              |
| `forma_ingresso`       | `str \| None` | `Desc_Forma_Ingresso_Matricula` (strip)   | classificação "de cota" |
| `forma_matricula_cota` | `str \| None` | `Desc_Cota` (strip)                       | classificação "de cota" |

**Regras de linha**:

- Sem `Matrícula` → linha ignorada + `AVISO:`.
- Campos de texto com espaços → `strip()` antes de qualquer comparação/classificação.

### 3. Campus

- `campus_nome`: o título da planilha (ex.: `Serra`).
- `campus_slug`: `normalizar_slug` (ex.: `serra`).
- Chave de agregação: `(campus_slug, ano)`.

### 4. NTE (contagem anual)

- **Definição (FR-004)**: `| { matricula : ∃ semestre ∈ {1,2} com
situacao ∈ {"Matriculado", "Formado"} } |` — união dos dois semestres,
  dedup por `matricula`.
- **Valores medidos (Serra)**: 2024 = 1282, 2025 = 1857, 2026 = 2121.

### 5. Cotistas (contagem anual — análise interna)

- **Definição (FR-006)**: subconjunto do NTE com
  `forma_ingresso` "de cota" **E** `forma_matricula_cota` "de cota"
  (classificação em `contracts/classificacao_cota.md`).
- **Valores medidos (Serra)**: 2024 = 438, 2025 = 616, 2026 = 775.
- Usada como **base do cruzamento NTECPP** e registrada no relatório de
  execução; não é o valor publicado de `PICOT.NTECPP_cotistas_em_pesquisa`.

### 5b. NTECPP (cruzamento NEP × cotistas)

- **Definição (FR-012)**: `| normalizar_nome(NEP_{campus,ano}) ∩
normalizar_nome(cotistas_{campus,ano}) |` — nomes **normalizados**
  (minúsculas, sem acentos, espaços colapsados) dos estudantes em pesquisa do
  export canônico (mesmo critério do NEP do `aggregator`) contra os nomes dos
  cotistas das listagens.
- **Valores medidos (Serra)**: 2024 = 73, 2025 = 93, 2026 = 96 — sempre
  ≤ NEP (349/422/391).
- **Fidelidade**: por construção NTECPP ≤ NEP; interseção vazia ⇒ `null` (não
  `0`, Princípio III); nome não é chave inequívoca e a cobertura é parcial —
  o valor é um **piso** documentado no relatório. Sem export canônico ⇒ `null`.

### 6. AgregadosPilar1 (contêiner de domínio)

Campos preenchidos pelo fluxo listagens:

| Campo                                                                                | Valor do fluxo listagens                                         |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `nte_total_estudantes_matriculados`                                                  | `int` (NTE) — anotação muda de `None` para `int \| None`         |
| `ntecpp_cotistas_pesquisa`                                                           | `int \| None` (cruzamento FR-012) — `null` sem canônico/vazio    |
| `ntpp_projetos_pesquisa_ativos`, `qspp_docentes_pesquisa`, `nep_estudantes_pesquisa` | `None` explícito (não deriváveis das listagens) → `null` no JSON |
| demais campos (percentuais)                                                          | `None` (default do dataclass) → `null`                           |

> **Nota (integridade do contrato)**: `json_pilar_sink._montar_pilar1` mapeia
> `p1.ntpp/qspp/nep` para os subcampos de NTPP/QSPP/PIES/PICOT. Os defaults do
> dataclass são `0`; para a feature, esses campos **não são deriváveis** e
> precisam serializar como `null` (FR-007/Princípio III), nunca `0`. **Decisão**:
> o fluxo listagens constrói `AgregadosPilar1` passando `None` explícito para
> `ntpp_projetos_pesquisa_ativos`, `qspp_docentes_pesquisa` e
> `nep_estudantes_pesquisa` (e `nte`/`ntecpp` com os valores calculados). Os
> defaults do modelo permanecem intactos (o pipeline canônico sempre os define
> explicitamente; nenhum teste usa o default — verificado).

### 7. PacotePilar (saída)

- Arquivos: `pilar{N}_{campus_slug}_{year}.json`, N ∈ {1,2,3}.
- Zip: `data/dist/indicadores_listagens.zip`.
- Merge: `data/dist/indicadores.zip` (somente `PIES.NTE` e `PICOT.NTECPP`).

## Regras sobre estados / distribuições

- **Sem transição de estados** entre execuções; cada execução é funcional e
  determinística (mesma entrada ⇒ mesma saída byte a byte). Escritas são
  atômicas (`tmp` + `os.replace`).
- **Ausência de dados** ⇒ `null` (Princípio III), nunca `0`; percentuais
  PIES/PICOT sempre `null` nesta feature.

## Validações de domínio (invariantes)

1. NTE ≥ 0 e cotistas ≥ 0; **cotistas ⊆ NTE** (invariante: cotista exige
   situação matriculado/formado — numerador nunca excede o denominador).
2. **NTECPP ⊆ NEP** por construção (interseção de conjuntos de nomes do mesmo
   campus/ano); NTECPP nunca excede o NEP publicado.
3. Deduplicação por `matricula` dentro do ano.
4. Contagem por `(campus_slug, ano)`; nenhum dado individual em qualquer artefato.
5. Zip determinístico (entradas ordenadas; timestamps fixos).
6. Merge altera **apenas** os 2 campos do Pilar 1 (valida diff de chaves).
