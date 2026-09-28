# Feature Specification: ETL de Listagens de Matrícula (XLSX) → Dados dos Pilares

**Feature Branch**: `010-listagens-xlsx-etl`

**Created**: 2026-09-28

**Status**: Finalizado (clarificações resolvidas em 2026-09-28)

**Input**: User description: "create a etl for data/raw .xlsx, named as
listagem_YYYY_1|2.xlsx (1|2 == 1 or 2); the etl will collect only Pilares
data; NOMES_PILARES = {1: Engajamento Academico e Inclusao, 2: Fomento e
Conexao com o Ecossistema, 3: Produtividade e Propriedade Intelectual};
SIGLAS_POR_PILAR = {1: [NTPP, QSPP, PIES, PICOT], 2: [PINV, PIPDI],
3: [PIPRO, PIPROT, PIPROTR]}; labeled as above."

## Contrato de Entrada (verificado nos 6 arquivos)

`data/raw/listagem_<AAAA>_<S>.xlsx`, onde `<AAAA>` ∈ {2024, 2025, 2026} e
`<S>` ∈ {1, 2}. **Todos os 6 arquivos têm exatamente o mesmo esquema (8 colunas,
verificado):**

| Coluna                          | Semântica                                                                                                              |
| :------------------------------ | :--------------------------------------------------------------------------------------------------------------------- |
| `Matrícula`                     | Chave única do estudante (deduplicação)                                                                                |
| `Nome`                          | Nome do aluno — **nunca** emitido (Princípio IV)                                                                       |
| `Curso`                         | Curso do aluno                                                                                                         |
| `Situação Matrícula`            | Situação da matrícula (Matriculado, Formado, Concluído, Cancelado, Trancado, …)                                        |
| `Sexo`                          | Sexo do aluno                                                                                                          |
| `Nascimento`                    | Data de nascimento                                                                                                     |
| `Desc_Forma_Ingresso_Matricula` | **Forma de ingresso** (Enem/SISU, Processo Seletivo, Transferência, Pós-Graduação, Ampla Concorrência…)                |
| `Desc_Cota`                     | **Forma de matrícula / classificação de cota** (Ampla Concorrência, Aluno de Escola Pública, PPI, renda, deficiência…) |

Estrutura do arquivo: linha 1 = título com o campus (`Campus Serra – Todos os
Cursos - Semestres letivo: 2024/1`), linha 3 = cabeçalho, linhas seguintes =
alunos (2,1k–2,7k linhas por arquivo).

### Dimensões independentes: forma de ingresso × forma de matrícula

