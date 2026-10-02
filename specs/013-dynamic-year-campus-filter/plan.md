# Implementation Plan: Filtragem Dinâmica de Ano e Campus no Frontend

**Branch**: `013-dynamic-year-campus-filter` | **Date**: 2026-09-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-dynamic-year-campus-filter/spec.md`

## Summary

Tornar a interface do painel dinâmica e reativa no cliente à seleção de campus e ano sem depender de renderização pelo lado do servidor ou recargas completas de página:

1. Extrair o núcleo de mapeamento de indicadores de `src/lib/dataset.ts` para um módulo isomórfico puro (`src/lib/dataset-core.ts`) sem dependências de Node.js (`node:fs`/`node:path`), reaproveitado tanto no build SSG quanto no cliente.
2. Embutir o dataset oficial consolidado (~18 KB descompactado) em cada página estática dentro de `<script id="dados-indicadores" type="application/json">` via `BaseLayout.astro`.
3. Adicionar identificadores semânticos `data-*` nos elementos de interface (Visão Geral, Pilares e Detalhes de Indicador) conforme o contrato DOM.
4. Implementar rotina de hidratação cliente em TypeScript (`src/lib/contexto-cliente.ts` e `src/lib/aplicar-visao.ts`) que lê a URL, resolve o contexto com auto-ajuste (FR-013), atualiza os seletores, atualiza todos os elementos visuais instantaneamente (< 1s) e gerencia histórico (`pushState`/`popstate`).
5. Garantir renderização imediata na primeira pintura (Clarificação 2, Opção A) e suporte offline/local (`npm run dev`/`preview`).

## Technical Context

**Language/Version**: TypeScript 5.8, Astro 5.12 (SSG - Static Site Generation).

**Primary Dependencies**: Astro 5 (SSG), TypeScript, Intl.NumberFormat (`pt-BR`). Nenhuma dependência externa nova de produção ou desenvolvimento.

**Storage**: Arquivos estáticos. O dataset agregado oficial (`data/dist/indicadores.zip`, 18 arquivos JSON, ~18 KB descompactado) é lido durante o build e embutido inline no HTML via `<script type="application/json">`.

**Testing**: Vitest (`tests/web/**`) com abordagem Test-First (Constituição II). Cobertura para resolução de contexto, auto-ajuste de ano por campus, mapeamento do núcleo puro e aplicação de visão no DOM.

**Target Platform**: Navegadores modernos em produção (GitHub Pages na base `/indicadores_ifes`) e ambiente local (`npm run dev` e `npm run preview`). Sem servidor Node.js em tempo de execução.

**Project Type**: Aplicação web estática (Astro SSG).

**Performance Goals**: Atualização de 100% dos elementos visíveis em < 1 segundo (SC-001) após troca de seleção nos seletores; payload de dados inline de ~18 KB por página HTML.

**Constraints**:

- Troca de ano e campus sem recarregar a página (FR-001).
- Contexto correto exibido já na primeira pintura, sem piscar valores errados (Clarificação 2-A).
- Funcionamento 100% autossuficiente e offline em dev e produção (FR-010).
- Dados sempre fiéis ao relatório oficial; "Dado indisponível" quando não houver apuração (Princípio III).
- Interface e mensagens em português do Brasil (pt-BR) (Princípio V).

**Scale/Scope**: 4 tipos de páginas (Visão Geral, 3 páginas de Pilares, páginas de Detalhe por indicador), 3 pares de seletores (cabeçalho topo, gaveta móvel e links de ano no detalhe), 9 indicadores com suas respectivas métricas e componentes.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                       | Status  | Evidência                                                                                                                                                                                                  |
| ------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Simplicidade                 | ✅ Pass | Utiliza apenas recursos nativos do Astro e TypeScript padrão; zero dependências adicionais; sem frameworks ou bibliotecas de estado externas; o estado é derivado da própria URL e do DOM.                 |
| II. Test-First (NÃO-NEGOCIÁVEL) | ✅ Pass | Testes unitários com Vitest em `tests/web/` cobrem o núcleo de mapeamento, resolução de contexto com auto-ajuste (FR-013) e aplicação de visão antes de consolidar o código.                               |
| III. Fidelidade aos Dados       | ✅ Pass | O cliente usa exatamente a mesma função pura de mapeamento do build (`dataset-core.ts`), garantindo zero divergência numérica. Indicadores sem apuração permanecem rigorosamente como "Dado indisponível". |
| IV. Apenas Dados Agregados      | ✅ Pass | O dataset inline contém estritamente os mesmos arquivos agregados públicos do pacote oficial `indicadores.zip`. Nenhum dado pessoal ou PII é manipulado ou exposto.                                        |
| V. Qualidade Básica             | ✅ Pass | Conformidade com ESLint e Prettier (zero erros); todos os rótulos e textos em pt-BR; responsividade validada tanto no desktop quanto na gaveta móvel (drawer).                                             |
| VI. Deploy Automatizado         | ✅ Pass | Mantém o pipeline de CI do GitHub Pages dependente de `npm run test` e `npm run build` passando com sucesso.                                                                                               |
| Restrição de Stack              | ✅ Pass | Astro + TypeScript + Vitest mantidos integralmente. Sem desvio de stack.                                                                                                                                   |
| Somente Estático                | ✅ Pass | Nenhum servidor backend, banco de dados ou runtime Node.js em produção.                                                                                                                                    |

## Project Structure

### Documentation (this feature)

```text
specs/013-dynamic-year-campus-filter/
├── plan.md              # Este arquivo (plano de implementação)
├── research.md          # Pesquisa de arquitetura e decisões D1–D6
├── data-model.md        # Entidades de contexto, dataset e visão
├── quickstart.md        # Guia passo a passo de validação manual
├── contracts/           # Contratos de interfaces
│   ├── dom.md           # Contrato de atributos data-* para atualização dinâmica
│   ├── dados-embarcados.md # Contrato do JSON embutido na página HTML
│   └── url.md           # Contrato dos parâmetros de busca ?campus=...&ano=...
└── tasks.md             # Tarefas de implementação (gerado pelo /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── data/
│   └── indicadores.ts            # Tipos, metadados e definições de pilares (inalterado)
├── layouts/
│   └── BaseLayout.astro          # Injeção do JSON embarcado, inicialização do cliente e remoção de reload
├── components/
│   ├── CartaoPilar.astro         # Inclusão de atributos data-* para métricas dos pilares
│   ├── IndicatorCard.astro       # Inclusão de atributos data-* para valores, deltas e avisos
│   ├── YearLinks.astro           # Integração com o despachador de contexto sem reload
│   ├── SeriesChart.astro         # Re-renderização ou atualização contextual do gráfico
│   ├── HistoricalSeries.astro    # Destaque dinâmico da linha do ano selecionado
│   └── ComponentCount.astro      # Inclusão de atributos data-* para contagem de componentes
├── pages/
│   ├── index.astro               # Atributos data-* nos KPIs da visão geral
│   ├── pilar-1/                  # [sigla].astro e index.astro com atributos data-*
│   ├── pilar-2/                  # [sigla].astro e index.astro com atributos data-*
│   └── pilar-3/                  # [sigla].astro e index.astro com atributos data-*
├── lib/
│   ├── dataset-core.ts           # NOVO: Funções puras de mapeamento e consulta (isomórfico, sem node:fs)
│   ├── dataset.ts                # Leitura de disco/zip (Node.js build); delega mapeamento para dataset-core
│   ├── contexto.ts               # NOVO: Resolução de contexto com auto-ajuste de ano (FR-013)
│   ├── visao.ts                  # NOVO: Computação pura das métricas a exibir para o contexto ativo
│   ├── aplicar-visao.ts          # NOVO: Atualização semântica do DOM a partir da visão computada
│   ├── contexto-cliente.ts       # NOVO: Inicialização no navegador, escuta de eventos, History API e propagação
│   └── urlSync.ts                # Atualização para delegar ao fluxo de contexto-cliente sem reload
tests/
└── web/
    ├── dataset-core.test.ts      # Testes unitários do núcleo isomórfico
    ├── contexto.test.ts          # Testes unitários de resolução e auto-ajuste de ano/campus
    ├── visao.test.ts             # Testes de formatação e cálculo da visão
    └── aplicar-visao.test.ts     # Testes da manipulação e preenchimento de elementos DOM
```

## Complexity Tracking

Nenhuma violação aos princípios da Constituição. Tabela vazia por design: zero bibliotecas novas, nenhuma dependência introduzida e separação estrita entre lógica pura e manipulação de DOM.
