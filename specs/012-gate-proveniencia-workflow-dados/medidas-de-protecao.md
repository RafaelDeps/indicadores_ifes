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

| #   | medida                                                              | onde age            | como se verifica                                              |
| --- | ------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------- |
| M-1 | Nunca versionado: `data/raw/` é ignorado pelo Git                   | repositório         | `git check-ignore -v data/raw/listagem_2024_1.xlsx`           |
| M-2 | Nunca sai do ETL: nenhum passo publica, anexa ou copia as planilhas | workflow            | inspeção — nenhum `upload-artifact` no workflow               |
| M-3 | Credencial de leitura, um repositório, revogável                    | GitHub              | tela de secrets **da outra conta**, onde o token foi emitido  |
| M-4 | Arquivo anexado a versão publicada, não commitado                   | repositório privado | `GET /git/blobs/<sha>` em 404 e `git fetch <sha>` sem sucesso |
| M-5 | Entrada do workflow é efêmera: vive no runner e some                | `ubuntu-latest`     | —                                                             |
| M-6 | Saída é agregada por construção                                     | ETL                 | `tests/etl/test_privacy.py`                                   |
| M-7 | Segredo nunca referenciado por evento de pull request               | gatilhos            | só `workflow_dispatch` existe                                 |

### M-4 em detalhe, porque é a que substitui a prática anterior

Um arquivo **commitado** em repositório privado vira **objeto no histórico**:
apagar a versão atual não apaga nada, quem já clonou leva todas as versões, e
removê-las exige reescrita de histórico que não alcança clones já feitos. Um
arquivo **anexado a versão publicada** não tem histórico — a remoção é real. É a
diferença entre "pedi para apagar" e "apagou".

**Isto foi confirmado na prática, e não do jeito que se previa.** Em 2026-10-01 as
seis planilhas chegaram commitadas no `main` de
`henriqk0/indicadores-dados-listagem`. A resposta óbvia é reescrever o histórico
e publicar as planilhas como assets. Fizemo-lo, e **não basta**:

| verificação                        | depois do force-push       | depois de apagar e recriar |
| ---------------------------------- | -------------------------- | -------------------------- |
| clone novo                         | limpo, 1 commit            | limpo, 1 commit            |
| `GET /git/blobs/<sha do plano>`    | **200**, bytes intactos    | **404**                    |
| `git fetch <sha do commit antigo>` | **exit 0**, seis planilhas | **`not our ref`**          |

A reescrita trocou os ponteiros dos ramos; os blobs ficaram no servidor, e um
`curl` com token trouxia as planilhas de volta byte a byte. A M-4 continua por
cumprir enquanto o repositório existir. Só a **eliminação do repositório** remove
o objeto — o que também leva a release, e obriga a publicá-la de novo, com
`asset_id` novos. Estado final verificado em 2026-10-01: repositório novo, um
commit com README e `.gitignore`, release `v1` com os seis assets, blobs antigos
em 404, e os assets descarregados com sha256 igual ao dos originais.

A lição que fica registada: **force-push não é apagamento.** Qualquer plano de
proteção de dados que conte com reescrita de histórico para satisfazer um
requisito de apagamento está errado, e o teste que o prova é `GET /git/blobs/
<sha>`, não `git log`.

## 3. Base legal declarada

TRATAMENTO de dados pessoais para o cumprimento de **obrigação legal**.

Base: **art. 7º, II da LGPD** — o tratamento para cumprir obrigação legal não
depende de consentimento.

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

**Estado**: decisão **institucional pendente**. As medidas deste documento
reduzem exposição; elas **não** substituem a análise de transferência
internacional.

O que é preciso verificar antes de tratar isso como resolvido:

- [ ] se o provedor em questão consta da lista de entidades certificadas no
      marco de proteção aplicável, e se o status da certificação está vigente;
- [ ] se existe parecer jurídico do IFES sobre tratamento de dados e transferência
      internacional;
- [ ] se a base legal declarada acima sustenta também a **transferência**, e não
      apenas o tratamento interno.

Enquanto esses três pontos estiverem abertos, este repositório **tem uma
pergunta de conformidade em aberto**, e declará-la é mais honesto que marcá-la
como resolvida.

### 4.1.1 Separação de contas, que não é separação de pessoas

Verificado por API em 2026-10-01, e é um facto que o resto do documento supunha
ao contrário:

- `indicadores-dados-listagem` (o privado) é de `henriqk0`;
- este repositório é de `RafaelDeps`;
- `henriqk0` tem permissão `write` aqui;
- `RafaelDeps` tem permissão `none` no privado.

A primeira e a quarta linhas são favoráveis: o token **não** é emitido na conta
dona do repositório que o consome, e quem controla o consumidor não consegue ler o
dado. A terceira é que incomoda: **a mesma pessoa** emite o token, controla o
repositório privado, escreve o `dados-insumo.yml` e faz o _merge_ deste
repositório.

O que limita o dano de um token vazado é o **âmbito** — `contents: read`, um
reposititório, revogável na hora — e não a separação de titulares. Isto não é um
defeito do plano de PAT: é uma consequência de o repositório privado e o
consumidor serem mantidos pela mesma pessoa, e só deixa de ser verdade quando o
privado passar a ter dono distinto. Fica declarado aqui porque um documento de
proteção que o omite dá a impressão de um controlo que não existe.

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

**M-4 verificada em 2026-10-01**, na altura em que o repositório privado foi
recriado — o que deu a esta medida um comando que ela não tinha, e que é o que a
coluna "como se verifica" da §2 passou a citar. Repetir a verificação significa
repetir o `GET /git/blobs/<sha>` e o `git fetch <sha>`, e ambos têm de falhar.
Reverificar no próximo semestre é barato e é a única forma de apanhar um
`git add` distraído, que o `.gitignore` do repositório privado impede mas não
proíbe.

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