`Desc_Forma_Ingresso_Matricula` e `Desc_Cota` são dimensões **independentes e
necessariamente distintas**: a forma de ingresso de um aluno (ex.: "M9 - Enem -
Ampla Concorrência") não determina a forma de matrícula/cota (ex.: "Aluno de
Escola Pública com renda <= 1,5 SM por pessoa"), e vice-versa. O mesmo valor
textual (ex.: "Ampla Concorrência") ocorre nas duas colunas com significados
diferentes. **Qualquer contagem rotulada por uma dimensão DEVE ser calculada
exclusivamente a partir da coluna dessa dimensão** — nunca pela outra, nunca
pela sobreposição textual.

## Revisão dos Pilares (o que as listagens alimentam)

Das 9 siglas fornecidas, apenas duas componentes são deriváveis com fidelidade
a partir das listagens de matrícula:

| Pilar                                       | Slot no contrato                               | Derivável das listagens?    | Justificativa                                                                                                                                                                       |
| :------------------------------------------ | :--------------------------------------------- | :-------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 — Engajamento Academico e Inclusao        | **PIES → `NTE_total_estudantes_matriculados`** | **Sim**                     | Contagem de matriculados+formados por campus/ano — denominador do PIES                                                                                                              |
| 1                                           | **PICOT → `NTECPP_cotistas_em_pesquisa`**      | **Sim (cruzamento FR-012)** | Interseção por nome normalizado entre os estudantes em pesquisa (NEP, export canônico) e os cotistas (listagens) — a única chave disponível; cobertura parcial e piso do valor real |
| 1                                           | NTPP, QSPP                                     | Não                         | Projetos de pesquisa e servidores; as listagens são de estudantes                                                                                                                   |
| 1                                           | NEP                                            | Não                         | Requer vínculo "em pesquisa", inexistente nas listagens                                                                                                                             |
| 2 — Fomento e Conexao com o Ecossistema     | PINV, PIPDI                                    | Não                         | Dados de investimento e parcerias; ausentes                                                                                                                                         |
| 3 — Produtividade e Propriedade Intelectual | PIPRO, PIPROT, PIPROTR                         | Não                         | Dados de produção intelectual; ausentes                                                                                                                                             |

**Conclusão**: as listagens alimentam exclusivamente dois slots do **Pilar 1**:
`NTE_total_estudantes_matriculados` (PIES) e `NTECPP_cotistas_em_pesquisa`
(PICOT, através do cruzamento por nome normalizado com o export canônico —
FR-012). As demais slots permanecem `null`
(Princípio III) no pacote de saída — o ETL NÃO inventa dados de pesquisa a
partir de listagens de matrícula. Os Pilares 2 e 3 entram no contrato apenas
como esqueleto rotulado (`NOMES_PILARES` / `SIGLAS_POR_PILAR`), para manter o
consumo pelo frontend sem quebras.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - NTE anual por campus a partir das listagens (Priority: P1)

Um analista dispõe, para um ano Y, de `listagem_Y_1.xlsx` e `listagem_Y_2.xlsx`.
Executa o ETL e recebe o pacote dos Pilares do ano Y com
`NTE_total_estudantes_matriculados` e `NTECPP_cotistas_em_pesquisa` preenchidos
no Pilar 1 e todas as demais slots com campos `null`. O site passa a exibir o
total de matriculados/formados onde antes exibia "Dado indisponível".

**Números medidos (campus Serra)** — NTE (Matriculado+Formado, únicos no ano):
2024 = **1282**, 2025 = **1857**, 2026 = **2121**. Cotistas (ambas colunas
"de cota", únicos; análise interna do relatório): 2024 = **438**, 2025 = **616**,
2026 = **775**. **NTECPP** (cruzamento NEP × cotistas por nome normalizado,
FR-012): 2024 = **73**, 2025 = **93**, 2026 = **96** — sempre ≤ NEP
(349/422/391). (Base: as listagens são deduplicadas por `Matrícula` entre os
dois semestres do mesmo ano; um estudante matriculado nos dois semestres conta
uma única vez.)

**Why this priority**: é a única entrega que transforma dados reais em
indicador; sem NTE, PIES segue sem denominador.

**Independent Test**: rodar o ETL com os arquivos de 2025 e o export canônico
(`data/canonical/exports_canonical.zip`); o pacote de 2025 do campus Serra
contém `NTE_total_estudantes_matriculados == 1857` e
`NTECPP_cotistas_em_pesquisa == 93` (cruzamento, não 616 — a contagem bruta de
cotistas fica apenas no relatório), e todos os demais campos `null`.

**Acceptance Scenarios**:

1. **Given** os dois arquivos de 2025 em `data/raw/`, **When** o ETL é executado
   para o ano 2025, **Then** o processo termina com código 0 e um resumo no stdout.
2. **Given** o pacote gerado, **When** um auditor abre `pilar1_serra_2025.json`,
   **Then** `indicadores.PIES.NTE_total_estudantes_matriculados == 1857`,
   `indicadores.PICOT.NTECPP_cotistas_em_pesquisa == 93` (≤ NEP 422), e os
   demais campos do contrato estão `null` (nunca `0`).
3. **Given** um estudante matriculado (ou formado) nos dois semestres de 2025,
   **When** o ETL agrega o ano, **Then** esse estudante é contado uma única vez
   no NTE (deduplicação por `Matrícula`).
4. **Given** a mesma entrada, **When** o ETL roda duas vezes, **Then** os pacotes
   são byte a byte idênticos (determinismo).

### User Story 2 - Fidelidade das dimensões ingresso × matrícula (Priority: P2)

O analista confia que "cotista" exige que **ambas** as colunas sejam de cota:
a forma de ingresso (`Desc_Forma_Ingresso_Matricula`) e a forma de
matrícula/cota (`Desc_Cota`). Um aluno ingressante por "Ampla Concorrência"
nunca é cotista, mesmo que a coluna de cota diga o contrário — e vice-versa.

**Why this priority**: erros aqui produzem números categoricamente errados no
site (Princípio III/IV).

**Independent Test**: alimentar o ETL com uma listagem sintética com 4
estudantes: (i) ingresso "M9 - Enem - Ampla Concorrência" + cota "Ampla
Concorrência"; (ii) ingresso "M9 - Enem - Ampla Concorrência" + cota "Aluno de
Escola Pública…"; (iii) ingresso "PS - Ação Afirmativa 1 - PPI" + cota "Aluno
de Escola Pública…"; (iv) ingresso "PS - Ação Afirmativa 1 - PPI" + cota "Não
possui". A contagem de cotistas deve resultar em **2** (apenas ii e iii têm
ambas as colunas de cota).

