# Research & Architectural Decisions: Seletores de Campus e Ano no Cabeçalho

**Feature**: `006-header-campus-year-selectors`  
**Date**: 2026-09-23  
**Status**: Concluído

Este documento detalha as decisões técnicas, justificativas arquiteturais e alternativas avaliadas para implementação dos dropdowns de Campus e Ano no cabeçalho.

---

## 1. Extração Dinâmica e Ordenação dos Campi a partir de `indicadores.zip`

### Contexto

O arquivo `indicadores.zip` armazena os arquivos no formato `pilar{N}_{campus}_{ano}.json`. Cada arquivo possui as propriedades `"campus"` e `"ano_referencia"`.

### Decisão

Utilizar e estender as funções existentes em `src/lib/dataset.ts` (`carregarDataset()`), garantindo que:

1. Todos os campi únicos sejam extraídos dinamicamente sem repetições.
2. A lista de opções para o seletor seja gerada com a tupla `{ slug: string, nome: string }`.
3. A primeira opção seja obrigatoriamente `{ slug: 'todos', nome: '(Todos)' }`.
4. Os demais campi sejam ordenados estritamente em ordem alfabética utilizando `nome.localeCompare(outro.nome, 'pt-BR', { sensitivity: 'base' })` para tratar adequadamente acentos gráficos (ex.: _Alegre, Aracruz, Colatina, Linhares, Serra, Vitória_).

### Rationale

- Elimina duplicatas de forma consistente por meio de chave normalizada (_slug_).
- Segue rigorosamente os requisitos da especificação (`spec.md`) e a Convenção CONIF de visão institucional unificada `(Todos)`.
- Evita discrepâncias de ordenação causadas por caracteres especiais em português.

### Alternativas Avaliadas

- _Lista estática de campi no código_: Rejeitada pois novos arquivos JSON podem ser adicionados ao ZIP com novos campi sem alteração de código.
- _Ordenação padrão do JavaScript (`Array.sort()` sem locale)_: Rejeitada pois posiciona letras acentuadas (como "Vitória") incorretamente após o "Z".

---

## 2. Extração Dinâmica e Ordenação Decrescente dos Anos

### Contexto

Na clarificação (Sessão 2026-09-23, Q1), definiu-se que o dropdown de anos deve listar os períodos em ordem estritamente decrescente (mais recente primeiro) e selecionar o ano mais recente por padrão.

### Decisão

1. Coletar os anos únicos presentes nos arquivos do ZIP através de um `Set<number>`.
2. Ordenar o vetor resultante numericamente em ordem decrescente: `anos.sort((a, b) => b - a)`.
3. O primeiro item (`anos[0]`) é adotado como valor padrão inicial na ausência de query parameter `?ano=`.

### Rationale

- Em painéis públicos e relatórios gerenciais, o ano mais recente é a métrica prioritária de consulta.
- A ordenação decrescente facilita o acesso aos exercícios mais novos e relevantes.

### Alternativas Avaliadas

- _Ordem crescente_: Rejeitada na etapa de clarificação da especificação.
- _Opção "(Todos os Anos)"_: Rejeitada pois a maior parte dos indicadores por pilar e resumos opera sobre o corte anual específico, mantendo séries temporais restritas às páginas de detalhes.

---

## 3. Disposição Responsiva no Cabeçalho (Desktop vs Mobile Drawer)

### Contexto

Em telas desktop há espaço horizontal suficiente ao lado do menu de navegação. Em telas móveis (< 768px), o cabeçalho fixo tem largura limitada (ocupada pelo logotipo, badge e botão hambúrguer). Na clarificação (Sessão 2026-09-23, Q2), definiu-se que em mobile os seletores devem residir dentro da gaveta móvel (_Drawer_).

### Decisão

1. **Desktop (`min-width: 768px`)**:
   - Um container `.cabecalho-filtros` posicionado dentro de `.topo-container` entre a navegação de pilares e o final da barra.
   - Apresenta os dois `<select>` inline com visual institucional limpo, bordas sutis e foco destacado.
2. **Mobile (`max-width: 767px`)**:
   - O container de desktop fica oculto (`display: none`).
   - Um container `.drawer-filtros` é renderizado dentro do `#mobile-drawer .drawer-conteudo`, posicionado logo acima do `.drawer-nav` (links dos pilares).
   - Apresenta os seletores empilhados verticalmente com `<label>` claro e área de clique/toque adequada (altura mínima 44px para conformidade com WCAG Touch Target).

### Rationale

- Mantém o cabeçalho superior despoluído em telas de 320px a 767px.
- Proporciona usabilidade tátil confortável em dispositivos móveis, sem risco de toques acidentais no logotipo ou no botão de menu.
- Cumpre o Princípio V da Constituição (excelência em dispositivos móveis).

### Alternativas Avaliadas

- _Exibir seletores compactos no topo do celular_: Rejeitada por provocar quebra de linha indesejada ou sobreposição com a marca do IFES em celulares estreitos (iPhone SE, Galaxy A, etc.).

---

## 4. Sincronização de URL, Histórico e Navegação

### Contexto

Ao alterar o campus ou o ano, o usuário espera que o estado seja preservado ao navegar entre as rotas (`/`, `/pilar-1/`, `/pilar-2/`, `/pilar-3/`, etc.) e ao usar os botões "Voltar" e "Avançar" do navegador.

### Decisão

1. No evento `change` dos elementos `<select>`:
   - Capturar o novo valor selecionado.
   - Atualizar a URL atual com os parâmetros `?campus=...&ano=...`.
   - Se estiver em uma página estática onde os dados dependem dos parâmetros, navegar ou atualizar a rota mantendo os parâmetros.
   - Chamar a rotina de propagação (`propagarContexto()` / `propagarParametrosNosLinksInternos()`) para reescrever todos os links `<a>` da página, garantindo que qualquer clique futuro carregue os mesmos parâmetros.
2. Na carga da página:
   - Ler `window.location.search` (`URLSearchParams`).
   - Sincronizar o valor dos `<select>` (tanto de desktop quanto do mobile drawer) para refletir os parâmetros presentes na URL.
   - Se o parâmetro não estiver presente ou for inválido, adotar o padrão (`'todos'` para campus e o ano mais recente para ano).

### Rationale

- Garante compartilhamento de links com contexto fixado.
- Suporta histórico do navegador (`popstate`).
- Reutiliza a lógica já aprovada em `src/lib/urlSync.ts` e `BaseLayout.astro`.

---

## 5. Acessibilidade (WCAG 2.1 AA) e Semântica

### Decisão

- Utilizar elementos nativos `<select>` e `<option>`.
- Associar explicitamente `<label>` via atributo `for` ou utilizar `<label class="sr-only">` para leitores de tela caso o visual seja compacto com placeholder explicativo.
- Adicionar atributos `aria-label` descritivos:
  - `"Selecionar campus do IFES"`
  - `"Selecionar ano de referência dos indicadores"`
- Assegurar contraste visual com cores institucionais do IFES (`--color-ink` sobre `--color-surface`, foco com `--color-primary`).
