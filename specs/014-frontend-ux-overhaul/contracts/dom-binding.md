# Contrato de Ligação de Interface (DOM Bindings)

**Feature**: `014-frontend-ux-overhaul`
**Date**: 2026-10-01

Este contrato define a interface formal de atributos `data-*`, seletores de acessibilidade ARIA e classes semânticas manipulados pelo motor reativo do cliente (`src/lib/contexto-cliente.ts` e `src/lib/aplicar-visao.ts`).

---

## 1. Contratos da Página de Detalhe do Indicador

### 1.1 Banner de Destaque

- Container raiz: `[data-detalhe-sigla="SIGLA"]`
- Rótulo de ano: `[data-detalhe-ano-rotulo]` (atualizado para: `Resultado apurado ({ANO})`)
- Valor principal: `[data-detalhe-valor]` (número formatado em pt-BR ou "Dado indisponível")
- Unidade de medida: `[data-detalhe-unidade]` (exibida se disponível, ocultada via `display: none` se indisponível)

### 1.2 Gráfico de Série Histórica (`SeriesChart`)

- Elemento SVG raiz: `svg[data-grafico-svg]`
- Caminho da linha: `path[data-grafico-linha]` (atributo `d` recalculado dinamicamente)
- Grupo de pontos: `g[data-grafico-pontos]`
  - Cada ponto: `g.grupo-ponto[data-ponto-ano="ANO"]`
    - Círculo: `circle.ponto` com classe `.ponto-ativo` quando `ANO === anoAtivo`
    - Rótulo visível: `text.rotulo-dado`
    - Rótulo do eixo: `text.rotulo-ano`
    - Tooltip: `g.tooltip-svg`
- Grupo de escala vertical: `g[data-grafico-escala]` (linhas-guia e rótulos de escala recalculados)
- Estado vazio: `p[data-grafico-vazio]` (visível quando não há dados suficientes para desenhar)

### 1.3 Tabela de Série Histórica (`HistoricalSeries`)

- Corpo da tabela: `tbody[data-historico-corpo]`
- Linha de dados: `tr[data-historico-ano="ANO"]` com classe `.linha-ativa` quando `ANO === anoAtivo`
  - Cabeçalho de linha: `th[scope="row"]` (ano)
  - Célula de valor: `td` (valor formatado ou "Dado indisponível" com justificativa)

### 1.4 Detalhamento de Componentes (`ComponentCount`)

- Chave composta de elemento: `[data-componente-qtd="SIGLA"][data-componente-ano="ANO"]`
- Atualização: Cada elemento de contagem anual é atualizado com o valor apurado do respectivo ano para o campus selecionado.

---

## 2. Contratos de Acessibilidade e Variação Anual (Delta)

### 2.1 Componente de Delta

- Elemento container: `[data-card-delta="SIGLA"]`
- Atributos obrigatórios:
  - `role="status"`
  - `aria-label="Variação anual: {DESCRICAO_EXTENSO}"` (ex: "Variação anual: aumento de 15,4% em relação a 2024")
- Filhos de renderização visual:
  - `span.delta-simbolo`: `▲`, `▼`, ou `=`
  - `span.delta-valor`: texto formatado com sinal (ex: `+15,4%`, `-2,1%`, `0,0%`)
  - `span.delta-subtexto`: `em relação a {ANO_ANTERIOR}` (oculto quando sem base)

### 2.2 Link de Salto de Conteúdo (Skip to Main Content)

- Elemento no topo do `<body>`:
  ```html
  <a href="#conteudo-principal" class="link-pular-conteudo"> Pular para o conteúdo principal </a>
  ```
- Elemento alvo: `<main id="conteudo-principal" tabindex="-1">`

---

## 3. Contratos de Gestão de Tema

- Atributo no elemento raiz: `html[data-theme="claro" | "escuro" | "auto"]`
- Botão de alternância: `button[data-btn-tema]`
  - `aria-label="Alternar tema visual (atualmente: {TEMA_ATUAL})"`
  - Ícone dinâmico refletindo o estado atual.

---

## 4. Contratos de Busca Rápida no Cabeçalho

- Campo de entrada: `input[data-busca-input]`
  - `type="search"`
  - `role="combobox"`
  - `aria-expanded="true|false"`
  - `aria-autocomplete="list"`
  - `aria-controls="busca-resultados-lista"`
- Painel de resultados: `ul[data-busca-resultados]` id="busca-resultados-lista"
  - `role="listbox"`
- Item de resultado: `li[data-busca-item]`
  - `role="option"`
  - `data-href="/pilar-{P}/[slug]/"`
  - `aria-selected="true|false"`
