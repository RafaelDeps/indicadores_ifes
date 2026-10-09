# Research & Architecture Decisions: Alternância de Gráfico (Linha vs. Barra)

## 1. Abordagem de Renderização do Gráfico de Barras SVG

### Decisão

Implementar a função `mapearBarras(valores: ValorParaGrafico[], largura: number, altura: number, margem?: number): BarraGrafico[]` diretamente em `src/lib/chart.ts`.
A função calcula a distribuição horizontal equitativa dos anos apurados, calculando a largura de cada coluna (`larguraBarra`), o espaçamento entre elas (`gap`) e as coordenadas verticais baseadas no valor máximo e mínimo da escala.

### Racional

- **Zero Overhead de Bundle**: Mantém a aplicação 100% estática sem bibliotecas de terceiros (sem Chart.js, D3 ou Recharts), em conformidade estrita com o Princípio I (Simplicidade) da Constituição.
- **Isomorfismo de Dados**: Reutiliza a mesma estrutura de dados `ValorAnual` e a função `calcularEscala` já testadas e consolidadas no projeto.
- **Renderização Vetorial**: Barras desenhadas com tags SVG `<rect>` com cantos superiores arredondados (`rx="4"`) e texto de valor posicionado no topo (`<text>`).

### Alternativas Consideradas

- **Chart.js / ApexCharts**: Rejeitado por adicionar centenas de KB ao bundle, exigir hidratação JavaScript pesada e introduzir complexidade de ciclo de vida desnecessária para uma série de 5 a 7 anos.
- **HTML/CSS puro com Divs**: Rejeitado porque o gráfico atual já utiliza SVG responsivo (`viewBox="0 0 560 240"`), e manter ambas as visualizações no mesmo sistema de coordenadas SVG simplifica a sobreposição, dimensionamento e futura exportação para imagem.

---

## 2. Padrão de Alternância de Visualização e Acessibilidade (a11y)

### Decisão

Renderizar ambas as camadas vetoriais (`<g data-camada-linha>` e `<g data-camada-barras>`) no template estático do Astro. Por padrão, a camada de linha fica visível e a camada de barras inicia com classe `.oculto` (ou `display: none`).
Um grupo de botões compactos no topo do gráfico (`role="group"` com `aria-label="Tipo de visualização do gráfico"`) permite ao usuário alternar instantaneamente entre os modos.

Atributos de acessibilidade:

- Os botões recebem `aria-pressed="true"` (ativo) e `aria-pressed="false"` (inativo).
- A navegação por teclado (Tab, Enter, Espaço) é totalmente suportada.
- A tabela de dados textuais existente (`HistoricalSeries`) permanece no DOM como elemento irmão complementar, assegurando que leitores de tela tenham acesso integral aos dados tabulares independentemente do modo visual.

### Racional

- Comutação instantânea (< 10ms) no cliente sem necessidade de requisições ou recálculos em tempo de execução.
- Aderência estrita às diretrizes WCAG AA e Princípio V da Constituição.

### Alternativas Consideradas

- **Substituição de nós DOM via `innerHTML`**: Rejeitada por ser mais propensa a erros, exigir escape de strings e re-execução de scripts no cliente.
- **Componente React ou Svelte com estado interno**: Rejeitada por contrariar o Princípio I (não adicionar frameworks de componentes de cliente além do Astro nativo).

---

## 3. Fidelidade aos Dados e Tratamento de Anos Indisponíveis (Princípio III)

### Decisão

Nos anos em que `valor === null` (ano sem apuração ou em andamento sem consolidação final):

- Nenhuma barra sólida de valor zero será renderizada (Princípio III - Fidelidade aos dados).
- O ano será representado no gráfico de barras por uma demarcação neutra com borda tracejada (`stroke-dasharray="3,3"`), cor atenuada e altura mínima simbólica.
- O rótulo sobre a coluna exibirá "Indisp." e o elemento `<title>` conterá a descrição completa: `"[Ano]: Dado indisponível"`.

### Racional

Garante clareza cognitiva imediata: o leitor sabe que o ano foi avaliado, mas a informação não está apurada, sem distorcer médias nem fazer parecer que a produção científica foi nula.

---

## 4. Persistência de Preferência do Usuário

### Decisão

Utilizar `sessionStorage` com a chave `ifes_grafico_modo` (`'linha' | 'barras'`).

- Ao clicar em "Barras", o script salva `'barras'`.
- Ao navegar para outro indicador (ex.: de `/pilar-1/ntpp/` para `/pilar-1/pies/`), o script inicial lê `sessionStorage` e aplica o modo ativo antes da interação do usuário.
- Caso `sessionStorage` esteja bloqueado (navegação anônima ultra-restrita), a operação falha silenciosamente mantendo o modo "Linha" como padrão.
