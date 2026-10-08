# Feature Specification: Página de Downloads dos Dados e Guia de Instalação

**Feature Branch**: `[a definir]` — worktree sobre `main` (528bbea); nenhum hook
de branch existe neste projeto.

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "crie um botao no header, mobile e desktop. esse botao levará para uma nova tela, em que poderá ser baixado os arquivos utilizados no make dados (exports_canonical.zip, .xlsx , etc) a partir de um visual claro e que direcione o usuário para a instalação dos dados brutos."

## Decisões e Pendências

### Decisões do mantenedor (2026-10-05)

- **D-01 — Escopo dos downloads (resposta à Q1)**: a página DEVE disponibilizar
  para download os **insumos brutos** que alimentam a cadeia — os arquivos
  `.xlsx` de matrícula, o `exports_canonical.zip` e quaisquer outros arquivos
  primeiramente utilizados para gerar o `indicadores.zip`. A decisão é
  deliberada e substitui a leitura restritiva do Princípio IV que a spec 012
  (FR-026/FR-028) e o item 2 de LGPD do `README.md` faziam valer para esses
  arquivos.
- **D-02 — Sem canal de acesso restrito (resposta à Q2, derivada de D-01)**: não
  há canal de solicitação, credencial ou token para obter os insumos — o acesso
  é aberto e público. A seção de instalação deixa de "ensinar a obter acesso"
  e passa a "ensinar a posicionar e usar" os arquivos.
- **D-03 — Base legal registrada**: a publicação dos insumos brutos foi
  autorizada por **Paulo Sérgio dos Santos Júnior**, Diretor de Extensão e
  Pesquisa do Campus Serra, em 2026-10-05. O escopo autorizado cobre **duas**
  bases: a base legal de tratar e publicar (art. 7º, II da LGPD) e a
  **transferência internacional** (art. 33 da LGPD) — o Hosting e a publicação
  em GitHub Pages ocorrem fora do Brasil, o que torna a transferência mais
  relevante, não menos, em relação ao repositório privado anterior.
- **D-04 — Natureza dos dados (esclarecimento técnico)**: nenhum insumo contém
  **dado sensível** nos termos do art. 5º, II da LGPD. As planilhas contêm
  **dado pessoal** (a coluna `Nome`), que não se confunde com dado sensível: a
  base legal de D-03 é a que autoriza a publicação de dado **pessoal**, e é o
  que o Princípio IV da constituição proíbe. A distinção é registrada aqui
  para que a justificativa não seja lida — nem auditada — como incompleta.

### Pendências de governança que D-01 cria

D-01 é uma **emenda ao Princípio IV** (dado pessoal deixa de ser proibido no
site público) e uma **reversão da decisão de isolamento** do export canônico.
Pela seção "Governance" da constituição, isso exige:

1. **Emenda registrada na constituição** — PENDENTE. O Princípio IV é
   redefinido, o que pela política de versionamento da constituição exige
   **MAJOR** (1.1.0 → 2.0.0), com data e Sync Impact Report.
2. **Base legal registrada** — RESOLVIDA por D-03.
3. **Revisão de privacidade antes do merge** — **APROVADA**, aguardando apenas
   registro em disco. A autorização de D-03 cobre tanto a base legal de tratar
   e publicar (art. 7º, II da LGPD) quanto a **transferência internacional**
   (art. 33), que `specs/012-gate-proveniencia-workflow-dados/medidas-de-protecao.md`
   §4.1 mantinha como "decisão institucional pendente". Falta transcrevê-la
   para `docs/revisao-privacidade.md`, porque o portão exige registro
   **versionado** — a aprovação registrada apenas nesta spec não satisfaz P-1.

O mantenedor optou pelo **portão automático** (opção 1):FR-016 bloqueia a
publicação enquanto (1) e (3) estiverem pendentes, verificado na esteira que já
bloqueia o deploy. O portão é satisfeito por registros versionados no
repositório — não por uma checagem informal.

Ressalva operacional: a exposição é **irreversível** quando o build é
publicado, e o commit que removeu `data/raw/*` e `data/canonical/*` do
`.gitignore` já existe no histórico. O portão protege a **publicação do site**;
ele não desfaz o que já foi versionado. Se a exposição for considerada
indesejada, o remedy é remover os arquivos do histórico — que é uma operação
separada, com reescrita de histórico, e não faz parte desta feature.

