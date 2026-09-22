# Implementation Plan: Visual Redesign of Frontend Inspired by Figma Mock

**Branch**: `005-figma-visual-redesign` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-figma-visual-redesign/spec.md`

## Summary

Reformulação visual completa da interface do painel de indicadores do IFES baseada no mockup do Figma, integrando:

1. Identidade visual oficial com o logotipo em grade de 9 blocos do IFES (1 círculo vermelho `#e6323e` e 8 quadrados verdes `#178447`), paleta institucional em tons de esmeralda e ardósia (`#178447`, `#0c3929`, `emerald-50`, `#f7f9f8`) e conformidade com WCAG AA.
2. Cabeçalho fixo no topo com abas de navegação direta entre os 3 pilares CONIF, seletores dinâmicos de Campus e Ano-base sincronizados na URL, e gaveta móvel (_slide-over drawer_) responsiva.
3. Cartões de indicador aprimorados com ícone temático, valor numérico em destaque, badge para "Dado indisponível", cálculo de variação (_delta_) e link de detalhes.
4. Páginas de detalhe redesenhadas com banner superior de resultado destacado e leiaute em 2 colunas funcionais (coluna principal com texto conceitual, fórmula mono e tabela de variáveis em 3 colunas; coluna lateral com gráfico temporal, contagem de componentes analíticos e nota metodológica em cartão verde-escuro).
5. Manutenção de fidelidade estrita de dados (nunca exibir 0 para faltantes), sem botões descontinuados de exportação e zero regressões nos 117 testes automatizados existentes.

## Technical Context

**Language/Version**: Node.js `>= 20.0.0`, TypeScript `5.8+`  
**Primary Dependencies**: Astro `5.12+` (geração estática nativa SSG, zero runtime React/Vue)  
**Storage**: Arquivos estáticos gerados em tempo de compilação a partir de `indicadores.zip`  
**Testing**: Vitest `3.2+`  
**Target Platform**: Navegadores modernos (Desktop, Tablet e Mobile), hospedado estaticamente no GitHub Pages  
**Project Type**: Aplicação Web Estática (Astro SSG)  
**Performance Goals**: Tempo de renderização inicial < 1s, CSS leve sem frameworks externos pesados, zero bundle JavaScript de terceiros  
**Constraints**: Conformidade estrita WCAG AA (contraste $\ge 4.5:1$), fidelidade de dados estrita (nulo = "Dado indisponível", zero apenas quando apurado), zero regressões nos 117 testes prévios  
**Scale/Scope**: 13 rotas estáticas (Home `/`, 3 páginas de pilares `/pilar-{n}/`, 9 páginas de detalhe de indicadores `/pilar-{n}/{sigla}/`)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio Constitucional         | Exigência                                                                            |                                Avaliação de Conformidade                                |
| :------------------------------- | :----------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------: |
| **I. Simplicity**                | Estrutura padrão Astro, dependências mínimas, sem React ou bibliotecas de estado.    |         **PASS** — Implementação nativa Astro + CSS tokens + vanilla TS inline.         |
| **II. Test-First Development**   | Testes no Vitest antes da implementação de cálculos, deltas e seletores.             |   **PASS** — Testes unitários para tokens, logotipo, deltas e layout antes do código.   |
| **III. Fidelity to Report Data** | Nulo = "Dado indisponível"; 0 reservado exclusivamente para contagens comprovadas.   |        **PASS** — Mantido rigorosamente em todos os componentes novos e cartões.        |
| **IV. Aggregated Data Only**     | Apenas dados públicos agregados (sem dados pessoais LGPD).                           |                **PASS** — Apenas métricas quantitativas institucionais.                 |
| **V. Basic Quality**             | ESLint + Prettier com zero erros; textos em pt-BR; responsividade mobile verificada. |         **PASS** — Testes em viewport móvel e auditoria de contraste e linter.          |
| **VI. Automated Deployment**     | Build SSG automatizado com publicação via GitHub Pages após testes.                  | **PASS** — Build estático Astro `npm run build` gerando todas as 13 páginas em `dist/`. |

## Project Structure

### Documentation (this feature)

```text
specs/005-figma-visual-redesign/
├── plan.md              # Este arquivo (plano técnico e arquitetura)
├── research.md          # Decisões de design, contraste e arquitetura
├── data-model.md        # Entidades, tipos TypeScript e regras de delta
├── quickstart.md        # Roteiro de validação manual e automatizada
├── contracts/           # Contratos de tokens e componentes UI
│   ├── tokens-contract.md
│   └── ui-contract.md
└── checklists/
    └── requirements.md  # Checklist de conformidade de requisitos (16/16)
```

### Source Code Layout

```text
src/
├── components/
│   ├── HeaderMarca.astro         # Logotipo oficial em grade de 9 blocos e marca
│   ├── IndicatorCard.astro       # Cartão com ícone temático, valor, delta e badge
│   ├── SeriesChart.astro         # Gráfico SVG com rótulos numéricos e eixos
│   ├── ComponentCount.astro      # Decomposição dos componentes analíticos
│   ├── CartaoPilar.astro         # Cartão de pilar na Home
│   └── YearLinks.astro           # Controles suspensos estilizados de Campus e Ano
├── layouts/
│   └── BaseLayout.astro          # Layout base com cabeçalho sticky e drawer móvel
├── lib/
│   ├── delta.ts                  # Utilitário isolado para cálculo de variação
│   ├── formatters.ts             # Formatadores de moeda, porcentagem e nulos
│   ├── selectors.ts              # Seleção de séries e indicadores
│   ├── ano.ts                    # Resolução de filtros de ano e campus
│   ├── urlSync.ts                # Sincronização de URL e histórico do navegador
│   └── chart.ts                  # Cálculos de geometria e escalas SVG
├── pages/
│   ├── index.astro               # Visão geral (Home) com 3 pilares
│   ├── pilar-1/
│   │   ├── index.astro           # Listagem do Pilar 1
│   │   └── [sigla].astro         # Detalhe do indicador em 2 colunas
│   ├── pilar-2/
│   │   ├── index.astro           # Listagem do Pilar 2
│   │   └── [sigla].astro         # Detalhe do indicador em 2 colunas
│   └── pilar-3/
│       ├── index.astro           # Listagem do Pilar 3
│       └── [sigla].astro         # Detalhe do indicador em 2 colunas
└── styles/
    └── tokens.css                # Tokens CSS da paleta institucional IFES
```

**Structure Decision**: Utilização estrita da estrutura padrão do Astro SSG em `src/`, sem inclusão de runtimes adicionais ou subprojetos separados, garantindo simplicidade e máxima velocidade de carregamento estático.

## Complexity Tracking

> Nenhuma violação das regras constitucionais identificada. Nenhuma dependência externa adicional necessária.
