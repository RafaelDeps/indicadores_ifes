# Implementation Plan: Gate de Proveniência do Pacote e Automação do `make dados`

**Branch**: `012-gate-proveniencia-workflow-dados` | **Date**: 2026-09-30 |
**Spec**: [spec.md](./spec.md)

**Input**: Feature specification from
`specs/012-gate-proveniencia-workflow-dados/spec.md`

## Summary

Duas entregas em ordem obrigatória.

**Grupo A — o portão.** Funções puras que medem **perda de cobertura por campo
derivado** entre o pacote publicado e o zip de listagens, com dois chamadores
que fazem perguntas diferentes: a verificação do pacote (o que se perdeu?) e a
guarda da cadeia (o que vai se perder?). Sem efeito no dado publicado, testável
localmente, e sem depender de tempo de arquivo.

**Grupo B — a automação.** `.github/workflows/dados.yml`, acionamento manual
por padrão, que obtém as planilhas de repositório privado por PAT fine-grained
emitido na conta dona daquele repositório,
obtém o export canônico por revisão fixa, executa a cadeia em modo estrito,
verifica e abre pull request.

A ordem não é preferência: sem o grupo A, a automação do grupo B republicaria em
silêncio o defeito que hoje é invisível.

## Technical Context

**Language/Version**: Python 3 (≥3.12, verificado também em 3.14) para o ETL;
TypeScript/Astro para o site (não tocado por esta feature); YAML para o workflow

**Primary Dependencies**: `openpyxl` (leitura de planilhas), biblioteca padrão
(`zipfile`, `json`, `re`) para o portão. **Nenhuma dependência nova.** Para o
workflow: `curl` do shell do runner — sem `rclone`, sem biblioteca de nuvem.

**Storage**: arquivos em disco. Saída da feature: pacote agregado
(`data/dist/indicadores.zip`, commitado) e entradas gitignored
(`data/raw/`, `data/canonical/`). Nenhum armazenamento externo novo é
introduzido — o repositório privado de dados é pré-requisito, não entrega.

**Testing**: `pytest` (`tests/etl/`) para o portão; `vitest` (`src/**/*.test.ts`)
inalterado. Verificação de ponta a ponta do grupo B é manual por natureza — ver
[quickstart.md](./quickstart.md), cujos cenários do grupo A já foram executados
contra o código atual e têm o resultado registrado (§1, §1.1 e §4).

**Target Platform**: Linux; CI em `ubuntu-latest` (GitHub-hosted)

**Project Type**: ETL determinístico (Python) + site estático (Astro). A feature
toca **apenas** o ETL em Python e um workflow.

**Performance Goals**: o portão é O(n) sobre o número de arquivos de pilar —
18 no pacote real, 9 no zip de listagens, **3 chaves exigidas**. Nenhuma métrica
de tempo é significativa; os requisitos reais são determinismo (mesma entrada,
mesmo veredito) e **estabilidade da ordem** do relatório, sem a qual dois logs
não são comparáveis.

**Constraints** (herdadas da constitution e da spec 006):

- **Princípio II** — todo código de gate nasce de teste falhando.
- **Princípio III** — valor nunca inventado; derivado ausente é `null`, nunca
  número antigo.
- **Princípio IV** — só agregado no repositório público, em log, em PR e em
  artifact. A feature opera sobre planilha que **contém dado pessoal**; a
  separação entre entrada com PII e saída agregada é o invariante central.
- **Princípio VI** — o job novo depende de testes e build, como o existente.
- **Spec 011** (status `Draft`) — o modo tolerante é `opt-in` e **não** pode ser
  acionado por job agendado.
- **Spec 006 FR-013** — a proibição de regeneração automática em CI é
  **substituída** pelo grupo B, e isso consta do texto (FR-025).

**Scale/Scope**: 6 planilhas (cresce a cada semestre), 18 arquivos no pacote,
~863 KB de entrada com PII, 1 workflow novo, 3 arquivos Python tocados, 2
contratos atualizados, 1 linha de documentação em spec 006.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Gate 1 — Princípio II (test-first)

| Requisito                                  | Avaliação                                                   |
| ------------------------------------------ | ----------------------------------------------------------- |
| Todo código de gate precede teste falhando | tasks.md T001–T003, T007 são RED explícitos, antes do GREEN |