### Decisões resolvidas

- **D-05 — Artefatos agregados oferecidos (resposta à Q3)**: apenas o pacote
  oficial consolidado (`indicadores.zip`). Os pacotes parciais por campus e o
  intermediário de listagens ficam de fora — são artefatos de desenvolvimento e
  publicá-los exigiria alterar a regra que os mantém fora do versionamento.

### Pendências

Nenhuma decisão dependente do mantenedor em aberto. Permanecem as pendências
**de governança** de D-01 (emenda do Princípio IV e revisão de privacidade),
que são trabalho de execução rastreado por FR-016, e não clarificação de escopo.

## Contexto: o que existe hoje e o que não existe

O site público não tem **nenhuma** superfície de download. A informação sobre quais
arquivos o pipeline exige e como obtê-los existe apenas no `README.md` do
repositório — ou seja, só é alcançável por quem já cloneou o projeto. Um gestor
do IFES, um pesquisador da comunidade acadêmica ou um desenvolvedor que abre o
site no navegador não tem como saber que os dados existem, nem como obtê-los.

A cadeia `make dados` é composta por três etapas (`etl` → `etl-listagens` →
`merge-listagens`). Ela consome dois grupos de insumos e produz um artefato
publicado:

| Insumo                                 | Papel na cadeia                                                      | Situação atual                                                                     |
| -------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `data/canonical/exports_canonical.zip` | entrada da etapa `etl` (export upstream, revisão fixada)             | isolado em `data/canonical/`, **permanentemente ignorado pelo Git**                |
| `data/raw/listagem_*.xlsx`             | entrada da etapa `etl-listagens` (planilhas de matrícula, 2024–2026) | isoladas em `data/raw/`, **ignoradas pelo Git**; sob D-01, passam a ser publicadas |
| `data/dist/indicadores.zip`            | **saída** — pacote oficial consolidado, agregado                     | único artefato versionado e publicável                                             |

### O que D-01 implica

O pedido nomeia explicitamente `exports_canonical.zip` e os `.xlsx` como
baixáveis, e D-01 confirma esse escopo. Vale registrar o que isso significa,
porque a decisão contraria documentos hoje vigentes:

- As planilhas de matrícula contêm a coluna `Nome` — ou seja, **dado individual**
  (o ETL lê essa coluna e a descarta ao serializar). O Princípio IV da
  constituição, o item 2 da seção "Governança de Dados, Fidelidade e LGPD" do
  `README.md` e as FR-026/FR-028 da spec 012 proíbem dado individual no
  repositório, nos pacotes de distribuição e no histórico Git.
- O export canônico é, por decisão explícita do projeto, uma fonte **estritamente
  isolada** e ignorada pelo Git; a spec 012 transferiu sua obtenção para um
  repositório privado com token restrito.

Duas consequências práticas decorrem de D-01:

1. **Exposição irreversível.** Os arquivos precisam deixar de ser ignorados pelo
   Git e passam a ser versionados, porque o site é estático e serve o que está
   no repositório. Isso coloca dado individual no histórico de um repositório
   público — a própria constituição classifica essa exposição como
   "efetivamente irreversível".
2. **Vazamento retroativo**: remover os arquivos depois não desfaz a publicação
   — o histórico Git, os caches e os links externos permanecem. O controle é
   _antes_ de publicar, não depois.
3. **Propagação para terceiros**: qualquer pessoa que reutilize os insumos
   redistribui junto o dado pessoal que eles carregam. O risco não se limita ao
   site do IFES.

Por isso a feature carrega requisitos de conformidade que **bloqueiam** a
publicação até que a emenda constitucional e o registro da base legal existam
(FR-016, FR-018). A seção de instalação continua sendo parte do escopo: os
arquivos agora são obtidos pela própria página, e o guia ensina a posicioná-los
e a rodar a cadeia.

### O que já existe no header

O header é único e compartilhado por todas as páginas. Em viewport largo ele
exibe as abas de navegação por pilar, a busca rápida, os filtros de campus e
ano e o seletor de tema. Em viewport estreito, o header reduz para marca +
seletor de tema + botão de gaveta, e a navegação completa (busca, filtros,
abas) fica dentro da gaveta móvel. Não existe hoje nenhum ponto de entrada para
dados, downloads ou documentação — nem no viewport largo, nem na gaveta.

