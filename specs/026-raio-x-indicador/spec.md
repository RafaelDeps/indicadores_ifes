# Feature Specification: Raio-X do Indicador (Drawer de Auditoria de Micradados)

**Feature Branch**: `026-raio-x-indicador`

**Created**: 2026-10-15

**Status**: Draft

**Input**: User description: "Create a feature specification for an 'Indicator Audit Drawer / Modal' (Raio-X do Indicador) across all Pillar pages (/pilar-1, /pilar-2, /pilar-3) and indicator detail pages.

Objective: Provide instant, interactive auditability at the microdata level by allowing any user to open a side drawer/modal for any indicator and inspect the exact list of individual records (students, projects, staff, contracts, etc.) that were counted to calculate the indicator value for the selected year and campus.

User Story & Experience: As an auditor, student, or researcher visiting the indicator dashboard: When I view an indicator (e.g., PIES - Percentage of Students in Research), I want to click a clear '[🔍 Auditar Dados Brutos]' (or 'Raio-X do Indicador') button. A slide-over drawer (or accessible modal) opens without leaving the page. The drawer displays tabs corresponding to each component of the formula (e.g., Tab 1: 'Numerador (NEP) - 355 Alunos em Pesquisa'; Tab 2: 'Denominador (NTE) - 1.989 Matrículas Ativas'). On each tab, I see a searchable, paginated table listing the actual records (e.g., Student Name, Matricula/ID, Course, Project Title, Role). A prominent audit badge displays: 'Exibindo 355 registros listados | Total apurado: 355 ✓ (Conferido)'. If I type into the search bar (e.g., search by course or student name), the table filters instantaneously and displays: 'Exibindo Y de 355 registros'. A footer displays the formula calculation step (355 / 1989 * 100 = 17.85% -> 18%) and an 'Exportar Lista (.csv / .xlsx)' button.

Key Requirements: 1. Trigger & Navigation — consistent, accessible audit trigger button on IndicatorCard and IndicadorDetalhe; pass the active context (campus, ano). 2. Audit Drawer / Modal — component-based tabs reflecting the formula variables; high-performance tabular display with client-side search, sorting, pagination (25/50/100 rows per page); summary bar linking visible record count to the official calculated indicator number; quick export button for the filtered or raw data slice. 3. Data Pipeline & Performance (ETL) — generate lightweight, optimized JSON audit fixtures per indicator, campus, and year (e.g., public/dados/auditoria/{indicador}_{campus}_{ano}.json) containing only the necessary audit fields; frontend loads these lazily on demand (fetch only when the drawer opens). 4. Accessibility & Usability — ARIA modal/drawer attributes (role='dialog', aria-modal='true', focus trapping, ESC key, close button); keyboard accessible and responsive across mobile and desktop. 5. Governance & Privacy — align with constitution Principle IV and existing governance decisions authorizing public raw input processing; include unit/integration tests for data extraction and component rendering."

---

## Clarifications

### Session 2026-10-15

- Q: Que campos os registros de pessoas (NEP, NTE, NTECPP, SUPP) exibem no Raio-X? → A:
  Completo como o pedido (Opção A) — Nome, Matrícula/ID, Curso, Projeto e Papel, além dos
  campos naturais dos registros não-pessoais (projetos, ativos, acordos, itens orçamentários).
  A publicação DEVE ser precedida da emenda MAJOR do Princípio IV e da revisão de privacidade
  versionada (FR-012), e o drawer DEVE exibir a marcação de dados pessoais (FR-013).
- Q: Como o Raio-X convive com a "Ver memória de cálculo" (feature 025) nos cartões dos
  pilares? → A: Coexistem (Opção A) — a memória inline permanece como conferência rápida da
  conta, e o Raio-X é a auditoria profunda registro a registro (drawer sob demanda): dois
  níveis de progressive disclosure no mesmo cartão. Nenhum substitui o outro.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Abrir o Raio-X do Indicador no contexto ativo (Priority: P1) 🎯 MVP

