# Feature Specification: Reformulação e Correção Abrangente do Frontend

**Feature Branch**: `014-frontend-ux-overhaul`

**Created**: 2026-10-01

**Status**: Draft

**Input**: User description: "Implementar uma reformulação e correção abrangente do frontend dos Indicadores IFES focada em reatividade de dados, acessibilidade, performance e consistência de UI/UX"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Atualização Reativa Completa nos Detalhes do Indicador (Priority: P1)

Ao navegar na página detalhada de um indicador institucional (`/pilar-[1-3]/[sigla]`) e selecionar um campus ou ano de referência diferente no cabeçalho ou gaveta móvel, o gestor ou cidadão deve ver todas as seções atualizadas instantaneamente: o banner de resultado apurado, o gráfico SVG de evolução temporal, a tabela de série histórica e as contagens dos componentes analíticos ano a ano, eliminando a ancoragem estática em um único campus.

**Why this priority**: Integridade e fidelidade aos dados oficiais (Princípio III da Constituição do projeto). Exibir números de um campus no resumo enquanto o gráfico e a tabela exibem dados de outro gera desinformação institucional e invalida a utilidade analítica do portal.

**Independent Test**: Acessar `/pilar-1/ntpp/` com filtro inicial geral, alterar o campus para "Vitória" ou "Serra" nos seletores do cabeçalho e verificar se o gráfico temporal de pontos/linhas, a tabela de série histórica e o banner exibem unicamente a série do campus selecionado, com o ponto do ano ativo visualmente destacado.

**Acceptance Scenarios**:

1. **Given** um usuário na página de detalhe de um indicador com visualização inicial, **When** seleciona um campus diferente no seletor, **Then** o gráfico de evolução temporal SVG e a tabela de série histórica atualizam dinamicamente seus valores, linhas e rótulos para o campus escolhido, sem recarregar a página.
2. **Given** um indicador com múltiplos componentes analíticos (como estudantes voluntários e bolsistas), **When** o usuário altera o ano de referência, **Then** cada componente exibe sua contagem correspondente àquele ano sem sobrescrever ou desorganizar a lista histórica dos demais anos.
3. **Given** um usuário visualizando a série histórica em gráfico SVG, **When** um determinado ano está selecionado no contexto ativo, **Then** o ponto do gráfico referente àquele ano recebe marcação visual de destaque (anel duplo, realce de cor ou marcador distintivo) diferenciando-o dos demais pontos da série.

---

### User Story 2 - Desduplicação de Controles e Coerência Visual (Priority: P2)

O usuário deve desfrutar de uma interface limpa, sem redundâncias operacionais, interagindo com um conjunto unificado de filtros no cabeçalho fixo (ou gaveta móvel), com páginas de pilares estruturadas de forma homogênea e padronizada.

**Why this priority**: Clareza de interface e redução de carga cognitiva. Controles concorrentes na mesma tela criam confusão quanto à precedência do filtro e poluem a leitura dos dados.

**Independent Test**: Acessar as páginas de detalhe em desktop e mobile e verificar a ausência de blocos redundantes de seleção no miolo do conteúdo, garantindo que os filtros do cabeçalho fixo governam todo o estado visível.

**Acceptance Scenarios**:

1. **Given** um usuário navegando em qualquer página de detalhe ou visão de pilar, **When** visualiza a interface, **Then** os seletores de Campus e Ano estão presentes unicamente no cabeçalho fixo e na gaveta móvel, sem duplicatas no corpo da página.
2. **Given** um usuário transitando entre o Pilar 1, Pilar 2 e Pilar 3, **When** compara o layout das páginas, **Then** a apresentação, espaçamentos, trilhas de navegação e cartões de indicadores seguem o mesmo padrão visual consistente.

---

### User Story 3 - Acessibilidade Inclusiva e Navegação Assistiva WCAG AA (Priority: P3)

