# Feature Specification: Filtragem Dinâmica de Ano e Campus no Frontend

**Feature Branch**: `013-dynamic-year-campus-filter`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "Fix dynamic year and campus filtering in the frontend UI. Currently, selecting a different year or campus via the header dropdowns (or mobile drawer) updates the URL search parameters (?campus=...&ano=...), but the displayed metrics across the dashboard (Overview KPI cards, Pillar 1, 2, and 3 cards, and indicator detail views) remain permanently stuck showing only the 2026 values. Requirements: 1. Client-Side Reactivity. 2. Data Availability (full dataset from data/dist/indicadores.zip exposed to the browser, offline/local). 3. DOM & Metric Updates (KPI values, units, indicator cards, delta variations, status badges). 4. Seamless Navigation & History (popstate, query params preserved across internal links, no full page reloads). 5. Local and Production Compatibility (dev, preview, GitHub Pages)."

## Clarifications

### Session 2026-09-30

- Q: O que acontece quando a pessoa troca para um campus que não possui o ano atualmente
  selecionado? → A: Ajustar automaticamente para o ano disponível mais próximo (mais
  recente) e refletir o ajuste na URL (Opção A).
- Q: Um breve vislumbre de valores do contexto padrão antes da aplicação do contexto da
  URL é aceitável? → A: Não; o contexto correto deve estar visível na primeira pintura,
  sem nunca exibir valores de outro contexto (Opção A).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Trocar ano/campus atualiza todas as métricas na hora (Priority: P1)

Uma pessoa visita o painel público (visão geral ou página de um pilar). Pelos seletores
do cabeçalho — ou pelo menu lateral no celular — ela escolhe outro ano ou outro campus.
Imediatamente, sem recarregar a página, todos os valores visíveis mudam para refletir a
seleção: os cartões de KPI da visão geral, os cartões dos Pilares 1, 2 e 3, suas unidades,
variações (deltas) e selos de status. Hoje esse é o defeito central: a URL muda, mas os
números permanecem presos nos valores de 2026.

**Why this priority**: É o defeito reportado. Sem isso, o painel apresenta dados errados
para qualquer seleção diferente do padrão — uma violação direta da credibilidade do site
como espelho fiel do relatório oficial.

**Independent Test**: Pode ser testado abrindo a página inicial, escolhendo um ano ou
campus diferente do atual e conferindo se cada valor exibido corresponde ao conjunto de
dados daquele contexto, sem recarga de página.

**Acceptance Scenarios**:

1. **Given** a visão geral exibindo o contexto padrão, **When** a pessoa seleciona um ano
   diferente no seletor do cabeçalho, **Then** todos os cartões de KPI, incluindo valores,
   unidades, variações e selos de status, passam a exibir os dados do ano escolhido e a
   página não é recarregada.
2. **Given** a visão geral exibindo o contexto padrão, **When** a pessoa seleciona um
   campus diferente no seletor (ou no menu lateral em tela estreita), **Then** todos os
   valores exibidos passam a corresponder aos daquele campus, sem recarga.
3. **Given** a página de um pilar (1, 2 ou 3), **When** a pessoa troca o ano ou o campus,
   **Then** todos os cartões de indicadores daquele pilar — valor, unidade, variação em
   relação ao ano anterior e selo de status — atualizam para o novo contexto, sem recarga.
4. **Given** a página de detalhe de um indicador, **When** a pessoa troca o ano ou o
   campus, **Then** o valor principal, os componentes/variáveis, as variações e o selo de
   status atualizam para o novo contexto, sem recarga.
5. **Given** um indicador sem dados para o contexto escolhido, **When** a pessoa seleciona
   esse ano/campus, **Then** o indicador é apresentado como "Dado indisponível" e nunca
   como zero, traço ou outro valor substituto.

---

### User Story 2 - Abrir a página com parâmetros na URL já mostra o contexto certo (Priority: P1)