Uma pessoa (auditor, estudante, pesquisador ou gestor) vendo um indicador — no cartão de uma
página de pilar ou na página de detalhe — aciona o controle **"Raio-X do Indicador"**
(pt-BR; ex.: "[🔍 Auditar dados brutos]"). Um drawer lateral acessível se abre sem sair da
página, no **contexto ativo** (campus e ano dos filtros globais). O drawer exibe uma **aba por
componente da fórmula** (ex.: PIES → "Numerador (NEP) — 355 alunos em pesquisa" e
"Denominador (NTE) — 1.989 matrículas ativas"), e cada aba lista os **registros individuais
que foram contabilizados** naquele componente naquele contexto. Um selo de conferência
protagoniza o topo: **"Exibindo 355 registros listados | Total apurado: 355 ✓ (Conferido)"**.

**Why this priority**: É o núcleo do pedido — auditoria no nível do micrado, a click de
distância do número. Sem ele, o site declara e (desde a feature 025) mostra a conta, mas não
permite conferir **registro a registro** o que foi contado.

**Independent Test**: Em `/pilar-1`, com um campus e ano selecionados, abrir o Raio-X do PIES
pelo cartão e conferir que cada aba lista exatamente os registros daquele componente naquele
contexto e que a contagem listada coincide com o total apurado do dataset canônico.

**Acceptance Scenarios**:

1. **Given** a página de um pilar com contexto ativo, **When** a pessoa aciona "Raio-X do
   Indicador" no cartão do PIES, **Then** um drawer abre sem recarregar a página, com uma aba
   por componente da fórmula, cada aba rotulada com papel, símbolo e valor apurado daquele
   contexto (ex.: "Numerador (NEP) — 355 alunos em pesquisa").
2. **Given** uma aba do drawer, **When** a pessoa examina a tabela, **Then** as linhas são os
   registros individuais contabilizados naquele componente para o campus e ano ativos, e o
   selo exibe "Exibindo N registros listados | Total apurado: N ✓ (Conferido)" quando a
   contagem coincide com o valor apurado canônico.
3. **Given** o portão de governança fechado (registro ausente ou inválido), **When** a página
   é construída, **Then** nenhuma fixture de micradados é publicada, o Raio-X não é oferecido
   (com motivo legível em pt-BR) e o restante do painel segue intacto (portão fail-closed,
   Princípio IV).
4. **Given** o drawer aberto, **When** a pessoa troca o campus ou o ano pelos seletores
   globais, **Then** o conteúdo passa a refletir o novo contexto — nunca permanece visível
   registro de contexto diferente do ativo.
5. **Given** um componente sem detalhamento registro a registro na fonte (ex.: item
   orçamentário agregado), **When** a aba correspondente é aberta, **Then** ela informa de
   forma transparente que a fonte não detalha registros (com o total apurado mantido) — nunca
   linhas vazias fingidas, zero ou dados inventados (Princípio III).

---

### User Story 2 - Encontrar registros: busca, ordenação e paginação (Priority: P2)

Dentro de uma aba com centenas ou milhares de registros (ex.: NTE com ~2 mil matrículas), a
pessoa digita em uma barra de busca (por curso, nome, título de projeto, conforme os campos da
aba) e a tabela filtra instantaneamente, exibindo "Exibindo Y de 355 registros". Ela pode
ordenar por qualquer coluna e paginar em 25, 50 ou 100 linhas por página.

**Why this priority**: A auditoria só é utilizável em escala com busca/paginação; sem elas,
abas de 2 mil linhas são inutilizáveis em telas comuns e na conexão móvel.

**Independent Test**: Em uma aba com N registros, digitar um termo que casa com um subconjunto
conhecido e conferir que o contador exibe "Exibindo Y de N registros", que a ordenação por
coluna reordena com indicador acessível e que a paginação respeita o tamanho de página
escolhido.

