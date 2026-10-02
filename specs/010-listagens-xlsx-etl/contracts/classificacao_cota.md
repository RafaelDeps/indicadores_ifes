# Contrato de Classificação — "de cota" por coluna

**Feature**: `010-listagens-xlsx-etl` | **Regido por**: [spec.md](../spec.md) FR-005/FR-006

## 1. Objetivo

Definir, de forma explícita e **testável**, quando um valor de cada uma das
duas colunas é considerado "de cota" (modalidade de reserva de vagas / ação
afirmativa). A contagem de cotistas exige que **ambas** as colunas sejam "de
cota" (conjunção):

```
cotista = situação ∈ SITUACOES_NTE                    (está no NTE)
        ∧ forma_ingresso ∈ DE_COTA_INGRESSO
        ∧ forma_matricula_cota ∈ DE_COTA_MATRICULA
```

## 2. Regra geral

Classificação por **lista negativa explícita** (exclusão por igualdade exata
após `strip()` de espaços). Todo valor **não listado** como negativo em uma
coluna é considerado "de cota" naquela coluna. A lista é um **contrato de
dados versionado**: se o conjunto de valores da fonte mudar, a lista deve ser
revisada (e os testes atualizados) antes de reexecutar.

`Situação Matrícula` é a **exceção**: é lista **positiva** (§2.3), não negativa.
A distinção é deliberada — nas colunas de cota a lista negativa é _fail-open_
(um valor novo passa a contar como cota, inflando um indicador); em
`Situação Matrícula` a lista positiva é _fail-closed_ (um valor novo é
descartado até ser revisado, derrubando um indicador). Erro de lista positiva é
visível e conservador; erro de lista negativa é silencioso e otimista.

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

### 2.3 `Situação Matrícula` — valores que contam (lista positiva)

1. `Matriculado`
2. `Formado`
3. `Concluído`

Iguaisdades exatas, sempre. `Concluído` entrou na lista por decisão de dado
(request de 2026-10-02) e vale, por essa mesma lista, para **as duas portas**:
o NTE (denominador do PIES) e a retenção de nomes de cotistas para o cruzamento
NTECPP (numerador do PICOT). Uma lista só, de propósito: manter as duas
decisões separadas permitiria que NTE e NTECPP divergissem sobre quem é o
estudante. Um concluinte que ingressou por cota e ainda consta da listagem é
cotista tanto quanto um matriculado.

Não contam, e o motivo importa porque os rótulos são quase homônimos:

| Valor                            | Ocorrências | Por que está fora              |
| -------------------------------- | ----------- | ------------------------------ |
| `Cancelamento Compulsório`       | 2313        | desligamento administrativo    |
| `Trancado`                       | 340         | trancamento de período         |
| `Aguard. Solicitar Certificação` | 308         | aguardando certificação        |
| `Cancelado`                      | 291         | desligamento voluntário        |
| `Concludente`                    | 66          | quase idêntico a `Concluído`   |
| `Não Concluído`                  | 87          | contém `Concluído` como sufixo |
| `Estagiario (Concludente)`       | 16          | contém `Concludente`           |

Nenhum casamento por substring é permitido em nenhum dos dois lados: `Não
Concluído` contém a string procurada, e é justamente o caso que um `in` ou um
`contains` deixaria entrar.

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

- `cotistas ⊆ NTE` — a conjunção exige situação em `SITUACOES_NTE`. O NTE conta
  quem tem situação válida; os cotistas são um subconjunto (os que também têm as
  duas colunas de cota).
- `NTE` conta **matrículas únicas**, não linhas. A mesma matrícula aparece em
  `listagem_<ano>_1.xlsx` e `listagem_<ano>_2.xlsx`; somar as linhas daria +2 para
  um estudante. Nos dados reais de 2026 são 4135 linhas com situação válida e
  2425 matrículas únicas — a razão é 1,7, e por isso a soma ingênua inflaria o
  denominador do PIES em ~70%.
- Lista negativa por coluna e lista positiva de situação são constantes
  versionadas em `etl/core/logic/classificacoes_listagens.py` (frozenset) —
  única fonte da verdade; testes comparam contra casos tabulados do §3.

## 5. Números medidos (câmpus Serra, regra acima)

Medidos por `make dados` em 2026-10-02, depois da entrada de `Concluído`.
"Antes" é a mesma medição com a constante anterior
(`{"Matriculado","Formado"}`), para deixar o efeito explícito.

| Ano  | NTE antes → depois | Cotistas antes → depois (análise interna — base do cruzamento NTECPP) | NTECPP | PIES | PICOT |
| ---- | ------------------ | --------------------------------------------------------------------- | ------ | ---- | ----- |
| 2024 | 1282 → **1989**    | 438 → 628                                                             | 97     | 18%  | 28%   |
| 2025 | 1857 → **2338**    | 616 → 718                                                             | 107    | 18%  | 25%   |
| 2026 | 2121 → **2425**    | 775 → 827                                                             | 102    | 16%  | 26%   |

O PIES cai (+38% a +14% de denominador) porque `Concluído` representa 2331 das
15086 linhas das planilhas e esses estudantes não estavam no denominador. O PICOT
sobe (+7 p.p., +3 p.p., +1 p.p.) porque concluinte que ingressou por cota ainda
consta da listagem e passa a ser cruzável com o universo de pesquisa.

Os dois movimentos vão em sentidos opostos e nenhum dos dois é erro: é a
consequência de aplicar a mesma definição de "quem é o estudante" nas duas
portas. Se apenas o NTE mudasse, PIES e PICOT mediriam populações diferentes e a
soma `PIES + PICOT` deixaria de ter sentido.
