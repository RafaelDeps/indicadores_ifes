# Implementation Plan: Reformulação e Correção Abrangente do Frontend

**Branch**: `014-frontend-ux-overhaul` | **Date**: 2026-10-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/014-frontend-ux-overhaul/spec.md`

## Summary

Esta feature implementa uma reformulação completa e estruturada da camada de frontend dos Indicadores IFES. O objetivo central é eliminar inconsistências silenciosas na página de detalhe (reativando a renderização dinâmica do gráfico SVG e da tabela histórica conforme a troca de campus/ano), desduplicar controles redundantes de interface, elevar a acessibilidade para conformidade estrita WCAG AA (símbolos explícitos em deltas, skip links e tabelas responsivas), reativar o suporte a tema escuro/claro/sistema com persistência no navegador, otimizar ativos visuais institucionais (logotipo SVG vetorial e scripts assíncronos) e disponibilizar uma ferramenta de busca rápida no cabeçalho.

A arquitetura permanece estritamente alinhada à Constituição do projeto: Astro estático puro, TypeScript, manipulação declarativa e eficiente do DOM/SVG sem dependência de bibliotecas de estado ou frameworks de SPA, e desenvolvimento orientado a testes com Vitest.

## Technical Context

**Language/Version**: TypeScript 5.8+ / Node.js >= 20
**Primary Dependencies**: Astro 5.12+ (sem frameworks de terceiros como React/Vue/Svelte, sem bibliotecas externas de estado)
**Storage**: `localStorage` no navegador para preferência de tema visual (`indicadores_tema`) com fallback gracioso para navegação privada
**Testing**: Vitest 3.2+ com JSDOM para testes de unidade, integração de DOM e contratos de renderização
**Target Platform**: Navegadores modernos (Desktop e Mobile) servidos estaticamente via GitHub Pages
**Project Type**: Dashboard estático gerado por SSG (Static Site Generation) com reatividade client-side via Vanilla JS
**Performance Goals**: Tempo de resposta à troca de campus/ano < 100ms; FCP < 1.0s; TBT < 150ms em conexões móveis; pontuação de Acessibilidade no Lighthouse = 100
**Constraints**: Zero chamadas de API externa em tempo de execução; fidelidade absoluta aos relatórios oficiais CONIF; conformidade total com WCAG AA; textos 100% em pt-BR
**Scale/Scope**: 3 pilares temáticos, 9+ indicadores oficiais, dezenas de campi do IFES, histórico temporal de 2021 a 2026

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                    | Descrição da Restrição Constitucional                                                                                                                                             | Status   | Avaliação                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicity**            | Manter estrutura padrão do Astro (`src/pages`, `src/components`, `src/layouts`) com TS. Sem frameworks de SPA adicionais, sem bibliotecas de estado (Redux, Nanostores, Zustand). | **PASS** | Todas as atualizações reativas reaproveitam as funções puras já existentes (`chart.ts`, `visao.ts`, `aplicar-visao.ts`) via manipulação nativa do DOM/SVG.        |
| **II. Test-First**           | Vitest para o frontend. Implementações guiadas por testes prévios (Red → Green → Refactor).                                                                                       | **PASS** | Novos testes serão criados para re-renderização de SVG, integridade de componentes, deltas acessíveis e índice de busca antes da codificação final.               |
| **III. Fidelity to Data**    | Proibido inventar, estimar, arredondar ou interpolar dados. Dados ausentes devem ser exibidos como "Dado indisponível".                                                           | **PASS** | A re-renderização do gráfico e da tabela respeita rigorosamente os dados apurados do campus selecionado, exibindo "Dado indisponível" quando não houver apuração. |
| **IV. Aggregated Data Only** | Apenas dados públicos agregados. Proibição absoluta de dados pessoais (LGPD).                                                                                                     | **PASS** | Não há inclusão de dados individuais; manipulação puramente agregada no dataset estático compilado.                                                               |
| **V. Basic Quality**         | Zero erros de ESLint e Prettier. Textos 100% em pt-BR. Layout mobile verificado e acessível.                                                                                      | **PASS** | O pipeline de qualidade valida lint e formatação; novos elementos e atalhos contêm textos e rótulos ARIA nativos em pt-BR.                                        |
| **VI. Automated Deployment** | Build e testes no GitHub Actions bloqueando publicações com falha.                                                                                                                | **PASS** | As validações continuam executando no workflow de CI existente.                                                                                                   |

## Project Structure

### Documentation (this feature)

```text
specs/014-frontend-ux-overhaul/
├── spec.md              # Especificação de requisitos funcionais e histórias de usuário
├── plan.md              # Plano de implementação técnica e gates constitucionais
├── research.md          # Decisões arquiteturais e justificativas técnicas
├── data-model.md        # Modelos de dados e transição de estados no cliente
├── quickstart.md        # Guia de validação prática e cenários de teste
├── checklists/
│   └── requirements.md  # Checklist de qualidade da especificação
└── contracts/
    ├── dom-binding.md   # Contratos de seletores e binding de interface
    └── url-sync.md      # Contratos de sincronização de parâmetros na URL