Usuários que utilizam leitores de tela, navegação exclusivamente por teclado ou que possuem daltonismo devem ser capazes de interpretar tendências de indicadores, saltar diretamente ao conteúdo central e consultar tabelas de dados em qualquer dispositivo sem barreiras.

**Why this priority**: Obrigatoriedade de acessibilidade em serviços públicos e conformidade estrita WCAG AA (Princípio V da Constituição). Variações numéricas não podem ser comunicadas apenas por cores verde/vermelho.

**Independent Test**: Navegar utilizando apenas a tecla Tab a partir da carga da página para acionar o link de salto de conteúdo; verificar a presença de símbolos direcionais (▲, ▼, =) e `aria-label` descritivos nos deltas; verificar a contenção responsiva com rolagem horizontal acessível na tabela de fórmulas em telas móveis estreitas.

**Acceptance Scenarios**:

1. **Given** um usuário daltônico ou usuário de leitor de tela observando a variação anual (delta), **When** o valor aumenta, diminui ou permanece estável, **Then** a interface apresenta um símbolo visual claro (▲, ▼, =) acompanhado de texto descritivo para tecnologias assistivas ("Aumento de X%", "Redução de X%", "Sem alteração"), sem depender apenas da cor.
2. **Given** um usuário navegando por teclado, **When** pressiona Tab imediatamente após a carga da página, **Then** recebe foco em um atalho visual acessível "Pular para o conteúdo principal", permitindo ignorar o cabeçalho e menus.
3. **Given** um usuário acessando uma página de detalhe em dispositivo móvel com viewport reduzido, **When** visualiza a tabela de variáveis da fórmula matemática, **Then** a tabela é exibida com rolagem horizontal contida e cabeçalhos semânticos (`scope="col"` e `scope="row"`), sem quebrar o layout da página.

---

### User Story 4 - Alternância de Tema Claro, Escuro e Automático (Priority: P4)

O cidadão ou pesquisador pode escolher entre modo claro, modo escuro ou seguir automaticamente a preferência do sistema operacional, garantindo ergonomia visual em sessões prolongadas de trabalho e preservando sua escolha para futuras visitas.

**Why this priority**: Conforto visual e uso completo dos tokens de design já existentes no projeto, eliminando configurações comentadas e inacabadas.

**Independent Test**: Acionar o botão alternador de tema no cabeçalho, validar a mudança imediata das cores de fundo, cartões, tipografia e gráficos SVG para alto contraste escuro, recarregar a página e constatar a retenção da preferência.

**Acceptance Scenarios**:

1. **Given** um usuário navegando em ambiente escuro, **When** aciona o botão de alternância de tema no cabeçalho, **Then** a interface adota imediatamente o tema escuro institucional de alto contraste e armazena a preferência no navegador.
2. **Given** um usuário sem preferência manual gravada, **When** acessa o dashboard, **Then** o sistema respeita a configuração de preferência de cor do dispositivo (`prefers-color-scheme`).

---

### User Story 5 - Otimização de Performance e Assets Institucionais (Priority: P5)

Usuários em redes de dados móveis ou conexões com restrição de banda devem ter acesso imediato às páginas, com carregamento otimizado de ativos visuais e execução não bloqueante de ferramentas analíticas.

**Why this priority**: Eficiência de transmissão, Core Web Vitals e respeito ao plano de dados do cidadão em conexões móveis.

**Independent Test**: Analisar a requisição de rede do logotipo institucional e o carregamento dos scripts de terceiros no navegador, confirmando que o logo é transferido em formato vetorial ultraleve e que scripts analíticos não atrasam o tempo de primeira pintura com conteúdo (FCP) ou resposta ao clique (TBT/INP).

**Acceptance Scenarios**:

