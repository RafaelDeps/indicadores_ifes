# Feature Specification: Gate de Proveniência do Pacote e Automação do `make dados`

**Feature Branch**: `012-gate-proveniencia-workflow-dados`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Corrija as lacunas de verificação/proveniência do
pacote `indicadores.zip` e inicie um workflow para executar `make dados`
automaticamente." Decisões tomadas em 2026-09-30: o gate de proveniência e a
automação formam **uma** feature (a divisão anterior em duas foi desfeita); o
acesso às planilhas `.xlsx` será por **PAT fine-grained + repositório privado**,
com os arquivos anexados como *release assets*; e o repositório privado fica em
outra conta, o que obriga o token a ser emitido **na conta dona dele** e não na
conta deste repositório.

**Correção de 2026-10-01**: a premissa "outra conta **do próprio mantenedor**"
não se confirmou. A conta dona do `dados-listagens` pertence a quem é membro com
direitos plenos da organização que passa a hospedar este repositório — não é a
mesma pessoa que o mantém hoje. As duas decisões **não** mudam: o token continua
nascendo na conta dona do repositório privado, e a revogação continua não
acontecendo na tela de secrets deste repositório. O que muda é o **quem**, e por
isso D3 foi reavaliada — ver [research.md](./research.md) D3.

## Contexto: o que hoje não é detectável

O pacote publicado (`data/dist/indicadores.zip`, 18 arquivos) é montado em três
etapas: `etl` (a partir do export canônico), `etl-listagens` (a partir das
planilhas de matrícula) e `merge-listagens` (integra NTE/NTECPP ao canônico).

**A verificação atual não distingue um pacote fundido de um pacote só-canônico.**
A validação de arquivos do pilar dispensa a checagem de nulidade para os campos
derivados, e um valor nulo é considerado válido. Consequência medida: um pacote
com NTE e NTECPP **100% nulos** é aceito com `Sucesso: 18 arquivo(s)`. Uma
execução que perca silenciosamente a contribuição das listagens — porque as
planilhas não chegaram, porque o nome divergiu do padrão aceito, ou porque o
cruzamento falhou — produz um pacote indistinguível de um pacote correto.

Isso importa mais do que parece porque o modo tolerante da spec 011 é justamente
o cenário em que uma etapa é pulada com `AVISO:` e o snapshot anterior é
preservado. O `AVISO:` é informativo; **nada hoje impede que esse pacote
preservado continue sendo republished indefinidamente**, e ninguém percebe que
ele parou de refletir as listagens.

Por isso a feature tem duas metades, e a ordem entre elas é o substance do
desenho:

1. **O portão** — tornar a lacuna detectável, num único lugar, com dois
   chamadores. Verificação pura, testável localmente, sem efeito no dado
   publicado.
2. **A automação** — só depois que o portão existe, porque automatizar a
   publicação sem o portão transformaria uma falha silenciosa em uma
   republicação silenciosa, com aparência de validada.

### Por que não "exigir NTE não nulo"

Seria a solução de uma linha e está errado. Os arquivos `pilar1_todos_*.json`
têm NTE nulo **legitimamente** em 3 de 6 arquivos `pilar1`: o indicador
agregado por todos os campi não pode ser a simples união dos valores por campus
sem violar o Princípio III. Logo "não nulo" rejeita pacotes corretos. O que
precisa ser comparado é a **cobertura**, não o valor.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Detectar pacote que perdeu a contribuição das listagens (Priority: P1)

Como mantenedor do repositório, quero que a verificação do pacote **rejeite**
um pacote em que o indicador derivado de matrícula (NTE) está ausente para um
par campus/ano que as planilhas de origem de fato cobrem, para que eu nunca
publicue um pacote degradado sem ter sido avisado.

**Why this priority**: sem isso, a automação da User Story 3 publica em silêncio
um pacote que perdeu metade da informação. É o defeito que motivated a feature.

**Independent Test**: entregar ao verificador um pacote cujas chaves
`(campus, ano)` de listagem estejam ausentes da lista de NTE; o verificador
precisa relatar a chave ausente e sair com código diferente de zero, sem que nada
mais no repositório tenha sido alterado.

**Acceptance Scenarios**:

1. **Given** um pacote que contém as chaves `(campus, ano)` presentes nas
   planilhas, **When** a verificação roda, **Then** ela emite um erro
   identificando as chaves não cobertas e termina com código de saída diferente
   de zero.
2. **Given** um pacote em que um arquivo de pilar existe mas com o indicador
   derivado nulo para um par campus/ano presente nas planilhas, **When** a
   verificação roda, **Then** ela trata a mesma forma que o caso anterior — a
   chave existe mas não foi preenchida.
