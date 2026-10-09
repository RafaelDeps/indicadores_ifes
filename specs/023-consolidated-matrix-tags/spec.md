# Feature Specification: Matriz Geral Consolidada de Indicadores e Filtros por Tags Temáticas

**Feature Branch**: `feat/new_pages`  
**Created**: 2026-10-09  
**Status**: Draft  
**Input**: User description: "Adicionar matriz geral consolidada de indicadores e filtros por tags temáticas no IFES Campus Serra"

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visão Tabular Consolidada dos Indicadores do Campus Serra (Priority: P1) 🎯 MVP

Como gestor, pesquisador ou membro da comunidade acadêmica do IFES Campus Serra, desejo visualizar todos os 9 indicadores institucionais organizados em uma tabela unificada, para que eu possa ter uma visão panorâmica e sinóptica do desempenho do campus sem precisar navegar de pilar em pilar.

**Why this priority**: É o valor central da funcionalidade. Uma tabela comparativa unificada contendo todos os indicadores com seus valores mais recentes e variações já entrega valor imediato como visão executiva e institucional.

**Independent Test**: Acessar a página da matriz consolidada (`/matriz/`), verificar que todos os 9 indicadores do Campus Serra são listados com colunas de Pilar, Sigla, Nome, Último Valor, Variação Recente, Polaridade e Ação, e verificar a ordenação das linhas ao clicar nos cabeçalhos de coluna.

**Acceptance Scenarios**:

1. **Given** a página da matriz geral aberta, **When** o usuário examina a tabela, **Then** todos os 9 indicadores do Campus Serra (NTPP, QSPP, PIES, PICOT, PINV, PIPDI, PIPRO, PIPROT, PIPROTR) são exibidos com suas respectivas colunas preenchidas conforme dados oficiais.
2. **Given** a listagem dos indicadores na tabela, **When** o usuário clica no cabeçalho de uma coluna ordenável (ex.: "Sigla" ou "Nome"), **Then** as linhas são reorganizadas na ordem selecionada (A-Z ou Z-A) com indicador visual de direção e atributo `aria-sort`.
3. **Given** a linha de qualquer indicador na tabela, **When** o usuário clica no link de ação "Ver ficha" ou no título do indicador, **Then** ele é direcionado diretamente para a página individual detalhada do indicador (ex.: `/pilar-1/ntpp/`).
4. **Given** um indicador sem dados apurados no ano de referência (ex.: PIES), **When** a linha correspondente é renderizada, **Then** o valor exibe rigorosamente "Dado indisponível" e a variação exibe traço neutro "—", sem jamais exibir "0" ou inferências (Princípio III).

---

### User Story 2 - Filtragem Rápida por Tags Temáticas (Priority: P2)

Como usuário interessado em uma temática específica (ex.: apenas indicadores de Inovação, Docência ou Estudantes), desejo clicar em chips de tags temáticas no topo da matriz, para que a tabela filtre instantaneamente apenas as métricas pertencentes àquela área de interesse.

**Why this priority**: Permite segmentar a análise institucional por temas transversais que cruzam diferentes pilares CONIF (por exemplo, temas de Inovação presentes tanto no Pilar 2 quanto no Pilar 3).

**Independent Test**: Clicar no chip de filtro "Inovação" ou "Docência" e confirmar que a tabela oculta imediatamente os indicadores não relacionados e exibe a contagem correta de resultados.

**Acceptance Scenarios**:

1. **Given** a lista de chips de tags temáticas no topo da tabela, **When** o usuário clica no chip "Inovação", **Then** a tabela exibe apenas os indicadores categorizados com a tag "Inovação" e o botão recebe destaque visual e `aria-pressed="true"`.
2. **Given** um filtro de tag selecionado, **When** o usuário clica na tag "Todos" (ou no chip ativo para desmarcá-lo), **Then** a tabela restaura a exibição de todos os 9 indicadores e o chip "Todos" fica ativo.
3. **Given** um usuário navegando por teclado, **When** ele navega até o grupo de chips e aciona uma tag com a tecla Enter ou Espaço, **Then** o filtro é aplicado sem salto de foco e o leitor de tela anuncia o número de indicadores filtrados.

---

### User Story 3 - Busca Textual Instantânea Integrada (Priority: P3)

Como pesquisador ou gestor que busca uma métrica específica por palavra-chave ou sigla, desejo digitar termos em um campo de busca instantâneo na matriz, para que a tabela seja filtrada em tempo real enquanto digito.

