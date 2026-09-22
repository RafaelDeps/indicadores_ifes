# Feature Specification: Rework do Dashboard com os 3 Pilares CONIF, Multi-Campus e Ingestão Zip

**Feature Branch**: `004-pillars-campi-zip-rework`

**Created**: 2026-09-22

**Status**: Draft

**Input**: User description: "Rework dashboard for all 3 CONIF pillars with multi-campus and zip ingestion: 1. Scope & Pillars: P1 (Engajamento Academico e Inclusao): NTPP, QSPP, PIES, PICOT; P2 (Fomento e Conexao com o Ecossistema): PINV, PIPDI; P3 (Produtividade e Propriedade Intelectual): PIPRO, PIPROT, PIPROTR; Home (/) activates all 3 pillars; individual pages: /pilar-1/, /pilar-2/, /pilar-3/ and /pilar-<n>/<sigla>/. 2. Data Ingestion & Contract: Ingest root `indicadores.zip` containing `pilar{N}_{campus}_{year}.json`; Multi-campus: support individual campuses (e.g., 'serra') plus institutional aggregate campus 'todos'; Strict rule: uncollected/missing metrics MUST be `null` ('Dado indisponível'). Value `0` is strictly reserved for verified zero counts. 3. UI & Navigation: URL query sync: reflect campus and year in URL (?campus=serra&ano=2026); Improved charts: add visible data labels on points, readable axes, and contextual tooltips; Removals: delete CSV/JSON download buttons and 'Fonte dos dados' field. 4. Deferred: UserWay plugin is postponed (out of scope for this feature)."

## Clarifications

### Session 2026-09-22

- Q: Como o campus consolidado institucional ("todos") deve obter seus dados? → A: Arquivo dedicado oficial (`pilar{N}_todos_{year}.json`). Se ausente, exibe "Dado indisponível", sem sintetizar somas parciais.
- Q: Como a navegação interna entre páginas deve tratar os parâmetros `campus` e `ano` ativos na URL? → A: Propagação contínua em todos os links internos (Home, pilares, indicadores e breadcrumbs).
- Q: Como indicadores com múltiplos tipos ou componentes (ex.: PIPROT, PIPRO) devem apresentar essas subdivisões na página de detalhe? → A: Métrica principal em destaque com gráfico de série temporal + seção de grade/tabela de componentes detalhando cada tipo/variável individualmente com seus valores ou "Dado indisponível".

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ingestão de Dados Multi-Campus e Contrato Estrito de Fidelidade (Priority: P1)

Gestores, pesquisadores e a comunidade acadêmica precisam acessar dados fidedignos de múltiplos campi e da visão agregada institucional ("todos"). O sistema deve ingerir o arquivo raiz `indicadores.zip` contendo os arquivos estruturados como `pilar{N}_{campus}_{year}.json`. Quando um indicador ou componente não tiver dados coletados, seu valor deve ser estritamente `null` e apresentado como "Dado indisponível", garantindo que o número zero (`0`) seja exibido exclusivamente quando houver contagem nula verificada (ex.: zero patentes ativas registradas), sem jamais mascarar ausência de informação como zero ou traço numérico.

**Why this priority**: A credibilidade dos indicadores institucionais depende da integridade e fidelidade aos relatórios oficiais (Princípio III da Constituição). Diferenciar ausência de dado de contagem zero é indispensável para evitar conclusões estatísticas errôneas.

**Independent Test**: Pode ser testado de forma isolada alimentando o pacote `indicadores.zip` com arquivos JSON de diferentes campi e anos contendo valores preenchidos, nulos e zeros verificados, validando que a ingestão processa os arquivos corretamente e que os estados `null` geram "Dado indisponível" enquanto `0` gera o valor numérico "0".

**Acceptance Scenarios**:

