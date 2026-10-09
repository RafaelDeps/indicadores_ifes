# Feature Specification: Nova Página Explicativa dos Pilares CONIF (Campus Serra)

**Feature Branch**: `feat/new_pages`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Criar nova página institucional explicando o modelo e os pilares CONIF para o Campus Serra"

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Compreensão do Modelo e dos 3 Pilares CONIF (Priority: P1)

Como membro da comunidade acadêmica, gestor ou cidadão interessado no IFES Campus Serra,
quero acessar uma página dedicada que explique de forma didática o que é o modelo CONIF e o que cada um dos três pilares avalia,
para que eu compreenda o significado das siglas e indicadores apresentados no painel.

**Why this priority**: É a essência funcional da entrega: fornecer contexto conceitual e institucional para os dados do dashboard, sanando dúvidas sobre o que o CONIF mensura.

**Independent Test**: Pode ser testado acessando a rota `/sobre-conif/` diretamente pelo navegador e verificando se todas as seções explicativas (Contextualização CONIF, Pilar 1, Pilar 2 e Pilar 3) estão presentes, legíveis e com links direcionando para os respectivos indicadores.

**Acceptance Scenarios**:

1. **Given** que o usuário acessa a rota `/sobre-conif/`, **When** a página carregar, **Then** deve visualizar um cabeçalho explicativo sobre o Conselho Nacional das Instituições da Rede Federal (CONIF) e seu propósito na avaliação de Pesquisa, Pós-graduação e Inovação.
2. **Given** que o usuário lê as seções dos pilares, **When** visualizar o Pilar 1 (Engajamento Acadêmico e Inclusão), **Then** deve encontrar a explicação do foco em pessoas, estudantes, docentes, bolsas e ações afirmativas, acompanhada de atalhos para os indicadores relacionados (NTPP, QSPP, PIES, PICOT).
3. **Given** que o usuário lê a seção do Pilar 2 (Fomento e Conexão com o Ecossistema), **When** inspecionar o conteúdo, **Then** deve encontrar a contextualização sobre captação de recursos, parcerias externas, inovação aberta e o Polo de Inovação/Embrapii no Campus Serra (PINV, PIPDI).
4. **Given** que o usuário lê a seção do Pilar 3 (Produtividade e Propriedade Intelectual), **When** inspecionar o conteúdo, **Then** deve encontrar a explicação sobre entrega de patentes, registros de software, produção acadêmica e transferência de tecnologia (PIPRO, PIPROT, PIPROTR).

---

### User Story 2 - Entendimento da Relevância Estratégica para o Campus Serra (Priority: P2)

Como gestor, pesquisador ou estudante do Campus Serra,
quero ler uma seção específica detalhando por que esses indicadores são vitais especificamente para a nossa unidade,
para que eu compreenda a importância dos dados na transparência pública, no planejamento anual e na atração de parceiros para o campus.

**Why this priority**: Garante que o painel não seja visto apenas como um repositório burocrático de fórmulas, mas como uma ferramenta viva de desenvolvimento e governança do Campus Serra.

**Independent Test**: Pode ser testado verificando a existência de uma seção em destaque ("Por que isso é importante para o Campus Serra?") detalhando os eixos de transparência pública, planejamento de editais/bolsas e atração de parcerias com o setor produtivo.

**Acceptance Scenarios**:

1. **Given** que o usuário está na página `/sobre-conif/`, **When** rolar até a seção de relevância institucional, **Then** deve encontrar tópicos claros sobre transparência dos recursos públicos investidos, subsídio para decisões de gestão/editais e fortalecimento do ecossistema local de tecnologia e inovação.
2. **Given** que o usuário lê sobre o Polo Embrapii e as iniciativas da Serra, **When** clicar nos links para os indicadores pertinentes, **Then** deve ser direcionado para a visualização dos dados apurados do campus com preservação do contexto.

---

### User Story 3 - Navegação Fluida a partir do Cabeçalho e da Página Inicial (Priority: P3)

Como visitante navegando em qualquer parte do site,
quero encontrar links e chamadas visíveis para a nova página explicativa tanto no menu principal quanto na página inicial,
para que eu possa transitar facilmente entre os dados numéricos e a fundamentação teórica.

**Why this priority**: Aumenta a descoberta da página, garantindo que o usuário encontre a explicação no momento em que tiver dúvidas.

**Independent Test**: Pode ser testado clicando no novo item de navegação ("Sobre o Modelo") no cabeçalho fixo, na gaveta móvel de telas pequenas e no card de destaque inserido na página inicial.

**Acceptance Scenarios**:

1. **Given** que o usuário está em qualquer página do site em desktop, **When** olhar o menu de navegação, **Then** deve visualizar um link claramente identificado (ex.: "Sobre o Modelo" ou "Pilares CONIF") que leva a `/sobre-conif/`.
2. **Given** que o usuário está em um dispositivo móvel, **When** abrir a gaveta móvel de navegação, **Then** o link para a página sobre os pilares deve estar listado e acessível.
3. **Given** que o usuário está na página inicial (`/`), **When** visualizar os blocos de apresentação, **Then** deve encontrar um card convidativo orientando a conhecer a metodologia e o modelo dos pilares.
4. **Given** que o usuário está na página `/sobre-conif/`, **When** observar a barra de navegação, **Then** o link correspondente deve estar marcado como ativo (`aria-current="page"`).