**PASS**. Nenhum item da feature escreve código sem teste anterior.

### Gate 2 — Princípio III (fidelidade ao relatório)

| Requisito                                       | Avaliação                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| Nenhum valor inventado, estimado ou interpolado | o gate não escreve valor; apenas compara presença. Derivado ausente permanece `null` |

**PASS**. A feature aumenta a capacidade de _detectar_ perda de fidelidade; não
altera nenhum cálculo.

### Gate 3 — Princípio IV (apenas agregado)

| Requisito                                                       | Avaliação                                                                                          |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Nenhum dado individual no repositório, log, PR ou artifact      | FR-026 e FR-028 viram requisito explícito; T037 proíbe `upload-artifact`; `--raw` nunca é anexado  |
| Nada de individual em PR, log de execução ou mensagem de commit | FR-026; portão de verificação é M-2 e M-5 de [medidas-de-protecao.md](./medidas-de-protecao.md) §6 |
| Credencial ausente do clone público                             | o PAT existe só como segredo de Actions; um clone não o expõe                                      |

**PASS na análise de engenharia. Revisão de privacidade PENDENTE.**

O requisito em si é satisfeito, e a análise acima sustenta isso: nada de
individual entra no repositório, no PR, no log nem em artifact.

O que **não** está satisfeito é outra restrição da constituição, que este gate
não pode declarar por si:

> **Privacy review**: toda feature que adiciona ou transforma dados DEVE ser
> revisada quanto ao Princípio IV antes do merge.

A análise deste gate é do autor da feature; a revisão que a constituição exige é
de outra pessoa. E ela não pode ser feita enquanto a §4.1 das
[medidas de proteção](./medidas-de-protecao.md) tiver as três caixas abertas.

**Consequência para a entrega**: os grupos A (portão e guarda) seguem para merge
— não tocam dado pessoal. O grupo B (workflow) **não** segue antes da revisão.
Isso não é scrupilo: o grupo B é exatamente o que retira o dado do Brasil, e é o
único que cria a exposição descrita na §4.1.

### Gate 4 — Princípio VI (automação com portões)

| Requisito                                  | Avaliação                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------------- |
| Publicação só após testes e build passarem | o grupo B **abre PR** e não envia direto; o merge passa pelo `quality` existente |

**PASS**. A publicação no GitHub Pages continua dependente do job de qualidade.

### Gate 5 — Princípio I (simplicidade)

| Requisito                                  | Avaliação                                                                  |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| Sem camada ou abstração além da necessária | 1 função de cobertura em 1 módulo; sem classe, sem registry, sem framework |

**PASS**. Justificativa em Complexity Tracking: 2 chamadores de 1 regra
justificam 1 função compartilhada, sem camada de abstração.

### Gate 6 — Stack declarado

| Requisito           | Avaliação                |
| ------------------- | ------------------------ |
| Sem desvio da stack | nenhuma dependência nova |

**PASS**.

**Gate 7 (extra, derivado da spec 011 `Draft`)**: alterar contrato de spec em
`Draft` é território de speckit. A atualização de
`specs/011-.../contracts/check-dados.md` e da linha 170 da spec 006 ocorre
**nesta** feature, com FR-025 explícito.

**PASS**, condicionado a FR-025 ser atendido.

### Resultado do gate inicial

**PASS** nos sete gates. Reavaliação pós-design em §Reavaliação.

## Project Structure

### Documentation (this feature)

```text
specs/012-gate-proveniencia-workflow-dados/
├── spec.md                  # (/speckit-specify) — o quê e por quê
├── plan.md                  # este arquivo — arquitetura
├── research.md              # Phase 0 — decisões com alternativas avaliadas
├── data-model.md            # Phase 1 — entidades e o formato do manifesto
├── quickstart.md            # Phase 1 — validação de ponta a ponta
├── medidas-de-protecao.md   # Phase 1 — registro exigido por FR-027
├── contracts/
│   ├── check-dados.md       # Phase 1 — nova Etapa 1.5 (atualiza o de 011)
│   └── dados-workflow.md    # Phase 1 — interface do workflow
├── checklists/
│   └── requirements.md      # (/speckit-specify)
└── tasks.md                 # Phase 2 — (/speckit-tasks)
```