Uma pessoa recebe (ou salva) um link como `?campus=serra&ano=2024`. Ao abrir o link —
inclusive colando direto na barra de endereço ou recarregando a página — todas as métricas
já aparecem no contexto indicado nos parâmetros, sem precisar interagir com os seletores.
Os seletores do cabeçalho também passam a refletir o contexto da URL.

**Why this priority**: Links compartilháveis são a forma principal de divulgar um recorte
específico (ex.: um campus específico em um ano específico) em comunicações oficiais. Um
link que abre com dados errados invalida o compartilhamento.

**Independent Test**: Pode ser testado abrindo a URL com parâmetros conhecidos e conferindo
que os valores exibidos — e os seletores — correspondem exatamente a esses parâmetros.

**Acceptance Scenarios**:

1. **Given** a URL contém `?campus=X&ano=A` válidos, **When** a página é carregada,
   **Then** todas as métricas visíveis correspondem ao campus X no ano A já na primeira
   pintura (valores de outro contexto nunca aparecem) e os seletores mostram X e A como
   seleção atual.
2. **Given** a URL contém apenas `?ano=A`, **When** a página carrega, **Then** o campus
   permanece no valor padrão e o ano exibido é A.
3. **Given** a URL contém apenas `?campus=X`, **When** a página carrega, **Then** o campus
   exibido é X e o ano permanece o ano mais recente disponível.

---

### User Story 3 - Voltar/avançar do navegador restaura o contexto correto (Priority: P2)

Depois de trocar de ano ou campus algumas vezes, a pessoa usa os botões voltar/avançar do
navegador. Cada passo do histórico devolve a página exatamente ao contexto daquele momento
— valores, variações, selos e seletores — sem recarregar a página.

**Why this priority**: Comportamento esperado de qualquer aplicação web moderna; sua
ausência quebra a confiança na navegação e pode deixar a tela em desacordo com a URL.

**Independent Test**: Pode ser testado trocando o contexto duas ou três vezes, usando
voltar/avançar e conferindo que cada estado do histórico corresponde aos valores exibidos.

**Acceptance Scenarios**:

1. **Given** a pessoa trocou o ano de 2026 para 2025 e depois para 2024, **When** ela clica
   em "voltar" no navegador, **Then** a página volta a exibir os dados de 2025 sem recarga.
2. **Given** a pessoa voltou um passo, **When** ela clica em "avançar", **Then** a página
   volta a exibir os dados de 2024 sem recarga.
3. **Given** qualquer etapa de voltar/avançar, **When** o histórico muda, **Then** a URL da
   barra de endereço e os valores exibidos permanecem consistentes entre si.

---

### User Story 4 - Links internos preservam a seleção (Priority: P2)

Enquanto navega entre a visão geral, as páginas de pilares e os detalhes de indicadores,
a pessoa não perde o contexto: todo link interno leva adiante os parâmetros de campus e
ano atuais, e a página de destino abre já no contexto correto. Trocar de ano ou campus
nunca exige uma recarga completa da página.

**Why this priority**: Perder o contexto a cada clique força a pessoa a refazer a seleção
repetidamente — atrito desnecessário que desestimula o uso dos recortes por campus/ano.

**Independent Test**: Pode ser testado selecionando um contexto, clicando em um link
interno (ex.: um indicador) e conferindo que a página de destino abre com os mesmos
campus e ano.

**Acceptance Scenarios**:

1. **Given** o contexto selecionado é `campus=serra&ano=2025`, **When** a pessoa clica em um
   indicador da visão geral, **Then** a página de detalhe abre com os dados de serra/2025
   e a URL mantém os dois parâmetros.
2. **Given** o contexto selecionado é `campus=todos&ano=2024`, **When** a pessoa navega da
   visão geral para um pilar e de volta, **Then** o contexto se mantém em todas as páginas
   visitadas na sessão.

### Edge Cases

- O que acontece quando o contexto selecionado (campus + ano) não possui dados publicados?
  Indicadores sem dados devem aparecer como "Dado indisponível"; a página não pode falhar
  nem inventar valores.
