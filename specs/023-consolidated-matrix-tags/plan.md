# Implementation Plan: Matriz Geral Consolidada de Indicadores e Filtros por Tags Temáticas

**Branch**: `feat/new_pages` | **Date**: 2026-10-09 | **Spec**: [specs/023-consolidated-matrix-tags/spec.md](spec.md)

**Input**: Feature specification from `specs/023-consolidated-matrix-tags/spec.md`

## Summary

Implementar a **Matriz Geral Consolidada de Indicadores** do IFES Campus Serra na rota `/matriz/`, apresentando todos os 9 indicadores do modelo CONIF em uma visão tabular panorâmica unificada. A matriz incluirá:

1. Tabela sinóptica com colunas de Pilar, Sigla, Indicador, Último Valor, Variação Recente, Polaridade e Ação direta para a ficha individual;
2. Ordenação interativa por clique nos cabeçalhos (Pilar, Sigla e Nome);
3. Filtros rápidos por tags temáticas em chips interativos (`role="group"` e `aria-pressed`);
4. Campo de busca textual instantâneo com normalização insensível a acentuação e caixa;
5. Integração na navegação do cabeçalho (desktop e gaveta móvel) e atalho na página inicial;
6. Conformidade rigorosa com acessibilidade WCAG AA e tokens de design institucionais.

---

## Technical Context

**Language/Version**: TypeScript 5.x / Astro 5.x (SSG)  
**Primary Dependencies**: Nenhuma nova dependência adicionada. Utiliza APIs nativas do navegador e Astro.  
**Storage**: N/A (dados compilados estaticamente a partir de `src/data/indicadores.ts` e renderizados no HTML).  
**Testing**: Vitest (`npm run test:web`) com testes unitários em `tests/web/` cobrindo cálculo de tags, busca, ordenação e acessibilidade.  
**Target Platform**: Navegadores modernos (Desktop e Mobile responsivo).  
**Project Type**: Aplicação Web Estática (SSG).  
**Performance Goals**: Tempo de renderização inicial da tabela < 1s; resposta da filtragem por tag ou digitação na busca < 50ms.  
**Constraints**: Zero bibliotecas pesadas de runtime; fidelidade estrita aos dados (Princípio III); uso exclusivo de `tokens.css` (sem cores hexadecimais diretas).  
**Scale/Scope**: 9 indicadores oficiais do IFES Campus Serra divididos nos 3 Pilares CONIF.

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                        | Avaliação | Justificativa / Conformidade                                                                                                                                             |
| :------------------------------- | :-------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicity**                |  ✅ PASS  | Utiliza estrutura nativa do Astro (`src/pages/matriz/index.astro`, `src/components/`, `src/lib/matriz.ts`) sem frameworks de estado adicionais ou dependências externas. |
| **II. Test-First Development**   |  ✅ PASS  | Testes unitários e de componente em Vitest (`tests/web/matriz-*.test.ts`) serão escritos antes do código de implementação, verificando falha antes de passar.            |
| **III. Fidelity to Report Data** |  ✅ PASS  | Métricas sem apuração exibem explicitamente "Dado indisponível" e variação "—", sem interpolações ou conversão indevida para zero.                                       |
| **IV. Aggregated Data Only**     |  ✅ PASS  | A matriz exibe unicamente totais e percentuais agregados por campus/ano, sem nenhum dado de nível individual.                                                            |
| **V. Basic Quality**             |  ✅ PASS  | Código validado por ESLint e Prettier (`npm run lint`, `npm run format:check`); texto 100% em pt-BR; layout testado em viewports estreitas (< 768px).                    |
| **VI. Automated Deployment**     |  ✅ PASS  | Build estático verificado com `npm run build` antes de qualquer entrega; sem impactos negativos na esteira de CI.                                                        |

---

## Project Structure

### Documentation (this feature)

```text
specs/023-consolidated-matrix-tags/
├── spec.md              # Especificação de requisitos da feature
├── plan.md              # Este plano de implementação
├── research.md          # Decisões arquiteturais e de taxonomia
├── data-model.md        # Modelos das entidades (IndicadorMatrizItem, TagTematica, etc.)
├── quickstart.md        # Guia de validação e testes
├── contracts/
│   └── matriz-contract.md # Contrato do módulo de matriz e marcação ARIA
└── tasks.md             # Tarefas de implementação (gerado pelo /speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── MatrizIndicadores.astro  # Componente da tabela consolidada com busca e chips
├── lib/
│   └── matriz.ts                # Módulo com catálogo de tags, filtros e ordenação
├── pages/
│   ├── index.astro              # Adição de atalho/card para a matriz consolidada
│   └── matriz/
│       └── index.astro          # Página dedicada da Matriz Geral Consolidada
└── layouts/
    └── BaseLayout.astro         # Inclusão do link "Matriz" no cabeçalho e gaveta móvel

tests/web/
├── matriz-dados.test.ts         # Testes de enriquecimento de tags e formatação
├── matriz-filtros.test.ts       # Testes de filtragem por tag, busca e ordenação
└── matriz-componente.test.ts    # Testes de renderização, rota e acessibilidade
```

**Structure Decision**: Segue o padrão estabelecido no repositório Astro, mantendo lógica pura em `src/lib/` para teste unitário independente e marcação semântica nos componentes `.astro`.

---

## Complexity Tracking

> **Nenhuma violação identificada.**  
> A solução proposta não adiciona nenhuma dependência externa, mantendo máxima velocidade estática e simplicidade arquitetural.