**Acceptance Scenarios**:

1. **Given** a aba do denominador (NTE) de um campus, **When** a pessoa digita um termo
   presente em alguns registros (ex.: um curso), **Then** a tabela filtra instantaneamente
   (sem recarregar) e o contador passa a "Exibindo Y de N registros", com o selo de total
   apurado preservado.
2. **Given** um termo de busca com variações de acento ou caixa (ex.: "informatica" vs.
   "Informática"), **When** a busca é aplicada, **Then** a correspondência é insensível a
   acento e caixa.
3. **Given** qualquer aba, **When** a pessoa aciona o cabeçalho de uma coluna, **Then** as
   linhas se reordenam por aquela coluna com indicador de direção e atributo de ordenação
   acessível (`aria-sort`).
4. **Given** uma aba com mais registros que o tamanho de página, **When** a pessoa navega pela
   paginação (25/50/100 por página), **Then** apenas a página atual é exibida, com controles
   de navegação acessíveis e contador de páginas coerente.
5. **Given** uma busca sem resultados, **When** a busca termina, **Then** um estado vazio
   legível orienta limpar o termo — sem exibir "0" como valor apurado (Princípio III).

---

### User Story 3 - Exportar o recorte e conferir a conta (Priority: P3)

A pessoa que chegou a um recorte (com ou sem busca aplicada) quer levá-lo: um botão
**"Exportar lista"** baixa o recorte exibido (CSV; e XLSX quando tecnicamente viável sem
dependência pesada). No rodapé do drawer, a **etapa de cálculo** é exibida — a fórmula com os
valores substituídos e a avaliação ilustrativa (ex.: `355 / 1.989 × 100 = 17,85% → 18%`), com
o valor final publicado governando sempre. O drawer também cita a **fonte** dos registros e a
data de extração, ligando o recorte aos insumos publicados em `/dados`.

**Why this priority**: Fecha o ciclo de auditoria (conferir → levar o registro). Depende da
US1/US2 para ter conteúdo, mas é verificável isoladamente.

**Independent Test**: Aplicar uma busca que filtra Y de N registros, acionar "Exportar lista" e
conferir que o arquivo baixado contém exatamente os Y registros visíveis, com os mesmos campos
da tabela.

**Acceptance Scenarios**:

1. **Given** um recorte filtrado (ou a lista completa), **When** a pessoa aciona "Exportar
   lista", **Then** o arquivo baixado contém exatamente os registros visíveis no recorte, com
   os mesmos campos exibidos na tabela.
2. **Given** o rodapé do drawer, **When** a pessoa lê a etapa de cálculo, **Then** constam a
   fórmula declarada com os valores substituídos e o valor final publicado; a avaliação
   aritmética intermediária aparece apenas como ilustração e, quando não reproduz o valor
   publicado, uma nota transparente informa que a apuração oficial governa (Princípio III).
3. **Given** qualquer aba, **When** a pessoa observa a proveniência, **Then** constam a fonte
   dos registros e a data de extração da fixture, coerentes com o registro de insumos de
   `/dados`.

---

### User Story 4 - Drawer acessível, responsivo e leve (Priority: P4)

Qualquer pessoa — inclusive quem navega só por teclado, usa leitor de tela ou celular — abre,
navega e fecha o Raio-X sem barreiras. O drawer é um diálogo modal acessível: foco preso
dentro dele, ESC fecha, botão de fechar explícito, foco devolvido ao disparador. Ele é
carregado **sob demanda**: nenhum micrado é baixado até o drawer abrir, e o carregamento
inicial das páginas permanece exatamente como hoje.

**Why this priority**: Qualidade transversal que garante que a transparência não custe
acessibilidade nem desempenho; o produto só existe com US1–US3.