- O que acontece quando a URL contém um campus ou ano desconhecido (ex.: `?campus=xyz`)?
  A página deve contornar o problema de forma graciosa usando os valores padrão, sem
  exibir dados de outro contexto como se fossem os pedidos.
- O que acontece quando o ano selecionado não permite calcular a variação (delta) por falta
  do ano anterior? A variação deve ser omitida/apresentada como indisponível, nunca zerada.
- O que acontece quando o pacote de dados não está disponível (dataset vazio)? A página
  deve continuar carregando com o comportamento atual de aviso, sem quebrar a interface.
- O que acontece ao abrir o mesmo link compartilhado em outro dispositivo ou offline?
  O comportamento e os valores devem ser idênticos, pois todos os dados necessários estão
  disponíveis junto com a página.
- O que acontece com o menu lateral (mobile drawer) ao trocar a seleção? Deve se comportar
  de forma idêntica aos seletores do cabeçalho.
- O que acontece quando a pessoa troca para um campus que não tem o ano atualmente
  selecionado? O ano é ajustado automaticamente para o disponível mais próximo (mais
  recente), a URL reflete o ajuste e nenhum dado de contexto inválido é exibido.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O site publicado, após carregado no navegador, MUST reagir dinamicamente a
  mudanças de ano e campus selecionados, atualizando a exibição inteiramente no cliente,
  sem depender de geração pré-renderizada por contexto e sem recarregar a página.
- **FR-002**: O site MUST disponibilizar ao navegador o conjunto completo de indicadores
  (todos os anos e campi presentes no pacote de dados oficial), de modo que qualquer
  contexto selecionável tenha seus dados acessíveis localmente, inclusive sem conexão
  com a internet.
- **FR-003**: Ao alterar o ano ou o campus pelos seletores do cabeçalho ou pelo menu
  lateral, o sistema MUST atualizar imediatamente todos os elementos visíveis de métricas:
  valores de KPI da visão geral, cartões dos Pilares 1, 2 e 3, páginas de detalhe de
  indicadores, unidades, variações (deltas) e selos de status.
- **FR-004**: Ao carregar a página com parâmetros de busca `?campus=...&ano=...`, o
  sistema MUST exibir o contexto correspondente já na primeira pintura — valores de
  outro contexto MUST NOT ficar visíveis a qualquer momento — e os seletores MUST
  refletir esse contexto.
- **FR-005**: O sistema MUST atualizar a URL (parâmetros `campus` e `ano`) sempre que o
  contexto mudar, mantendo a URL compartilhável e consistente com o que é exibido.
- **FR-006**: O sistema MUST suportar navegação do histórico do navegador (voltar/avançar),
  restaurando o contexto — URL, seletores e métricas — de cada etapa sem recarregar a página.
- **FR-007**: O sistema MUST propagar os parâmetros `campus` e `ano` atuais para todos os
  links internos da página, preservando o contexto entre navegações internas.
- **FR-008**: Quando não houver dados para um indicador no contexto selecionado, o sistema
  MUST exibi-lo como "Dado indisponível", em conformidade com a fidelidade aos dados do
  relatório (nunca como zero, traço ou valor estimado).
- **FR-009**: O sistema MUST tratar parâmetros inválidos ou desconhecidos na URL de forma
  graciosa, recaindo nos valores padrão sem exibir dados de contexto divergente.
- **FR-010**: O comportamento descrito MUST ser idêntico no ambiente local de desenvolvimento,
  no preview local e na publicação em produção (GitHub Pages), sem necessidade de
  configuração distinta por ambiente.
- **FR-011**: As opções dos seletores (campi e anos) MUST refletir os anos e campi de fato
  disponíveis no conjunto de dados, e a lista de anos disponíveis MUST respeitar as
  particularidades do campus selecionado quando houver.
- **FR-012**: Todo texto voltado ao usuário gerado por este recurso MUST estar em
  português do Brasil (pt-BR).
