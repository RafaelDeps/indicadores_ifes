# Fase 0 — Pesquisa e Decisões de Arquitetura

**Feature**: `012-gate-proveniencia-workflow-dados` | **Data**: 2026-09-30

Cinco decisões. Cada uma registra o que foi escolhido, por quê, e o que foi
avaliado e rejeitado. Não há `NEEDS CLARIFICATION` pendente: todas foram
fechadas em conversa e aqui formalizadas.

---

## D1 — O que a cobertura compara

**Decisão**: a verificação mede **perda de cobertura**, por campo derivado:

```
violacoes = { (campus, ano, campo) com valor na origem }
          - { (campus, ano, campo) com valor no pacote  }
```

O universo real é pequeno e foi medido antes de decidir: o pacote tem 18
arquivos (3 pilares × {escopo por campus, escopo agregado} × 3 anos), o zip de
listagens tem 9 (só escopo por campus), e apenas **3 pares** `(serra, 2024..2026)`
têm derivado com valor. A regra produz 3 chaves exigidas.

**A consequência que resolve o caso difícil**: os 3 arquivos de escopo agregado
têm derivado nulo e **não** são exigidos — não porque a regra os isente, mas
porque a origem não os produz. O escopo agregado é agregado porque a soma de
matrículas não é o número de matrículas; unificar violaria o Princípio III.
Nenhum nome de escopo, campus ou ano é escrito no código da regra. Uma lista de
isenção seria a mesma regra com um valor mágico, e o próximo campus novo
reintroduziria o falso positivo.

**Direção**: origem → pacote. O inverso (chave no pacote que a origem não cobre) é
o estado normal: as listagens cobrem os semestres enviados, o canônico cobre
todos os anos. Perda em origem zero é zero.

**Justificativa**: o defeito é de *perda de contribuição*, não de valor errado. O
pacote é montado em três etapas e a integração das listagens é a terceira; se
ela não roda ou não acha as planilhas, o pacote resultante é **idêntico em
estrutura** ao canônico e passa na verificação atual.

**Por que por campo, e não por par**: a integração escreve os dois derivados na
mesma passagem, então perda parcial não é estruturalmente possível hoje. A
verificação ser por campo é gratuita e torna o relatório acionável — o mantenedor
lê *qual* derivado sumiu, não só que algo sumiu. Se um dia um derivado for
legitimamente indisponível para um par, isso vira premissa revisada, com caso real
observado.

**Alternativas avaliadas e rejeitadas**:

| alternativa | por que rejeitada |
|---|---|
| Exigir derivado não nulo | **Rejeitada com dado real.** Dos 6 arquivos `pilar1` do pacote, 3 (escopo agregado) têm NTE nulo legitimamente. "Não nulo" reprovaria o pacote correto — e o gate precisa passar contra o pacote commitado |
| Isentar escopo agregado por lista de nomes | Resolve o caso real e cria o próximo: o nome do escopo (`todos`) vira constante da regra, e um campus novo volta a gerar falso positivo |
| Validar o cruzamento NTECPP por nome de aluno | NTECPP depende de um universo de nomes que **não existe no zip** — é por isso que o próprio merge avisa que NTECPP não é recalculável a partir do canônico. Não há com o validar |
| Gravar manifesto com hash do insumo dentro do pacote | Muda o contrato do dado publicado. A fonte da verdade já está em disco; um carimbo errado é pior do que carimbo nenhum |
| Comparar contagem de arquivos entre origem e pacote | Não detecta o caso principal: par presente nos dois, com derivado nulo |
| Comparar o pacote contra o export canônico | O canônico **não tem** os derivados por construção. A comparação seria vazia |

---

## D2 — Onde a função mora

**Decisão**: `etl/core/logic/cobertura_listagens.py`, com funções puras e sem
I/O: uma que devolve o conjunto de cobertura de um conjunto de registros, e uma
que subtrai o pacote da origem. Os dois chamadores ficam onde já estão.

**Justificativa**: é o caminho que a spec 006 (hexagonal) e a spec 008 já
estabeleceram para lógica de domínio, e é exatamente o padrão que o repositório
já usa: `validar_arquivos_pilar` vive em um módulo e é importado por
`validate_zip`, `merge_listagens_indicadores` e `check_dados`. Um quarto
importador não é uma camada nova; é o mesmo padrão com um consumidor a mais.

