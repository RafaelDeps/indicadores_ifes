# Feature Specification: Alternância entre Gráfico de Linha e Barras no Histórico

**Feature Branch**: `feat/new_pages` (ou `021-chart-view-toggle`)

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Adicionar alternância de visualização entre gráfico de linha e gráfico de barras no histórico dos indicadores"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visualização de Série em Gráfico de Barras e Controle de Alternância (Priority: P1) 🎯 MVP

Como gestor público, pesquisador ou cidadão visualizando os indicadores do IFES Campus Serra, desejo alternar entre o gráfico de linha e o gráfico de barras verticais na página de detalhe do indicador para comparar tanto a tendência contínua ao longo do tempo quanto o volume anual absoluto ou percentual discreto de cada período.

**Why this priority**: É o valor central da funcionalidade: transformar o gráfico estritamente linear em uma ferramenta versátil de visualização que atende tanto quem busca entender tendências quanto quem busca comparar grandezas pontuais por ano.

**Independent Test**: Acessar qualquer página de detalhe de indicador (ex.: `/pilar-1/ntpp/` ou `/pilar-2/pipdi/`), acionar o botão "Barras" no topo do gráfico e verificar a renderização imediata de colunas verticais proporcionais, com rótulos de ano e destaque no ano selecionado.

**Acceptance Scenarios**:

1. **Given** um usuário na página de detalhe com visualização padrão em linha, **When** o usuário clica ou aciona a opção "Barras", **Then** a representação do gráfico comuta para colunas verticais proporcionais aos valores de cada ano apurado.
2. **Given** a visualização em barras ativada, **When** o usuário observa a coluna correspondente ao ano ativo selecionado no cabeçalho ou filtro do campus, **Then** essa coluna específica recebe destaque visual cromático institucional em relação às demais colunas.
3. **Given** a visualização em barras ativada, **When** o usuário clica no botão "Linha", **Then** o gráfico retorna à visualização clássica de linha contínua e pontos marcadores.

---

### User Story 2 - Acessibilidade Semântica, Navegação por Teclado e Estados ARIA (Priority: P2)

Como usuário que utiliza leitores de tela ou navegação exclusivamente por teclado, desejo que os controles de alternância sejam claramente anunciados com seus estados de seleção (`aria-pressed="true"` / `role="group"`) e que a ordem de tabulação e a leitura de dados permaneçam totalmente coerentes e acessíveis.

**Why this priority**: Garante conformidade com o Princípio V da Constituição do projeto e as diretrizes WCAG AA, assegurando que pessoas com deficiência ou que utilizam tecnologias assistivas tenham a mesma autonomia de controle.

**Independent Test**: Navegar até o grupo de alternância do gráfico usando apenas a tecla Tab, verificar o anúncio do estado do botão com leitor de tela/inspeção de DOM, e alternar o modo com a tecla Enter ou Barra de Espaço.

**Acceptance Scenarios**:

1. **Given** o foco do teclado no grupo de botões de alternância, **When** o usuário pressiona Enter ou Espaço sobre a opção inativa, **Then** a opção torna-se ativa, seu atributo `aria-pressed` passa para `true`, a opção anterior recebe `aria-pressed="false"`, e a visualização do gráfico é comutada.
2. **Given** um leitor de tela ativo, **When** o usuário atinge o bloco do gráfico, **Then** o componente anuncia claramente o grupo de visualização e a presença da tabela textual de suporte (`HistoricalSeries`) para consulta detalhada dos dados.

---

### User Story 3 - Tratamento de Dados Indisponíveis, Contraste Temático e Persistência de Sessão (Priority: P3)

Como usuário frequente da plataforma, desejo que anos sem apuração de dados sejam sinalizados com clareza sem distorção visual, que as barras mantenham excelente contraste nos temas claro e escuro, e que minha escolha de visualização seja lembrada enquanto navego entre diferentes indicadores na mesma visita.

**Why this priority**: Evita interpretações errôneas de dados inexistentes (respeitando o Princípio III - Fidelidade aos Dados), garante legibilidade impecável em qualquer ambiente luminoso e melhora a ergonomia da navegação continuada.

**Independent Test**: Navegar para um indicador com ano indisponível no modo barra e confirmar que o ano exibe marcação neutra (sem inventar zero); alternar para o tema escuro e validar o contraste; mudar para outro indicador e verificar se a preferência de barra permanece ativa.

**Acceptance Scenarios**:

1. **Given** um ano com dado indisponível (`null`), **When** exibido no gráfico de barras, **Then** o componente renderiza uma representação visual neutra/tracejada com rótulo "Dado indisponível", sem desenhar barra com valor zero.
2. **Given** o tema escuro ativo (`data-theme="escuro"`), **When** o gráfico de barras é renderizado, **Then** as barras, eixos, rótulos e estados destacados utilizam os tokens semânticos oficiais com contraste superior a 4.5:1.
3. **Given** o usuário selecionou o modo "Barras" no indicador A, **When** ele navega para o indicador B na mesma sessão do navegador, **Then** o indicador B já é apresentado inicialmente no modo "Barras".