- **FR-013**: Quando a pessoa trocar para um campus que não possui dados do ano
  atualmente selecionado, o sistema MUST ajustar automaticamente a seleção para o ano
  disponível mais próximo (preferindo o mais recente) e refletir o ajuste na URL,
  mantendo o contexto exibido sempre válido.

### Key Entities _(include if feature involves data)_

- **Conjunto de dados de indicadores**: coleção completa de registros por pilar, campus e
  ano de referência; exposta ao navegador para consulta de qualquer contexto. É a única
  fonte de valores exibidos — nenhum valor pode ser calculado ou inventado na apresentação
  além do que o conjunto contém.
- **Contexto de filtro**: par combinante campus + ano que determina quais valores são
  exibidos; refletido na URL e nos seletores, e restaurável via histórico do navegador.
- **Campus**: unidade institucional com slug, nome de exibição e lista de anos com dados;
  inclui a opção agregada "Todos os Campi".
- **Ano de referência**: ano com dados publicados; determina o valor exibido e o ano-base
  para cálculo de variação (delta).
- **Indicador**: métrica identificada por sigla, com valor por contexto, unidade,
  componentes/variáveis, polaridade e disponibilidade; alimenta cartões de KPI, cartões de
  pilar e páginas de detalhe.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Ao trocar ano ou campus, 100% dos elementos de métricas visíveis na página
  (KPIs, cartões de pilar, detalhes, unidades, deltas e selos) passam a refletir o novo
  contexto em menos de 1 segundo, sem recarga de página.
- **SC-002**: Em uma varredura de todas as combinações válidas de campus × ano, 100% das
  páginas exibem valores idênticos aos do conjunto de dados oficial para o contexto
  correspondente.
- **SC-003**: Ao abrir a URL com parâmetros `?campus=...&ano=...`, o contexto correto é
  exibido já na primeira pintura, sem qualquer vislumbre de valores de outro contexto,
  em 100% dos casos testados, incluindo recarregamento da página.
- **SC-004**: Navegar voltar/avançar após múltiplas trocas de contexto restaura o estado
  correto (URL, seletores e métricas) em 100% das etapas testadas.
- **SC-005**: 100% dos links internos carregam os parâmetros de contexto da sessão,
  verificados em todas as páginas (visão geral, pilares e detalhes).
- **SC-006**: O comportamento é indistinguível entre desenvolvimento local, preview e
  produção: nenhum caso de teste manual apresenta divergência de valores ou de reatividade
  entre os ambientes.
- **SC-007**: Com a rede desconectada após o carregamento inicial, a troca de contexto
  continua funcionando para todos os contextos disponíveis (dados 100% locais).

## Assumptions

- Os valores padrão quando não há parâmetros na URL permanecem os atuais: campus padrão do
  site e ano mais recente disponível no conjunto de dados.
- Parâmetros inválidos na URL são tratados como ausentes (queda para o padrão), sem
  mensagens de erro intrusivas; isso é um comportamento razoável para um site público.
- O conjunto de dados completo já disponível no repositório (pacote gerado pelo pipeline
  de dados) contém todos os campi e anos necessários; o site não precisa buscar dados de
  servidores externos.
- O volume de dados do pacote é compatível com entrega ao navegador de uma só vez
  (ordem de dezenas de KB por arquivo JSON de pilar), sem necessidade de paginação ou
  carregamento sob demanda; a entrega acontece junto com a própria página, de modo que
  o contexto da URL possa ser aplicado na primeira pintura (ver FR-004).
- Navegação entre páginas distintas (visão geral → pilar → detalhe) pode continuar sendo
  navegação normal de documentos; o requisito de "sem recarga" aplica-se à troca de
  contexto (ano/campus) e à navegação do histórico dentro de uma mesma página.
- A fidelidade aos dados do relatório oficial (princípio do projeto) prevalece: nenhum
  valor será interpolado ou estimado para preencher contextos sem dados.