### Source Code (repository root)

```text
etl/
├── adapters/sinks/
│   └── zip_indicadores_sink.py     # NÃO TOCADO (já exporta validar_arquivos_pilar)
├── core/
│   └── logic/
│       └── cobertura_listagens.py  # NOVO — as funções de cobertura
├── scripts/
│   ├── check_dados.py              # ETAPA 1.5 nova
│   ├── cadeia_dados.py             # guarda passa a chamar a cobertura
│   └── merge_listagens_indicadores.py  # NÃO TOCADO (dona do PADRAO_PILAR1)

.github/workflows/
├── deploy.yml                      # NÃO TOCADO
└── dados.yml                       # NOVO (grupo B)

dados-insumo.yml                     # NOVO — manifesto de insumo (data-model §6)
requirements-etl.txt                 # comentário sobre a política de fixação
specs/006-deterministic-etl-pipeline/spec.md        # 1 linha de substituição
specs/011-etl-soft-mode-frescor/contracts/check-dados.md  # ponteiro p/ Etapa 1.5
specs/012-gate-proveniencia-workflow-dados/medidas-de-protecao.md  # NOVO (FR-027)

tests/etl/
├── test_cobertura_listagens.py      # NOVO
├── test_check_dados.py              # existente — casos novos
└── test_cadeia_dados.py             # existente — casos novos
```

**Structure Decision**: o módulo de cobertura mora em `etl/core/logic/`, que é
onde a spec 006 e a 008 posicionam a lógica de domínio livre de I/O — e é o
mesmo caminho que `check_dados`, `merge_listagens_indicadores` e
`validate_zip` já usam para compartilhar `validar_arquivos_pilar`. Não há pasta
nova, nem classe nova, nem registry: funções puras com dois chamadores.

O manifesto de insumo é um arquivo de dados versionado na raiz, porque é
configuração do workflow, não código do ETL.

O registro das medidas de proteção (FR-027) vai em
`specs/012-.../medidas-de-protecao.md`, **junto da spec que o exige**, e não em
`docs/` — que não existe neste repositório e cujas entradas são de leitura
opcional. Conformidade que depende de conhecimento tácito não é auditável: e a
spec 011 já mostrou o preço disso. A §5.1 do contrato dela descrevia, com
precisão, exatamente o cenário que este plano fecha — e ninguém a viu, porque
está escrita numa seção que ninguém procurava. Um registro que não está onde a
pessoa está lendo é um registro ausente.

## Fase 0 — research.md

Ver [research.md](./research.md). Cinco decisões, cada uma com alternativas
avaliadas e rejeitadas:

| #   | decisão                                            | pergunta respondida                                                                                                                    |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | o que a cobertura compara                          | perda de cobertura por campo derivado, e não "derivado não nulo"                                                                       |
| D2  | onde a função mora, e o que cada chamador pergunta | duas funções puras em `etl/core/logic/`, dois chamadores em lugares distintos                                                          |
| D3  | plataforma de acesso às planilhas                  | repositório privado + release asset + PAT fine-grained emitido na outra conta; por que nem App do GitHub nem pasta de conta de serviço |
| D4  | como o export canônico é obtido                    | revisão fixa, e por que referência móvel é invisível ao portão                                                                         |
| D5  | por que não há agendamento                         | automatizar comportamento nunca observado                                                                                              |

Sem `NEEDS CLARIFICATION` pendente na fase 0 — todas as decisões de arquitetura
foram fechadas em conversa e o plano as formaliza.

## Fase 1 — data-model, contracts, quickstart

- [data-model.md](./data-model.md) — entidades, formato do manifesto, e a
  regra de transição de estado do portão.
- [contracts/check-dados.md](./contracts/check-dados.md) — a Etapa 1.5,
  incluindo as mensagens em pt-BR e os códigos de saída.
- [contracts/dados-workflow.md](./contracts/dados-workflow.md) — gatilhos,
  permissões, entradas, e o contrato de falha.
- [quickstart.md](./quickstart.md) — como provar que a feature funciona antes e
  depois de implementada. Os cenários do grupo A **já foram executados** contra o
  código atual: o resultado de hoje está registrado no próprio arquivo, e um deles
  (guarda com zip parcial) é o único que muda de veredito.

## Ordem de entrega

