# Feature Specification: Renderização Tipográfica de Fórmulas Matemáticas

**Feature Branch**: `feat/new_pages`

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Implementar renderização tipográfica elegante e acessível de fórmulas matemáticas nos detalhes de indicadores"

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visualização Tipográfica de Frações e Operadores (Priority: P1) 🎯 MVP

Como gestor, pesquisador ou estudante visualizando a página de detalhe de um indicador,
quero ver a fórmula de cálculo renderizada visualmente como uma expressão matemática real (com numerador acima, barra de fração horizontal e denominador abaixo),
para que a lógica de cálculo seja imediatamente inteligível sem esforço de decodificação de sintaxe de programação.

**Why this priority**: É o cerne visual da funcionalidade: transformar códigos monoespaçados (`(NEP / (NTE - NTECPP)) * 100`) em uma equação visual limpa e elegante no padrão editorial acadêmico.

**Independent Test**: Acessar a página de detalhe de um indicador com fração (ex.: `/pilar-1/pies/` ou `/pilar-2/pinv/`) e verificar a presença de um bloco de equação contendo o membro esquerdo, o sinal de igualdade, a fração com numerador e denominador empilhados verticalmente e o fator multiplicador.

**Acceptance Scenarios**:

1. **Given** que o usuário está na página de um indicador calculado por razão (ex.: PIES), **When** a seção "Fórmula de cálculo" for renderizada, **Then** a fórmula deve apresentar o numerador posicionado acima da barra horizontal de fração e o denominador abaixo dela.
2. **Given** que a fórmula possui multiplicação por constante (ex.: `× 100`), **When** for exibida, **Then** o operador deve ser o símbolo tipográfico `×` (e não o asterisco `*`), com espaçamento equilibrado.
3. **Given** que o indicador é uma contagem ou somatório direto (ex.: NTPP ou QSPP), **When** a fórmula for exibida, **Then** deve ser apresentada em linha com símbolos matemáticos padronizados (ex.: `Σ`).

---

### User Story 2 - Correlação Interativa entre Variáveis da Fórmula e a Tabela (Priority: P2)

Como usuário analisando as variáveis que compõem o indicador,
quero passar o cursor ou focar pelo teclado em uma variável dentro da fórmula e ver a linha correspondente na tabela "Variáveis da fórmula" ser realçada,
para que eu identifique instantaneamente o significado de cada símbolo sem me perder no texto.

**Why this priority**: Conecta diretamente a representação abstrata da equação à sua definição operacional na tabela, enriquecendo a experiência de leitura analítica.

**Independent Test**: Posicionar o mouse ou focar via tecla `Tab` sobre o símbolo `NEP` na fórmula do PIES e verificar se a linha da tabela referente ao símbolo `NEP` recebe destaque visual (classe de destaque e alteração de fundo).

**Acceptance Scenarios**:

1. **Given** que o usuário passa o mouse sobre uma variável na fórmula (ex.: `NEP`), **When** o evento de foco/hover ocorrer, **Then** a variável na fórmula e a linha correspondente na tabela de variáveis devem receber classe de destaque visual simultaneamente.
2. **Given** que o usuário navega exclusivamente por teclado, **When** mover o foco com `Tab` até a variável na fórmula, **Then** a variável deve exibir anel de foco visível e ativar o realce na respectiva linha da tabela.
3. **Given** que o usuário retira o cursor ou move o foco para fora da variável, **When** o evento `blur`/`mouseleave` ocorrer, **Then** o realce temporário deve ser removido.

---

### User Story 3 - Acessibilidade Sonora e Semântica para Leitores de Tela (Priority: P3)

Como usuário com deficiência visual navegando com leitor de tela,
quero que o sintetizador de voz leia a fórmula em português claro e estruturado,
para que eu compreenda a regra de cálculo sem que caracteres de formatação visual causem confusão auditiva.

**Why this priority**: Garante conformidade total com a diretriz WCAG AA e a Constituição do projeto, evitando barreiras de acessibilidade em equações matemáticas.

**Independent Test**: Inspecionar o bloco da fórmula no DOM e verificar a presença de um rótulo textual legível (via `aria-label` ou elemento com classe visualmente oculta `sr-only`) contendo a transcrição falada da fórmula.

**Acceptance Scenarios**:

