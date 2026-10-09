# Implementation Plan: Alternância entre Gráfico de Linha e Barras no Histórico

**Branch**: `feat/new_pages` (ou `021-chart-view-toggle`) | **Date**: 2026-10-09 | **Spec**: [specs/021-chart-view-toggle/spec.md](spec.md)

**Input**: Feature specification from `/specs/021-chart-view-toggle/spec.md`

## Summary

Implementar a capacidade de alternar instantaneamente entre a visualização clássica de linha (tendência contínua) e uma visualização em colunas verticais/barras (volumes anuais discretos) no componente de série histórica dos indicadores (`SeriesChart.astro`).
A implementação utiliza funções geométricas dedicadas em TypeScript (`src/lib/chart.ts`), renderização vetorial estática em SVG nativo sem bibliotecas externas pesadas, controle acessível com atributos ARIA (`role="group"` e `aria-pressed`), persistência de sessão e adaptação plena aos temas claro e escuro.

## Technical Context

**Language/Version**: TypeScript 5.x / Astro 5.x / Node.js 20+

**Primary Dependencies**: Nenhuma nova dependência. Astro nativo + SVG vetorial puro (0 KB adicionais).

**Storage**: `sessionStorage` do navegador para persistência da preferência de modo durante a sessão do usuário.

**Testing**: Vitest (`tests/web/`) para testes unitários de funções geométricas e testes de contrato de componentes.

**Target Platform**: Navegadores modernos (Desktop e Mobile) com renderização estática SSG.

**Project Type**: Aplicação Web Estática (SSG).

**Performance Goals**: Alternância de modo em < 10ms; 0 KB de bibliotecas gráficas pesadas no bundle.

**Constraints**: WCAG AA (contraste >= 4.5:1, navegação completa por teclado); fidelidade aos dados (dados nulos nunca exibidos como zero).

**Scale/Scope**: Todas as séries históricas dos 9 indicadores oficiais do Campus Serra.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Princípio I (Simplicidade)**: PASS. Nenhuma biblioteca externa gráfica (D3, Chart.js, etc.) adicionada. Todo o cálculo é geométrico nativo em SVG.
- **Princípio II (Desenvolvimento Guiado por Testes - TDD)**: PASS. Testes em Vitest (`tests/web/chart.test.ts` e `tests/web/chart-toggle.test.ts`) serão criados antes da implementação.
- **Princípio III (Fidelidade aos Dados)**: PASS. Anos sem dados apurados (`null`) são renderizados como marcação neutra/tracejada de "Dado indisponível", sem desenhar barra de valor zero.
- **Princípio IV (Dados Agregados)**: PASS. A série histórica manipula exclusivamente totais agregados por ano no Campus Serra.
- **Princípio V (Qualidade Básica e Acessibilidade)**: PASS. Todos os textos em pt-BR, suporte responsivo mobile, conformidade estrita WCAG AA e checagem de ESLint e Prettier com zero erros.
- **Princípio VI (Deploy Automatizado)**: PASS. Pipeline de CI do GitHub Pages validado com lint, testes e build.

## Project Structure

### Documentation (this feature)

```text
specs/021-chart-view-toggle/
├── plan.md              # Este plano de implementação
├── research.md          # Decisões de arquitetura e pesquisa técnica (Fase 0)
├── data-model.md        # Modelos de dados e tipos TypeScript (Fase 1)
├── quickstart.md        # Guia rápido de validação e testes (Fase 1)
├── contracts/           # Contratos de componentes e APIs (Fase 1)
│   └── chart-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Tarefas de implementação (Fase 2)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── SeriesChart.astro       # Atualização: suporte a botões de alternância e camada de barras SVG
└── lib/
    └── chart.ts                 # Atualização: adição de mapearBarras e tipagens de barras

tests/
└── web/
    ├── chart.test.ts            # Atualização: testes unitários de mapearBarras
    └── chart-toggle.test.ts     # Novo: testes de integração do componente e acessibilidade
```

**Structure Decision**: Reutilização e extensão modular dos arquivos existentes `src/lib/chart.ts` e `src/components/SeriesChart.astro`, preservando a arquitetura estática e os testes já existentes.

## Complexity Tracking

| Possível Violação | Justificativa                                               | Alternativa Rejeitada |
| :---------------- | :---------------------------------------------------------- | :-------------------- |
| Nenhuma           | Arquitetura 100% aderente aos 6 princípios da Constituição. | Não se aplica.        |