**Why this priority**: Garante agilidade máxima na localização de métricas quando o usuário já sabe o que procura (ex.: digitar "patente", "servidores" ou "PINV").

**Independent Test**: Digitar termos parciais como "proj", "serv" ou "PIPRO" no campo de busca da matriz e verificar a filtragem reativa das linhas da tabela.

**Acceptance Scenarios**:

1. **Given** o campo de busca na matriz, **When** o usuário digita "pesquisa", **Then** a tabela filtra em tempo real exibindo apenas os indicadores que contêm o termo em sua sigla, nome ou tags.
2. **Given** um termo de busca digitado com ou sem acentos (ex.: "producao" vs. "produção"), **When** a busca é processada, **Then** a correspondência é insensível a acentuação e caixa alta/baixa (_case_ e _accent-insensitive_).
3. **Given** uma busca que não retorna resultados (ex.: "termo_inexistente"), **When** a busca termina, **Then** uma mensagem amigável de estado vazio é apresentada com orientação para limpar a busca.
4. **Given** um chip de tag ativo e um termo de busca digitado, **When** ambos são aplicados, **Then** a tabela apresenta a interseção de ambos os filtros (indicadores que possuem a tag E correspondem à busca).

---

### User Story 4 - Integração na Navegação Global e Responsividade Móvel (Priority: P4)

Como visitante acessando pelo celular ou desktop, desejo acessar a matriz facilmente pelo menu de navegação e consultar a tabela de forma confortável em qualquer tamanho de tela, tanto no modo claro quanto escuro.

**Why this priority**: Assegura a integridade da arquitetura de informação do site, o respeito às diretrizes de acessibilidade e a consistência visual em qualquer dispositivo.

**Independent Test**: Acessar o site em viewport de 360px a 1440px, alternar entre modo claro e escuro e navegar até a matriz pelo menu principal e pela gaveta móvel.

**Acceptance Scenarios**:

1. **Given** a barra de navegação principal (desktop) e a gaveta móvel (mobile), **When** o usuário observa os links, **Then** encontra o item "Matriz" com indicador de página ativa `aria-current="page"` quando na rota `/matriz/`.
2. **Given** a página inicial (`/`), **When** o usuário visualiza as opções de exploração, **Then** existe um atalho ou banner direcionando para a visão consolidada da matriz.
3. **Given** uma tela estreita (mobile < 768px), **When** a matriz é aberta, **Then** a tabela é contida em um contêiner com rolagem horizontal suave e sem overflow na janela do navegador.
4. **Given** a troca entre temas claro e escuro, **When** o tema é alterado, **Then** todas as células, cabeçalhos, chips de tags e campos de busca adaptam suas cores utilizando estritamente os tokens de `tokens.css`, preservando contraste mínimo WCAG AA (>= 4.5:1).

---

### Edge Cases

- **Anos sem apuração ou dados nulos**: Indicadores sem valor no ano de referência exibem "Dado indisponível" no valor e "—" na variação percentual/absoluta, nunca exibindo "0" ou calculando deltas fictícios (Princípio III).
- **Busca combinada sem resultados**: Caso a combinação de tag + busca textual resulte em zero linhas, um aviso claro com botão "Limpar filtros" deve permitir restauração imediata com um clique.
- **Teclado e foco no cabeçalho ordenável**: Cabeçalhos de coluna ordenáveis devem ser botões semânticos (`<button>` com `aria-sort` e `type="button"`), com contorno de foco visível (`outline` nos tokens institucionais).
- **Persistência leve**: A filtragem na matriz ocorre no cliente sem poluir a URL de forma destrutiva, mantendo sincronia com os seletores globais de ano e campus do cabeçalho.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE disponibilizar a rota `/matriz/` no Astro com título "Matriz Consolidada de Indicadores — IFES Campus Serra".
- **FR-002**: A tabela consolidada DEVE listar todos os 9 indicadores institucionais do Campus Serra com as seguintes colunas:
  - **Pilar**: número e identificação do pilar CONIF;
  - **Sigla**: código oficial (ex.: NTPP, PINV, PIPRO);
  - **Indicador**: nome completo do indicador;
  - **Último Valor**: valor apurado no ano mais recente disponível ou "Dado indisponível";
  - **Variação Recente**: delta em relação ao ano anterior (com símbolo ▲/▼/= e descrição acessível);
  - **Polaridade**: sentido do indicador ("Quanto maior, melhor" ou "Menor é melhor");
  - **Ação**: link acessível para a ficha detalhada individual.
