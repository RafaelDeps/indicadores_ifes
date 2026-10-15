# Feature Specification: Memória de Cálculo e Auditoria nas Páginas dos Pilares

**Feature Branch**: `025-pillar-calculation-audit`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Create a feature specification for adding an interactive Audit & Calculation Memory table to the Pillar pages (/pilar-1, /pilar-2, /pilar-3) in the Indicadores IFES dashboard.

Objective: Provide complete public auditability and transparency by displaying the exact underlying data, variables, and calculation steps used to produce each indicator within each pillar, along with direct access to download the source spreadsheet/data files.

Key Requirements: 1. Pillar Page Calculation Memory / Audit Table — on each pillar overview page, add an audit view (or expandable spreadsheet-like section/drawer) alongside or within the indicator cards; for the selected year and campus, display the raw input components and variables used in the indicator formula (e.g., for PIES, show NEP [students in research], NTE [total enrolled students], and the explicit formula evaluation (NEP / NTE) * 100), reusing the existing metadata and component mappings. 2. Spreadsheet-Style Data Breakdown — tabular audit layout showing Variable Symbol & Name, Raw Numerical Value for the active filter (year/campus), Unit of measurement, Applied Formula with substituted values, Final Apurated Indicator Value; support viewing multi-year component values in a mini-history table. 3. Direct Data Traceability & Download — direct download links or contextual buttons targeting the relevant raw source files (enrollment/matrix .xlsx files or canonical exports from /dados) corresponding to that pillar's indicators; clear source provenance info (source registry, extraction timestamp). 4. UX & Accessibility — keep the default pillar dashboard clean with progressive disclosure ('Auditar Cálculo' / 'Ver Memória de Cálculo' toggle/accordion or dedicated audit tab); fully responsive; WCAG 2.1 AA; respect constitution guidelines (public data transparency, fail-closed governance gate, unit tests)."

---

## Clarifications

### Session 2026-10-15

- Q: Onde deve viver a área de rastreabilidade com downloads e proveniência (US3)? → A: Híbrido
  (Opção C) — uma seção de rastreabilidade compartilhada por página de pilar (downloads +
  proveniência dos insumos daquele pilar) e, dentro de cada memória de indicador, a citação do(s)
  arquivo(s) de origem relevante(s) àquele indicador, com atalho para a seção.
- Q: O estado expandido da memória deve persistir entre navegações? → A: Não (Opção A) — a
  memória carrega sempre recolhida; a expansão é estado local de leitura, não vai para a URL.
  Dentro da mesma página, uma memória aberta permanece aberta durante trocas de contexto
  (ano/campus).
- Q: Que postura a rastreabilidade deve adotar quanto à marcação/aviso dos insumos brutos? → A:
  Herdar integralmente as regras e a apresentação vigentes da página de dados (Opção A) — a
  rastreabilidade não mantém marcação própria; um ajuste em `/dados` reflete automaticamente nela.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver a memória de cálculo de um indicador no pilar (Priority: P1) 🎯 MVP

Uma pessoa que visita a página de um pilar (`/pilar-1`, `/pilar-2` ou `/pilar-3`) quer conferir
**exatamente de onde vem o número** de um indicador, sem sair da página. Ela aciona o controle
"Ver memória de cálculo" no cartão do indicador e uma tabela estilo planilha se expande,
mostrando, para o **ano e campus ativos** (os mesmos dos filtros globais do cabeçalho): cada
variável participante da fórmula com símbolo, nome, valor bruto apurado e unidade; a fórmula
aplicada com os valores substituídos; e o valor final apurado do indicador. Exemplo: no PIES,
a memória exibe NEP (estudantes em pesquisa) e NTE (total de estudantes matriculados), os dois
valores brutos do contexto ativo, a avaliação explícita `(NEP / NTE) × 100` com os números no
lugar dos símbolos, e o percentual final publicado.

**Why this priority**: É o núcleo do pedido — transparência verificável. Sem a memória de
cálculo por indicador, o site apenas _declara_ números; com ela, qualquer visitante consegue
**conferir** a conta. É também o slice mínimo de valor: funciona isoladamente e já entrega a
auditoria completa de um indicador.

**Independent Test**: Acessar `/pilar-1`, expandir "Ver memória de cálculo" no cartão do PIES e
conferir que a tabela exibe NEP, NTE, unidades, a fórmula com valores substituídos e o valor
final — todos idênticos aos dados oficiais para o contexto ativo.