3. **Given** um pacote cujos campos derivados são nulos em arquivos que
   agregam todos os campi, **When** a verificação roda, **Then** ela **não** reporta
   violação, porque esse nulo é legítimo.
4. **Given** o pacote atualmente commitado, **When** a verificação roda com as
   planilhas de origem disponíveis, **Then** ela passa sem violações.
5. **Given** as planilhas de origem ausentes, **When** a verificação roda, **Then**
   ela emite um aviso informativo e **não** reporta violação, porque não há como
   afirmar cobertura sem fonte.

---

### User Story 2 - Impedir que a cadeia comece de uma entrada incompleta (Priority: P2)

Como mantenedor, quero que a verificação prévia bloqueie a execução quando a
entrada disponível **não cobre** o que o export canônico exige e não há nada
mais a processar, para que eu não produza um pacote a partir de material
insuficiente.

**Why this priority**: hoje a guarda libera entrada antiga ("ainda que stale")
quando há um arquivo de listagens presente e a pasta de trabalho bruta está
vazia. Ela pergunta *"o merge terá alguma entrada?"*, não *"a entrada terá o que
o pacote hoje tem?"*. Um zip de listagens parcial — que cobre 2026 mas perdeu
2025 — satisfaz a pergunta atual e ainda assim apaga a cobertura de 2025 do
pacote. É o mesmo defeito da User Story 1, detectado tarde demais. Independe da
automação, e por isso pode ser entregue antes dela.

**Independent Test**: com um pacote publicado que cobre 2025 e 2026, um zip de
listagens que só cobre 2026 e a pasta bruta vazia, a guarda precisa bloquear com
erro; com a pasta bruta contendo a planilha de 2025, precisa liberar.

**Acceptance Scenarios**:

1. **Given** um pacote publicado que cobre um conjunto de chaves, entrada de
   listagem que cobre menos, e nenhuma entrada bruta, **When** a guarda avalia a
   cadeia, **Then** ela bloqueia com erro, nomeando as chaves que seriam
   perdidas, e o pacote não é tocado.
2. **Given** a mesma entrada e planilha bruta do ano de uma chave perdida
   presente, **When** a guarda avalia, **Then** ela libera a execução.
3. **Given** a mesma entrada e material bruto ausente, com o modo tolerante
   ativo, **When** a guarda avalia, **Then** ela emite aviso e **preserva o
   pacote existente sem reescrevê-lo**.
4. **Given** um pacote publicado sem cobertura de derivados, **When** a guarda
   avalia, **Then** ela libera — não há cobertura a perder.
5. **Given** qualquer um dos casos de bloqueio, **When** a guarda bloqueia,
   **Then** o código de saída é o mesmo já publicado para bloqueio.

---

### User Story 3 - Regenerar o pacote sem passos manuais repetidos (Priority: P3)

Como mantenedor, quero disparar uma única ação no repositório e receber um pull
request com o pacote regenerado a partir das entradas oficiais, para que eu não
precise rodar a cadeia na minha máquina a cada semestre.

**Why this priority**: é conveniência real, mas automação sem o portão da User
Story 1 amplifica o defeito silencioso em vez de contê-lo. Por isso é P3 e
depende das duas anteriores.

**Independent Test**: disparar o workflow manualmente num repositório de teste e
verificar que ele obtém as duas entradas, executa a cadeia em modo estrito,
confere o resultado e abre um pull request — sem alterar nada fora do escopo.

**Acceptance Scenarios**:

1. **Given** um disparo manual, **When** o workflow roda, **Then** ele obtém as
   seis planilhas e o export canônico, executa a cadeia em modo estrito, roda a
   verificação e abre um pull request com o pacote resultante.
2. **Given** as entradas inalteradas desde a última execução, **When** o
   workflow regenera o pacote, **Then** o resultado é idêntico byte a byte ao
   pacote local.
3. **Given** a credencial ausente, revogada ou expirada, **When** o workflow roda,
   **Then** ele **falha imediatamente**, sem prosseguir com a pasta de entrada
   parcial.
4. **Given** uma execução parcial — menos planilhas do que o esperado, **When** o
   workflow verifica a pasta, **Then** ele falha em vez de gerar pacote com
   insumo incompleto.
5. **Given** um disparo, **When** o workflow conclui, **Then** nenhuma credencial
   nem qualquer linha de nome, matrícula ou nascimento aparece no log, no pull
   request, ou em artefato de execução.