---

### Edge Cases

- **Série com todos os anos sem dados**: O gráfico deve exibir um aviso informativo elegante de indisponibilidade em vez de um SVG quebrado ou colunas vazias sem sentido.
- **Série com apenas 1 ano apurado**: A barra única deve ser centralizada ou posicionada no seu ano correspondente com largura adequada, sem ocupar 100% da largura de maneira desproporcional.
- **Valores com magnitude muito baixa ou zero real**: Diferenciar claramente zero apurado (barra de altura mínima visível com rótulo "0") de dado indisponível (marcação vazia com rótulo informativo).
- **Telas móveis estreitas (320px - 480px)**: As barras e anos devem manter espaçamento legível, adaptando a largura ou permitindo rolagem horizontal suave sem quebra de layout.
- **Navegador com armazenamento local desabilitado ou em navegação anônima restrita**: O componente deve tratar graciosamente a impossibilidade de salvar a preferência sem emitir erros no console.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O componente de gráfico de série histórica DEVE incluir um controle de alternância compacto com duas opções: "Linha" e "Barras".
- **FR-002**: O controle de alternância DEVE ser agrupado semanticamente (`role="group"`) e indicar o modo ativo via atributo de acessibilidade (`aria-pressed="true"` na opção ativa e `aria-pressed="false"` na inativa).
- **FR-003**: No modo "Barras", o sistema DEVE desenhar barras verticais proporcionais à magnitude dos dados de cada ano apurado, com cantos superiores suavemente arredondados (`rx` no SVG).
- **FR-004**: No modo "Barras", o ano atualmente selecionado no contexto da página DEVE receber destaque cromático com o verde institucional (`--color-primary`), enquanto os demais anos utilizam tonalidade neutra/suave.
- **FR-005**: No modo "Barras", cada coluna DEVE apresentar o rótulo do respectivo ano no eixo horizontal inferior e o valor numérico formatado associado.
- **FR-006**: Anos com valores nulos/indisponíveis NUNCA devem ser desenhados como zero; DEVEM exibir demarcação visual tracejada ou neutra com identificação acessível de dado indisponível.
- **FR-007**: A transição ou comutação entre visualização em linha e em barras DEVE ocorrer no lado do cliente sem recarregamento de página.
- **FR-008**: O sistema DEVE persistir a preferência de visualização selecionada (linha ou barra) no armazenamento de sessão do navegador (`sessionStorage` ou `localStorage`), aplicando-a automaticamente ao acessar outras páginas de indicadores.
- **FR-009**: O gráfico em barras DEVE ser construído em SVG nativo sem bibliotecas externas pesadas, integrado aos tokens semânticos de cor para suportar modo claro e escuro.
- **FR-010**: A tabela de dados textuais existente (`HistoricalSeries`) DEVE ser mantida intacta como complemento acessível e auditável da série.

### Key Entities _(include if feature involves data)_

- **TipoVisualizacaoGrafico**: Modo de exibição da série histórica (`'linha' | 'barras'`).
- **PontoSerie**: Objeto contendo ano (`number`), valor numérico (`number | null`), formatação textual (`string`) e indicador de disponibilidade.
- **ConfiguracaoBarraSVG**: Parâmetros geométricos calculados para cada barra no SVG: coordenadas `x`, `y`, largura `width`, altura `height`, raio de canto `rx` e cor de preenchimento `fill`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A alternância entre os modos "Linha" e "Barras" responde em menos de 100 milissegundos após o clique ou tecla do usuário.
- **SC-002**: 100% dos indicadores apurados no Campus Serra funcionam corretamente tanto no modo linha quanto no modo barras.
- **SC-003**: 0 KB de dependências JavaScript externas adicionadas ao bundle final da aplicação (renderização pura em SVG).
- **SC-004**: 100% dos botões e elementos interativos do gráfico atingem conformidade estrita WCAG AA (contraste superior a 4.5:1 e navegabilidade completa por teclado).
- **SC-005**: Ao alternar o modo em qualquer indicador, navegar para outro indicador mantém a preferência escolhida em 100% das vezes na mesma sessão.

## Assumptions

- O usuário tem JavaScript habilitado para interações dinâmicas no cliente; caso o script não execute, o gráfico em linha continua sendo exibido por padrão como renderização estática SSR/SSG.
- Os dados anuais respeitam os anos apurados oficiais (2020 a 2026) consolidados para o Campus Serra.
- A persistência no navegador usa chave específica com prefixo do projeto (ex.: `ifes_grafico_modo`) para evitar colisões.