**Acceptance Scenarios**:

1. **Given** a página do Pilar 1 no contexto padrão, **When** a pessoa expande a memória de
   cálculo do PIES, **Then** a tabela exibe cada variável (ex.: NEP e NTE) com símbolo, nome,
   valor bruto do ano/campus ativos e unidade, seguidas da fórmula aplicada `(NEP / NTE) × 100`
   com os valores substituídos e do valor final apurado, que coincide com o valor exibido no
   cartão do indicador no mesmo contexto.
2. **Given** um indicador de transcrição direta sem variáveis intermediárias (ex.: NTPP),
   **When** a memória de cálculo é expandida, **Then** a tabela mostra o dado de entrada
   (ex.: projetos registrados em execução) e o valor final, sem inventar variáveis
   intermediárias inexistentes.
3. **Given** um indicador sem valor apurado para o ano/campus selecionado, **When** a memória
   é expandida, **Then** as células sem dado exibem rigorosamente "Dado indisponível" — nunca
   "0", traço ou qualquer substituto legível como valor (Princípio III).
4. **Given** a memória de cálculo expandida, **When** a pessoa troca o ano ou o campus pelos
   seletores globais do cabeçalho, **Then** todos os valores da memória (variáveis, fórmula
   substituída e valor final) atualizam para o novo contexto sem recarregar a página.
5. **Given** qualquer um dos 9 indicadores nas três páginas de pilar, **When** a memória é
   expandida, **Then** o valor final apurado é exatamente o valor canônico publicado — nada é
   estimado, arredondado ou interpolado (Princípio III).

---

### User Story 2 - Comparar o histórico multi-anual das variáveis (Priority: P2)

Uma pessoa analisando a evolução de um indicador quer ver, dentro da própria memória de
cálculo, **como os valores das variáveis mudaram ao longo dos anos** para o campus ativo. A
memória inclui uma mini-tabela histórica estilo planilha: linhas por variável, colunas por ano
disponível, com o ano ativo destacado.

**Why this priority**: Complementa a auditoria pontual com leitura de tendência, apoiando a
análise gestora ("o denominador cresceu ou o numerador caiu?"). Depende da memória base (US1)
para existir, mas é independentemente verificável.

**Independent Test**: Com a memória de um indicador expandida, conferir que a mini-tabela
histórica lista todos os anos disponíveis para o campus ativo e que os valores por ano
correspondem aos dados oficiais, com o ano ativo visualmente destacado.

**Acceptance Scenarios**:

1. **Given** a memória de cálculo do PIES expandida para o Campus Serra, **When** a pessoa
   observa a mini-tabela histórica, **Then** ela exibe NEP e NTE por ano, cobrindo todos os
   anos disponíveis para aquele campus, com o ano ativo destacado.
2. **Given** um ano em que uma variável não teve apuração, **When** a pessoa lê a coluna
   correspondente da mini-tabela, **Then** a célula exibe "Dado indisponível", sem zero ou
   inferência.
3. **Given** a troca do campus ativo com a memória aberta, **When** o histórico é reprocessado,
   **Then** a mini-tabela passa a refletir os anos disponíveis e os valores do novo campus.

---

### User Story 3 - Baixar os dados de origem e conferir a proveniência (Priority: P3)

Uma pessoa que conferiu a memória de cálculo quer **ir à fonte**. O acesso é híbrido: cada
memória de indicador cita o(s) arquivo(s) de origem relevante(s) àquele indicador, e a página
do pilar mantém uma seção de rastreabilidade com os downloads e a proveniência dos insumos
daquele pilar — o pacote agregado canônico e os insumos brutos da cadeia (planilhas de
listagem/matriz), conforme as regras já vigentes na página `/dados`. Junto dos links, a
memória informa a proveniência: origem institucional do insumo, revisão e data da última
atualização/extração. Quando um insumo bruto não pode ser publicado (portão de governança
fechado ou arquivo ausente), o link não é oferecido e o motivo é exibido em linguagem clara —
o portão falha **fechado**, nunca aberto.

**Why this priority**: Fecha o ciclo de auditoria aberto pela US1 (conferir a conta → conferir
a fonte). Reutiliza regras existentes da página de dados, mas o valor "download no contexto do
pilar" só existe com a memória já implantada.