---

### Edge Cases

- **Navegação com parâmetros de consulta preservados**: Caso o usuário chegue com parâmetros de contexto na URL (ex.: `?campus=serra&ano=2024`), os links internos para os pilares dentro da página `/sobre-conif/` devem preservar os parâmetros para não resetar o filtro do usuário.
- **Telas muito pequenas (mobile < 360px)**: O layout dos cards explicativos dos pilares deve se reorganizar em coluna única sem quebra de margens ou overflow horizontal.
- **Leitores de tela e navegação por teclado**: A estrutura de cabeçalhos (`h1`, `h2`, `h3`) deve ser estritamente sequencial, sem pular níveis, com ordem lógica de foco e contraste mínimo WCAG AA em ambos os temas (claro e escuro).

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar uma página pública na rota canônica `/sobre-conif/`.
- **FR-002**: A página DEVE conter uma seção introdutória explicando a origem, o papel do CONIF e o propósito de harmonização das métricas de Pesquisa, Pós-Graduação e Inovação da Rede Federal.
- **FR-003**: A página DEVE apresentar detalhadamente o **Pilar 1 (Engajamento Acadêmico e Inclusão)**, descrevendo seus objetivos, público envolvido (estudantes, cotistas, docentes) e listando seus indicadores com links diretos (NTPP, QSPP, PIES, PICOT).
- **FR-004**: A página DEVE apresentar detalhadamente o **Pilar 2 (Fomento e Conexão com o Ecossistema)**, contextualizando a captação financeira, parcerias institucionais, projetos de PDeI e o Polo de Inovação/Embrapii do Campus Serra (PINV, PIPDI).
- **FR-005**: A página DEVE apresentar detalhadamente o **Pilar 3 (Produtividade e Propriedade Intelectual)**, detalhando proteção de patentes, registros de software, produção científica e acordos de transferência tecnológica (PIPRO, PIPROT, PIPROTR).
- **FR-006**: A página DEVE conter uma seção dedicada à **Importância Estratégica para o Campus Serra**, articulando os eixos de: (a) Transparência Pública, (b) Governança e Planejamento Interno, e (c) Fomento ao Ecossistema Regional Capixaba.
- **FR-007**: O sistema DEVE incluir no cabeçalho institucional (`Header`) e na gaveta móvel (`mobile-drawer`) um link direto para a rota `/sobre-conif/`.
- **FR-008**: Quando o usuário estiver na rota `/sobre-conif/`, o item de navegação no cabeçalho e na gaveta DEVE receber estado ativo visual e semântico (`aria-current="page"`).
- **FR-009**: A página inicial (`/`) DEVE incluir um card de destaque ou banner convidativo ligando o visitante à página explicativa do modelo CONIF.
- **FR-010**: A página DEVE utilizar a tipografia, espaçamentos e paleta de cores institucionais do projeto, oferecendo suporte pleno e automático aos modos de tema claro e escuro.
- **FR-011**: Todos os elementos interativos, cartões e links DEVEM ser navegáveis por teclado e possuir indicadores visíveis de foco (`:focus-visible`).
- **FR-012**: A página DEVE fornecer trilha de navegação (_breadcrumbs_) semântica permitindo retornar rapidamente à página inicial.

### Key Entities

- **Modelo CONIF**: Conjunto de diretrizes e pilares formulados pelo Conselho Nacional das Instituições da Rede Federal para acompanhamento institucional de P&I.
- **Pilar Institucional**: Eixo temático estruturante (Engajamento, Fomento ou Produtividade) que agrupa indicadores de desempenho com fórmulas e variáveis padronizadas.
- **Campus Serra**: Unidade do IFES tomada como referência principal, destacando sua atuação prática em pesquisa aplicada e inovação tecnológica.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O usuário consegue navegar da página inicial até a explicação detalhada de qualquer um dos 3 pilares em no máximo 1 clique.
- **SC-002**: 100% dos indicadores mencionados na página explicativa possuem links funcionais direcionando para a visualização dos dados apurados daquele indicador no Campus Serra.
- **SC-003**: A página atinge pontuação máxima de acessibilidade automatizada (zero violações WCAG AA de contraste e semântica de marcos/títulos).
- **SC-004**: O tempo de carregamento da página estática permanece instantâneo (< 500ms em conexões padrão), sem inclusão de bibliotecas ou dependências externas pesadas.

---

## Assumptions

- A rota canônica primária será `/sobre-conif/`, com rótulo "Sobre o Modelo" no cabeçalho para concisão em telas médias.
- Como o foco do projeto é no Campus Serra, os exemplos e a contextualização prática enfatizarão as ações de pesquisa e o ecossistema de inovação da Serra (ex.: Polo Embrapii).
- Nenhum dado pessoal ou individualizado é mencionado ou exposto na página (conformidade com o Princípio IV da Constituição).

---

## Out of Scope

- Edição ou alteração nas fórmulas de cálculo dos indicadores (tratado nas etapas de dados e detalhamento).
- Formulários interativos de perguntas/respostas ou comentários de usuários.
- Comparação multilateral com dados de outros Institutos Federais externos (o foco é o modelo e os dados do IFES Serra).
