# Feature Specification: Visual Redesign of Frontend Inspired by Figma Mock

**Feature Branch**: `005-figma-visual-redesign`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Visual redesign of frontend inspired by Figma mock, adapted to CONIF 3-pillar Astro SSG: 1. Visual Identity & Tokens: Official IFES 9-block grid logo (1 red circle #e6323e, 8 green squares #178447); Color system: Institutional emerald/green palette (#178447, dark green #0c3929, emerald-50, emerald-700, slate-900, surface bg #f7f9f8); Modern typography (Manrope or clean sans) and crisp inline SVG icons. 2. Navigation & Header: Sticky header with Brand, CONIF pillar navigation tabs (Visão geral, Pilar 1, Pilar 2, Pilar 3); FilterSelect dropdowns for dynamic Campus (from dataset, default 'Todos') and Year-base with URL sync (?campus=...&ano=...); Mobile menu drawer support. 3. Components & Pages (Astro Native, no React runtime): IndicatorCard: Clean card with themed icon container, large numeric value (or elegant 'Dado indisponível' badge when null), unit, change delta, and 'Ver detalhes' footer link; Detail page: Header banner with large highlight result box, 2-column layout (Main: What it measures, Purpose, Calculation formula in highlighted mono block, Variables table; Aside: Recent historical evolution chart, Component counts breakdown, and dark-green methodological note card). 4. Constraints & Exclusions: No 'Fonte dos dados' card, no CSV/JSON export downloads; Strict null handling: never render 0 for missing data; Full WCAG AA contrast compliance and zero regressions on existing 117 tests."

## Clarifications

### Session 2026-09-22

- Q: Formato de Exibição e Cálculo da Variação (Delta) nos Cartões de Indicador → A: Variação percentual (`▲ +12%` / `▼ -5%`) se anterior > 0; diferença absoluta (`+3`) se anterior = 0; badge neutro cinza ("Sem base anterior") se inexistente ou nulo.
- Q: Padrão de Interação da Gaveta de Navegação Móvel (Mobile Menu Drawer) → A: Gaveta lateral com sobreposição (slide-over), fundo escurecido, bloqueio temporário de rolagem da página e fechamento por botão 'X', tecla Escape ou clique externo.
- Q: Estrutura de Colunas da Tabela de Variáveis da Fórmula de Cálculo → A: 3 colunas padronizadas: Símbolo (código mono), Descrição (significado conceitual) e Unidade de Medida.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Identidade Visual Institucional e Tokens de Design (Priority: P1)

Como cidadão ou gestor público acessando o painel de indicadores, desejo visualizar uma identidade visual moderna, coesa e fiel à marca institucional do IFES (com logotipo em grade de 9 blocos, paleta esmeralda/verde institucional e tipografia limpa), para que a experiência de navegação transmita credibilidade, clareza e acessibilidade visual.

**Why this priority**: Estabelece o alicerce visual de cores, contraste acessível WCAG AA, tipografia e logotipo oficial que unificam todas as páginas do sistema.

**Independent Test**: Carregar qualquer página do portal e verificar a presença do logotipo oficial do IFES em grade (1 círculo vermelho `#e6323e` e 8 quadrados verdes `#178447`), a paleta institucional aplicada no fundo `#f7f9f8` e textos em ardósia/esmeralda com contraste mínimo de 4.5:1.

**Acceptance Scenarios**:

1. **Given** que o usuário acessa o cabeçalho de qualquer página, **When** o logotipo do IFES é renderizado, **Then** ele apresenta a grade de 9 blocos composta por 1 círculo vermelho no canto superior esquerdo e 8 quadrados verdes dispostos proporcionalmente, acompanhado do nome institucional.
2. **Given** que o usuário navega pela aplicação, **When** os estilos visuais são aplicados, **Then** o fundo geral utiliza a tonalidade neutra clara (`#f7f9f8`), os títulos utilizam cores de alto contraste (`#0c3929` / `#0f172a`), os acentos primários usam o verde institucional (`#178447`) e todos os textos atendem aos critérios de contraste WCAG AA.
3. **Given** que os ícones da interface são exibidos, **When** são renderizados na tela, **Then** utilizam traços nítidos e proporcionais com estilo institucional coeso.

---

### User Story 2 - Cabeçalho Fixo, Navegação entre Pilares e Seletores de Contexto (Priority: P1)

Como pesquisador ou gestor institucional, desejo um cabeçalho fixo no topo da página contendo a marca, abas de navegação direta entre os pilares (Visão geral, Pilar 1, Pilar 2, Pilar 3), seletores suspensos integrados para Campus e Ano-base, e menu deslizante em dispositivos móveis, para que eu possa alternar de contexto e navegar com fluidez mantendo a sincronização de filtros na URL.

**Why this priority**: A navegação estrutural e a seleção ágil de campus e ano-base constituem o fluxo central de exploração de todos os dados do painel.

**Independent Test**: Rolar a página para baixo e confirmar que o cabeçalho permanece fixo no topo. Alterar o campus no menu suspenso para um campus específico e o ano para um exercício específico, verificando atualização imediata da página e preservação dos parâmetros `?campus=...&ano=...` em todas as abas de navegação.

**Acceptance Scenarios**:

1. **Given** que o usuário acessa a página inicial ou páginas de pilares, **When** a página carrega, **Then** o cabeçalho fixo exibe a marca IFES, as abas de navegação ("Visão geral", "Pilar 1", "Pilar 2", "Pilar 3") com a aba ativa destacada, e seletores suspensos de Campus e Ano.
2. **Given** que o usuário altera a seleção de Campus ou Ano no cabeçalho, **When** a opção é confirmada, **Then** a URL é sincronizada no formato `?campus={sigla}&ano={exercicio}` e todos os links de navegação propagam esses mesmos parâmetros.
3. **Given** que o usuário acessa a aplicação em uma tela com largura reduzida (viewport móvel), **When** clica no botão de menu móvel, **Then** uma gaveta de navegação lateral (slide-over) desliza com fundo translúcido, bloqueia temporariamente a rolagem de fundo e disponibiliza as abas dos pilares e seletores de contexto com fechamento por botão 'X', tecla Escape ou clique externo.

---

### User Story 3 - Cartões de Indicador com Destaque Numérico, Variação e Status (Priority: P2)

Como usuário consultando a lista de indicadores de um pilar ou a visão geral, desejo que cada cartão de indicador apresente um ícone temático, valor numérico destacado em tipografia nítida (ou distintivo elegante de "Dado indisponível" se nulo), unidade de medida, cálculo de variação em relação ao ano anterior e link direto "Ver detalhes", para comparar indicadores rapidamente.

**Why this priority**: Os cartões são a principal vitrine informativa nas páginas de resumo e listagem por pilar.

**Independent Test**: Acessar `/pilar-1/` e verificar que cada indicador (NTPP, QSPP, PIES, PICOT) exibe seu cartão estilizado com ícone temático, número grande ou distintivo "Dado indisponível", variação percentual/absoluta quando houver ano anterior disponível e link "Ver detalhes".

**Acceptance Scenarios**:

1. **Given** um indicador com valor numérico coletado no ano selecionado, **When** o cartão é renderizado, **Then** ele exibe o contêiner do ícone temático, sigla e nome do indicador, valor em destaque com unidade de medida correspondente, variação em relação ao exercício anterior e o link "Ver detalhes".
2. **Given** um indicador cujo valor não foi coletado (nulo) no ano selecionado, **When** o cartão é renderizado, **Then** ele exibe um distintivo refinado com o texto "Dado indisponível" em vez de números zerados ou vazios.
3. **Given** que o usuário clica em "Ver detalhes" de um cartão, **When** o link é acionado, **Then** o usuário é direcionado para a página de detalhe do indicador preservando os parâmetros de campus e ano ativos.

---

### User Story 4 - Redesenho da Página de Detalhe com Layout em 2 Colunas e Banner de Destaque (Priority: P2)

Como gestor, auditor ou pesquisador interessado em um indicador específico, desejo visualizar a página de detalhe com um banner superior contendo o resultado consolidado em caixa de destaque, seguido de um layout estruturado em 2 colunas (coluna principal com contextualização, finalidade, fórmula em bloco mono destacado e tabela de variáveis; coluna lateral com gráfico de evolução recente, contagem de componentes e ficha metodológica institucional em cartão verde-escuro), para compreender a fundo a metodologia e os resultados.

**Why this priority**: Garante profundidade técnica e transparência analítica rigorosa para tomada de decisão e auditoria de cada indicador.

**Independent Test**: Acessar a página de detalhe de um indicador composto (ex.: `/pilar-3/piprot/`) e confirmar a presença do banner com caixa de destaque, coluna principal contendo "O que mede", "Finalidade", bloco mono da fórmula de cálculo e tabela de variáveis, e coluna lateral com gráfico de série temporal, contagem de tipos de ativos e nota metodológica em cartão verde-escuro `#0c3929`.

**Acceptance Scenarios**:

1. **Given** que o usuário acessa a página de detalhe de um indicador, **When** o topo da página é renderizado, **Then** um banner de cabeçalho exibe a identificação do indicador acompanhada de uma caixa de destaque com o valor apurado no exercício selecionado (ou "Dado indisponível").
2. **Given** o corpo da página de detalhe, **When** renderizado em telas amplas, **Then** adota um leiaute em duas colunas funcionais:
   - **Coluna Principal**: seções "O que mede", "Finalidade", fórmula matemática expressa em bloco mono destacado com fundo diferenciado e tabela descritiva das variáveis estruturada em 3 colunas (_Símbolo_, _Descrição_ e _Unidade_).
   - **Coluna Lateral**: gráfico de evolução histórica com eixos e rótulos claros, quadro de contagem de componentes (quando aplicável ao indicador) e cartão de notas metodológicas com fundo verde-escuro institucional.
3. **Given** telas de dispositivos móveis, **When** a página de detalhe é visualizada, **Then** as duas colunas se reorganizam responsivamente em fluxo vertical natural, mantendo a legibilidade sem cortes ou rolagem horizontal indesejada.

---

### User Story 5 - Fidelidade Estrita, Acessibilidade e Ausência de Elementos Descontinuados (Priority: P3)

Como mantenedor e usuário da plataforma, desejo que todas as novas telas preservem estritamente as regras de fidelidade de dados da instituição (valores nulos como "Dado indisponível", valor 0 apenas quando apurado como zero), sem botões descontinuados de download CSV/JSON, sem campo legado "Fonte dos dados", e mantendo 100% de aprovação na suíte de testes existente.

**Why this priority**: Preserva a integridade funcional, legal e de auditoria estabelecida pelo modelo CONIF e pela Constituição do projeto.

**Independent Test**: Executar a suíte de testes de regressão automatizada e auditoria de tela confirmando que nenhum valor faltoso é exibido como `0`, nenhum botão de download CSV/JSON é renderizado, o campo "Fonte dos dados" inexiste em qualquer template e os 117 testes anteriores continuam passando.

**Acceptance Scenarios**:

1. **Given** um conjunto de dados com métricas faltantes ou não coletadas, **When** qualquer componente renderiza o dado, **Then** exibe obrigatoriamente "Dado indisponível" e jamais o número 0.
2. **Given** a inspeção de qualquer cartão ou página de detalhe, **When** analisado o conteúdo HTML, **Then** não contém botões ou links para "Baixar CSV", "Baixar JSON" e não contém o campo "Fonte dos dados".
3. **Given** a execução da suíte de testes do projeto, **When** executada a validação completa, **Then** todas as asserções de fidelidade e contratos de rotas são cumpridas com zero falhas.

---

### Edge Cases

- **Ausência de dados históricos anteriores**: Quando o ano selecionado for o primeiro ano da série temporal do campus ou o ano anterior for nulo, o indicador de variação do cartão deve exibir o badge neutro "Sem base anterior", evitando divisões por zero ou valores inconsistentes.
- **Indicador sem componentes analíticos**: Quando o indicador for escalar simples (sem lista de componentes, como NTPP ou PIES), a seção de contagem de componentes na coluna lateral da página de detalhe deve ser omitida de forma limpa, expandindo visualmente a nota metodológica e o gráfico.
- **Visualização em telas ultrafinas ou com zoom de acessibilidade (200%+)**: O cabeçalho fixo e os seletores suspensos devem manter controles tocáveis (mínimo de 44x44px) e reorganizar os campos verticalmente caso o espaço horizontal seja insuficiente, sem ocultar a marca nem quebrar os menus.
- **Nomes de campi extensos no seletor suspenso**: O menu seletor de campus deve truncar ou ajustar o texto com reticências acessíveis garantindo que o cabeçalho não estoure a largura máxima da janela.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE exibir no cabeçalho e na identidade visual o logotipo oficial do IFES em grade proporcional de 9 blocos, composto por 1 círculo vermelho (`#e6323e`) no quadrante superior esquerdo e 8 quadrados verdes (`#178447`), acompanhado do texto institucional.
- **FR-002**: O sistema DEVE implementar uma paleta institucional unificada contendo verde institucional (`#178447`), verde escuro (`#0c3929`), esmeralda claro (`emerald-50`), esmeralda médio (`emerald-700`), ardósia escuro (`#0f172a` / `#1e293b`) e fundo de superfície neutro (`#f7f9f8`).
- **FR-003**: Todas as combinações de cores de texto e fundo DEVEM cumprir a razão de contraste mínima de 4.5:1 para texto normal e 3.0:1 para elementos de interface e texto grande, atendendo aos padrões WCAG AA.
- **FR-004**: O cabeçalho DEVE permanecer fixo no topo da janela de visualização (`sticky header`), fornecendo acesso permanente à navegação e aos filtros de contexto.
- **FR-005**: O cabeçalho DEVE conter abas de navegação para a "Visão geral" (`/`), "Pilar 1" (`/pilar-1/`), "Pilar 2" (`/pilar-2/`) e "Pilar 3" (`/pilar-3/`), sinalizando visualmente a aba correspondente à rota ativa.
- **FR-006**: O cabeçalho DEVE disponibilizar seletores suspensos estilizados para Campus (dinâmico a partir dos dados disponíveis, padrão "Todos") e Ano-base, sincronizando suas seleções com os parâmetros de consulta da URL (`?campus={campus}&ano={ano}`).
- **FR-007**: Em resoluções móveis, o cabeçalho DEVE oferecer acionador de gaveta de navegação lateral (slide-over) com fundo translúcido (backdrop), bloqueio da rolagem do documento quando aberta e fechamento acessível por botão 'X', clique externo ou tecla Escape, exibindo as abas dos pilares e seletores de contexto.
- **FR-008**: Cada cartão de indicador (`IndicatorCard`) DEVE conter contêiner estilizado para ícone temático, sigla do indicador, nome por extenso, valor destacado na tipografia institucional, unidade de medida, indicador de variação em relação ao ano anterior (percentual `▲ +X%` / `▼ -X%` se anterior > 0, diferença absoluta `+X` se anterior = 0, ou badge neutro 'Sem base anterior' se inexistente ou nulo) e link de navegação "Ver detalhes".
- **FR-009**: Quando um indicador não possuir valor coletado no exercício selecionado, o cartão DEVE renderizar um distintivo com "Dado indisponível", jamais exibindo o número 0.
- **FR-010**: A página de detalhe de cada indicador DEVE exibir um banner de cabeçalho contendo caixa de destaque visual com o resultado apurado no ano selecionado.
- **FR-011**: A página de detalhe DEVE estruturar o conteúdo em leiaute de duas colunas funcionais:
  - Coluna Principal contendo as seções: "O que mede", "Finalidade", "Fórmula de cálculo" em bloco monotípico destacado e "Tabela de variáveis" estruturada em 3 colunas (_Símbolo_, _Descrição_ e _Unidade_).
  - Coluna Lateral contendo: gráfico de evolução histórica recente com eixos e rótulos legíveis, seção de contagem de componentes (quando houver desdobramentos de ativos ou tipos) e cartão de nota metodológica com fundo verde-escuro institucional (`#0c3929`).
- **FR-012**: O sistema NÃO DEVE renderizar botões de exportação CSV ou JSON em nenhuma tela.
- **FR-013**: O sistema NÃO DEVE renderizar o campo ou seção "Fonte dos dados" em nenhum cartão ou página de detalhe.
- **FR-014**: Toda a renderização de componentes DEVE ser nativa e estática (Astro SSG), sem injeção de bibliotecas pesadas de interface ou runtimes de terceiros.
- **FR-015**: Todas as rotas internas DEVEM propagar os parâmetros de consulta de campus e ano ativo (`?campus=...&ano=...`) para assegurar a continuidade do contexto ao navegar entre páginas.

### Key Entities _(include if feature involves data)_

- **Indicador Institucional**: Representa a métrica pública do modelo CONIF, identificada por sigla, nome, pilar associado, descrição funcional, finalidade, fórmula matemática expressa em texto monotípico, lista de variáveis componentes e conjunto de valores anuais.
- **Valor Anual de Contexto**: Registro numérico apurado para determinado campus e ano civil, contendo valor apurado (ou indicativo estrito de nulo quando indisponível), unidade de medida e anotações metodológicas específicas.
- **Componente Analítico**: Desdobramento temático de um indicador composto (ex.: categorias de propriedade intelectual como patentes, programas de computador, marcas), contendo nome da categoria, valor apurado no exercício e status de coleta.
- **Contexto de Navegação**: Estado temporário determinado pela combinação de Campus selecionado e Ano-base, refletido na URL e propagado pelas interações do usuário.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% das páginas do portal (Home, 3 pilares e 9 indicadores detalhados) exibem o novo design institucional com logotipo oficial do IFES em grade e paleta de cores esmeralda/verde.
- **SC-002**: 100% dos pares de cores utilizados em textos informativos e elementos interativos atendem ao contraste mínimo de 4.5:1 (texto normal) e 3.0:1 (elementos gráficos e texto grande) conforme diretrizes WCAG AA.
- **SC-003**: Usuários conseguem alternar o campus e o ano-base através do cabeçalho fixo em qualquer página e visualizar a atualização imediata dos dados em menos de 1 segundo de resposta de interface.
- **SC-004**: 100% dos indicadores sem dados coletados para o ano/campus selecionado exibem expressamente "Dado indisponível", com zero ocorrências de valores 0 falsos ou campos em branco.
- **SC-005**: A totalidade dos 117 testes automatizados preexistentes continua sendo aprovada com 0 regressões funcionais, e a geração estática via build produz as 13 páginas do portal sem alertas ou erros.

## Assumptions

- A tipografia institucional utilizará uma pilha de fontes modernas sem serifa de carregamento rápido e limpo (ex.: Manrope ou fontes de sistema modernas), preservando a performance sem dependências externas bloqueantes.
- O logotipo oficial do IFES em grade de 9 blocos será desenhado como SVG inline acessível, permitindo escalabilidade geométrica perfeita e carregamento imediato sem requisições HTTP adicionais.
- Os ícones dos cartões e cabeçalho serão vetoriais inline em SVG com estilo limpo e consistente.
- A comparação de variação do indicador toma como referência o exercício imediatamente anterior presente na série histórica do mesmo campus; se o ano anterior não existir ou for nulo, exibe indicativo neutro.