**Independent Test**: A partir da memória de cálculo de qualquer pilar, alcançar o download do
arquivo de origem correspondente em no máximo duas interações (ou ler o motivo claro de
indisponibilidade quando o portão de governança estiver fechado).

**Acceptance Scenarios**:

1. **Given** a página de qualquer pilar, **When** a pessoa observa a seção de rastreabilidade,
   **Then** ela encontra links de download para os arquivos de origem dos indicadores daquele
   pilar, incluindo o pacote agregado canônico; e cada memória de indicador expandida cita o
   arquivo de origem relevante àquele indicador, com atalho para a seção.
2. **Given** um insumo bruto listado na memória, **When** a pessoa lê as informações de
   proveniência, **Then** constam a origem do insumo, a revisão (quando existir) e a data da
   última atualização/extração, em pt-BR.
3. **Given** o portão de governança fechado (registro ausente ou inválido), **When** a página
   é construída, **Then** os insumos brutos não são oferecidos como download e a memória exibe
   um motivo legível ao visitante, sem identificadores internos — enquanto o pacote agregado
   continua disponível (portão fail-closed, Princípio IV).
4. **Given** um arquivo de origem que não existe em disco, **When** a página é construída,
   **Then** o item aparece como indisponível com motivo — nunca como um link quebrado.

---

### User Story 4 - Painel limpo, responsivo e acessível (Priority: P4)

Toda pessoa visitante — inclusive quem navega por teclado, usa leitor de tela ou acessa pelo
celular — precisa operar a memória de cálculo sem esforço e sem perder a leitura limpa do
painel. A revelação é progressiva: recolhida, a página do pilar fica exatamente como hoje;
expandida, a tabela auditável é navegável semanticamente. Todo texto está em pt-BR e os temas
claro/escuro são respeitados.

**Why this priority**: É qualidade transversal, não funcionalidade isolada: garante que a
transparência não degrade a experiência nem viole WCAG 2.1 AA. Porém o produto só tem valor
com as histórias 1–3 implantadas.

**Independent Test**: Percorrer a página de um pilar usando somente o teclado, expandir a
memória, percorrer a tabela com leitor de tela e verificar ausência de overflow de página em
viewport de 360px, nos temas claro e escuro.

**Acceptance Scenarios**:

1. **Given** a página do pilar no estado padrão, **When** a pessoa só visualiza os cartões,
   **Then** a apresentação é a mesma de antes da funcionalidade: a memória fica recolhida e o
   painel permanece limpo e digerível (disclosure progressivo).
2. **Given** uma pessoa navegando por teclado, **When** ela aciona o controle da memória com
   Enter/Espaço, **Then** o estado expandido/recolhido é anunciado por leitor de tela
   (estado acessível do controle) e o foco permanece visível e coerente.
3. **Given** a memória expandida, **When** um leitor de tela percorre a área, **Then** as
   tabelas são semânticas (cabeçalhos com escopo e legenda/título acessível), e nenhuma
   informação depende apenas de cor.
4. **Given** um viewport estreito (a partir de 360px), **When** a memória é expandida,
   **Then** a tabela fica contida em rolagem horizontal própria, sem overflow da página, nos
   temas claro e escuro com contraste WCAG AA.

---

### Edge Cases

- **Fórmula não avaliável a partir dos componentes** (componente ausente, divisão por zero,
  contexto consolidado sem componente apurado): a memória exibe o valor final publicado e uma
  nota transparente de que a avaliação não pôde ser reconstruída — nunca exibe um resultado
  inventado, "Infinity" ou "NaN" (Princípio III).
- **Contexto "Todos" (campus consolidado)**: a memória usa os mesmos valores canônicos que os
  cartões usam nesse contexto; variável sem valor consolidado para o conjunto vira "Dado
  indisponível".
- **Ano disponível para o campus só em parte das variáveis**: a mini-tabela histórica exibe o
  ano na coluna e "Dado indisponível" apenas nas células sem apuração.
- **Portão de governança fechado ou arquivo inexistente**: nenhum link quebrado; motivo em
  pt-BR sem jargão interno; pacote agregado permanece disponível.
- **Indicador com fórmula de variável única**: a coluna de fórmula substituída mostra a
  transcrição direta (valor = valor), sem variáveis fictícias.
