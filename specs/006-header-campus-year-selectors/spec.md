# Feature Specification: Seletores de Campus e Ano no Cabeçalho

**Feature Branch**: `006-header-campus-year-selectors`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Adicionar seletores suspensos (dropdowns) de Campus e Ano no cabeçalho (header) do sistema com extração dinâmica de dados a partir do pacote de indicadores. Requisitos da funcionalidade: 1. Fonte de Dados (indicadores.zip): Inspecionar e extrair os arquivos JSON contidos em indicadores.zip para identificar todos os campi e anos de referência disponíveis. Desduplicar os nomes de campus para evitar qualquer repetição. Desduplicar os anos de referência disponíveis nos projetos. 2. Dropdown de Campus: Posicionar no cabeçalho da aplicação. A primeira opção deve ser obrigatoriamente \"(Todos)\". Os demais campi únicos devem ser listados em ordem alfabética. 3. Dropdown de Ano: Posicionar no cabeçalho da aplicação ao lado do seletor de campus. Listar os anos únicos encontrados no ZIP em ordem cronológica (ou mais recente primeiro). 4. Sincronização e Experiência do Usuário: Sincronizar as opções selecionadas via parâmetros na URL (?campus=...&ano=...) para persistir o filtro na navegação entre páginas (Visão Geral, Pilar 1, Pilar 2 e Pilar 3) e no histórico do navegador. Garantir acessibilidade (rótulos semânticos, foco por teclado e contraste) e responsividade (comportamento adequado tanto no cabeçalho desktop quanto na gaveta móvel/drawer)."

## Clarifications

### Session 2026-09-23

- Q: Qual critério de ordenação deve ser aplicado às opções do seletor de Ano no cabeçalho e qual valor deve ser selecionado como padrão inicial quando o usuário entra no site sem o parâmetro `?ano=` na URL? → A: Ordem decrescente (mais recente primeiro), com o ano mais recente pré-selecionado como padrão inicial.
- Q: Onde os seletores de Campus e Ano devem ser posicionados na experiência móvel para garantir a melhor usabilidade sem poluir o cabeçalho? → A: Dentro do menu gaveta móvel (Drawer), logo acima dos links dos pilares.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Seleção de Campus no Cabeçalho (Priority: P1)

Como visitante ou gestor do painel de indicadores do IFES, desejo selecionar um campus específico ou a opção "(Todos)" diretamente em um seletor no cabeçalho, para que eu possa analisar os indicadores consolidados de toda a instituição ou isolados por unidade de ensino.

**Why this priority**: A contextualização por campus é o filtro primário de navegação nos relatórios CONIF. Sem ele, o usuário não consegue segmentar as análises institucionais nem identificar a realidade de cada campus.

**Independent Test**: Pode ser testado de forma autônoma acessando qualquer página do site, abrindo o dropdown de campus no cabeçalho, verificando que a lista inicia com "(Todos)" e segue em ordem alfabética sem duplicidades, e selecionando um campus para verificar a filtragem dos dados exibidos.

**Acceptance Scenarios**:

1. **Given** que o pacote de dados possui arquivos de múltiplos campi, **When** o usuário visualiza o seletor de campus no cabeçalho, **Then** a primeira opção é obrigatoriamente "(Todos)" e os demais itens são os nomes únicos de campi ordenados alfabeticamente.
2. **Given** que o usuário está visualizando qualquer página com indicadores, **When** seleciona um campus diferente no seletor, **Then** a visualização atualiza os dados para o campus escolhido e a URL reflete o parâmetro `campus`.
3. **Given** que o usuário seleciona a opção "(Todos)", **When** a seleção é confirmada, **Then** o sistema exibe os dados consolidados institucionais e limpa ou atualiza o parâmetro `campus` na URL.

---

### User Story 2 - Seleção de Ano de Referência no Cabeçalho (Priority: P2)

Como usuário do painel, desejo selecionar o ano de referência dos indicadores através de um dropdown no cabeçalho, para comparar o desempenho atual com períodos históricos documentados.

**Why this priority**: Permite análise temporal e acesso a séries históricas sem sair do contexto da página atual, viabilizando o acompanhamento da evolução dos indicadores.

**Independent Test**: Pode ser testado de forma isolada ao alterar o ano selecionado no cabeçalho e verificar se os cartões, resumos e métricas da página refletem os valores correspondentes ao ano selecionado.

**Acceptance Scenarios**:

1. **Given** que existem dados de múltiplos anos no pacote de indicadores, **When** o seletor de ano é exibido no cabeçalho, **Then** todos os anos de referência únicos disponíveis são listados sem repetições em ordem decrescente (mais recente primeiro), com o ano mais recente pré-selecionado por padrão.
2. **Given** um ano de referência selecionado no dropdown, **When** o usuário escolhe um novo ano, **Then** os indicadores da página são atualizados para aquele ano e o parâmetro `ano` é sincronizado na URL.

---

### User Story 3 - Persistência de Contexto na Navegação e Responsividade (Priority: P3)

Como usuário navegando entre as seções (Visão Geral, Pilar 1, Pilar 2, Pilar 3) ou utilizando dispositivos móveis, desejo que os filtros de campus e ano permaneçam ativos durante a navegação e sejam facilmente operáveis em qualquer tamanho de tela e dispositivo de assistência.

**Why this priority**: Garante consistência de navegação ao alternar entre pilares sem perder o contexto de pesquisa, assegurando conformidade com padrões de acessibilidade e usabilidade móvel.

**Independent Test**: Pode ser testado selecionando um campus e um ano específicos na página inicial, clicando em links para outros pilares, e conferindo se a nova página carrega com os mesmos filtros ativos no cabeçalho e na URL. Em telas móveis, pode ser testado abrindo o menu gaveta (_drawer_) e manipulando os seletores.