## User Scenarios & Testing _(mandatory))

### User Story 1 - Encontrar o caminho para os dados a partir do header (Priority: P1)

Como visitante do site em qualquer dispositivo, quero encontrar um botão
"Dados" no header que me leve a uma página de downloads, para saber que
os dados por trás dos indicadores existem e são acessíveis, sem precisar
descobrir o repositório do projeto.

**Why this priority**: sem este caminho, nenhum dos demais valores é entregue —
o botão no header é a única porta de entrada da feature, e é o que diferencia
esta feature de "mais uma página no site". É também o requisito que o pedido
traz de forma mais explícita (mobile **e** desktop).

**Independent Test**: abrir o site em viewport largo e em viewport estreito,
localizar o botão no header, ativá-lo e chegar à página de downloads. Entrega
valor sozinho: o visitante passa a saber que existe uma página de dados,
mesmo que a página ainda não ofereça nenhum arquivo.

**Acceptance Scenarios**:

1. **Given** um visitante em viewport largo, **When** a página inicial é
   carregada, **Then** o header exibe o botão de dados visível sem abrir
   nenhum menu, e o botão é o único ponto de entrada para a nova página.
2. **Given** um visitante em viewport estreito, **When** a página inicial é
   carregada, **Then** o botão de dados está disponível no header em tela
   estreita e também dentro da navegação da gaveta móvel.
3. **Given** qualquer página do site (visão geral, pilares, páginas de
   indicador), **When** a página é carregada, **Then** o header também exibe o
   botão de dados, com aparência idêntica.
4. **Given** o visitante está em qualquer uma dessas páginas, **When** o botão
   é ativado por teclado, **Then** a página de downloads é aberta e o foco é levado ao
   conteúdo principal, de forma anunciada a leitores de tela.

---

### User Story 2 - Baixar os dados e os insumos que os produzem (Priority: P2)

Como visitante que quer os dados, quero ver a lista de arquivos disponíveis com
informação suficiente para decidir, e baixar em uma ação tanto o pacote oficial
quanto os insumos brutos que o produzem, para usar os números fora do site e
conferir como foram obtidos.

**Why this priority**: é o valor central da página — sem download real, a página
é apenas documentação. Depende do Story 1 para ser alcançada, mas é
independente dele em termos de entrega.

**Independent Test**: abrir a página de downloads diretamente pela URL, sem
passar pelo header, e baixar um insumo bruto e o pacote oficial com uma ação
cada, sem autenticação e sem formulário.

**Acceptance Scenarios**:

1. **Given** a página de downloads, **When** o visitante a abre, **Then** cada
   arquivo disponível é listado com rótulo legível, formato, tamanho,
   cobertura (anos e escopo de campus) e data da última atualização.
2. **Given** um arquivo listado como disponível, **When** o visitante ativa o
   download, **Then** o arquivo é entregue sem autenticação, sem formulário e
   sem página intermediária.
3. **Given** a página de downloads, **When** o visitante a abre, **Then** os
   insumos brutos da cadeia (`exports_canonical.zip`, os `.xlsx` de matrícula e
   os demais arquivos que alimentam o `indicadores.zip`) estão disponíveis para
   download, cada um em uma ação.
4. **Given** um insumo bruto listado, **When** o visitante o observa antes de
   baixar, **Then** ele está identificado como contendo dados pessoais e não
   anonimizado — e essa marcação não depende de cor.
5. **Given** a página de downloads, **When** o visitante a abre, **Then** ela
   declara de forma visível que os valores exibidos pelo site são transcritos
   do relatório oficial e que nenhum valor é estimado.
6. **Given** um arquivo que não pôde ser incluído na versão publicada, **When**
   o visitante abre a página, **Then** ele aparece como indisponível, com
   explicação — e não como um link quebrado nem como um valor substituto.
7. **Given** a emenda do Princípio IV ou a revisão de privacidade ainda
   pendentes, **When** a versão para publicação é construída, **Then** os
   insumos brutos não são publicados e a publicação é bloqueada com o motivo
   indicado.