**Independent Test**: Percorrer o drawer inteiro por teclado (abrir, trocar de aba, buscar,
paginar, fechar com ESC), verificar o retorno do foco ao disparador, a ausência de overflow de
página em 360px e que nenhuma requisição de micradados acontece antes do primeiro
acionamento.

**Acceptance Scenarios**:

1. **Given** o drawer aberto, **When** uma pessoa navega por teclado, **Then** o foco fica
   preso dentro do diálogo, TAB percorre controles e tabelas em ordem coerente, e ESC (ou o
   botão "Fechar") devolve o foco ao disparador.
2. **Given** um leitor de tela, **When** o drawer abre, **Then** ele é anunciado como diálogo
   modal (`role="dialog"`, `aria-modal="true"`) com título e rótulos acessíveis em pt-BR nas
   abas, tabelas e controles.
3. **Given** um viewport estreito (a partir de 360px), **When** o drawer abre, **Then** ele
   ocupa a largura disponível sem overflow da página, com a tabela contida em rolagem
   própria, nos temas claro e escuro.
4. **Given** a página recém-carregada, **When** ninguém abriu o Raio-X, **Then** nenhuma
   requisição de dados de auditoria acontece — os dados são buscados apenas ao abrir, e a
   página exibe estados de carregamento e falha legíveis (ex.: falha de rede com nova tentativa).

---

### Edge Cases

- **Contagem divergente** (registros listados ≠ total apurado): o selo exibe estado
  transparente de divergência com os dois números — nunca "✓ (Conferido)" falso nem um dos
  números silenciosamente ajustado (Princípio III).
- **Componente sem detalhamento registro a registro na fonte** (ex.: item orçamentário
  consolidado, acumulados): aba informa a indisponibilidade do detalhamento com o total
  apurado mantido e a proveniência da fonte.
- **Contexto consolidado "Todos"**: o Raio-X não lista registros cruzando campi; o drawer
  explica e aponta para os insumos de `/dados` (listagens por período e export canônico).
- **Portão de governança fechado ou fixture ausente**: sem link quebrado nem botão morto —
  motivo em pt-BR, sem jargão interno; pacote agregado e painel seguem normais.
- **Ano em andamento (2026)**: os registros refletem o snapshot publicado; o aviso de ano em
  andamento já existente no painel é reaproveitado dentro do drawer.
- **Campos ausentes em registros individuais**: célula exibe "Dado indisponível" — nunca
  inferência ou preenchimento fictício.
- **Drawer aberto durante navegação**: fecha ao sair da página; estado de abertura não é
  persistido na URL (mesmo padrão da memória de cálculo, feature 025).
- **Falha de rede ao buscar a fixture**: estado de erro legível com nova tentativa — nunca
  tabela vazia silenciosa.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Cada cartão de indicador nas páginas de pilar e cada página de detalhe de
  indicador DEVE oferecer o controle "Raio-X do Indicador" (rótulo em pt-BR, ex.:
  "[🔍 Auditar dados brutos]"), operável por teclado e com rótulo acessível.
- **FR-002**: O drawer DEVE abrir sem recarregar a página e exibir exatamente os registros da
  apuração do contexto ativo (campus + ano dos filtros globais); nenhum registro de contexto
  diferente pode ficar visível.
- **FR-003**: O drawer DEVE exibir uma aba por componente da fórmula, rotulada com papel,
  símbolo e valor apurado do contexto (ex.: "Numerador (NEP) — 355 alunos em pesquisa";
  "Denominador (NTE) — 1.989 matrículas ativas").
- **FR-004**: Cada aba DEVE listar os registros individuais contabilizados naquele componente.
  Para registros de pessoas (ex.: NEP, NTE, NTECPP, SUPP), os campos DEVEM incluir Nome,
  Matrícula/ID, Curso, Projeto e Papel; para registros não-pessoais (projetos, ativos,
  acordos, itens orçamentários), os campos naturais do tipo (título, tipo, papel, valor).
  Campos ausentes são exibidos como "Dado indisponível". A publicação é condicionada à emenda
  MAJOR do Princípio IV e à revisão de privacidade (FR-012) e à marcação de dados pessoais no
  drawer (FR-013).