- **FR-003**: A tabela DEVE permitir ordenação interativa de colunas (Pilar, Sigla e Nome), alternando entre ascendente e descendente, com atributo `aria-sort` apropriado.
- **FR-004**: Cada indicador DEVE possuir uma lista de tags temáticas padronizadas vinculadas no catálogo de dados, englobando áreas como:
  - _Pesquisa_, _Docência_, _Servidores_, _Estudantes_, _Extensão_, _Gestão_, _Inovação_, _Propriedade Intelectual_.
- **FR-005**: O sistema DEVE exibir um componente de seleção por tags (chips clicáveis) acima da tabela com suporte a seleção única/múltipla e opção "Todas".
- **FR-006**: Os botões de tag DEVEM conter semântica acessível (`role="group"`, `aria-pressed="true|false"` e indicação da quantidade de indicadores em cada tag).
- **FR-007**: O sistema DEVE fornecer um campo de busca em tempo real com ícone, rótulo acessível e botão para limpar o texto digitado.
- **FR-008**: O algoritmo de filtragem textual DEVE ser insensível a acentuação e caixa alta/baixa (_case-insensitive_ e _accent-insensitive_).
- **FR-009**: A filtragem por tags e a busca textual DEVEM operar de forma combinada (interseção lógica E).
- **FR-010**: Quando nenhum indicador satisfizer os filtros ativos, o sistema DEVE renderizar um estado vazio amigável com botão para resetar os filtros.
- **FR-011**: O layout da tabela DEVE possuir rolagem horizontal responsiva em telas móveis e preservação de legibilidade.
- **FR-012**: A navegação principal (`BaseLayout.astro`) DEVE conter o link para `/matriz/` no menu desktop e na gaveta móvel, com `aria-current="page"` na rota ativa.
- **FR-013**: Toda a estilização DEVE utilizar exclusivamente tokens de design de `tokens.css` (sem cores hexadecimais diretas fora do arquivo de tokens).

---

### Key Entities _(include if feature involves data)_

- **IndicadorMatrizItem**:
  - `sigla`: string (identificador único, ex.: 'NTPP');
  - `slug`: string (slug para URL, ex.: 'ntpp');
  - `pilarNumero`: 1 | 2 | 3;
  - `pilarNome`: string;
  - `nome`: string;
  - `tipoValor`: 'quantidade' | 'percentual';
  - `unidade`: string opcional;
  - `polaridade`: string;
  - `tags`: string[] (ex.: `['Pesquisa', 'Docência']`);
  - `ultimoAno`: number | null;
  - `ultimoValorFormatado`: string;
  - `delta`: VariavelDelta | null;
- **TagDefinicao**:
  - `id`: string;
  - `nome`: string;
  - `total`: number;

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O usuário visualiza a matriz consolidada com todos os 9 indicadores carregada em menos de 1 segundo após acessar a rota `/matriz/`.
- **SC-002**: A filtragem instantânea por tag ou termo de busca atualiza a listagem na tabela em menos de 50 milissegundos sem qualquer recarregamento de página.
- **SC-003**: 100% dos controles interativos (cabeçalhos de ordenação, chips de tags, campo de busca e links de ação) são operáveis por teclado e possuem rótulos acessíveis.
- **SC-004**: Zero dependências externas adicionadas ao projeto (JavaScript puro e SVG nativo no Astro).
- **SC-005**: 100% dos testes automatizados (unitários e de componentes no Vitest) passam sem erros, cobrindo filtros por tags, busca textual e ordenação.

---

## Assumptions

- O catálogo de indicadores do IFES Campus Serra é composto exatamente pelos 9 indicadores oficiais dos Pilares 1, 2 e 3 do modelo CONIF.
- As tags temáticas são derivadas das características metodológicas e componentes de cada indicador, servindo como taxonomia auxiliar de navegação.
- A ordenação padrão inicial da tabela é por Pilar (1, 2, 3) e subsequentemente pela Sigla do indicador.
- A filtragem e busca ocorrem inteiramente client-side sobre os dados pré-renderizados estaticamente no HTML pelo Astro, assegurando desempenho ultra-rápido sem dependência de APIs externas.