**O que cada chamador faz, e por que não fazem a mesma pergunta**:

| chamador | pergunta | momento |
|---|---|---|
| `check_dados`, Etapa 1.5 | a origem tem derivado e o pacote perdeu? | detecta **depois** |
| `cadeia_dados.avaliar_cadeia` | a cadeia vai reduzir a cobertura que o pacote hoje tem? | detecta **antes** |

Para a guarda, "o que a cadeia pode repor" é o conjunto de cobertura do zip de
listagens disponível **unido** ao dos anos com planilha bruta em pasta. O nome
do arquivo bruto (`listagem_2025_2.xlsx`) informa o ano, e o nome do arquivo do
pacote informa campus e ano — a união só afirma reposição quando o par **e** o
ano batem. Isso **superestima** a capacidade de reposição quando o nome não
corresponde ao campus, e a escolha é assim: superestimar deixa passar, e quem
fecha o caso é a Etapa 1.5, que tem o par exato; subestimar bloquearia execução
legítima sem causa.

**Alternativas avaliadas e rejeitadas**:

| alternativa | por que rejeitada |
|---|---|
| Duplicar a comparação nos dois scripts | Duas regras que podem divergir. A divergência silenciosa é exatamente o defeito que a feature corrige |
| Nova classe de serviço, ou registry | Princípio I. Não há interface a abstrair: são 2 chamadores de funções puras |
| Reaproveitar `PADRAO_PILAR1` do merge como base | Correto e **é** o que se faz — o padrão de nome `pilar1_<campus>_<ano>.json` é a mesma chave `(campus, ano)`. O merge permanece dono do padrão; o módulo de cobertura o **importa** em vez de redefinir |
| A guarda exigir cobertura de todo par do export canônico | O canônico tem mais anos do que há planilha — 2023 não tem nenhuma. Exigir cobertura do canônico bloquearia toda execução a partir do primeiro semestre sem planilha |
| A guarda continuar perguntando só "o merge terá entrada?" | É o defeito atual: um zip parcial (cobre 2026, perdeu 2025) satisfaz a pergunta e mesmo assim apaga a cobertura de 2025 do pacote |

---

## D3 — Plataforma de acesso às planilhas

**Decisão**: repositório **privado**, com as planilhas anexadas como **release
assets**, acessadas por **PAT fine-grained** com permissão `contents: read` sobre
um único repositório, armazenado como secret de Actions. Os identificadores dos
assets vão em arquivo versionado no repositório público, porque **não são
segredo**.

**Fato que decide o resto desta seção**: o repositório `dados-listagens` fica em
**outra conta do próprio mantenedor**, não na conta deste repositório. Isso não
impede o PAT — impede é que ele seja emitido daqui. Um PAT pertence à conta que
o emitiu: o token criado na conta deste repositório não alcança um repositório
de outra conta, por maior que a autorização. O token é emitido **na conta dona
do `dados-listagens`**, e é por isso que é um segredo só.

**Justificativa**:

1. **Release asset, e não arquivo commitado** — é a diferença que decide. Um
   arquivo commitado vira blob no histórico: apagar não apaga, quem clona leva
   todas as versões passadas, e removê-las de fato exige reescrita de histórico,
   que não alcança clones já feitos. Release asset não tem histórico; a remoção
   é real. Isso torna a eliminação de dado pessoal (LGPD art. 18) cumprível.
2. **Credencial de escopo restrito** — leitura, um repo, revogável na hora. O
   plano anterior era pasta pessoal na nuvem + chave de conta de serviço de longa
   duração: credencial que, uma vez copiada, concede acesso indefinido e exige
   lembrar que existe para revogar.
3. **Identificadores versionados** — separando o que é segredo do que é
   configuração, o workflow fica autodescritivo: qualquer um lê *qual* snapshot
   ele baixa, e o único segredo é o token.
4. **PAT, e não GitHub App, apesar de haver duas contas** — o App resolve o
   cenário em que quem emite a credencial **não é quem vai usá-la**: conta de
   serviço de máquina, terceiro, bot de outra organização. Aqui as duas contas
   são do mesmo mantenedor, não há identidade de terceiro a representar, e o
   App só agregaria custo.