**Acceptance Scenarios**:

1. **Given** um aluno com ingresso "Ampla Concorrência" e cota "Aluno de Escola
   Pública…", **When** o ETL conta cotistas, **Then** o aluno **não** entra na
   contagem (ingresso não é de cota).
2. **Given** um aluno com ingresso "PS - Ação Afirmativa 1 - PPI" e cota "Não
   possui", **When** o ETL conta cotistas, **Then** o aluno **não** entra na
   contagem (forma de matrícula não é de cota).
3. **Given** um aluno com ingresso e cota ambos de reserva de vagas, **When** o
   ETL conta cotistas, **Then** o aluno entra **uma única vez** na contagem.

### User Story 3 - Auditoria, avisos e privacidade (Priority: P3)

O analista recebe `AVISO:` no stderr quando um semestre esperado está ausente
ou o título do arquivo diverge do nome do arquivo; e nenhum dado pessoal
(Nome, Matrícula, cota individual) aparece no pacote público.

**Why this priority**: origem dos dados fora do Git + obrigação LGPD
(Princípio IV).

**Independent Test**: inspecionar o pacote de saída — nenhum nome, matrícula ou
valor individual das planilhas aparece; e remover `listagem_2026_2.xlsx`
reesecutando 2026 produz `AVISO:` nomeando o arquivo ausente.

**Acceptance Scenarios**:

1. **Given** o pacote de saída e as planilhas de entrada, **When** busca-se
   qualquer `Nome`/`Matrícula` das planilhas, **Then** nenhum ocorre no pacote.
2. **Given** um arquivo de semestre ausente, **When** o ETL roda, **Then** um
   `AVISO:` no stderr nomeia o arquivo ausente (sem falhar se o outro semestre
   existe; falha limpa com `ERRO:` + código 1 se ambos os semestres do ano
   faltarem ou um arquivo estiver corrompido).
3. **Given** situação fora de {Matriculado, Formado} (Concluído, Cancelado,
   Trancado…), **When** o ETL calcula NTE, **Then** o estudante não entra em
   nenhuma contagem (nem NTE, nem cotistas).

### Edge Cases

- Ano sem nenhum arquivo em `data/raw/` → `ERRO:` + código 1 (sem pacote falso).
- Apenas 1 semestre presente → usa o semestre disponível e `AVISO:` sobre o
  ausente (nunca inventa o semestre faltante).
- Arquivo corrompido / cabeçalho inesperado → `ERRO:` + código 1, sem saída parcial.
- `Desc_Cota` vazia (`None`/branco) → não é "de cota"; a linha ainda conta para
  NTE se a situação for matriculado/formado.
- `Desc_Forma_Ingresso_Matricula` vazia → não é "de cota"; a linha ainda conta
  para NTE se a situação for matriculado/formado.
- Linhas sem `Matrícula` → ignoradas com `AVISO:`.
- A mesma `Matrícula` nos dois semestres com situações diferentes (ex.: S1
  Matriculado, S2 Cancelado) → conta uma única vez no NTE (pela janela S1).
- Campus no título com variações de escrita → normalização de slug consistente.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE localizar todos os arquivos `data/raw/listagem_<AAAA>_<S>.xlsx`
  com `<AAAA>` de 4 dígitos e `<S>` ∈ {1, 2}, agrupando-os por ano.