1. **Given** a renderização de qualquer página, **When** o logotipo do IFES é carregado, **Then** é servido em formato vetorial SVG ou imagem otimizada com resolução adequada à exibição, sem transferência desnecessária de imagens de alta resolução.
2. **Given** a carga inicial do portal, **When** os scripts analíticos e de terceiros são requisitados, **Then** sua execução ocorre de forma postergada e assíncrona, sem bloquear a interatividade dos seletores de campus e ano.

---

### User Story 6 - Localização e Busca Rápida de Indicadores (Priority: P6)

O usuário deve conseguir localizar qualquer indicador da instituição digitando parte de sua sigla, nome ou termo de interesse diretamente na barra de navegação, sem precisar procurar manualmente através de cada um dos três pilares.

**Why this priority**: Eficiência de navegação transversal para gestores e auditores que já conhecem a sigla ou o assunto da métrica procurada.

**Independent Test**: Digitar termos como "bolsas", "patente" ou "QSPP" no campo de busca do cabeçalho, verificar a exibição imediata de sugestões filtradas e selecionar uma opção para abrir diretamente a página de destino com os filtros de contexto preservados.

**Acceptance Scenarios**:

1. **Given** um usuário procurando um indicador específico, **When** digita um termo no campo de busca do cabeçalho, **Then** uma lista suspensa acessível exibe resultados em tempo real contendo sigla, nome e pilar do indicador.
2. **Given** um usuário seleciona um resultado na lista de busca, **When** confirma a seleção via teclado ou clique, **Then** é redirecionado para a página do indicador mantendo o campus e ano previamente selecionados.

---

### Edge Cases

- **Ausência de dados históricos para um campus específico**: Quando um campus recém-inaugurado ou sem apuração não possuir dados para o indicador na série temporal, o gráfico e a tabela devem exibir mensagens amigáveis de indisponibilidade ("Dado indisponível para o campus selecionado no período"), sem quebrar o layout e sem exibir zeros fictícios.
- **Busca sem correspondência**: Quando o usuário digitar termos que não correspondem a nenhum indicador cadastrado, a caixa de busca deve exibir um estado vazio informativo ("Nenhum indicador encontrado para o termo pesquisado"), sem emitir erros ou travar o foco do teclado.
- **Navegação anônima ou armazenamento local desativado**: Quando o navegador do usuário bloquear o acesso ao `localStorage`, a alternância de tema e o filtro de campus/ano devem continuar funcionando normalmente na memória da sessão sem disparar exceções de runtime no console.
- **Gráficos com apenas um ano apurado**: Quando o campus possuir registro de apenas um ano na série histórica, o gráfico SVG deve renderizar um ponto central bem delineado com rótulo legível em vez de tentar traçar linhas inexistentes.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE atualizar dinamicamente no cliente todos os elementos da página de detalhe (banner de destaque, gráfico de evolução temporal SVG, tabela de série histórica e contagens de componentes) em resposta à seleção de Campus ou Ano nos seletores.
- **FR-002**: O sistema DEVE destacar visualmente o ponto da série temporal correspondente ao ano ativo no filtro dentro do gráfico SVG.
- **FR-003**: O sistema DEVE atualizar os valores de contagem de componentes associando estritamente a chave de sigla do componente e o ano correspondente, preservando a integridade histórica de cada linha.
- **FR-004**: O sistema DEVE centralizar os controles de seleção de Campus e Ano exclusivamente no cabeçalho fixo e na gaveta móvel, removendo controles duplicados do corpo das páginas de detalhe.
- **FR-005**: O sistema DEVE expressar a variação anual (delta) por meio de símbolos gráficos visíveis (▲, ▼, =) acompanhados de atributos de acessibilidade (`aria-label`) para tecnologias assistivas, assegurando compreensão sem dependência exclusiva de cor.
- **FR-006**: O sistema DEVE disponibilizar um link de atalho "Pular para o conteúdo principal" no topo da ordem de foco de todas as páginas.
- **FR-007**: O sistema DEVE garantir que tabelas de dados e variáveis matemáticas em dispositivos móveis contenham rolagem horizontal dedicada e marcação semântica de cabeçalhos.
- **FR-008**: O sistema DEVE fornecer um seletor acessível de Tema (Claro, Escuro e Automático) no cabeçalho, persistindo a escolha no navegador e utilizando a paleta oficial de tokens de design.
- **FR-009**: O sistema DEVE servir o logotipo institucional em formato vetorial SVG ou imagem otimizada compatível com alta densidade de pixels e baixo peso de transferência.
- **FR-010**: O sistema DEVE carregar scripts de terceiros e de telemetria analítica de forma assíncrona/diferida, sem bloquear o carregamento e a interatividade dos dados centrais.
- **FR-011**: O sistema DEVE fornecer funcionalidade de busca rápida com autocompletar na barra de navegação, permitindo filtrar e navegar diretamente para indicadores por sigla, nome ou palavra-chave.
- **FR-012**: O sistema DEVE manter conformidade estrita com o princípio da fidelidade aos dados oficiais: indicadores sem valores apurados devem apresentar explicitamente "Dado indisponível", proibindo interpolações, estimativas ou zeros arbitrários.

