# Research: Filtragem Dinâmica de Ano e Campus no Frontend

**Feature**: `013-dynamic-year-campus-filter` | **Date**: 2026-09-30
**Entrada**: `spec.md` (com Clarificações da sessão 2026-09-30) + codebase atual (`src/`, `tests/web/`).

Todas as decisões abaixo resolvem os pontos de design da funcionalidade. Nenhum "NEEDS CLARIFICATION" permanece em aberto.

---

## D1 — Entrega do dataset ao navegador (Offline e Local)

**Decision**: Embutir o dataset completo em cada página estática como `<script type="application/json" id="dados-indicadores">` renderizado no `BaseLayout.astro` a partir da serialização do `datasetPadrao` (já extraído do zip no build).

**Rationale**: A Clarificação 2 (Opção A) e o requisito FR-004 exigem contexto correto na primeira pintura sem requisições de rede assíncronas que causem "Flash of Incorrect Content" (FOIC). Um JSON inline viaja junto com o payload HTML, permitindo leitura imediata e síncrona pelo JavaScript do cliente, sem requisições HTTP adicionais, sem risco de falha de rede e funcionando 100% offline em desenvolvimento local (`npm run dev`/`npm run preview`) e no GitHub Pages. O tamanho descompactado de todos os 18 arquivos JSON é de apenas ~15 KB a 18 KB, perfeitamente desprezível para a carga de rede e altamente compressível via gzip/brotli.

**Alternatives considered**:

- _Arquivo estático `indicadores.json` em `public/` + `fetch()`_: Rejeitado porque introduz latência de rede assíncrona, obrigando spinners ou exibindo valores antigos antes da resposta (violando a Clarificação 2-A), além de adicionar complexidade com caminhos relativos ao `base` do GitHub Pages.
- _Gerar páginas estáticas para cada combinação de rotas (ex: `/[campus]/[ano]/`)_: Rejeitado porque multiplica exponencialmente a quantidade de páginas estáticas geradas, impede a sincronização natural via query params (`?campus=...&ano=...`) estipulada em FR-005 e na Spec 006, e quebra o requisito de troca de contexto instantânea sem reload (FR-001).

---

## D2 — Fonte única de mapeamento e isomorfismo (Build e Cliente)

**Decision**: Extrair a lógica pura de mapeamento de dados de `src/lib/dataset.ts` para um novo módulo isomórfico `src/lib/dataset-core.ts` sem qualquer dependência de `node:fs`, `node:path` ou `zip.ts`. O arquivo `dataset.ts` original continuará responsável apenas pela leitura do arquivo `.zip` no Node.js durante o build e repassará os dados brutos para o `dataset-core.ts`.

**Rationale**: O Princípio III da Constituição exige fidelidade absoluta aos dados do relatório. Ter uma única função para transformar os dados brutos dos JSONs nos objetos `Indicador` e suas métricas garante que o navegador e o gerador de páginas estáticas calculem e formate os valores de maneira 100% idêntica, eliminando qualquer risco de divergência de arredondamento, cálculo de componentes ou tratamento de `null`.

**Alternatives considered**:

- _Duplicar as regras de extração em um script exclusivo do cliente_: Rejeitado categoricamente (viola Princípio III e Princípio I por introduzir código redundante e propenso a desvios).
- _Pré-computar todas as visualizações em tempo de build para todos os pares `(campus, ano)` dentro de um grande mapa_: Rejeitado porque aumenta o tamanho do JSON embarcado e diminui a flexibilidade do cliente em computar séries dinamicamente.

---

## D3 — Contrato de Atualização do DOM via atributos semânticos (`data-*`)

**Decision**: Utilizar seletores baseados em atributos `data-*` padronizados nos elementos HTML para mapear cada ponto dinâmico da interface:

- Na Visão Geral (`index.astro`): `data-kpi-valor="SIGLA"`, `data-kpi-unidade="SIGLA"`, etc.
- Nos Cartões de Pilar (`CartaoPilar.astro`): `data-metrica-valor="SIGLA"`, `data-metrica-unidade="SIGLA"`.
- Nos Cartões de Indicador (`IndicatorCard.astro`): `data-card-valor="SIGLA"`, `data-card-delta="SIGLA"`, `data-card-aviso="SIGLA"`.
- Nas Páginas de Detalhe (`[sigla].astro`): `data-detalhe-valor`, `data-detalhe-ano`, `data-detalhe-unidade`, `data-componente-qtd="SIGLA_COMP"`.