1. **Given** que um leitor de tela encontra o bloco da fórmula, **When** anunciar o conteúdo, **Then** deve ler a descrição acessível em linguagem natural (ex.: "Fórmula de cálculo: PIES é igual a NEP dividido por NTE menos NTECPP, multiplicado por 100").
2. **Given** que a fórmula é exibida na tela, **When** o modo de alto contraste ou tema escuro estiver ativo, **Then** os traços fracionários e os símbolos matemáticos devem manter contraste mínimo de 4.5:1.

---

### Edge Cases

- **Fórmulas sem fração**: Indicadores como NTPP ou PIPDI que não possuem divisão não devem quebrar o alinhamento visual; devem renderizar com elegância em linha contínua.
- **Telas muito estreitas (mobile < 360px)**: Fórmulas com denominadores longos (ex.: `NTE - NTECPP`) devem manter a barra horizontal expandida conforme a largura do maior termo sem causar overflow horizontal na página.
- **JavaScript desativado no navegador**: A fórmula deve permanecer 100% legível visualmente e acessível mesmo se o script de correlação por hover não for executado (degradação graciosa).

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE substituir a tag `<code>` de linha única na seção "Fórmula de cálculo" de `IndicadorDetalhe.astro` por um componente visual dedicado de equação.
- **FR-002**: Para fórmulas baseadas em divisão/razão, o componente DEVE renderizar uma fração vertical real composta por numerador centralizado, traço fracionário horizontal contínuo e denominador centralizado.
- **FR-003**: O componente DEVE substituir asteriscos `*` pelo símbolo tipográfico de multiplicação `×` com espaçamento padronizado.
- **FR-004**: Cada variável componente da fórmula DEVE ser envolvida em um elemento semântico identificável portando o atributo `data-variavel-simbolo="SIMBOLO"`.
- **FR-005**: A tabela "Variáveis da fórmula" DEVE possuir atributos correspondentes nas linhas (`data-linha-variavel="SIMBOLO"`) para possibilitar a correlação bidirecional de foco/hover.
- **FR-006**: Ao passar o cursor ou focar por teclado em uma variável na fórmula, o sistema DEVE aplicar uma classe CSS de destaque (ex.: `destaque-ativo`) tanto na variável quanto na linha correspondente da tabela.
- **FR-007**: O componente DEVE disponibilizar uma transcrição acessível textual completa em português via atributo `aria-label` ou elemento `.sr-only`.
- **FR-008**: O traço fracionário, símbolos e textos da equação DEVEM utilizar variáveis de cores de `tokens.css` (`--color-ink`, `--color-border`, `--color-primary`), adaptando-se automaticamente aos modos claro e escuro.
- **FR-009**: O componente DEVE suportar todas as fórmulas registradas no catálogo de indicadores dos Pilares 1, 2 e 3 sem necessidade de bibliotecas externas pesadas em tempo de execução.

### Key Entities

- **Equação do Indicador**: Estrutura lógica contendo membro esquerdo (sigla resultante), operador de atribuição (`=`), expressão (fração ou linha) e multiplicador opcional.
- **Termo Fracionário**: Composto por numerador (expressão superior), traço de divisão e denominador (expressão inferior).
- **Variável da Fórmula**: Símbolo atômico referenciado no cálculo (ex.: `NEP`, `NTE`, `TAFPPI`, `OCC`) com vínculo direto à tabela de variáveis.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos indicadores que possuem divisão/percentual no catálogo (ex.: PIES, PICOT, PINV, PIPRO) renderizam visualmente com estrutura de fração vertical.
- **SC-002**: 100% das variáveis contidas na fórmula possuem correlação interativa com suas respectivas linhas na tabela de variáveis.
- **SC-003**: Zero bibliotecas externas ou scripts de terceiros adicionados (peso adicional no bundle de JavaScript < 2 KB).
- **SC-004**: Pontuação máxima de acessibilidade automatizada no bloco da fórmula (sem erros de contraste ou falta de texto acessível).

---

## Assumptions

- O catálogo de indicadores em `src/data/indicadores.ts` já contém o campo textual `formula` e a lista `variaveisFormula` com símbolo, descrição e unidade.
- A decomposição da fórmula em numerador e denominador pode ser estruturada diretamente no componente ou mapeada por uma rotina pura TypeScript sem acoplamento a analisadores sintáticos complexos.

---

## Out of Scope

- Edição de fórmulas pelo usuário final (as fórmulas são estáticas e canônicas do modelo CONIF).
- Calculadora interativa de valores de simulação (o painel exibe valores apurados oficiais).