- **FR-005**: A tabela de cada aba DEVE oferecer busca textual instantânea (insensível a caixa
  e acento), ordenação por coluna com indicador acessível e paginação em 25, 50 ou 100 linhas
  por página, com contador "Exibindo Y de N registros" sempre visível.
- **FR-006**: O selo de conferência DEVE comparar a contagem de registros listados com o valor
  apurado canônico do componente: iguais → "✓ (Conferido)"; diferentes → aviso transparente de
  divergência com os dois números (Princípio III — nunca conferência falsa).
- **FR-007**: O rodapé DEVE exibir a fórmula declarada com os valores substituídos e o valor
  final publicado; a avaliação aritmética intermediária pode aparecer como ilustração, com
  nota de que a apuração oficial governa quando a aritmética não a reproduz.
- **FR-008**: O drawer DEVE oferecer "Exportar lista" do recorte atual (filtrado ou completo):
  CSV obrigatório; XLSX apenas se viável sem dependência pesada (a justificativa cabe ao plano
  — Princípio I).
- **FR-009**: Os dados de auditoria DEVEM ser carregados sob demanda (busca apenas ao abrir o
  drawer), sem nenhum micrado no carregamento inicial das páginas; estados de carregamento e
  de falha (com nova tentativa) DEVEM ser legíveis.
- **FR-010**: O ETL DEVE gerar fixtures de auditoria leves por indicador, campus e ano
  (apenas os campos de auditoria necessários), derivadas exclusivamente das fontes já
  consumidas pela cadeia; o dataset canônico agregado e os valores publicados NÃO podem ser
  alterados por essa derivação.
- **FR-011**: O portão de governança fail-closed DEVE valer para as fixtures de auditoria:
  portão fechado → fixtures não publicadas e Raio-X não oferecido, com motivo legível ao
  visitante (Princípio IV).
- **FR-012**: A publicação de micradados por este recurso DEVE ser precedida de emenda MAJOR
  do Princípio IV (que hoje autoriza apenas os insumos brutos exatos consumidos por `make
dados`) e de atualização da revisão de privacidade versionada — mesma disciplina da feature
  016; sem emenda e revisão, o Raio-X não pode publicar registros individuais.
- **FR-013**: Quando os registros exibidos contiverem dados pessoais, o drawer DEVE exibir
  marcação em pt-BR ("contém dados pessoais; não anonimizado"), que não dependa apenas de cor.
- **FR-014**: O drawer DEVE ser um diálogo modal acessível: `role="dialog"`, `aria-modal`,
  foco preso no diálogo, fechamento por ESC e botão "Fechar", devolução do foco ao
  disparador, operação completa por teclado e apresentação responsiva a partir de 360px nos
  temas claro e escuro.
- **FR-015**: Todo texto do Raio-X DEVE estar em pt-BR; valores exibidos seguem as regras
  canônicas de formatação e de indisponibilidade ("Dado indisponível" — Princípios III e V).
- **FR-016**: A geração das fixtures (ETL) e o comportamento do drawer (extração, busca,
  contagem, acessibilidade) DEVEM estar cobertos por testes automatizados executados antes do
  merge — pytest para o ETL e Vitest para o frontend (Princípio II).

### Key Entities _(include if feature involves data)_

- **Fixture de Auditoria**: arquivo leve por indicador × campus × ano, com o papel/símbolo/
  rótulo de cada componente da fórmula, o total apurado canônico de cada componente, a lista
  de registros daquele componente e a proveniência (fonte + data de extração). Derivada em
  build/ETL; sujeita ao portão de governança.
