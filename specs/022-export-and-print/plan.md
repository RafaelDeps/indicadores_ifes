# Implementation Plan: Ferramentas de Exportação (PNG, CSV) e Impressão A4

**Branch**: `feat/new_pages` (ou `022-export-and-print`) | **Date**: 2026-10-09 | **Spec**: [specs/022-export-and-print/spec.md](spec.md)

**Input**: Feature specification from `/specs/022-export-and-print/spec.md`

## Summary

Implementar recursos integrados de exportação de dados e relatório institucional para os indicadores do IFES Campus Serra:

1. Geração e download client-side de arquivos CSV formatados com codificação UTF-8 com BOM e delimitador `;`.
2. Exportação de imagem PNG em alta resolução do gráfico SVG ativo com cabeçalho institucional via Canvas nativo.
3. Formatação A4 para impressão (`@media print`) e botão "Imprimir Ficha" nativo.
   Tudo executado puramente no navegador sem bibliotecas de terceiros (0 KB de dependências externas).

## Technical Context

**Language/Version**: TypeScript 5.x / Astro 5.x / Node.js 20+

**Primary Dependencies**: Nenhuma nova dependência externa (Web APIs nativas: Canvas 2D, XMLSerializer, Blob, URL).

**Storage**: N/A (Geração direta sob demanda no cliente).

**Testing**: Vitest (`tests/web/`) para testes unitários de geração de CSV e testes de integração de componentes e estilos.

**Target Platform**: Navegadores modernos com suporte a CSS `@media print`, Canvas e Blobs.

**Project Type**: Aplicação Web Estática (SSG).

**Performance Goals**: Downloads disparados em < 100ms; 0 KB adicionados de bibliotecas externas pesadas.

**Constraints**: Fidelidade estrita aos dados (dados indisponíveis nunca exibidos como zero no CSV); WCAG AA para todos os botões de ação; folhas de impressão legíveis em monocromático e colorido.

**Scale/Scope**: Todas as páginas de detalhe de indicadores nos 3 pilares do Campus Serra.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Princípio I (Simplicidade)**: PASS. Implementação sem pacotes de terceiros (sem SheetJS, PapaParse, html2canvas ou jspdf).
- **Princípio II (Desenvolvimento Guiado por Testes - TDD)**: PASS. Testes em Vitest serão criados antes da implementação das funções de exportação e componentes.
- **Princípio III (Fidelidade aos Dados)**: PASS. Dados indisponíveis mantêm status explícito de "Dado indisponível", sem valores fabricados no CSV ou no PNG.
- **Princípio IV (Dados Agregados)**: PASS. A exportação contém exclusivamente os dados consolidados da série por ano do Campus Serra.
- **Princípio V (Qualidade Básica e Acessibilidade)**: PASS. Rótulos claros em pt-BR, foco por teclado e contraste adequado nos botões e folhas de impressão.
- **Princípio VI (Deploy Automatizado)**: PASS. Integração contínua e build estático Astro verificados.

## Project Structure

### Documentation (this feature)

```text
specs/022-export-and-print/
├── plan.md              # Este plano de implementação
├── research.md          # Decisões de arquitetura e Canvas (Fase 0)
├── data-model.md        # Tipos e estruturas de exportação (Fase 1)
├── quickstart.md        # Guia rápido de testes e validação (Fase 1)
├── contracts/           # Contratos das funções e componentes (Fase 1)
│   └── export-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Tarefas de implementação (Fase 2)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── SeriesChart.astro        # Adição do botão Baixar PNG e script de Canvas
│   ├── HistoricalSeries.astro   # Adição do botão Exportar CSV e disparo
│   └── IndicadorDetalhe.astro   # Adição do botão Imprimir e regras @media print
└── lib/
    ├── exportar-csv.ts          # Módulo puro de formatação de CSV e download
    └── exportar-grafico.ts      # Módulo puro de conversão SVG -> Canvas -> PNG

tests/
└── web/
    ├── exportar-csv.test.ts     # Testes unitários da geração do CSV
    └── exportar-print.test.ts   # Testes de integração dos botões e regras de impressão
```

**Structure Decision**: Criação de módulos utilitários em `src/lib/` para manter a lógica testável isoladamente e desacoplada dos componentes Astro.

## Complexity Tracking

| Possível Violação | Justificativa                                               | Alternativa Rejeitada |
| :---------------- | :---------------------------------------------------------- | :-------------------- |
| Nenhuma           | Arquitetura 100% aderente aos 6 princípios da Constituição. | Não se aplica.        |
