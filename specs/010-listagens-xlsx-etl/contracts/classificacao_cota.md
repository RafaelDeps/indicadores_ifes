# Contrato de Classificação — "de cota" por coluna

**Feature**: `010-listagens-xlsx-etl` | **Regido por**: [spec.md](../spec.md) FR-005/FR-006

## 1. Objetivo

Definir, de forma explícita e **testável**, quando um valor de cada uma das
duas colunas é considerado "de cota" (modalidade de reserva de vagas / ação
afirmativa). A contagem de cotistas exige que **ambas** as colunas sejam "de
cota" (conjunção):

```
cotista = situação ∈ {"Matriculado","Formado"}            (está no NTE)
        ∧ forma_ingresso ∈ DE_COTA_INGRESSO
        ∧ forma_matricula_cota ∈ DE_COTA_MATRICULA
```

## 2. Regra geral

Classificação por **lista negativa explícita** (exclusão por igualdade exata
após `strip()` de espaços). Todo valor **não listado** como negativo em uma
coluna é considerado "de cota" naquela coluna. A lista é um **contrato de
dados versionado**: se o conjunto de valores da fonte mudar, a lista deve ser
revisada (e os testes atualizados) antes de reexecutar.

### 2.1 `Desc_Cota` (forma de matrícula) — NÃO de cota

1. `Não possui`
2. `Ampla Concorrência`
3. vazio / `None`

Todos os demais valores observados são de cota: Escola Pública (com renda
`≤`/`>` 1,5 SM por pessoa, autodeclarações preto/pardo/indígena), sem
comprovação de renda (PPI/deficiência), candidatos sem comprovação de renda +
PPI, PPI independente da escola (PPIIEO), candidato com deficiência,
`P2027/2023 - 1..8` (novas reservas de vagas), e **Servidor da Rede Federal de
Educação Profissional, Científica e Tecnológica** (categoria de reserva de
vagas — classificada como cota; somente 6 ocorrências; reclassificar é decisão
de dados, não de código).

### 2.2 `Desc_Forma_Ingresso_Matricula` (forma de ingresso) — NÃO de cota

1. `Ampla Concorrência`
2. `Pós-Graduação - Ampla Concorrência`
3. `Transferência Interna`
4. `Transferência Externa`
5. `Transferência Externa Ex-Ofício`
6. `Portador de Diploma (Novo Curso)`
7. `Análise de Currículo`
8. `Graduação - Intercampi`
9. `Aluno Intercambista`
10. `Professores da Rede Pública`
11. vazio / `None`

Todos os demais valores observados são de cota: modalidades Enem/SISU
(`M1`–`M9`, `SISU - …`), Processo Seletivo de Ação Afirmativa (`PS - Ação
Afirmativa 1/2 …`), e Pós-Graduação com reserva (`Pós-Graduação - PPI`,
`Pós-Graduação - CD`).

## 3. Casuística observada (validada nas 6 planilhas, câmpus Serra)

### 3.1 Coluna cota — valores distintos

`Não possui` (5387), `Ampla Concorrência` (4508), `None` (282),
Escola Pública ± renda/PPI/deficiência (3976 no total), sem comprovação de
renda ± PPI/deficiência (1700+), `PPIIEO` (59), candidato com deficiência (39),
`P2027/2023 - 1..8` (48), Servidor da Rede Federal (6).

### 3.2 Coluna ingresso — valores distintos (amostra das categorias)

`Ampla Concorrência` (5169), `M9 - Enem - Ampla Concorrência` (2561),
`Pós-Graduação - Ampla Concorrência` (1154), `Transferência Interna` (583),
`Transferência Externa` (353), `Portador de Diploma (Novo Curso)` (128),
`Análise de Currículo` (36), `Graduação - Intercampi` (2),
`Aluno Intercambista` (1), `Professores da Rede Pública` (1); modalidades de
cota: `M1`–`M8` Enem (≈2400), `SISU - …` (≈370), `PS - Ação Afirmativa …`
(≈1600), `Pós-Graduação - PPI` (250) e `Pós-Graduação - CD` (34).

### 3.3 Casos-limite — o porquê da conjunção e da igualdade exata

1. **`Ampla Concorrência` × cota de reserva (118 alunos)**: 118 alunos têm
   ingresso literalmente "Ampla Concorrência" (ou "Pós-Graduação - Ampla
   Concorrência") com a coluna cota apontando reserva de vagas (ex.: "Alunos de
   Escola Pública, sem comprovação renda" — 40). A regra de conjunção os
   **exclui** (ingresso não-cota ⇒ falso), pois o ingresso por ampla
   concorrência não é reserva de vagas.
2. **`M9 - Enem - Ampla Concorrência`**: contém a palavra "Ampla" no rótulo,
   mas não é igualdade exata com `Ampla Concorrência`; **porém**, na fonte,
   esses alunos têm a coluna cota sempre = `Ampla Concorrência`, logo a
   conjunção os exclui igualmente. A regra de igualdade exata é suficiente e
   correta (não usar substring).
3. **Ingresso de cota × coluna cota `Não possui`/None**: aluno com
   `PS - Ação Afirmativa…` e cota "Não possui" **não** é cotista (coluna cota
   não-cota) — são casos reais (dados inconsistentes de entrada).

## 4. Invariantes

- `cotistas ⊆ NTE` (a conjunção exige situação matriculado/formado).
- Lista negativa por coluna é uma constante versionada em
  `etl/core/logic/classificacoes_listagens.py` (frozenset) — única fonte da
  verdade; testes comparam contra casos tabulados do §3.

## 5. Números medidos (câmpus Serra, regra acima)

| Ano  | NTE  | Cotistas (análise interna — base do cruzamento NTECPP) |
| ---- | ---- | ------------------------------------------------------ |
| 2024 | 1282 | 438                                                    |
| 2025 | 1857 | 616                                                    |
| 2026 | 2121 | 775                                                    |
