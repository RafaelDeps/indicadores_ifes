# Research: Reformulação e Correção Abrangente do Frontend

**Feature**: `014-frontend-ux-overhaul`
**Date**: 2026-10-01

## 1. Reatividade e Re-renderização Dinâmica do Gráfico SVG e Tabela

### Decisão

Utilizar manipulação de DOM/SVG baseada nas funções puras já consolidadas em `src/lib/chart.ts` (`calcularEscala`, `mapearPontos`, `construirLinha`) no lado do cliente dentro de `src/lib/aplicar-visao.ts`.

### Racional

- O projeto segue o Princípio I da Constituição (Simplicidade e zero dependências desnecessárias). Não é permitida a introdução de frameworks pesados de gráficos (Chart.js, D3, ECharts) ou bibliotecas de estado (React/Vue/Redux).
- As funções de cálculo matemático de coordenadas cartesianas e escala de `src/lib/chart.ts` já são isomórficas e cobertas por testes automatizados em Vitest.
- Ao atualizar o campus ou ano em `sincronizarTela()`, a função `aplicarVisaoDetalhe()` chamará `aplicarVisaoGrafico()` e `aplicarVisaoHistorico()`, que atualizam o `<svg>` e a `<table>` diretamente no DOM sem recarregar a página.

### Alternativas Consideradas

- _Recarregar a página a cada seleção (`window.location.search`)_: Rejeitado por degradar a experiência do usuário (UX), causar recarregamentos bruscos da tela e anular o ganho de fluidez alcançado na Feature 013.
- _Adotar biblioteca de componentes reativos (Preact/Solid Island)_: Rejeitado por violar o Princípio I da Constituição, que proíbe adicionar camadas de abstração ou dependências extras para problemas solucionáveis com a arquitetura padrão do Astro.

---

## 2. Integridade dos Dados de Componentes (`ComponentCount`)

### Decisão

Vincular os seletores de dados de componentes a uma chave composta unívoca `[data-componente-qtd="SIGLA"][data-componente-ano="ANO"]` e renderizar os valores históricos completos para o campus selecionado.

### Racional

- O bug identificado ocorria porque `doc.querySelector('[data-componente-qtd="SIGLA"]')` localizava apenas o primeiro elemento no DOM (geralmente o ano mais antigo) e sobrescrevia seu texto com a quantidade do ano corrente selecionado.
- Com a chave composta, a atualização dinâmica afeta exclusivamente o ano correto, ou o componente é atualizado iterando sobre cada ano da série do componente para o campus selecionado.

### Alternativas Consideradas

- _Exibir apenas o ano ativo sem histórico_: Rejeitado porque o usuário perde a visibilidade da evolução anual dos bolsistas e voluntários (componentes analíticos da métrica).

---

## 3. Gestão de Tema (Modo Claro / Escuro / Sistema) e Prevenção de FOUC

### Decisão

Implementar um script inline leve de inicialização síncrona no `<head>` do `BaseLayout.astro` que lê o `localStorage.getItem('indicadores_tema')` e a media query `(prefers-color-scheme: dark)`, aplicando imediatamente o atributo `data-theme` no `<html>`. Adicionar um botão alternador de tema acessível com ícones SVG no cabeçalho.

### Racional

- O arquivo `tokens.css` já possui 100% das variáveis e contrastes WCAG AA mapeados para `[data-theme='escuro']`.
- Executar a checagem no `<head>` antes do render do corpo do documento elimina o Flash of Unstyled Content (FOUC).
- Se o `localStorage` estiver indisponível (navegação privada restrita), o código trata graciosamente via `try/catch` mantendo a preferência em memória durante a sessão.

### Alternativas Consideradas

- _Depender apenas do `prefers-color-scheme` via CSS puro sem toggle manual_: Rejeitado porque muitos usuários em ambientes corporativos ou educacionais desejam forçar o modo escuro ou claro independentemente do tema do sistema operacional.

---

## 4. Acessibilidade de Deltas e Navegação por Teclado (WCAG AA)

### Decisão

1. Incluir caracteres/ícones direcionais explícitos: `▲` para variação positiva, `▼` para negativa e `=` para estabilidade, associados a classes semânticas.
2. Inserir atributo `aria-label` descritivo completo no container do delta (ex: `aria-label="Variação anual: aumento de 15,4% em relação a 2024"`).
3. Adicionar um link oculto no topo do `<body>` (`<a href="#conteudo-principal" class="sr-only foco-visivel">Pular para o conteúdo principal</a>`), associando `id="conteudo-principal"` à tag `<main>`.

### Racional

- Atende à diretriz WCAG 1.4.1 (Uso de Cor): cor não deve ser o único meio visual de transmitir informação, indicar uma ação ou distinguir um elemento visual.
- Atende à diretriz WCAG 2.4.1 (Ignorar Blocos): fornece mecanismo para saltar blocos repetidos de navegação.

---

## 5. Arquitetura da Busca Rápida de Indicadores

### Decisão

Implementar um componente de busca na barra de navegação com dados indexados em memória a partir do dataset embutido (`#dados-indicadores`).

### Racional

- O catálogo de indicadores é leve e fixo (~9 indicadores principais nos 3 pilares). Não requer backend, bibliotecas pesadas de busca ou chamadas de rede.
- O campo de pesquisa executará correspondência insensível a maiúsculas/minúsculas e acentuação por sigla (`NTPP`), nome completo (`Número total de projetos...`) e termos associados (`bolsas`, `patentes`, `parcerias`).
- A navegação é orientada a acessibilidade com suporte a teclado (`ArrowDown`, `ArrowUp`, `Enter`, `Escape`) e roles ARIA (`combobox`, `listbox`, `option`).

### Alternativas Consideradas

- _Biblioteca externa como Fuse.js ou Lunr.js_: Rejeitado por ser desnecessário para uma lista de menos de 20 métricas, violando o Princípio I.

---

## 6. Otimização de Imagens e Scripts de Terceiros

### Decisão

1. Logotipo: Criar/converter o logotipo do IFES em vetor SVG institucional limpo (`public/ifes-horizontal.svg`) ou gerar versão WebP com densidade correta, substituindo o PNG de 2835x1134.
2. Scripts analíticos: Adicionar `defer` ou postergar o carregamento dos scripts de telemetria (Clarity, Google Tag) para após o evento `load` ou primeira interação do usuário, garantindo LCP e TBT ótimos.

### Racional

- Reduz o peso da imagem no cabeçalho de 54 KB para menos de 10 KB, garantindo renderização vetorial cristalina em monitores Retina e celulares de alta resolução.
- Evita que scripts externos de telemetria compitam com a execução do JavaScript de reatividade no momento crítico de primeira pintura.