8. **Given** as três pendências resolvidas, **When** a versão para publicação é
   construída, **Then** os insumos brutos são publicados e a página os oferece
   com a marcação de dado pessoal.

---

### User Story 3 - Saber como instalar os dados brutos (Priority: P3)

Como pessoa que quer reproduzir os dados localmente (desenvolvedor, pesquisador
ou gestor com interesse em auditoria), quero um guia na própria página que liste
todos os insumos da cadeia, de onde obtê-los e onde posicioná-los, para rodar o
pipeline completo na minha máquina.

**Why this priority**: é o requisito explícito de "direcionar o usuário para a
instalação dos dados brutos" e é o que substitui, de forma conforme, a
publicação dos arquivos brutos. É P3 porque o valor primário da feature é o
acesso aos dados, não a reprodução local.

**Independent Test**: seguir o guia do início ao fim em uma máquina limpa e
conseguir produzir o pacote oficial; ou, sem executar, responder "de onde vem
cada insumo e onde ele deve ficar" apenas com a informação da página.

**Acceptance Scenarios**:

1. **Given** a página de downloads, **When** o visitante abre a seção de
   instalação, **Then** todos os insumos exigidos pela cadeia aparecem
   listados — cada um com finalidade na cadeia, origem, revisão e caminho de
   destino exato.
2. **Given** a seção de instalação, **When** o visitante a percorre, **Then** ela
   contém os passos para obter os insumos (a partir da própria página),
   posicioná-los nos caminhos esperados, executar a cadeia e verificar o
   pacote resultante.
3. **Given** a seção de instalação, **When** o visitante a percorre, **Then**
   nenhum segredo, credencial ou token aparece na página — o acesso é aberto
   (D-02), mas a página **não distribui** segredo algum.
4. **Given** a seção de instalação, **When** o visitante a percorre, **Then** os
   comandos apresentados são copiáveis em bloco único, em pt-BR, sem depender de
   formatação ou escape visual.
5. **Given** a seção de instalação, **When** o visitante a percorre, **Then** ela
   alerta que os insumos contêm dados pessoais e que positioná-los em um
   repositório ou ambiente compartilhado os expõe a terceiros.

---

### Edge Cases

- **Arquivo ausente na versão publicada**: um artefato listado no manifesto pode
  não existir no momento da publicação. A página não pode oferecer um link que
  falha; o item aparece como indisponível com o motivo.
- **Cobertura parcial**: o pipeline pode produzir pacotes sem um campus ou sem um
  ano específico. A página reflete a cobertura real, sem inventar nem completar
  escopos ausentes.
- **Divergência entre a lista e a realidade**: se o conjunto de artefatos
  oferecidos e o que existe em disco divergirem, o comportamento correto é
  verificável automaticamente e falha antes da publicação.
- **Governança não registrada**: se a emenda do Princípio IV ou a revisão de
  privacidade estiverem pendentes, os insumos brutos não são publicados e a
  construção para publicação falha com o motivo — o comportamento é **omissão
  com aviso**, nunca degradação silenciosa nem publicação parcial.
- **Visitante que ignora os avisos**: um visitante pode baixar o insumo sem ter
  lido a marcação de dado pessoal. A página não pode depender da leitura para
  cumprir o dever de informar; a marcação acompanha o item, e as consequências
  de ignorar o aviso são de quem baixou.
- **Insumo com dado pessoal em ambiente do visitante**: o guia alerta sobre
  versionar os arquivos em repositório próprio ou compartilhado.
- **Navegador sem suporte a recursos modernos**: a página é estática e sem
  dependência de runtime; o conteúdo textual e os links permanecem acessíveis.
- **Publicação em subendereço**: o site é publicado sob um subendereço; links de
  download e navegação interna devem funcionar igualmente na versão publicada,
  não apenas no ambiente de desenvolvimento.
- **Visitante que abre a página diretamente pela URL**: o acesso direto à página
  de dados precisa funcionar, com o header marcando-a como página atual.
- **Tema claro e escuro**: o botão do header e todos os elementos da página
  precisam ser legíveis nos dois temas.
- **Tela muito estreita**: a lista de arquivos, o guia e os blocos de comando
  precisam caber sem rolagem horizontal.