- **FR-002**: O sistema DEVE validar, para todo arquivo lido, o contrato de
  entrada: as 8 colunas exatas (`Matrícula`, `Nome`, `Curso`, `Situação
Matrícula`, `Sexo`, `Nascimento`, `Desc_Forma_Ingresso_Matricula`,
  `Desc_Cota`) e cabeçalho na linha 3; divergência ⇒ `ERRO:` + código 1.
- **FR-003**: O sistema DEVE derivar campus, ano e semestre (campus do título;
  ano/semestre do nome do arquivo e conferidos com o título) e tratar
  divergência de campus entre os dois semestres do mesmo ano com `AVISO:`.
- **FR-004**: O sistema DEVE calcular NTE como o conjunto de `Matrícula`
  **únicas por ano** cuja `Situação Matrícula` seja "Matriculado" **ou**
  "Formado" em **pelo menos um dos semestres** do ano, agregando
  exclusivamente com os alunos dos dois semestres `listagem_<AAAA>_1.xlsx` e
  `listagem_<AAAA>_2.xlsx`. **Um estudante matriculado/formado nos dois
  semestres é contado uma única vez.** (Valores medidos campus Serra:
  2024 = 1282, 2025 = 1857, 2026 = 2121.)
- **FR-005**: O sistema DEVE tratar `Desc_Forma_Ingresso_Matricula` e
  `Desc_Cota` como dimensões independentes e calcular qualquer contagem
  rotulada por dimensão estritamente a partir da sua própria coluna.
- **FR-006**: O sistema DEVE calcular, além do NTE (FR-004), a **contagem de
  cotistas** (análise interna do relatório e base do cruzamento FR-012):
  estudantes do NTE cuja **forma de ingresso E forma de matrícula/cota sejam
  ambas "de cota"** (reserva de vagas/ação afirmativa), deduplicados por ano.
  "De cota" é uma classificação explícita e testável (as modalidades sem
  reserva — "Ampla Concorrência", transferências, portador de diploma, análise
  de currículo, intercâmbio etc. — ficam fora). (Valores medidos campus Serra:
  2024 = 438, 2025 = 616, 2026 = 775.)
- **FR-007**: O sistema DEVE gerar a saída apenas com a estrutura dos Pilares,
  usando exatamente `NOMES_PILARES` e `SIGLAS_POR_PILAR`; todo campo não
  derivável DEVE ser `null` (Princípio III), nunca `0`.
- **FR-008**: O sistema DEVE emitir o pacote de saída no mesmo contrato do
  pipeline atual: arquivos `pilar{N}_{campus}_{year}.json` (N ∈ {1,2,3})
  empacotados em zip sob `data/dist/`. Por padrão o nome do zip é
  `data/dist/indicadores_listagens.zip` (não sobrescreve o `indicadores.zip`
  do pipeline de pesquisa). O Pilar 1 preenche `PIES.NTE_total_estudantes_matriculados`
  e `PICOT.NTECPP_cotistas_em_pesquisa` — este último somente quando o export
  canônico está disponível para o cruzamento FR-012 (sem ele, permanece `null`);
  as demais slots permanecem `null` (descrições textuais do contrato são
  mantidas).
- **FR-009**: O sistema DEVE ser determinístico (mesma entrada ⇒ mesma saída
  byte a byte; escrita atômica; sem timestamps no pacote).
- **FR-010**: O sistema DEVE gerar zero dados pessoais (Nome, Matrícula, cota
  individual) no pacote de saída (Princípio IV).
- **FR-011**: O sistema DEVE usar `AVISO:` (stderr) para ausências/divergências
  não fatais e `ERRO:` + código de saída 1 para falhas fatais; `0` em sucesso.
- **FR-012**: O sistema DEVE calcular `NTECPP_cotistas_em_pesquisa` como o
  **cruzamento por nome normalizado** (sem acentos, minúsculas, espaços
  colapsados — `normalizacao_nomes.normalizar_nome`) entre os estudantes em
  pesquisa do export canônico (conjunto NEP do campus/ano, mesmo critério do
  `aggregator`) e os cotistas das listagens (FR-006), e DEVE documentar no
  relatório de execução as limitações do método: (i) nome não é chave
  inequívoca (homônimos) e (ii) a cobertura do cruzamento é parcial — o valor
  publicado é um **piso** do indicador real. Por construção NTECPP ≤ NEP do
  mesmo campus/ano; interseção vazia é publicada como `null` (não `0`,
  Princípio III). Sem o export canônico disponível o NTECPP permanece `null`.
  Os percentuais PIES/PICOT permanecem `null` nesta feature.