```

### Source Code Layout

```text
src/
├── components/
│   ├── HeaderMarca.astro         # Logotipo institucional otimizado (SVG vetorial)
│   ├── SeriesChart.astro         # Gráfico SVG com data-attributes e ponto do ano ativo
│   ├── HistoricalSeries.astro    # Tabela com data-attributes e marcação de ano ativo
│   ├── ComponentCount.astro      # Contagens anuais com chave composta sigla + ano
│   ├── IndicatorCard.astro       # Cartão com deltas acessíveis (símbolos ▲/▼/= e aria-label)
│   ├── CartaoPilar.astro         # Cartão de visão geral com deltas acessíveis
│   ├── BuscaRapida.astro         # Novo: Campo e dropdown acessível de busca no cabeçalho
│   ├── SeletorTema.astro         # Novo: Botão acessível de alternância de tema no cabeçalho
│   └── IndicadorDetalhe.astro    # Novo: Layout compartilhado das páginas de detalhe (DRY)
├── layouts/
│   └── BaseLayout.astro          # Skip link, script inline de tema antecipado, busca e cabeçalho unificado
├── lib/
│   ├── chart.ts                  # Funções puras matemáticas de escala, pontos e linhas
│   ├── visao.ts                  # Computação de visão de métricas, histórico e componentes
│   ├── aplicar-visao.ts          # Atualização reativa do DOM: banner, gráfico SVG e tabela histórica
│   ├── contexto-cliente.ts       # Orquestração de eventos, seletores unificados e histórico de URL
│   └── busca.ts                  # Novo: Índice em memória e correspondência de termos de busca
├── styles/
│   └── tokens.css                # Paleta completa de tokens claro e escuro WCAG AA
└── pages/
    ├── index.astro               # Visão geral
    ├── pilar-1/
    │   ├── index.astro
    │   └── [sigla].astro         # Refatorado para usar IndicadorDetalhe.astro
    ├── pilar-2/
    │   ├── index.astro
    │   └── [sigla].astro         # Refatorado para usar IndicadorDetalhe.astro
    └── pilar-3/
        ├── index.astro
        └── [sigla].astro         # Refatorado para usar IndicadorDetalhe.astro

tests/web/
├── aplicar-visao.test.ts         # Testes de atualização dinâmica do SVG e tabela
├── chart.test.ts                 # Testes de escala e cálculo de pontos
├── busca.test.ts                 # Novo: Testes de correspondência do índice de busca
├── tema.test.ts                  # Novo: Testes de alternância de tema e persistência
├── acessibilidade-delta.test.ts  # Novo: Testes de símbolos direcionais e rótulos ARIA
└── routes.test.ts                # Testes de integridade das rotas estáticas
```

## Complexity Tracking

> Nenhuma violação identificada. O design respeita 100% dos princípios constitucionais sem dependências extras ou abstrações artificiais.