1. **Given** um arquivo `indicadores.zip` na raiz com arquivos `pilar{N}_{campus}_{year}.json`, **When** o processo de ingestão é executado, **Then** todos os indicadores e métricas para cada campus, pilar e ano são carregados com sucesso.
2. **Given** um indicador com métricas não coletadas (`null`), como `PIES` ou `PICOT` sem censo completo, **When** o indicador é visualizado na interface, **Then** o sistema exibe explicitamente "Dado indisponível" com o detalhamento dos componentes faltantes e não apresenta o valor como zero, traço ou estimativa.
3. **Given** um indicador com contagem comprovadamente nula (`0`), como patentes ou desenhos industriais zerados em `PIPROT`, **When** o indicador é visualizado, **Then** o sistema renderiza o valor numérico "0", indicando contagem verificada.
4. **Given** a seleção do campus individual (ex.: "serra") ou do consolidado ("todos"), **When** a página carrega, **Then** os dados exibidos correspondem exatamente ao escopo do campus selecionado.
5. **Given** um indicador composto com discriminação por tipos ou componentes (ex.: `PIPROT` ou `PIPRO`), **When** visualizado em sua página de detalhe, **Then** o sistema exibe o total principal e uma seção discriminando cada tipo de ativo ou componente, respeitando individualmente a regra de valor numérico versus "Dado indisponível".

---

### User Story 2 - Navegação e Visão Geral dos 3 Pilares CONIF (Priority: P1)

O visitante acessa a página inicial (`/`) e encontra os 3 pilares CONIF plenamente ativos e navegáveis: Pilar 1 (Engajamento Acadêmico e Inclusão), Pilar 2 (Fomento e Conexão com o Ecossistema) e Pilar 3 (Produtividade e Propriedade Intelectual), sem cartões marcados como "em breve". A partir de `/`, o usuário pode ingressar em qualquer página de pilar (`/pilar-1/`, `/pilar-2/`, `/pilar-3/`) para visualizar o painel do pilar com seus respectivos indicadores (P1: NTPP, QSPP, PIES, PICOT; P2: PINV, PIPDI; P3: PIPRO, PIPROT, PIPROTR) e, a partir de cada pilar, acessar o detalhamento do indicador em `/pilar-<n>/<sigla>/`.

**Why this priority**: A arquitetura de informação completa dos 3 pilares estabelece a cobertura integral dos indicadores CONIF planejados para a instituição.

**Independent Test**: Pode ser testado acessando a Home (`/`), navegando para cada um dos três pilares e acessando as 9 páginas de detalhe de indicadores, verificando se todos os links, títulos, siglas e rotas respondem corretamente.

**Acceptance Scenarios**:

1. **Given** o visitante acessa a Home (`/`), **When** a página é renderizada, **Then** são exibidos 3 cartões de pilares ativos (Pilar 1, Pilar 2 e Pilar 3) com links diretos para suas páginas dedicadas.
2. **Given** o visitante clica no Pilar 1, **When** a rota `/pilar-1/` carrega, **Then** são listados os 4 indicadores do pilar: NTPP, QSPP, PIES e PICOT.
3. **Given** o visitante clica no Pilar 2, **When** a rota `/pilar-2/` carrega, **Then** são listados os 2 indicadores do pilar: PINV e PIPDI.
4. **Given** o visitante clica no Pilar 3, **When** a rota `/pilar-3/` carrega, **Then** são listados os 3 indicadores do pilar: PIPRO, PIPROT e PIPROTR.
5. **Given** o visitante clica em qualquer indicador a partir de seu pilar, **When** a navegação é concluída, **Then** a página de detalhe é carregada sob o padrão `/pilar-<n>/<sigla>/` (ex.: `/pilar-1/ntpp/`, `/pilar-2/pinv/`, `/pilar-3/pipro/`).
6. **Given** qualquer página interna de pilar ou indicador, **When** a trilha de navegação (breadcrumb) é consultada, **Then** existem links funcionais para retornar ao pilar de origem e à página inicial.

---

### User Story 3 - Sincronização de Campus e Ano na URL (Priority: P2)

O dashboard disponibiliza controles de seleção para o Campus (campi individuais como "Serra" e opção institucional "Todos os Campi") e para o Ano de referência. A seleção atual do usuário é imediatamente refletida na URL via parâmetros de busca (`?campus=serra&ano=2026`). Dessa forma, links diretos podem ser compartilhados com garantia de reprodução do mesmo contexto, e a navegação pelo histórico do navegador (botões avançar/voltar) restaura perfeitamente o estado visual anterior. Todos os links internos propagam os parâmetros selecionados para garantir uma navegação fluida sem perda de contexto.

**Why this priority**: Permite que pesquisadores e gestores compartilhem relatórios e análises específicas diretamente via link preservando o contexto temporal e geográfico exato.

**Independent Test**: Pode ser testado alterando campus e ano nos seletores da interface e verificando se a URL é atualizada; abrindo uma URL com parâmetros predefinidos; utilizando os botões de avançar e voltar do navegador; e clicando em links internos para verificar a propagação dos parâmetros.