### Key Entities _(include if feature involves data)_

- **Listagem de Matrícula**: planilha por campus/ano/semestre com o contrato de
  8 colunas; dados internos apenas.
- **Estudante (linha da listagem)**: identificado por `Matrícula` (única);
  possui `Situação Matrícula`, `Desc_Forma_Ingresso_Matricula`, `Desc_Cota`;
  usado só para agregar, nunca emitido.
- **Campus**: derivado do título; chave de agrupamento das contagens
  (slug idêntico ao usado no zip atual: `serra`, `vitoria`, …).
- **Forma de Ingresso** (`Desc_Forma_Ingresso_Matricula`): dimensão
  independente de classificação de ingresso.
- **Forma de Matrícula / Cota** (`Desc_Cota`): dimensão independente de
  classificação da matrícula; nunca confundida com a forma de ingresso.
- **Pacote de saída**: zip `data/dist/indicadores_listagens.zip` com arquivos
  `pilar{N}_{campus}_{year}.json` no contrato atual do pipeline (FR-008),
  consumíveis pelo frontend.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Executar o ETL com os arquivos de 2025 termina em < 60 s, código 0.
- **SC-002**: NTE 2025 do campus Serra == 1857 e **NTECPP == 93** (cruzamento
  NEP × cotistas por nome, FR-012), conferidos com contagem manual/independente
  das planilhas e do export canônico. Invariante: NTECPP ≤ NEP (93 ≤ 422) e
  interseção vazia nunca vira `0` (Princípio III).
- **SC-003**: Execuções repetidas com a mesma entrada produzem pacotes byte a
  byte idênticos (mesmo checksum).
- **SC-004**: Nenhum Nome, Matrícula ou valor individual (cota/ingresso por
  estudante) das planilhas ocorre no pacote de saída.
- **SC-005**: O build estático do site consome o pacote sem alterações no
  frontend e exibe o NTE do Pilar 1 (PIES) e o NTECPP do PICOT (card de
  componente) onde antes era "Dado indisponível".

## Assumptions

- **Questão 2 (contagem de cotistas, confirmada em 2026-09-28)**: os cotistas
  são um subconjunto do NTE (contagem definida na Questão 1) calculado com a
  regra das duas colunas — forma de ingresso E forma de matrícula/cota devem
  ser ambas "de cota". O ETL calcula o NTE e **adiciona** essa contagem
  (documentada no relatório; usada como base do cruzamento FR-012).
- **NTECPP (decisão de 2026-09-28, após comprovar ausência de chave de
  junção)**: o export canônico não carrega matrícula/`identification_id`
  (verificado por 3 métodos independentes — 0 de 2.756 estudantes com campo
  preenchido), portanto o único cruzamento possível entre estudantes em
  pesquisa e cotistas é **por nome normalizado** (FR-012). A cobertura medida
  é de 12–17% dos cotistas e o valor publicado é um piso documentado; a
  alternativa de publicar `null` foi avaliada e recusada pela decisão do
  usuário. A correção exata (chave `Matrícula`/`identification_id` no export
  canônico) permanece como pedido de dados à plataforma.
- Os 6 arquivos presentes (campus Serra, 2024–2026) refletem o contrato de
  entrada estável; o ETL DEVE suportar múltiplos campi (campus do título), mas
  só é obrigado a produzir para os arquivos presentes.
- A saída reutiliza o contrato de arquivos `pilar{N}_{campus}_{year}.json` do
  pipeline existente; o zip novo não sobrescreve `data/dist/indicadores.zip`.
- NEP/NTPP/QSPP e Pilares 2/3 não são deriváveis das listagens (exigem vínculo
  "em pesquisa" ou dados de pesquisa); permanecem como esqueleto `null`.
- A integração futura (combinar NTE/NTECPP das listagens com NEP do export
  canônico para calcular PIES/PICOT) está fora do escopo desta feature.