- **Acesso por teclado e leitor de tela**: todo controle precisa ter nome
  acessível; o botão do header precisa ser identificável como link de navegação.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O site DEVE oferecer um único e consistente caminho para a página
  de downloads a partir do header, presente em **todas** as páginas do site.
- **FR-002**: Em viewport largo, o caminho DEVE estar visível no header sem que
  o visitante abra qualquer menu, gaveta ou painel.
- **FR-003**: Em viewport estreito, o caminho DEVE estar disponível no header em
  tela estreita **e** na navegação da gaveta móvel.
- **FR-004**: O caminho DEVE ter rótulo em pt-BR curto e inequívoco, e DEVE
  marcar a página de downloads como página atual quando ela estiver aberta.
- **FR-005**: A página DEVE ser acessível diretamente por URL, sem depender da
  navegação pelo header.
- **FR-006**: A página DEVE listar os artefatos disponíveis para download com,
  para cada um: rótulo legível em pt-BR, formato, tamanho, cobertura (anos e
  escopo de campus) e data da última atualização.
- **FR-007**: Cada artefato listado como disponível DEVE ser obtido em uma
  única ação, sem autenticação, sem formulário e sem página intermediária.
- **FR-008**: A página DEVE declarar de forma visível que os valores do site
  são transcritos do relatório oficial e que nenhum valor é estimado.
- **FR-009**: A página DEVE conter uma seção que liste **todos** os insumos
  exigidos pela cadeia de dados, com finalidade, forma de obtenção e caminho de
  destino de cada um, de forma que nenhum insumo exigido fique sem instrução.
- **FR-010**: A seção de instalação DEVE conter, em ordem, os passos para obter
  os insumos, posicioná-los, executar a cadeia e verificar o pacote resultante.
- **FR-011**: Nenhum segredo, credencial ou token DEVE aparecer na página.
- **FR-012**: Os comandos apresentados na seção de instalação DEVEM ser
  copiáveis em bloco único, em pt-BR.
- **FR-013**: A página DEVE oferecer para download os insumos brutos da cadeia:
  os arquivos `.xlsx` de matrícula, o `exports_canonical.zip` e quaisquer outros
  arquivos primeiramente utilizados para gerar o `indicadores.zip` (decisão
  D-01).
- **FR-014**: O acesso aos insumos DEVE ser aberto e público, sem autenticação,
  sem credencial, sem token e sem canal de solicitação (decisão D-02).
- **FR-015**: A listagem DEVE distinguir visualmente os artefatos **agregados**
  dos **insumos brutos**, e identificá-lo de forma explícita e visível: o
  visitante que baixa uma planilha precisa saber, antes de baixar, que o arquivo
  contém dados pessoais e **não** está anonimizado.
- **FR-016**: Os insumos brutos NÃO DEVEM ser publicados enquanto a emenda do
  Princípio IV na constituição (G-1) e a revisão de privacidade (G-2) não
  estiverem registradas no repositório.
  **Ambas registradas em 2026-10-05** — a constituição em 2.0.0 (FR-016a) e a
  autorização transcrita em `docs/revisao-privacidade.md`. A base legal (D-03)
  nunca bloqueou. A checagem DEVE rodar na esteira que bloqueia
  a publicação, e a ausência de qualquer uma das duas pendências DEVE bloquear
  a publicação com o motivo indicado — nunca falhar de forma silenciosa nem
  publicar parcialmente.
- **FR-016c**: Fechar o portão DEVE **remover** artefatos de uma execução
  anterior, e não apenas recusar copiá-los. O diretório de saída é gerado e não é
  limpo entre execuções; sem a remoção, o Astro continuaria servindo — pela cópia
  de `public/` para `dist/` — o dado pessoal que o portão acabara de recusar,
  enquanto o log anunciava a omissão.
- **FR-016a**: A versão da constituição DEVE ser incrementada como MAJOR
  (1.1.0 → 2.0.0), com data de emenda e Sync Impact Report, porque o Princípio
  IV é redefinido e não apenas esclarecido.
- **FR-016b**: O `README.md` e a spec 012 DEVERÃO ser atualizados para deixar de
  afirmar a restrição de privacidade que D-01 revoga; enquanto não o forem, os
  documentos se contradizem (ver SC-010).
