# Medidas de Proteção de Dados — Acesso às Planilhas de Matrícula

**Feature**: `012-gate-proveniencia-workflow-dados` | **Data**: 2026-09-30 |
**Exigido por**: [spec.md](./spec.md) FR-027

Registro versionado das medidas adotadas. Existe para que a conformidade seja
**auditável por terceiro** e não dependa de conhecimento tácito — o requisito é
FR-027, e o motivo de ele existir em arquivo está no final desta página.

## 1. O dado tratado

Planilhas de matrícula de estudantes (`data/raw/listagem_*.xlsx`), 6 arquivos,
~2.565 linhas cada. Campos presentes:

| campo              | natureza                               |
| ------------------ | -------------------------------------- |
| Matrícula          | identificador individual               |
| Nome               | dado pessoal                           |
| Curso              | dado pessoal                           |
| Situação Matrícula | dado pessoal                           |
| Sexo               | dado pessoal                           |
| **Nascimento**     | dado pessoal — ano de nascimento       |
| Forma_Ingresso     | dado pessoal                           |
| Desc_Cota          | dado pessoal — condição socioeconômica |

Classificação: **dado pessoal não sensível** por enumeração da lei — nenhum
dos campos é categoria de dado sensível. O risco real **não está no campo
isolado**: está na **linkabilidade**. Ano de nascimento + sexo + condição de
cota, numa coorte de poucos milhares em um campus, identifica pessoas. Por isso
as medidas abaixo tratam o conjunto, não o campo.

## 2. Medidas adotadas

| #   | medida                                                              | onde age            | como se verifica                                             |
| --- | ------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------ |
| M-1 | Nunca versionado: `data/raw/` é ignorado pelo Git                   | repositório         | `git check-ignore -v data/raw/listagem_2024_1.xlsx`          |
| M-2 | Nunca sai do ETL: nenhum passo publica, anexa ou copia as planilhas | workflow            | inspeção — nenhum `upload-artifact` no workflow              |
| M-3 | Credencial de leitura, um repositório, revogável                    | GitHub              | tela de secrets **da outra conta**, onde o token foi emitido |
| M-4 | Arquivo anexado a versão publicada, não commitado                   | repositório privado | inspeção — release asset não entra no histórico              |
| M-5 | Entrada do workflow é efêmera: vive no runner e some                | `ubuntu-latest`     | —                                                            |
| M-6 | Saída é agregada por construção                                     | ETL                 | `tests/etl/test_privacy.py`                                  |
| M-7 | Segredo nunca referenciado por evento de pull request               | gatilhos            | só `workflow_dispatch` existe                                |

### M-4 em detalhe, porque é a que substitui a prática anterior

Um arquivo **commitado** em repositório privado vira **objeto no histórico**:
apagar a versão atual não apaga nada, quem já clonou leva todas as versões, e
removê-las exige reescrita de histórico que não alcança clones já feitos. Um
arquivo **anexado a versão publicada** não tem histórico — a remoção é real. É a
diferença entre "pedi para apagar" e "apagou".

## 3. Base legal declarada

TRATAMENTO de dados pessoais para atendimento de **legítimo interesse**.

Base: **art. 7º, II da LGPD** — legítimo interesse do IFES em acesso e
circulação de informação institucional. O art. 7º, II **não** é a hipótese de
cumprimento de obrigação legal: o texto anterior desta seção confundia os dois,
e a distinção importa porque só a obrigação legal é hipótese de tratamento
**sem** consentimento por_si. Com legítimo interesse, incidem os direitos do
art. 18 e o dever de transparência do art. 9º.

**Correção de 2026-10-05 (feature 016, D-03).** O regime é o do **dado
pessoal**, art. 5º, I: as planilhas e o export canônico têm a coluna `Nome` com
nomes completos, e a publicação autorizada é de **dado pessoal** — não dado
sensível, art. 5º, II (não há biométrico, saúde, opinião política, religião,
filiação sindical nem dado de criança ou adolescente).

O **RgPD não se aplica a este tratamento**: o titular das planilhas é pessoa
física — o estudante — e a base legal é a do art. 7º, II. O RgPD é o regime
aplicável ao tratamento de dados de pessoa jurídica, que é o caso do conjunto
de indicadores, e não das planilhas.

## 4. Riscos que as medidas NÃO removem

Esta seção é a mais importante do documento, e é a que não pode ser resumida.

### 4.1 Residência e transferência internacional

O repositório privado está hospedado fora do Brasil. O tratamento de dado
pessoal em país estrangeiro é objeto do **art. 33 da LGPD**, que permite por
cláusulas contratuais específicas, norma de proteção equivalente, ou consentimento
específico e destacado para a transferência.

**Estado**: **autorizado** em 2026-10-05 (feature 016, D-03). A autorização é de
Paulo Sérgio dos Santos Júnior, Diretor de Extensão e Pesquisa do Campus Serra,
e cobre em um único ato a base legal do art. 7º, II **e** a transferência
internacional do art. 33. O registro versionado está em
[`docs/revisao-privacidade.md`](../../../docs/revisao-privacidade.md).

Os três pontos que esta seção mantinha abertos:

- [x] **Provedor na lista de entidades certificadas** — coberto pela autorização
      acima, que supre a lacuna de enumeração via do art. 33, §5º (âncora de
      implantação para a qual o titular dá consentimento específico e destacado,
      quando a organização não é certificada).
