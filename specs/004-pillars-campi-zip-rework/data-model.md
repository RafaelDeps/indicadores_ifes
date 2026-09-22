# Data Model: Rework do Dashboard com os 3 Pilares CONIF, Multi-Campus e Ingestão Zip

**Feature**: `004-pillars-campi-zip-rework` | **Data**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

## Entidades e Modelos Conceituais

### 1. Campus

Representa uma unidade de ensino do IFES ou a entidade institucional consolidada.

- **Campos**:
  - `id`: `string` — Identificador / slug em minúsculas (ex.: `"serra"`, `"todos"`).
  - `nome`: `string` — Nome legível para exibição (ex.: `"Serra"`, `"Todos os Campi"`).
  - `anosDisponiveis`: `number[]` — Anos de referência com dados registrados para o campus.
- **Regras de Validação**:
  - `id` deve ser alfanumérico em minúsculas sem acentos.
  - `todos` é o identificador reservado para a visão institucional agregada oficial.
  - Anos devem estar contidos no intervalo 2000–2100.

---

### 2. Pilar CONIF

Uma das três dimensões avaliativas estabelecidas no modelo CONIF de pesquisa e pós-graduação.

- **Campos**:
  - `numero`: `1 | 2 | 3` — Número do pilar.
  - `slug`: `string` — Caminho canônico de rota (`"pilar-1"`, `"pilar-2"`, `"pilar-3"`).
  - `nome`: `string` — Nome institucional oficial:
    - Pilar 1: `"Engajamento Acadêmico e Inclusão"`
    - Pilar 2: `"Fomento e Conexão com o Ecossistema"`
    - Pilar 3: `"Produtividade e Propriedade Intelectual"`
  - `descricao`: `string` — Descrição dos objetivos do pilar.
  - `indicadores`: `IndicadorMetadata[]` — Lista de indicadores subordinados ao pilar.

---

### 3. Indicador (Metadata & Definição Conceitual)

Métrica quantitativa ou percentual que compõe um dos pilares.

- **Campos**:
  - `sigla`: `string` — Sigla do indicador em maiúsculas (ex.: `"NTPP"`, `"QSPP"`, `"PIES"`, `"PICOT"`, `"PINV"`, `"PIPDI"`, `"PIPRO"`, `"PIPROT"`, `"PIPROTR"`).
  - `slug`: `string` — Sigla em minúsculas para roteamento (ex.: `"ntpp"`).
  - `pilarNumero`: `1 | 2 | 3` — Número do pilar ao qual pertence.
  - `nome`: `string` — Título completo descritivo.
  - `oQueMede`: `string` — Finalidade de aferição.
  - `formula`: `string` — Descrição textual da fórmula de cálculo.
  - `tipoValor`: `'quantidade' | 'percentual'` — Natureza numérica da métrica.
  - `polaridade`: `'maior-e-melhor'` — Orientação institucional de desempenho.
  - `componentes`: `VariavelComponenteDef[]` — Variáveis que alimentam a métrica.

---

### 4. Registro Anual do Indicador (Valor & Estado por Campus e Ano)

Representa o resultado aferido para determinado indicador, campus e ano.

- **Campos**:
  - `campus`: `string` — Identificador do campus.
  - `ano`: `number` — Ano de referência.
  - `valor`: `number | null` — Valor numérico calculado ou medido.
  - `status`: `'disponivel' | 'indisponivel'` — Estado de disponibilidade.
  - `motivoIndisponivel`: `string | undefined` — Justificativa institucional obrigatória caso `valor === null`.
  - `componentes`: `Record<string, number | null>` — Valores dos componentes e subtipos individuais (ex.: tipos de patentes em PIPROT).
- **Regras Estritas de Fidelidade (Princípio III)**:
  - Se `valor === null`, `status` DEVE ser `'indisponivel'` e a interface DEVE exibir "Dado indisponível".
  - O valor `0` é estritamente reservado para contagens nulas comprovadas e NÃO DEVE ser tratado como nulo.
  - Variáveis não coletadas são `null`. Se uma variável de indicador composto for `null`, o resultado consolidado é `null`.

---

### 5. Conjunto de Dados Extraído do Zip (`DatasetIndicadores`)

Coleção completa de dados em memória extraída de `indicadores.zip` durante o build estático.

- **Campos**:
  - `campi`: `Campus[]` — Lista de campi disponíveis no pacote.
  - `anos`: `number[]` — Lista consolidada de anos.
  - `pilares`: `Map<number, RegistroPilar[]>` — Coleção estruturada indexada por pilar, campus e ano.