### Key Entities

- **Indicador**: Métrica oficial de governança CONIF vinculada a um dos 3 pilares temáticos, composta por sigla, nome descritivo, finalidade, fórmula, polaridade, unidade de medida, série histórica de valores e componentes analíticos.
- **Valor da Série**: Registro anual de apuração do indicador contendo ano, valor numérico ou nulo, campus de apuração e eventual justificativa de indisponibilidade oficial.
- **Componente**: Parcela analítica ou subcontagem que compõe a fórmula do indicador (ex: número de bolsistas, discentes voluntários), vinculada aos anos de apuração.
- **Contexto de Visualização**: Estado unificado composto pelo campus selecionado (ou "todos") e ano de referência, sincronizado via parâmetros de URL e propagado reativamente pela interface.
- **Tema da Interface**: Estado de apresentação visual do portal (`claro`, `escuro` ou `auto`), determinando os tokens de cores institucionais em uso.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos componentes da página de detalhe (banner, gráfico SVG, tabela e componentes) sincronizam seus dados com o campus e ano selecionados em menos de 100ms após o evento de escolha, sem recarregamento de página.
- **SC-002**: A pontuação de Acessibilidade no Google Lighthouse para todas as páginas atinge 100 pontos, sem qualquer apontamento de contraste insuficiente (WCAG AA) ou falta de rotulagem assistiva.
- **SC-003**: O peso dos ativos visuais da marca no cabeçalho é reduzido em mais de 75% através do uso de vetor otimizado.
- **SC-004**: O Total Blocking Time (TBT) na carga inicial permanece inferior a 150ms em conexões móveis simuladas de velocidade padrão.
- **SC-005**: Usuários conseguem encontrar e acessar qualquer indicador por meio do campo de busca rápida em até 3 segundos a partir de qualquer ponto do site.
- **SC-006**: Todos os 181+ testes automatizados da suíte web (Vitest) permanecem válidos e em execução contínua com 100% de sucesso, expandidos com novos testes para busca, acessibilidade e reatividade do gráfico.

## Assumptions

- O dataset consolidado continuará sendo disponibilizado como ativo estático agregado em tempo de compilação, em conformidade com as restrições arquiteturais da Constituição do projeto (sem backend em tempo de execução).
- As cores e proporções do tema escuro aderem estritamente aos tokens pré-estabelecidos no arquivo `tokens.css`, preservando a identidade visual do IFES.
- A ferramenta de busca rápida funciona no cliente a partir do catálogo de indicadores pré-carregado no DOM, sem dependência de serviços externos de pesquisa.
- As diretrizes do modelo CONIF e a fidelidade aos relatórios oficiais permanecem soberanas sobre quaisquer convenções estéticas.