- **Memória expandida durante troca de contexto com recálculo**: nenhum valor de contexto
  anterior permanece visível ("primeira pintura" sempre correta, coerente com o comportamento
  de filtros já vigente no site).
- **Nomes e siglas de variáveis**: variáveis sem nome declarado no dicionário exibem o símbolo
  e "Dado indisponível" na descrição, nunca uma descrição inventada.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Cada página de pilar (`/pilar-1`, `/pilar-2`, `/pilar-3`) DEVE oferecer, por
  indicador, um controle de revelação progressiva rotulado em pt-BR (ex.: "Ver memória de
  cálculo") que expande e contrai a memória de cálculo daquele indicador. A memória carrega
  sempre recolhida; a expansão é estado local de leitura — não é persistida na URL nem entre
  navegações — e, dentro da mesma página, uma memória aberta permanece aberta durante trocas
  de contexto (ano/campus).
- **FR-002**: A memória de cálculo DEVE apresentar, para o contexto ativo (ano/campus dos
  filtros globais), uma tabela com: símbolo da variável, nome/descrição, valor bruto apurado,
  unidade de medida; e o valor final apurado do indicador.
- **FR-003**: A memória DEVE apresentar a fórmula declarada do indicador com os valores das
  variáveis substituídos no lugar dos símbolos (avaliação explícita), preservando também a
  fórmula original legível.
- **FR-004**: Todo valor exibido na memória DEVE ser exatamente o valor do conjunto de dados
  canônico publicado: é proibido inventar, estimar, arredondar ou interpolar; valor ausente
  DEVE ser renderizado como "Dado indisponível" (Princípio III).
- **FR-005**: A memória DEVE atualizar-se junto com os filtros globais de ano e campus sem
  recarregar a página, e o valor final exibido DEVE coincidir com o valor do cartão do mesmo
  indicador no mesmo contexto.
- **FR-006**: A memória DEVE incluir uma mini-tabela de histórico multi-anual dos valores das
  variáveis, cobrindo todos os anos disponíveis para o campus ativo, com o ano ativo
  destacado (US2).
- **FR-007**: A página de cada pilar DEVE manter uma seção de rastreabilidade com acesso
  direto ao download dos arquivos de origem dos indicadores daquele pilar: o pacote agregado
  canônico e os insumos brutos da cadeia que os alimentam; e cada memória de indicador DEVE
  citar o(s) arquivo(s) de origem relevante(s) àquele indicador, com atalho para a seção.
- **FR-008**: A oferta de insumos brutos (na seção de rastreabilidade e nas citações das
  memórias) DEVE seguir as mesmas regras da página de
  dados: disponibilidade derivada dos arquivos reais e do portão de governança, que falha
  **fechado** — portão fechado ou arquivo ausente significa nenhum link de download, apenas o
  motivo em pt-BR legível ao visitante (Princípio IV). A rastreabilidade NÃO mantém marcação
  ou rotulagem própria: herda integralmente as regras e a apresentação vigentes da página de
  dados, de modo que um ajuste em `/dados` reflita automaticamente nela.
- **FR-009**: A seção de rastreabilidade DEVE informar a proveniência dos insumos listados:
  origem institucional, revisão (quando existir) e data da última atualização/extração do
  arquivo; a citação dentro de cada memória DEVE identificar o arquivo pelo mesmo nome/rótulo
  usado na seção.
- **FR-010**: A memória DEVE ser acessível: tabelas semânticas com cabeçalhos de escopo e
  legenda acessível; controle de expansão com estado anunciável; operação completa por teclado
  com foco visível; nenhuma informação transmitida apenas por cor; contraste mínimo WCAG 2.1 AA.
- **FR-011**: A memória DEVE ser responsiva: em viewports estreitos a tabela fica contida em
  rolagem horizontal própria, sem overflow da página, a partir de 360px.
- **FR-012**: No estado recolhido, a página do pilar DEVE manter a apresentação atual — a
  funcionalidade é de disclosure progressivo e não altera o painel padrão.
- **FR-013**: A memória NÃO DEVE renderizar nenhum dado em nível individual: apenas valores
  agregados/canônicos por indicador, variável, ano e campus (Princípio IV).
- **FR-014**: Todo texto de interface da memória DEVE estar em pt-BR e respeitar os temas
  claro/escuro existentes (Princípio V).
- **FR-015**: A apuração, a formatação e as regras de disponibilidade da memória DEVEM estar
  cobertas por testes automatizados executados antes do merge (Princípio II).

### Key Entities _(include if feature involves data)_

- **Memória de Cálculo**: registro auditável de um indicador em um contexto (campus + ano).
  Composta pelas variáveis participantes, a fórmula declarada, a fórmula com valores
  substituídos, o valor final apurado, o histórico multi-anual das variáveis e a rastreabilidade
  dos arquivos de origem.
- **Variável (componente)**: insumo numérico da fórmula, com símbolo, nome/descrição, unidade e
  série de valores por ano/campus; pode estar indisponível com motivo (ex.: "Dado indisponível").
- **Contexto de filtro**: par campus + ano ativo, herdado dos seletores globais do cabeçalho e
  refletido na URL, que determina todos os valores exibidos na memória.
- **Artefato de origem**: arquivo oferecido para download na seção de rastreabilidade do pilar
  e citado nas memórias (pacote agregado
  canônico ou insumo bruto da cadeia), com natureza, disponibilidade real, cobertura de
  anos/campi e data de atualização; insumos brutos adicionais sujeitos ao portão de governança.
- **Portão de governança**: registro que autoriza a publicação dos insumos brutos; consultado
  em tempo de build, com comportamento fail-closed (ausente/inválido/fechado = sem publicação,
  com motivo).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Uma pessoa identifica, a partir da página de um pilar, os valores de entrada,
  unidades e fórmula de qualquer indicador do contexto ativo em até 30 segundos e no máximo 3
  interações (expandir a memória e ler a tabela).
- **SC-002**: 100% dos valores exibidos na memória coincidem com o conjunto de dados canônico e
  o relatório oficial — verificação automatizada com zero ocorrências de valores inventados e
  zero ocorrências de "0" substituindo dado ausente.
- **SC-003**: A memória de cálculo está disponível para os 9 indicadores distribuídos nas três
  páginas de pilar.
- **SC-004**: A partir da memória de qualquer pilar, a pessoa alcança o download do arquivo de
  origem correspondente em no máximo 2 interações — ou lê um motivo de indisponibilidade
  compreensível sem vocabulário técnico interno.
- **SC-005**: Em viewport de 360px não há overflow horizontal da página com a memória expandida;
  uma pessoa usando somente teclado consegue expandir, percorrer e fechar a memória, e um leitor
  de tela anuncia a tabela e o estado do controle.
- **SC-006**: Com as memórias recolhidas, a página do pilar permanece visualmente equivalente ao
  estado atual (sem mudança de layout além do próprio controle).
- **SC-007**: A mini-tabela histórica cobre 100% dos anos disponíveis para o campus ativo em
  cada indicador.

## Assumptions

- **Escopo**: a memória de cálculo vive nas páginas de visão geral dos pilares
  (`/pilar-1`, `/pilar-2`, `/pilar-3`). As páginas de detalhe do indicador já expõem componentes
  e variáveis; estendê-las está fora do escopo desta feature.
- **Fonte dos dados**: a memória deriva do mesmo conjunto de dados canônico já entregue ao
  navegador para a filtragem cliente (funcionalidade de filtros dinâmicos vigente). Nenhuma nova
  fonte de dados, backend ou servidor é criado.
- **Reaproveitamento**: símbolos, nomes, unidades, fórmulas e valores de componentes já
  mapeados no projeto (metadados dos indicadores e extração de componentes por indicador) são a
  base da memória; nenhuma variável é inventada.
- **Apresentação por indicador**: a memória é expansível por cartão de indicador (não um único
  drawer por pilar), mantendo a proximidade entre o número e sua auditoria — uma das opções
  previstas no pedido.
- **Fórmula substituída**: a coluna de avaliação é a transcrição transparente da fórmula
  declarada com os valores das variáveis; o valor final autoritativo é sempre o publicado. A
  memória não recalcula nem "corrige" valores.
- **Downloads**: a listagem de arquivos de origem reutiliza as regras e o registro já vigentes
  na página de dados (disponibilidade por existência real em disco + portão fail-closed), em vez
  de duplicar a lógica.
- **Contexto "Todos"**: usa os mesmos valores canônicos consolidados que os cartões usam; onde
  o conjunto não fornece valor consolidado de uma variável, exibe "Dado indisponível".
