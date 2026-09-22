# Implementation Plan: Rework do Dashboard com os 3 Pilares CONIF, Multi-Campus e Ingestão Zip

**Branch**: `004-pillars-campi-zip-rework` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-pillars-campi-zip-rework/spec.md`

## Summary

Rework do dashboard de indicadores para cobrir integralmente os 3 pilares do modelo CONIF (P1: NTPP, QSPP, PIES, PICOT; P2: PINV, PIPDI; P3: PIPRO, PIPROT, PIPROTR). A ingestão de dados passa a ser realizada a partir de um pacote raiz `indicadores.zip` contendo arquivos `pilar{N}_{campus}_{year}.json`, processado de forma determinística em tempo de build estático sem dependências externas adicionais via parser ZIP nativo (`node:fs` e `node:zlib.inflateRawSync`). O sistema passa a suportar múltiplos campi individuais (ex.: "serra") e o campus consolidado institucional ("todos" via arquivos dedicados oficiais). Aplica-se a regra estrita de fidelidade do Princípio III: métricas não coletadas são estritamente `null` e renderizadas como "Dado indisponível", reservando o numeral `0` exclusivamente para contagens verificadas. A interface ganha sincronização bidirecional na URL (`?campus=<c>&ano=<a>`) com preservação contínua de parâmetros em links internos, gráficos aprimorados em SVG com rótulos de dados numéricos visíveis, eixos legíveis e tooltips contextuais, além da remoção definitiva de botões CSV/JSON e do campo "Fonte dos dados".

## Technical Context

**Language/Version**: TypeScript 5.x no Astro 5.x (saída estática SSG), Node.js >= 20

**Primary Dependencies**: Stack existente — `astro`, `vitest`, `eslint`, `prettier`. **Zero novas dependências** (leitura e descompressão de `indicadores.zip` implementadas via módulo nativo `node:zlib.inflateRawSync` em `src/lib/zip.ts`).

**Storage**: Arquivos estáticos JSON gerados em build time / embutidos no cliente para os 3 pilares; estado em tempo de execução sincronizado puramente via parâmetros de URL (`?campus=...&ano=...`).

**Testing**: Vitest (disciplina TDD red → green → refactor). Suítes novas e atualizadas:

- Ingestão e extração de ZIP (`zip.test.ts`)
- Modelo e validação de indicadores para os 3 pilares (`data-validation.test.ts`)
- Resolução e sincronização de campus e ano (`filtros.test.ts` e `ano.test.ts`)
- Renderização de rótulos visíveis e eixos no gráfico SVG (`chart.test.ts`)
- Verificação de rotas ativas para todos os 3 pilares e 9 indicadores (`routes.test.ts`)
- Auditoria de ausência de botões CSV/JSON e campo "Fonte dos dados" (`removals.test.ts`)

**Target Platform**: GitHub Pages (estático), navegadores modernos desktop e mobile

**Project Type**: Site estático Astro (SSG)

**Performance Goals**: Tempo de sincronização dos seletores e atualização de visualização <100ms; gráficos leves em SVG nativo sem bibliotecas pesadas de terceiros; payload otimizado.

**Constraints**: Fidelidade estrita aos relatórios (Princípio III): nulo = "Dado indisponível", 0 = contagem verificada; dados agregados apenas (Princípio IV: LGPD); contraste WCAG AA em modos claro e escuro; textos exclusivamente em pt-BR.

**Scale/Scope**: 3 pilares ativos na Home (`/`), 3 páginas de visão de pilar (`/pilar-1/`, `/pilar-2/`, `/pilar-3/`), 9 páginas de detalhe de indicador (`/pilar-<n>/<sigla>/`), suporte multi-campus e ingestão do zip raiz.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| #   | Principle                               | Status  | Evidence                                                                                                                                                                                                                        |
| --- | --------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I   | Simplicity                              | ✅ Pass | Zero novas dependências no `package.json`. Descompressão ZIP implementada em TypeScript com `node:zlib` nativo. Gráficos com SVG sem bibliotecas externas. Estrutura pura Astro em `src/pages/`, `src/components/`, `src/lib/`. |
| II  | Test-First (NON-NEGOTIABLE)             | ✅ Pass | Testes em Vitest escritos antes da implementação para ingestão do zip, validação dos dados dos 3 pilares, resolução de campus/ano e renderização dos gráficos.                                                                  |
| III | Fidelity to report data                 | ✅ Pass | Regra estrita: ausência de dados é `null` ("Dado indisponível"); `0` é restrito a contagens verificadas. "todos" requer arquivo oficial dedicado e não sintetiza somas parciais.                                                |
| IV  | Aggregated data only                    | ✅ Pass | O dataset ingerido e as páginas renderizadas contêm unicamente contagens e totais agregados por campus/ano, sem nenhum dado pessoal ou identificável (LGPD).                                                                    |
| V   | Basic quality                           | ✅ Pass | ESLint e Prettier com zero erros; textos de interface exclusivamente em pt-BR; conformidade de contraste WCAG AA mantida nos modos claro e escuro; responsividade mobile verificada.                                            |
| VI  | Automated deployment with quality gates | ✅ Pass | Pipeline de CI automatizado via GitHub Actions executando checagem de tipos, lint, formato, testes Vitest e build antes da publicação no GitHub Pages.                                                                          |

**Post-design re-evaluation (Phase 1)**: ✅ Todos os 6 portões constitucionais foram reavaliados e aprovados com louvor. O design preserva a simplicidade estática, não adiciona dependências e reforça o compromisso inegociável de fidelidade aos dados.

## Project Structure

### Documentation (this feature)

```text
specs/004-pillars-campi-zip-rework/
├── plan.md              # Este arquivo (resultado do /speckit-plan)
├── research.md          # Decisões de pesquisa (Fase 0)
├── data-model.md        # Modelo de dados e entidades (Fase 1)
├── quickstart.md        # Guia de validação ponta a ponta (Fase 1)
├── contracts/           # Contratos de dados e navegação (Fase 1)
│   ├── ingestion-contract.md
│   └── routes-contract.md
├── checklists/
│   └── requirements.md  # Checklist de qualidade da especificação
└── tasks.md             # Tarefas de implementação (gerado pelo /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── zip.ts                 # NEW: parser ZIP nativo (node:zlib + node:fs)
│   ├── dataset.ts             # NEW: orquestrador de ingestão multi-campus / multi-ano
│   ├── ano.ts                 # REWORKED: resolução e validação de campus e ano
│   ├── chart.ts               # REWORKED: cálculo de rótulos de dados visíveis e eixos
│   ├── formatters.ts          # REWORKED: formatação estrita (null -> Dado indisponível, 0 -> 0)
│   ├── exportacao.ts          # DELETED: remoção de exportações CSV/JSON
│   └── selectors.ts           # REWORKED: seleção de indicadores por pilar e campus
├── components/
│   ├── CartaoPilar.astro      # REWORKED: ativação dos 3 pilares (remoção do selo "em breve")
│   ├── IndicatorCard.astro    # REWORKED: remoção do campo "Fonte dos dados", suporte a multi-campus
│   ├── SeriesChart.astro      # REWORKED: SVG com rótulos numéricos visíveis, eixos e tooltips
│   ├── ComponentCount.astro   # REWORKED: suporte a discriminação de subtipos (ex.: PIPROT)
│   ├── ExportLinks.astro      # DELETED: botões CSV/JSON removidos
│   ├── YearLinks.astro        # REWORKED: seletor integrado de Campus e Ano
│   ├── HeaderMarca.astro      # KEPT: identidade visual do IFES
│   ├── UnavailableNotice.astro# KEPT: aviso padrão "Dado indisponível"
│   └── BaseLayout.astro       # REWORKED: propagação de query params em links
├── pages/
│   ├── index.astro            # REWORKED: visão geral com os 3 pilares CONIF ativos
│   ├── pilar-1/
│   │   ├── index.astro        # KEPT/REWORKED: lista de indicadores P1 (NTPP, QSPP, PIES, PICOT)
│   │   └── [sigla].astro      # REWORKED: detalhe de indicadores P1 sem CSV/JSON nem fonte
│   ├── pilar-2/
│   │   ├── index.astro        # NEW: lista de indicadores P2 (PINV, PIPDI)
│   │   └── [sigla].astro      # NEW: detalhe de indicadores P2
│   ├── pilar-3/
│   │   ├── index.astro        # NEW: lista de indicadores P3 (PIPRO, PIPROT, PIPROTR)
│   │   └── [sigla].astro      # NEW: detalhe de indicadores P3 (incluindo grade de tipos de PIPROT)
│   └── pilar-1/[sigla]/       # DELETED: rotas dados.csv.ts e dados.json.ts removidas
tests/
├── zip.test.ts                # NEW: testes do parser ZIP nativo
├── dataset.test.ts            # NEW: testes de ingestão de indicadores.zip
├── data-validation.test.ts    # REWORKED: validação dos 3 pilares e 9 indicadores
├── chart.test.ts              # REWORKED: testes dos rótulos visíveis e eixos do gráfico SVG
├── routes.test.ts             # REWORKED: testes de rotas ativas dos 3 pilares
├── exportacao.test.ts         # DELETED: testes de exportação removidos
└── removals.test.ts           # NEW: auditoria garantindo ausência de CSV/JSON e campo "Fonte dos dados"
```

**Structure Decision**: Estrutura modular e tipada por pilares (`pilar-1/`, `pilar-2/`, `pilar-3/`) mantendo páginas estáticas limpas e previsíveis. Ingestão e normalização encapsuladas em `src/lib/zip.ts` e `src/lib/dataset.ts`. Gráfico SVG aprimorado em `SeriesChart.astro` e `chart.ts` sem bibliotecas externas.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| (none)    |            |                                      |