- **Registro de Auditoria**: uma linha contabilizada em um componente. Registros de pessoas
  incluem Nome, Matrícula/ID, Curso, Projeto e Papel (decisão Q1, Opção A); registros
  não-pessoais (projeto, ativo, acordo, item orçamentário) usam os campos naturais do tipo.
  Células sem dado exibem "Dado indisponível".
- **Aba de Componente**: visão de um componente da fórmula dentro do drawer — rótulo, total
  apurado, tabela de registros, busca/ordenação/paginação e export.
- **Selo de Conferência**: comparação entre registros listados e total apurado canônico
  ("✓ Conferido" ou divergência transparente).
- **Contexto de Filtro**: campus + ano ativos, herdados dos seletores globais e refletidos na
  URL, determinando qual fixture é buscada.
- **Portão de Governança**: registro existente que autoriza a publicação dos insumos brutos —
  estendido por esta feature às fixtures de auditoria, com comportamento fail-closed.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Uma pessoa abre o Raio-X de qualquer indicador em no máximo 3 interações, e os
  registros aparecem em até 2 segundos após abrir (conexão típica) — sem alterar o peso de
  carregamento inicial das páginas (zero micrado pré-carregado).
- **SC-002**: 100% dos componentes com fonte de registros exibem abas funcionais; todo contexto
  em que a contagem listada coincide com o apurado exibe "✓ (Conferido)", e nenhuma interface
  exibe conferência quando há divergência (verificação automatizada com zero exceções).
- **SC-003**: Busca, ordenação e troca de página respondem em menos de 1 segundo no maior
  conjunto de registros (~2.500 linhas).
- **SC-004**: O recorte atual (filtrado ou completo) é exportado em no máximo 2 interações, e
  o arquivo contém exatamente os registros visíveis.
- **SC-005**: 100% do drawer é operável por teclado; ESC fecha e devolve o foco ao disparador;
  sem overflow de página em 360px, nos temas claro e escuro.
- **SC-006**: Com o portão de governança fechado, zero micradados são publicados e o Raio-X
  fica indisponível com motivo — verificação automatizada (fail-closed).
- **SC-007**: O Raio-X está disponível para os 9 indicadores, nas páginas de pilar e nas
  páginas de detalhe.

## Assumptions

- **Fonte dos registros**: as fixtures derivam exclusivamente das fontes já consumidas pela
  cadeia (listagens de matrícula e export canônico — os insumos autorizados pelo Princípio
  IV); nenhum dado novo é coletado ou estimado.
- **Pré-condição de governança**: a autorização vigente (emenda 2.0.0, decisão de
  2026-10-05, `docs/revisao-privacidade.md`) cobre a **publicação dos arquivos de insumo** —
  não uma nova superfície de renderização de micradados nem novas fixtures. Portanto a
  emenda do Princípio IV (FR-012) é pré-condição da publicação, seguindo o precedente da
  feature 016; sem ela, o Raio-X não sai.
- **Contexto "Todos"**: sem listagem de registros cruzando campi — drawer explica e aponta
  para `/dados` (assunção de escopo; as listagens e o export são por período/instituição).
- **Estado do drawer**: não persiste na URL; fecha ao navegar (mesmo padrão da memória de
  cálculo da feature 025).
- **Export**: CSV é o formato obrigatório; XLSX fica condicionado a não exigir dependência
  pesada no frontend (Princípio I) — decisão final no plano.
- **Escopo de telas**: gatilho nos cartões das páginas de pilar e nas páginas de detalhe; a
  matriz consolidada e a visão geral não recebem o gatilho nesta feature.
- **Composição com a memória de cálculo (025)**: nos cartões dos pilares os dois níveis
  coexistem — a memória inline (conta) continua expandida pelo controle de 025, e o Raio-X
  (registros, drawer) entra como segundo controle; nenhuma das superfícies substitui a outra.
- **Valores**: a contagem apurada exibida vem sempre do dataset canônico; a fixture nunca
  recalcula ou "corrige" valores (Princípio III).