**Acceptance Scenarios**:

1. **Given** uma página aberta sem parâmetros de URL, **When** ela é renderizada, **Then** os seletores assumem o campus padrão e o ano mais recente disponível, refletindo esses valores na URL.
2. **Given** o usuário altera o seletor de campus para "Serra", **When** a seleção é confirmada, **Then** a URL é atualizada para incluir `campus=serra` e os dados do campus são exibidos.
3. **Given** o usuário altera o seletor de ano para "2026", **When** a seleção é confirmada, **Then** a URL é atualizada para incluir `ano=2026` e os dados do ano são exibidos.
4. **Given** um link compartilhado com `?campus=serra&ano=2026`, **When** um novo usuário abre este link, **Then** a página exibe diretamente os dados de Serra para o ano de 2026 com os seletores sincronizados.
5. **Given** o usuário navegou entre diferentes seleções de campus/ano, **When** o usuário clica no botão "Voltar" do navegador, **Then** a interface e a URL retornam sincronizadamente à seleção anterior.
6. **Given** parâmetros `?campus=<c>&ano=<y>` ativos na URL, **When** o usuário clica em qualquer link interno (cartões de pilares, cartões de indicadores ou links de breadcrumb), **Then** a rota de destino carrega preservando os parâmetros de consulta na URL.

---

### User Story 4 - Visualização em Gráficos com Rótulos Visíveis e Tooltips Contextuais (Priority: P2)

Nas séries históricas e comparações, os gráficos devem fornecer leitura imediata e clara: cada ponto ou barra com dado disponível deve exibir seu rótulo numérico visível diretamente no gráfico, os eixos devem ter escalas e legendas legíveis, e interações de toque/foco/mouse devem exibir tooltips contextuais com detalhes da métrica e do período. Períodos sem dados coletados (`null`) devem ser sinalizados de forma que não induzam o leitor a interpretar a falta de dado como valor zero.

**Why this priority**: A visualização de dados eficiente e acessível evita erros de interpretação em telas institucionais e dispositivos móveis.

**Independent Test**: Pode ser testado inspecionando os componentes de gráfico em diferentes resoluções, confirmando a presença de rótulos visíveis nos pontos, legendas nos eixos e a abertura de tooltips contextuais nas interações.

**Acceptance Scenarios**:

1. **Given** um gráfico de série histórica com valores numéricos, **When** renderizado em tela, **Then** os pontos de dados possuem rótulos numéricos diretamente legíveis sem depender exclusivamente de passar o cursor do mouse.
2. **Given** qualquer gráfico de indicador, **When** o usuário passa o mouse ou toca em um ponto de dado, **Then** é exibido um tooltip contextual informativo com o ano, campus, descrição e valor da métrica.
3. **Given** um ano ou período com dado indisponível (`null`), **When** o gráfico é renderizado, **Then** o ponto é marcado ou descontinuado sem conectá-lo ao zero ou indicar valor inexistente.
4. **Given** eixos vertical e horizontal do gráfico, **When** inspecionados, **Then** apresentam tipografia e contraste adequados conforme WCAG AA e identificação clara das unidades de medida.

---

### User Story 5 - Limpeza de Interface e Remoção de Elementos Descontinuados (Priority: P3)

Para simplificar a experiência do usuário e focar a interface na análise direta dos indicadores CONIF, os botões de download de arquivos em formato CSV e JSON foram descontinuados e devem ser removidos de todas as páginas de detalhe de indicadores. Da mesma forma, o campo redundante "Fonte dos dados" deve ser removido dos cartões e cabeçalhos, concentrando as informações contextuais nas descrições e fórmulas dos indicadores. A integração com plugins externos de acessibilidade (UserWay) permanece postergada para entregas futuras.

**Why this priority**: Reduz ruído visual e simplifica a manutenção dos componentes estáticos da aplicação.

**Independent Test**: Pode ser testado realizando varredura em todas as páginas e componentes para garantir que nenhum botão de download CSV/JSON nem campo "Fonte dos dados" estejam presentes na interface renderizada.

**Acceptance Scenarios**:

1. **Given** a página de detalhe de qualquer indicador (`/pilar-<n>/<sigla>/`), **When** a página é renderizada, **Then** não são exibidos botões ou links para download em formato CSV ou JSON.
2. **Given** qualquer cartão de indicador ou página de detalhe, **When** inspecionados, **Then** o campo de texto rotulado como "Fonte dos dados" não é exibido.
3. **Given** o projeto geral, **When** o código e os scripts são inspecionados, **Then** o plugin UserWay não se encontra injetado ou referenciado.