6. **Given** um pull request aberto pelo workflow, **When** ele é mesclado, **Then**
   a verificação de qualidade roda antes da publicação, como em qualquer outro
   pull request.

---

### Edge Cases

- **Chave presente no pacote e ausente na origem**: normal e esperado — as
  listagens só cobrem os semestres enviados, o export canônico cobre todos os
  anos. A verificação mede perda, e perda em origem zero é zero. Apenas a
  direção origem → pacote é exigida.
- **Escopo agregado com derivado nulo**: o pacote real contém, para o mesmo par
  de anos, arquivos de escopo por campus **e** arquivos de escopo agregado, e só
  os primeiros recebem derivado. O escopo agregado nunca é exigido porque a
  origem não o produz — e isso é uma consequência da regra de perda, não uma
  lista de isenções: nenhum nome de escopo, campus ou ano é escrito no código da
  regra. Registrado aqui porque é o caso que faria uma implementação ingênua
  ("exigir derivado não nulo") reprovar o pacote correto.
- **Os dois indicadores derivados, um presente e outro ausente**: a verificação
  é por campo, não por chave, e DEVE reportar o par e o campo separadamente.
- **Planilhas de origem ausentes**: sem fonte não há afirmação de cobertura; o
  resultado é informativo, nunca bloqueio.
- **Nome de planilha fora do padrão aceito**: a fonte aceita um padrão estrito de
  nome; um arquivo divergente simplesmente não é considerado. Se **todos**
  divergirem, isso precisa aparecer como falha explícita, não como "zero
  planilhas".
- **Cobertura parcial**: a perda de uma chave é violação mesmo que as demais
  estejam cobertas; a verificação NÃO DEVE exigir completude para reportar.
- **Pacote sem nenhum arquivo**: precisa falhar por ausência de insumo, não por
  ausência de cobertura.
- **Credencial válida mas sem permissão**: falha por autorização, distinta de
  falha por rede, e ambas distintas de "zero planilhas baixadas".
- **Planilha bruta de ano cujo par campus/ano não é conhecido sem abrir o
  arquivo**: a guarda da cadeia só consegue ler o ano do nome do arquivo. Ela
  MIGHT superestimar a capacidade de reposição — o nome garante o ano, não o
  campus — e DEVE, por isso, tratar superestimação como permissão de seguir. O
  erro de superestimar é coberto pelo portão de cobertura ao final, que tem o par
  exato; o erro de subestimar seria bloquear uma execução legítima.

## Requirements _(mandatory)_

### Gate de proveniência

- **FR-001**: A verificação DEVE medir **perda de cobertura**: o conjunto de
  chaves `(campus, ano de referência)` em que um indicador derivado tem valor na
  origem, menos o mesmo conjunto no pacote. Toda chave presente no primeiro
  conjunto e ausente do segundo é violação.
- **FR-002**: A comparação DEVE ser feita **por indicador derivado**, e a
  violação DEVE identificar o par campus/ano **e** o campo derivado ausente, de
  modo que o relatório seja acionável sem inspeção manual.
- **FR-003**: A verificação NÃO DEVE reportar violação derivado de um valor nulo
  que a origem também não tem. Um arquivo ausente da origem é, por definição, um
  arquivo cuja cobertura não é devida — nenhum nome de escopo, campus ou ano é
  isentado por lista fixa.
- **FR-004**: A ausência da fonte de listagens DEVE produzir resultado
  informativo, nunca violação.
- **FR-005**: A regra de cobertura DEVE existir como um único ponto de decisão,
  consumido por dois chamadores independentes, de modo que as duas chamadas não
  possam divergir.
- **FR-006**: Violação de cobertura DEVE produzir erro em português e código de
  saída diferente de zero, nos dois modos, e NÃO DEVE ser suprimível pelo modo
  tolerante. A verificação não escreve o pacote, de modo que sob modo tolerante
  não há o que preservar: ou ela passa, ou ela reprova.
- **FR-007**: Sob o modo tolerante, o **bloqueio da guarda da cadeia** DEVE
  produzir aviso e DEVE preservar o pacote existente sem reescrevê-lo, em arquivo
  e data de modificação. Esta FR diz respeito à guarda e não à verificação, e as
  duas não podem ser lidas como a mesma regra: sob modo tolerante a verificação
  segue reprovando com erro, e é a guarda que degrada o bloqueio a aviso sem
  tocar no pacote.
- **FR-008**: A verificação DEVE continuar passando contra o pacote atualmente
  commitado, sem alteração do pacote.