**Acceptance Scenarios**:

1. **Given** um campus e ano selecionados na página inicial, **When** o usuário clica em um link de navegação para um pilar (ex.: Pilar 1), **Then** a página de destino carrega preservando os filtros ativos tanto nos seletores quanto na URL.
2. **Given** uma tela de dispositivo móvel ou viewport reduzido, **When** o usuário abre a gaveta de navegação móvel (drawer), **Then** os seletores de campus e ano estão posicionados no início do menu (logo acima dos links dos pilares), acessíveis por toque/teclado e plenamente funcionais.
3. **Given** um usuário utilizando leitor de tela ou navegação por teclado, **When** navega pelos seletores, **Then** os controles possuem rótulos acessíveis (`aria-label` ou `<label>`), indicador de foco visível e contraste adequado.

---

### Edge Cases

- **Pacote com apenas um campus ou apenas um ano**: O seletor deve se comportar normalmente, apresentando a opção "(Todos)" e a única opção disponível, sem quebrar o layout.
- **Campus sem dados para determinado ano**: Quando o usuário seleciona uma combinação de campus e ano para a qual não há dados em determinados indicadores, o sistema deve exibir amigavelmente o aviso de "Dado indisponível", sem erros ou valores nulos aparentes.
- **Parâmetro de URL inválido ou inexistente**: Se o usuário acessar uma URL com valores inexistentes de `campus` ou `ano` (ex.: `?campus=inexistente&ano=1900`), o sistema deve retornar graciosamente para valores padrão seguros (como "(Todos)" e o ano mais recente) sem falhar.
- **Nomes de campi extensos**: Seletores devem suportar nomes longos com quebra de linha ou elipse adequada para não estourar a largura do cabeçalho nem sobrepor o menu de navegação.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE inspecionar o pacote de dados oficial (`indicadores.zip`) e extrair todos os nomes de campus presentes nos arquivos de dados sem repetições.
- **FR-002**: O seletor de campus no cabeçalho DEVE apresentar obrigatoriamente a opção "(Todos)" como o primeiro item da lista.
- **FR-003**: O seletor de campus DEVE listar todos os demais campi únicos encontrados em estrita ordem alfabética (considerando a ordenação da língua portuguesa).
- **FR-004**: O sistema DEVE inspecionar o pacote de dados e extrair todos os anos de referência disponíveis nos arquivos, desduplicando-os.
- **FR-005**: O seletor de ano no cabeçalho DEVE listar os anos disponíveis em ordem estritamente decrescente (ano mais recente primeiro), sem duplicidades, adotando o ano mais recente como seleção padrão quando nenhum ano for especificado na URL.
- **FR-006**: Os seletores de Campus e Ano DEVEM estar localizados no cabeçalho fixo da aplicação, permanecendo acessíveis em todas as páginas principais (Visão Geral e Pilares 1, 2 e 3).
- **FR-007**: A alteração de qualquer seletor DEVE sincronizar imediatamente os parâmetros de busca da URL (`?campus=...` e `?ano=...`) e propagar o novo estado para a página ativa.
- **FR-008**: Todos os links de navegação interna entre pilares DEVEM preservar e propagar os parâmetros de contexto de campus e ano selecionados.
- **FR-009**: Os seletores DEVEM ser acessíveis por teclado, conter rótulos claros para tecnologias assistivas e atender aos critérios de contraste visual vigentes.
- **FR-010**: Em visualizações móveis (< 768px), os seletores de Campus e Ano DEVEM ser posicionados dentro do menu gaveta móvel (Slide-Over Drawer), imediatamente antes dos links de navegação dos pilares, preservando a barra de cabeçalho limpa e sem quebras visuais.
- **FR-011**: Caso parâmetros desconhecidos sejam passados na URL, o sistema DEVE adotar valores padrão seguros sem interrupção de serviço.

### Key Entities _(include if feature involves data)_

- **Campus**: Representa uma unidade de ensino do IFES identificada nos relatórios (ex.: Serra, Vitória, Cariacica, etc.), possuindo nome formal e identificador padronizado.
- **Ano de Referência**: Período anual correspondente aos dados dos indicadores reportados (ex.: 2024, 2025, 2026).
- **Contexto de Filtro**: O estado ativo composto pela tupla `(campus, ano)` que define o recorte dos indicadores exibidos na interface.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O usuário consegue alternar o campus ou o ano a partir de qualquer página em no máximo 2 cliques ou toques.
- **SC-002**: 100% dos campi listados no dropdown são únicos (0% de duplicatas) e seguem rigorosamente a ordem alfabética após "(Todos)".
- **SC-003**: 100% das transições de navegação interna entre Visão Geral e os três pilares preservam o estado selecionado de campus e ano.
- **SC-004**: 100% dos controles interativos de filtro cumprem os critérios de acessibilidade WCAG 2.1 AA (rótulos semânticos, foco visível e taxa de contraste mínima).
- **SC-005**: O cabeçalho com os seletores renderiza sem quebra horizontal de layout em telas de 320px até resoluções ultrawide.

## Assumptions

- O pacote `indicadores.zip` é a fonte confiável de dados de onde os campi e anos são extraídos em tempo de compilação/execução.
- A opção "(Todos)" reflete a visão consolidada institucional de indicadores.
- O idioma dos nomes e ordenação é o Português do Brasil (`pt-BR`).
- Os nomes de campi extraídos dos dados não contêm dados pessoais ou sensíveis, respeitando a Constituição do projeto (Princípio IV).