---

### Edge Cases

- **Ausência de parâmetros na URL**: Ao acessar rotas sem parâmetros de query, o sistema deve selecionar silenciosamente o campus institucional padrão ("todos" ou o primeiro campus disponível caso "todos" não conste) e o ano mais recente disponível.
- **Parâmetros inválidos ou inexistentes na URL**: Se a URL contiver `?campus=invalido&ano=9999`, o sistema deve degradar graciosamente para o campus e ano padrão válidos sem quebrar a renderização da página.
- **Arquivo de pilar ausente no zip para um campus/ano**: Se o pacote `indicadores.zip` não contiver o arquivo correspondente a determinado pilar/campus/ano, o sistema deve apresentar as páginas desse pilar com o estado "Dado indisponível" sem emitir erro fatal em tempo de execução.
- **Ausência do arquivo de 'todos'**: Se `indicadores.zip` contiver dados de campi individuais (ex.: `serra`), mas não contiver `pilar{N}_todos_{year}.json`, a seleção do campus "todos" exibirá "Dado indisponível" para o respectivo pilar/ano, respeitando o princípio de não gerar somas parciais não homologadas.
- **Composição com métricas parciais**: Em indicadores compostos por múltiplos fatores (como `PIES` ou `PICOT`), caso um componente esteja disponível e outro nulo (ex.: total de estudantes em pesquisa preenchido, mas total de matriculados nulo), o componente disponível deve ser mostrado no detalhamento enquanto a métrica consolidada deve permanecer como `null` ("Dado indisponível").
- **Valores legítimos iguais a zero**: Indicadores com valor zero comprovado (ex.: zero acordos de parceria ou zero patentes) devem exibir `0` e jamais serem convertidos para `null` ou ocultados.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE ingerir os dados do arquivo `indicadores.zip` localizado na raiz do projeto, contendo arquivos JSON nomeados no padrão `pilar{N}_{campus}_{year}.json`.
- **FR-002**: O sistema DEVE suportar os 3 pilares CONIF e seus respectivos 9 indicadores:
  - **Pilar 1 (Engajamento Acadêmico e Inclusão)**: `NTPP`, `QSPP`, `PIES`, `PICOT`.
  - **Pilar 2 (Fomento e Conexão com o Ecossistema)**: `PINV`, `PIPDI`.
  - **Pilar 3 (Produtividade e Propriedade Intelectual)**: `PIPRO`, `PIPROT`, `PIPROTR`.
- **FR-003**: O sistema DEVE manter a estrutura de rotas hierárquica e acessível:
  - `/` (Home com visão geral ativa dos 3 pilares).
  - `/pilar-1/`, `/pilar-2/`, `/pilar-3/` (páginas de visão geral de cada pilar).
  - `/pilar-<n>/<sigla>/` (páginas de detalhe para cada um dos 9 indicadores).
- **FR-004**: O sistema DEVE suportar múltiplos campi, permitindo a seleção de campi individuais (ex.: `serra`) bem como a visão institucional consolidada (`todos`). Os dados de `todos` DEVEM ser carregados a partir de arquivos dedicados `pilar{N}_todos_{year}.json` no zip; se o arquivo não estiver presente para o pilar/ano, o sistema DEVE exibir "Dado indisponível" sem realizar somas ou estimativas sintéticas com base em campi parciais.
- **FR-005**: O sistema DEVE tratar como `null` qualquer métrica ou indicador sem dados coletados, exibindo-o estritamente como "Dado indisponível". O valor numérico `0` é estritamente reservado para contagens zero verificadas.
- **FR-006**: O sistema DEVE sincronizar bidirecionalmente a seleção de campus e ano com os parâmetros de consulta da URL no formato `?campus=<sigla>&ano=<ano>` e DEVE propagar continuamente esses parâmetros nos links de navegação interna (cartões da Home, visões de pilares, cartões de indicadores e breadcrumbs).
- **FR-007**: O sistema DEVE sincronizar o estado da interface ao acionar os comandos de histórico do navegador ("Avançar" e "Voltar").
- **FR-008**: Os gráficos de indicadores DEVEM apresentar rótulos de dados numéricos visíveis diretamente sobre os pontos ou barras, eixos legíveis e tooltips contextuais com informações detalhadas na interação.
- **FR-009**: O sistema NÃO DEVE exibir botões de download nos formatos CSV ou JSON nas páginas de detalhe de indicadores.
- **FR-010**: O sistema NÃO DEVE exibir o campo "Fonte dos dados" nos cartões ou nas páginas dos indicadores.
- **FR-011**: A integração do plugin externo UserWay DEVE permanecer postergada, fora do escopo desta entrega.
- **FR-012**: Todo o texto voltado ao usuário DEVE estar em português brasileiro (pt-BR) e manter conformidade visual de acessibilidade WCAG AA em modos claro e escuro.
- **FR-013**: Em indicadores compostos por múltiplos tipos ou variáveis (como `PIPROT`, `PIPROTR`, `PIPRO`, `PIES`, `PICOT`, `PINV`), a página de detalhe DEVE exibir a métrica principal em destaque com seu respectivo gráfico temporal e DEVE disponibilizar uma seção dedicada de componentes detalhando individualmente cada variável ou subtipo, exibindo seu valor numérico verificado (inclusive 0) ou "Dado indisponível".