- **FR-017**: A página DEVE cobrir apenas os arquivos que realmente existem
  na versão publicada; um item sem artefato correspondente aparece como
  indisponível com explicação, nunca como link quebrado.
- **FR-018**: A listagem DEVE ser verificável automaticamente, de modo que a
  divergência entre o que é oferecido e o que existe seja detectada antes da
  publicação.
- **FR-019**: A página DEVE ser legível e utilizável nos temas claro e escuro,
  sem depender de cor como único meio de diferenciação.
- **FR-020**: A página DEVE renderizar sem rolagem horizontal a partir de
  320 px de largura, incluindo a listagem e os blocos de comando.
- **FR-021**: Todo controle interativo da página e o botão do header DEVEM ser
  operáveis por teclado, ter foco visível e ter nome acessível para leitor de
  tela.
- **FR-022**: Os links de download e a navegação interna DEVEM funcionar
  igualmente no site publicado, inclusive quando hospedado sob subendereço.
- **FR-023**: Todo texto de interface DEVE estar em pt-BR.
- **FR-024**: A seção de instalação DEVE informar a **origem e a revisão** de
  cada insumo bruto, de modo que a reprodução local seja auditável e não dependa
  de suposição sobre qual versão do export foi usada.
- **FR-025**: A página DEVE declarar que os valores do site são transcritos do
  relatório oficial e que nenhum valor é estimado, e DEVE diferenciar essa
  fideldade dos dados agregados da natureza **não agregada** dos insumos brutos
  baixados na mesma página.

- **FR-026**: A página DEVE oferecer como artefato agregado apenas o pacote
  oficial consolidado (`indicadores.zip`). Os pacotes parciais por campus
  (`indicadores_<campus>.zip`) e o pacote intermediário de listagens
  (`indicadores_listagens.zip`) NÃO DEVEM ser oferecidos: são artefatos de
  desenvolvimento, fora do contrato de dados publicado, e sua publicação
  exigiria alterar a regra que os mantém fora do versionamento.

## Scope

### In scope

- Botão/aba "Dados" no header, em viewport largo e estreito, e item
  correspondente na gaveta móvel.
- Nova página de downloads com listagem, metadados e marcação de natureza dos
  arquivos.
- Download dos insumos brutos da cadeia (D-01) e do pacote oficial consolidado.
- Seção de instalação com passos de posicionamento, execução e verificação, com
  origem e revisão de cada insumo.
- Verificação automática de listagem e de conformidade, integrada à esteira que
  bloqueia publicação.

### Out of scope

- Canal de solicitação de acesso, credencial ou token para obter insumos (D-02).
- Anonimização, sanitização ou desidentificação dos insumos brutos.
- Publicar pacotes parciais por campus ou o pacote intermediário de listagens
  (D-05), e alterar a regra de versionamento que os mantém de fora.
- Novos artefatos de dados, novos formatos de exportação ou novos relatórios.
- Alterar cálculos, escopos ou a governança do ETL.
- Página de download por campus, por ano ou por indicador.

### Key Entities

- **Artefato para download**: um arquivo disponibilizado pela página. Atributos:
  rótulo em pt-BR, nome do arquivo, formato, tamanho, cobertura (anos e escopo
  de campus), data da última atualização, disponibilidade.
- **Insumo da cadeia**: arquivo de entrada exigido pelo pipeline. Atributos:
  papel na cadeia (etapa que o consome), localização esperada, origem, revisão,
  natureza (agregado ou contém dado pessoal), visibilidade pública.
- **Pendência de governança**: registro que condiciona a publicação dos insumos
  brutos — emenda do Princípio IV e revisão de privacidade. Enquanto existir ao
  menos uma, os insumos não são publicados.
- **Base legal**: autorização registrada que fundamenta a publicação de dado
  pessoal nos insumos brutos. Atributos: autoridade que autorizou, cargo, data,
  fundamento e escopo do que foi autorizado.
- **Cobertura**: par de ano e escopo de campus ao qual os dados se aplicam,
  derivado do que de fato existe no pacote publicado.
- **Artefato agregado**: saída consolidada e desidentificada do pipeline, pronta
  para distribuição pública. A página oferece exatamente um: o pacote oficial
  consolidado.