**Rationale**: O Astro não possui um framework reativo acoplado por padrão (como React ou Vue) neste projeto. O uso de atributos semânticos `data-*` permite que uma função pura em TypeScript/JavaScript selecione os nós e atualize seu `textContent` e atributos de acessibilidade diretamente de forma ultra-rápida (< 10 ms), respeitando o Princípio I (Simplicidade: sem bibliotecas extras de gerenciamento de estado) e SC-001 (< 1s para atualização completa).

**Alternatives considered**:

- _Introduzir Preact/React ou Svelte como Astro Islands_: Rejeitado. Viola o Princípio I (Simplicidade e restrição de stack sem dependências externas não justificadas). O DOM a atualizar é pequeno e simples, tornando o Vanilla JS / TS compilado pelo Astro muito mais eficiente.

---

## D4 — Primeira Pintura sem FOIC (Flash of Incorrect Content)

**Decision**: Injetar os dados e um script inline no cabeçalho ou imediatamente antes do carregamento dos componentes, ou sincronizar a exibição imediatamente na inicialização antes da pintura perceptível (`DOMContentLoaded` síncrono e ocultação de transição instantânea se necessário).

**Rationale**: Conforme acordado na Clarificação 2 (Opção A), um visitante que clica em um link com `?ano=2024` nunca deve ver os números de 2026 piscarem na tela. Como os dados já estão no documento no momento da entrega do HTML, o script lê a URL imediatamente e ajusta os nós sem atrasos de requisição assíncrona.

**Alternatives considered**:

- _Exibir um skeleton/spinner até o JS carregar_: Rejeitado como desnecessário para um payload local inline de ~18 KB.

---

## D5 — Navegação com History API e Propagação de Parâmetros

**Decision**:

1. Ao mudar o ano ou campus nos seletores (`filtro-campus-topo`, `filtro-ano-topo`, gaveta móvel ou `YearLinks`), utilizar `history.pushState(null, '', novaUrl)` em vez de `window.location.href = ...`.
2. Escutar o evento `window.addEventListener('popstate', ...)` para restaurar o estado visual ao navegar no histórico (Voltar / Avançar).
3. Atualizar a função de propagação em links internos (`<a href="...">`) para que todos os links da página anexem os novos parâmetros `?campus=...&ano=...` dinamicamente.

**Rationale**: Elimina completamente o recarregamento de página para trocas de contexto (atendendo FR-001, FR-005, FR-006, FR-007, SC-001 e SC-004), tornando a experiência de uso instantânea.

**Alternatives considered**:

- _Manter reload completo da página (`window.location.href`)_: Rejeitado expressamente pelo requisito de reatividade sem recarga (FR-001, FR-003).

---

## D6 — Resolução de Conflitos e Auto-ajuste de Ano por Campus (FR-013)

**Decision**: Implementar a função pura `resolverContextoComAjuste(campus, ano, dataset)` que:

1. Valida se o campus existe no dataset; caso contrário, adota o campus padrão (`'todos'`).
2. Obtém a lista de anos disponíveis para aquele campus específico.
3. Se o ano solicitado estiver disponível para o campus, mantém-o.
4. Se o ano solicitado NÃO estiver disponível no campus, ajusta automaticamente para o ano disponível mais próximo (priorizando o mais recente), conforme definido na Clarificação 1 (Opção A).
5. Se o ano tiver sido alterado pelo auto-ajuste, atualiza a URL (`replaceState`) para refletir a nova realidade.

**Rationale**: Garante integridade referencial, evita exibir todos os cartões como "Dado indisponível" e mantém a URL sincronizada e precisa.

**Alternatives considered**:

- _Permitir manter o ano sem dados e renderizar "Dado indisponível"_: Rejeitado na sessão de clarificação (Opção B recusada pelo usuário).