- **FR-009**: A regra NÃO DEVE exigir alteração no formato do pacote publicado,
  nem inclusão de manifesto, hash ou metadado de proveniência.

### Guarda da cadeia

- **FR-010**: A verificação prévia da cadeia DEVE bloquear quando a cadeia
  reduziria a cobertura de derivados que o pacote publicado hoje possui, isto
  é, quando existe chave coberta no pacote atual que nem a entrada de listagem
  disponível nem as planilhas brutas disponíveis conseguem repor.
- **FR-011**: A guarda DEVE considerar como entrada capaz de repor uma chave tanto
  o zip de listagens quanto a existência de planilha bruta do ano correspondente,
  uma vez que a segunda etapa produz o zip a partir das planilhas.
- **FR-012**: A guarda NÃO DEVE alterar o código de saída já publicado para
  bloqueio, nem passar a bloquear quando o pacote publicado não existir — não há
  cobertura a perder, e a ausência do pacote é tratada pela verificação de
  contrato, que já a rejeita.

### Acesso às entradas

- **FR-013**: O acesso às planilhas de matrícula DEVE ocorrer por arquivo
  anexado a uma versão publicada em repositório privado, e NÃO DEVE usar
  compartilhamento de pasta com conta de serviço.
- **FR-014**: A credencial DEVE ser token de escopo restrito, com permissão
  somente-leitura sobre um único repositório, armazenada exclusivamente como
  segredo do repositório. Por estar o repositório privado em outra conta, o token
  DEVE ser emitido pela conta dona dele, e a sua revogação DEVE constar como
  tarefa datada — o ponto de revogação não é mais a tela de secrets deste
  repositório.
- **FR-015**: Os identificadores dos arquivos DEVE ser gravados no próprio
  repositório de código, e NÃO DEVE ser segredo.
- **FR-016**: O segredo NÃO DEVE ser exposto a eventos originados de pull
  request, incluindo os de base de pull request; o disparo DEVE ser restrito a
  acionamento manual nesta versão.
- **FR-017**: O export canônico DEVE ser obtido por revisão fixa e identificada,
  e NÃO DEVE ser obtido de referência móvel.
- **FR-018**: A obtenção das entradas DEVE falhar de forma imediata e distinta
  quando a credencial estiver ausente, revogada ou sem permissão, e NÃO DEVE
  prosseguir com pasta de entrada parcial.
- **FR-019**: A cadeia DEVE ser executada em modo estrito no workflow; o modo
  tolerante NÃO DEVE ser usado em execução automatizada.

### Execução e publicação

- **FR-020**: O resultado da verificação DEVE integrar o workflow sem etapa
  adicional, e o job de qualidade existente DEVE exercitá-lo.
- **FR-021**: Antes de abrir o pull request, o resultado regenerado DEVE ser
  comparado com o pacote local, e a execução DEVE ser interrompida se divergirem
  com as entradas inalteradas.
- **FR-022**: A publicação DEVE ocorrer por pull request, e NÃO DEVE por
  envio direto.
- **FR-023**: Nenhum passo do workflow DEVE anexar artefato de execução
  contenha as entradas brutas.
- **FR-024**: A vigência de execução automática agendada DEVE permanecer
  desabilitada até que a execução manual tenha sido exercitada com sucesso de
  forma repetida.
- **FR-025**: O comportamento DEVE substituir a proibição de regeneração
  automática em integração contínua registrada na spec 006, e essa substituição
  DEVE constar do texto da spec.

### Privacidade

- **FR-026**: Nenhuma linha de nome, matrícula, data de nascimento ou tipo de
  cota das planilhas de matrícula MAY aparecer no repositório público, no log do
  workflow, no pull request ou em artefato de execução.
- **FR-027**: As medidas de proteção adotadas DEVEM ser registradas em documento
  versionado, de modo que a conformidade seja auditável e não dependa de
  conhecimento tácito.
- **FR-028**: Nenhum dado individual DEVE ser incorporado ao pacote publicado,
  que permanece agregado.

### Key Entities

- **Chave de cobertura**: o par `(campus, ano de referência)` que identifica a
  granularidade mínima de um indicador derivado de matrícula.
- **Indicador derivado**: valor que só existe quando a extração das planilhas foi
  integrada ao export canônico; distinguishes-se por ser preenchido
  exclusivamente pela etapa de integração, nunca pelo export canônico.
- **Arquivo de listagens de origem**: conjunto das planilhas de matrícula
  disponíveis, que define o universo de chaves que deveria estar coberto.
- **Pacote publicado**: artefato agregado e versionado, único artefato do
  repositório que alimenta o site.