- **Cadeia de dados**: sequência ordenada de etapas que transforma insumos em
  artefatos publicados, usada como referência para que a listagem de downloads e
  o guia de instalação não fiquem defasados em relação ao pipeline.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O botão de dados é localizado no header em 100% dos viewports
  verificados (360 px, 768 px e 1440 px), sem abrir menu algum.
- **SC-002**: A partir de qualquer página, o visitante chega ao conteúdo
  principal da página de downloads em 1 clique, com o conteúdo principal visível
  em até 2 segundos em conexão típica.
- **SC-003**: O download de um artefato disponível é concluído sem erro em pelo
  menos 95% das tentativas em conexão típica, sem etapa extra de autenticação.
- **SC-004**: Nenhum insumo bruto é publicado enquanto a emenda do Princípio IV
  e a revisão de privacidade não estiverem registradas — verificado
  automaticamente na publicação, com falha bloqueante.
- **SC-005**: 100% dos insumos exigidos pela cadeia aparecem na seção de
  instalação com finalidade, origem, revisão e caminho de destino; nenhum insumo
  exigido fica sem instrução.
- **SC-006**: A listagem de artefatos oferecida e os artefatos realmente
  publicados são 100% coincidentes no momento da publicação — verificado
  automaticamente, com falha bloqueando a publicação.
- **SC-007**: A página não apresenta rolagem horizontal em nenhuma largura ≥ 320
  px, e é utilizável integralmente por teclado.
- **SC-011**: A página oferece exatamente um artefato agregado — o pacote oficial
  consolidado — e nenhum pacote parcial ou intermediário é alcançável a partir
  dela.
- **SC-008**: Nenhuma pergunta de suporte sobre "como obter os dados" ou "onde
  ficam os arquivos" permanece sem resposta na documentação do repositório após
  a publicação da página.
- **SC-009**: 100% dos insumos brutos listados estão marcados de forma visível
  e identificável sem depender de cor como contendo dados pessoais não
  anonimizados, verificado por inspeção em ambos os temas.
- **SC-010**: A vigente constituição, o `README.md` e a spec 012 deixam de
  contradizer o comportamento publicado — nenhum documento afirma restrição de
  privacidade que a página não cumra.

## Assumptions

- **Público-alvo**: gestores do IFES, pesquisadores, comunidade acadêmica e
  desenvolvedores. O texto de interface é pt-BR (Princípio V); a página é
  escrita para quem não conhece o repositório.
- **Site estático e público**: sem runtime de servidor, sem login, sem
  back-end (restrição "Static only" da constituição).
- **Rota da página**: endereço próprio, curto e legível, no mesmo padrão das
  rotas de pilar existentes.
- **O pacote oficial consolidado é o único artefato agregado oferecido** (D-05):
  a página o apresenta em posição de destaque, e nenhum artefato de
  desenvolvimento é oferecido.
- **A decisão D-01 é do mantenedor e foi registrada**, com a base legal em D-03:
  ela trata a contrariedade com o Princípio IV como uma emenda pendente, e não
  como um detalhe de implementação. A feature não pode ser considerada concluída
  sem a emenda do Princípio IV e a revisão de privacidade.
- **Escopo desta feature**: a exposição dos insumos é permitida por decisão
  explícita do mantenedor do projeto, com a base legal de D-03. A feature
  implementa e sinaliza essa decisão; ela não é um parecer jurídico sobre a
  base legal aplicada.
- **Fora do escopo desta feature**: reescrita de histórico Git para desversionar
  os arquivos que o commit "unignore raw/canonical" já versionou. É uma
  operação separada, com consequências próprias.
- **Metadados dos artefatos** (tamanho, cobertura, data) refletem o momento da
  publicação; não é preciso equipamento de atualização contínua.
- **A listagem segue o que existe de fato**: os itens são derivados dos
  artefatos presentes na versão publicada, para não poder divergir do pipeline.
- **O guia não substitui o `README.md`**: a página resume o caminho do
  visitante leigo; a documentação do repositório permanece a referência
  completa para desenvolvimento.
- **Verificação antes da publicação**: as checagens de conformidade e de
  divergência da listagem rodam na mesma esteira que já bloqueia publicação em
  caso de falha.