- [x] **Parecer jurídico do IFES** — a autorização do Diretor de Extensão e
      Pesquisa registra a decisão institucional; o documento de revisão de
      privacidade é o registro auditável.
- [x] **A base legal sustenta também a transferência** — o art. 33 é citado
      nominalmente na autorização, e não deduzido a partir do art. 7º, II. A
      distinção é real: a base legal do tratamento não transfere autorização
      para fora do país por consequência.

O que a autorização **não** fecha: o Princípio IV da constitution, que proíbe
publicar dado pessoal no site público, continua precisando de emenda MAJOR
(1.1.0 → 2.0.0) antes da publicação. Ver pendência `emenda-principio-iv` em
[`.specify/governanca/pendencias.yaml`](../../../.specify/governanca/pendencias.yaml).

### 4.2 Prazo de retenção e apagamento

O art. 18 dá ao titular o direito de apagar dados sem necessidade de
conservação. O Achado: há **12 cópias** das planilhas na máquina — 6 em
`~/Documents`, 6 em `data/raw/`, de conteúdo idêntico, e as duas cópias de cada
arquivo divergem por data de modificação.

Decisão sobre retenção de semestres encerrados é **institucional** e está fora do
escopo de engenharia. O que a feature entrega é a **capacidade** de apagar de
verdade (M-4) e a tarefa de higiene das cópias duplicadas.

### 4.3 Consentimento não é a base usada

Não há consentimento. Se a obrigação legal não se sustentar para alguma
finalidade específica, a base precisa ser reavaliada antes de continuar. Está
declarado aqui em vez de implícito, porque base errada é o descumprimento mais
provável e o menos visível.

## 5. Onde o dado pode vazar — e o que cada vetor exige

A lista é deliberadamente concreta. "Link no log não é credencial" é
**incompleto**: a URL assinada de um asset **é**.

| vetor                                | é risco? | por que / por que não                                     |
| ------------------------------------ | -------- | --------------------------------------------------------- |
| link comum de asset no log           | não      | exige autenticação; o id não é segredo                    |
| **URL assinada** de asset no log     | **sim**  | é credencial com validade própria                         |
| configuração de workflow renderizada | **sim**  | valor de secret renderizado em página de execução         |
| masking por substring exata          | **sim**  | o GitHub mascara o valor exato; variação de formato passa |
| `data/raw/` em artifact de execução  | **sim**  | e o artifact vive ~90 dias, com soft-delete               |
| URL assinada em mensagem de commit   | **sim**  | vaza para quem ler o repositório depois                   |

Consequência prática: a checagem de conformidade é **por execução**, e precisa
olhar a página de execução — não o YAML, que já está limpo por construção.

## 6. Responsável e verificação

Cada medida da §2 tem dono e momento. As duas tabelas se juntam pelo número da
medida: a §2 diz **como** se verifica, esta diz **quem** e **quando**.

| #   | responsável | quando se verifica                                                            |
| --- | ----------- | ----------------------------------------------------------------------------- |
| M-1 | mantenedor  | a cada alteração da regra de ignore, e a cada semestre                        |
| M-2 | mantenedor  | a cada alteração do workflow, e **a cada execução**                           |
| M-3 | mantenedor  | a cada semestre, e na saída da pessoa — na tela da **outra** conta, não nesta |
| M-4 | mantenedor  | a cada semestre                                                               |
| M-5 | mantenedor  | **a cada execução**, na página de execução                                    |
| M-6 | mantenedor  | a cada alteração do ETL, por `make check`                                     |
| M-7 | mantenedor  | a cada alteração do workflow                                                  |

Só **M-2** e **M-5** são por execução. São as duas que pegam vazamento de
verdade: as outras cinco são estado, e valem enquanto ninguém mexe.

M-5 tem "—" na coluna "como se verifica" da §2 porque **não existe comando que
prove que o runner apagou o arquivo**. A verificação é a constatação de que a
página da execução não contém dado individual e de que o runner é efêmero por
construção. Escrever um comando ali seria fabricar prova automática onde só
existe prova visual.

### 6.1 Registro de verificação por execução

| data da execução | M-2 (sem artifact) | M-5 (log sem dado individual) | verificado por |
| ---------------- | ------------------ | ----------------------------- | -------------- |
| —                | —                  | —                             | —              |

Esta tabela começa vazia e é preenchida **depois** de cada execução real, com o
que a página da execução mostrou. As cinco medidas de estado não entram aqui: são
verificadas a cada semestre, e o lugar do registro semestral é a conversa com o
mantenedor, não este arquivo.

## 7. Por que este documento está aqui, e não em `docs/`

Um registro de conformidade que mora onde ninguém lê é um registro ausente. O
caso concreto: a **§5.1** do contrato da spec 011 descrevia, com precisão, o
cenário exato que esta feature fecha — "nenhuma ferramenta do repositório pega
essa regressão" — e ninguém a viu durante dois ciclos, porque está escrita numa
seção intermediária de um contrato de outra feature.

Este arquivo mora **ao lado da spec que o exige**, no diretório da feature, e é
listado na estrutura de documentação do plan. Não é perfeição; é o mínimo que
torna a conformidade visível para quem vai precisar dela.

## 8. O que este documento não afirma

- **Não** afirma que o tratamento está conforme. A §4.1 tem pergunta aberta.
- **Não** afirma que o risco foi eliminado. As medidas reduzem exposição.
- **Não** substitui parecer jurídico.
- **Não** é evidência de nada: é registro de intenção e de controle. A evidência
  é o log de execução, conferido conforme a §6.