O portão fecha e mergeia **antes** da automação começar. Se a automação atrasar,
o portão já está no ar sozinho — que é o ponto: **o portão não deve esperar pela
automação que ele protege.**

```
Grupo A — o portão (sem efeito no dado publicado)
  A1  funções de cobertura                       <- núcleo, sem chamador
  A2  Etapa 1.5 em check_dados                   <- primeiro chamador
  A3  guarda da cadeia                           <- segundo chamador
  A4  comentário de fixação + nota na spec 006   <- isolado, 1 linha cada
Grupo B — a automação (altera o pacote público)
  B1  repositório privado + versão publicada + PAT
  B2  dados.yml: gatilho, permissões, segredos
  B3  obtenção das entradas + conferência de contagem
  B4  cadeia estrita + verificação
  B5  comparação byte a byte + abertura do PR
  B6  registro das medidas de proteção
```

A1 vem antes de A2 e A3 porque os dois chamadores precisam existir para que
"teste primeiro" signifique alguma coisa: sem a função, o teste do chamador não
tem contra o que falhar. B6 fecha a feature, e não é opcional — FR-027 exige o
registro, e registrá-lo no fim é tarde se a execução do grupo B já começou.

**B5 não pode vir antes de B2.** Abrir pull request é a única ação do grupo B
que escreve no repositório, e ela só faz sentido depois que a credencial e as
permissões estão provadas em execução real. Caso contrário o primeiro sinal de
problema é um pull request que não abre.

## Reavaliação do Constitution Check (pós-design)

| Gate             | Mudança no design                                                                           | Resultado                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| I — Simplicidade | Nenhuma camada nova; o manifesto é dado, não abstração                                      | PASS                                                                                    |
| II — Test-first  | Idem ao inicial                                                                             | PASS                                                                                    |
| III — Fidelidade | Gate não escreve valor                                                                      | PASS                                                                                    |
| IV — Agregado    | Risco de residência declarado, **não decidido**; controles reduzem exposição sem eliminá-la | PASS na engenharia; **revisão de privacidade pendente**, e ela barra o merge do grupo B |
| VI — Portões     | Grupo B abre PR; Pages segue dependendo do `quality`                                        | PASS                                                                                    |
| Stack            | Nenhuma dependência nova; `curl` do runner                                                  | PASS                                                                                    |
| Spec 011 `Draft` | Alteração de contrato é feature própria                                                     | PASS                                                                                    |

**Nenhuma violação de constitution que exija justificativa em Complexity
Tracking.** A seção abaixo registra apenas a decisão que mais se aproxima do
limite.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhuma violação a justificar. Registrado para revisão futura:

| Decisão                                                                    | Alternativa mais simples rejeitada                         | Por quê                                                                                                                                                                                |
| -------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Funções de cobertura compartilhadas por 2 chamadores, em `etl/core/logic/` | Duplicar a comparação em `check_dados` e em `cadeia_dados` | A duplicação é equivalente em linhas, mas cria duas regras que podem divergir — e divergência silenciosa é exatamente o defeito que a feature corrige. FR-005 existe para impedir isso |
| Perda de cobertura por campo derivado                                      | Exigir derivado não nulo                                   | Rejeitado **com dado medido**: 3 dos 6 arquivos `pilar1` do pacote têm NTE nulo legítimo. "Não nulo" reprovaria o pacote correto                                                       |
| Nenhum nome de escopo na regra                                             | Isentar `todos` por constante                              | Resolve o caso real e cria o próximo: um campus novo volta a gerar falso positivo, e a constante envelhece sem ninguém perceber                                                        |
| Guarda mede cobertura do pacote atual                                      | Guarda exigir cobertura de todo par do canônico            | O canônico tem anos sem planilha. Exigir cobertura do canônico bloquearia toda execução a partir do primeiro semestre sem planilha                                                     |
| Release asset em repo privado                                              | Pasta no Drive + chave de conta de serviço                 | Rejeitado: credencial de longa duração em secret, e pasta pessoal sem escopo de repositório. Ver research §3                                                                           |
| Revisão fixa do export canônico                                            | Referência móvel (`main`)                                  | Rejeitado: tornaria a entrada não-reprodutível, e o gate de cobertura **não** detectaria troca de insumo — ele compara cobertura, não identidade                                       |