### Key Entities

- **Campus**: Representa a unidade acadêmica avaliada ou a agregação geral. Atributos conceituais: identificador/slug (ex.: `serra`, `todos`), nome legível (ex.: `Serra`, `Todos os Campi`), lista de anos disponíveis.
- **Pilar CONIF**: Uma das 3 dimensões de avaliação da pesquisa e inovação. Atributos conceituais: número (1, 2, 3), nome (ex.: `Engajamento Acadêmico e Inclusão`), descrição institucional, lista de indicadores subordinados.
- **Indicador**: Métrica quantitativa ou percentual que avalia uma dimensão do pilar. Atributos conceituais: sigla identificadora (ex.: `NTPP`, `PINV`, `PIPROT`), nome completo, o que mede, fórmula matemática, polaridade institucional, componentes de cálculo.
- **Registro do Indicador**: O resultado ou estado de um indicador para determinado campus e ano de referência. Atributos conceituais: campus associado, ano de referência, valor calculado (`number` ou `null`), estado de disponibilidade ("disponível" ou "indisponível"), valores dos componentes e variáveis individuais.
- **Pacote Zip de Indicadores (`indicadores.zip`)**: Arquivo de arquivo na raiz contendo os registros serializados em JSON no padrão `pilar{N}_{campus}_{year}.json`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos 3 pilares CONIF e dos 9 indicadores definidos possuem rotas dedicadas funcionais e ativas a partir da Home (`/`).
- **SC-002**: 0 ocorrências de valores não coletados (`null`) exibidos como zero, traço numérico ou estimativa em qualquer tela ou componente.
- **SC-003**: 100% dos valores legitimamente nulos (`0`) são renderizados visualmente como o numeral "0" e diferenciados de "Dado indisponível".
- **SC-004**: A alteração dos controles de campus e ano atualiza a tela e a URL (`?campus=...&ano=...`) em menos de 100ms.
- **SC-005**: 100% dos links compartilhados com parâmetros válidos de campus e ano reproduzem exatamente a seleção correspondente no carregamento inicial.
- **SC-006**: 100% dos pontos de dados visíveis em gráficos apresentam rótulos numéricos legíveis e tooltips contextuais nas interações.
- **SC-007**: 0 botões de exportação CSV/JSON e 0 campos de "Fonte dos dados" presentes na interface renderizada.
- **SC-008**: Todas as páginas atendem aos critérios de contraste WCAG AA tanto no tema claro quanto no tema escuro do sistema.

## Assumptions

- O arquivo `indicadores.zip` estará presente na raiz do repositório contendo a estrutura de nomes padronizada `pilar{N}_{campus}_{year}.json`.
- A ingestão e descompactação dos dados ocorrem em tempo de build/geração estática da aplicação, mantendo a arquitetura puramente estática exigida pela Constituição do projeto.
- Quando nenhum campus for especificado na URL, o seletor padrão assumirá "todos" se houver dados institucionais consolidados, ou o primeiro campus disponível caso contrário.
- Quando nenhum ano for especificado na URL, o seletor padrão assumirá o ano mais recente presente no conjunto de dados.
- O plugin de acessibilidade UserWay será implementado em uma iteração futura e não impacta as regras de contraste e HTML semântico existentes.
- O site preserva a identidade visual própria estabelecida na especificação 003, sem herdar elementos visuais do projeto irmão Horizon.