- **Versão publicada de dados**: conjunto nomeado e versionado de arquivos
  anexados, mantido em repositório privado, que substitui o compartilhamento de
  pasta.
- **Credencial de leitura**: segredo de escopo restrito, somente-leitura, de um
  único repositório privado.
- **Medida de proteção**: controle de segurança registrado, com responsável e
  condição de verificação.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos pacotes de teste em que a origem tem derivado com valor e
  o pacote não tem, para o mesmo par e campo, são rejeitados — incluindo o caso
  de arquivo presente com derivado nulo, que é o mesmo veredito.
- **SC-002**: 0 falsos positivos sobre a suíte: nenhum pacote correto é
  rejeitado. O caso provado por dado real é o escopo agregado com derivado nulo
  no pacote e ausente da origem; ele DEVE passar sem violação.
- **SC-003**: O pacote atualmente commitado passa na verificação com zero
  violações, sem alteração do arquivo.
- **SC-004**: A verificação passa a ser exercitada pelo job de qualidade
  existente, sem passo novo no fluxo de integração contínua.
- **SC-005**: Uma regeneração completa pode ser disparada com uma única ação
  manual, sem execução de comandos na máquina do mantenedor.
- **SC-006**: Em execuções sucessivas, nenhuma credencial e nenhuma linha de
  dado individual aparece no log, no pull request ou em artefato de execução.
- **SC-007**: Com as entradas inalteradas, o pacote regenerado é idêntico byte a
  byte ao pacote local, verificado antes da publicação.
- **SC-008**: Uma execução em que as seis planilhas esperadas não chegam
  integralmente falha, com mensagem que distingue credencial inválida de
  entrada incompleta.
- **SC-009**: 100% das violações de cobertura são reportadas antes de qualquer
  publicação automatizada do pacote.
- **SC-010**: As medidas de proteção adotadas estão registradas em documento
  versionado, com responsável e condição de verificação.

## Assumptions

- O repositório privado de dados e as versões publicadas são mantidos pelo
  mantenedor do projeto; a gestão do repositório privado não faz parte desta
  feature.
- São seis planilhas, com nome no padrão aceito pela fonte, e o conjunto pode
  crescer a cada semestre.
- A verificação mede **perda**, com origem e pacote no mesmo sentido. O inverso
  — chave no pacote que a origem não cobre — é o estado normal e não é medido.
- Derivados nulos em escopo agregado são o estado **permanente e correto**:
  verificado nos 6 arquivos de escopo agregado do pacote real, contra 3
  arquivos de escopo por campus com valor. Nenhum nome de escopo é isentado por
  lista; a regra decorre de a origem não produzir o escopo agregado.
- Os dois indicadores derivados cobrem as mesmas chaves e são preenchidos na
  mesma passagem da integração. A verificação os trata por campo de qualquer
  forma, e passa a exigir cobertura de um sem o outro só se um caso real
  aparecer.
- **Residência e transferência internacional**: a escolha de repositório privado
  tem consequência de conformidade que esta feature não resolve e que exige
  decisão institucional fora do seu alcance. O risco está **declarado e não
  decidido**: ninguém o aceitou, e ele não é requisito atendido. Enquanto a
  análise não existir, os controles desta feature reduzem exposição mas não a
  eliminam. Dizer "risco aceito" aqui seria afirmar um parecer que não há.
- **Retenção das planilhas de matrícula de semestres encerrados** é decisão
  institucional e está fora do escopo. O achado de cópias duplicadas em disco é
  tratado como tarefa de higiene, não como política.
- O modo tolerante permanece **opt-in** e nunca é usado em execução agendada.
- O valor exato da revisão fixa do export canônico é insumo de implementação,
  não de especificação.
- O modo de execução manual precede qualquer agendamento, e o agendamento não
  faz parte desta feature.

## Fora de escopo

- **Carimbo de proveniência dentro do pacote** (manifesto, hash, metadado):
  rejeitado por mudar o contrato do dado publicado quando a fonte da verdade já
  está em disco.
- **Teste automatizado da política de fixação de dependências**: uma linha de
  comentário é a proporção adequada.
- **Ingestão de nome de planilha fora do padrão pela fonte**: a premissa de que
  existe essa falha foi verificada e é falsa.
- **Campus inexistente caindo na série completa**: robustez do site, gravidade
  menor, e o cenário já é coberto pelo gate de cobertura.
- **Canal de distribuição**: substituto do repositório privado não é assunto
  desta feature.
- **Execução agendada**: dependente de histórico de execuções manuais.