**Alternativas avaliadas e rejeitadas**:

| alternativa | por que rejeitada |
|---|---|
| Pasta pessoal na nuvem + chave de conta de serviço | Credencial de longa duração; sem escopo de repositório; e a pasta pessoal é a maior exposição, fora de qualquer controle |
| Objeto em nuvem com federação de identidade do CI (sem segredo) | A opção **mais segura** da lista, e mais simples de auditar. Rejeitada porque exige Setup de IAM fora do repositório (~45 min, recorrente) e Residência que esta feature não decide |
| URL pré-assinada como o único secret | Sem credencial durável, e expirada. Rejeitada porque a rotação é trabalho **mensal recorrente**, e falha ruidosamente na virada de semestre — o pior momento |
| Token clássico com escopo `repo` | Concede leitura de **todos** os repositórios alcançáveis pela conta que o emitiu. Inaceitável para arquivo com nome e nascimento |
| GitHub App (App de CI) | A resposta padrão para credencial que atravessa contas, e por isso precisa de comparação explícita. Rejeitada porque troca **um** segredo por **três** — `APP_ID`, `INSTALLATION_ID` e chave privada PEM — e a chave privada é exatamente a credencial durável e difícil de revogar que o PAT existe para evitar. O ganho real do App, token de instalação de 1 hora, não compra nada aqui: o PAT é revogável a qualquer momento e o risco é exposição indevida, não janela de uso. **Reavaliação obrigatória** se a conta dona do `dados-listagens` for de uma organização com política própria de PAT — ver a precondição abaixo |
| Conceder acesso de leitura ao repositório deste projeto à outra conta, e buscar o export canônico pela rede pública | Economiza o segredo, e é pior: exige que o repositório **público** hospede o dado com nome e nascimento. Troca um segredo bem escopado por um dado público |

**Precondição registrada, não assumida**: se `dados-listagens` estiver em
**organização** — e não em conta pessoal —, a emissão do PAT depende de ser
proprietário da organização e de a política dela permitir token de escopo
restrito. Isso é verificação, não suposição, e é a tarefa T022.

**Risco que esta decisão não remove** (registrado no spec como premissa):
residência do dado e transferência internacional. A escolha de plataforma não é
solução de conformidade. O que os controles fazem é reduzir exposição: escopo
mínimo, sem histórico, retenção removível.

**Consequência operacional que ninguém espera**: revogar o token **não** é mais
uma ação nesta tela de secrets. É entrar na outra conta, em
*Settings → Developer settings*, e revogar ali. Uma credencial cujo ponto de
revogação fica a três cliques de distância numa conta que o mantenedor talvez não
abra por meses é uma credencial que fica valendo. Isso está registrado como M-3
e como tarefa com data em
[medidas-de-protecao.md](./medidas-de-protecao.md).

---

## D4 — Por que revisão fixa do export canônico

**Decisão**: o export canônico é obtido por revisão **fixa e identificada**, com
o valor no YAML do workflow. Nunca uma referência móvel.

**Justificativa**: referência móvel tornaria a entrada não-reprodutível — o insumo
mudaria sozinho, e nenhum pacote commitado poderia ser reproduzido depois. E o
gate de cobertura **não** pegaria isso: ele compara cobertura de chaves, não
identidade de insumo. Uma troca inteira de export passaria pelo portão sem que
nada percebesse.

**Alternativa avaliada e rejeitada**: referência móvel (`main`) — pela razão
acima.

---

## D5 — Por que não há agendamento nesta feature

**Decisão**: o workflow dispara **somente por acionamento manual**. Agendamento
está fora de escopo.

**Justificativa**: sob modo tolerante, um bloqueio produz "não fez nada, sem erro" —
o pior resultado possível para um job agendado, porque parece saudável. Agendar
antes de haver histórico de execuções manuais seria automatizar um
comportamento nunca observado.

**Justificativa adicional**: o agendamento é o que tornaria a substituição do
FR-013 da spec 006 permanente. Adiá-lo mantém a substituição restrita ao
caminho
que a pessoa escolhe executar conscientemente.

**Consequência registrada**: a spec 006 precisa registrar que a regeneração
automatizada deixa de ser proibida **para o caminho de disparo manual**, e que
o agendamento é um caso separado ainda não decidido (FR-024, FR-025).
