# Implementation Plan: Nova Página Explicativa dos Pilares CONIF (Campus Serra)

**Branch**: `feat/new_pages` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/019-conif-pillars-page/spec.md`

---

## Summary

Esta funcionalidade cria uma página institucional explicativa na rota pública `/sobre-conif/` que contextualiza o modelo de Pesquisa e Inovação do CONIF (Conselho Nacional das Instituições da Rede Federal), detalha seus 3 pilares estruturantes (Engajamento, Fomento e Produtividade) e destaca a relevância estratégica desses indicadores especificamente para o **IFES Campus Serra** (incluindo transparência pública, governança e o papel do Polo de Inovação/Embrapii). A solução inclui a integração do item "Sobre o Modelo" na barra de navegação superior e na gaveta móvel (`BaseLayout.astro`), um card convidativo na página inicial (`src/pages/index.astro`), e atalhos diretos para os 9 indicadores apurados do campus.

---

## Technical Context

**Language/Version**: TypeScript / Node.js 20+ (Frontend)  
**Primary Dependencies**: Astro 5.x (SSG)  
**Storage**: N/A (conteúdo estático baseado nos dados de indicadores consolidados)  
**Testing**: Vitest (`npm run test:web`)  
**Target Platform**: GitHub Pages / Navegadores modernos  
**Project Type**: Página estática web institucional (SSG)  
**Performance Goals**: Tempo de carregamento estático < 500ms; zero adições a bibliotecas pesadas de terceiros  
**Constraints**: Conformidade estrita com acessibilidade WCAG AA, paleta e design tokens de `src/styles/tokens.css`, preservação da LGPD (Princípio IV)  
**Scale/Scope**: 1 rota estática nova (`/sobre-conif/`), ajustes pontuais de navegação no `BaseLayout.astro` e card institucional na Home (`index.astro`).

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                          | Descrição                                                              |  Status  | Justificativa                                                                                                                              |
| :--------------------------------- | :--------------------------------------------------------------------- | :------: | :----------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicidade**                | Estrutura padrão do Astro sem dependências desnecessárias.             | **PASS** | Usa Astro puro, componentes `.astro` declarativos e CSS baseado em tokens existentes, sem bibliotecas externas.                            |
| **II. Desenvolvimento Test-First** | Testes antes do código; Vitest para frontend.                          | **PASS** | Testes de unidade e contrato em `tests/web/` validarão a presença da rota, marcação do menu e links de indicadores antes da implementação. |
| **III. Fidelidade aos Dados**      | Nunca inventar, estimar ou arredondar valores sem fonte.               | **PASS** | O conteúdo textual reflete fielmente as diretrizes oficiais do CONIF e aponta para os indicadores existentes sem inventar métricas.        |
| **IV. Dados Agregados Apenas**     | Conformidade com LGPD; nenhum dado pessoal em arquivos de saída.       | **PASS** | A página é puramente conceitual e institucional, sem qualquer dado nominal ou individualizado.                                             |
| **V. Acessibilidade e Inclusão**   | Textos em pt-BR, contraste WCAG AA, foco por teclado e responsividade. | **PASS** | Estrutura semântica HTML5 com marcos ARIA, contraste validado via tokens e suporte pleno a telas móveis.                                   |

---

## Project Structure

### Documentation (this feature)

```text
specs/019-conif-pillars-page/
├── plan.md              # Este arquivo de plano de implementação
├── research.md          # Decisões de arquitetura e pesquisa técnica (Fase 0)
├── data-model.md        # Modelos conceituais e estruturação de seções (Fase 1)
├── quickstart.md        # Guia de validação e comandos de teste (Fase 1)
├── contracts/
│   └── conif-page-contract.md # Contrato de UI, rotas e acessibilidade
├── checklists/
│   └── requirements.md  # Checklist de validação da especificação
```

### Source Code (repository root)

```text
src/
├── layouts/
│   └── BaseLayout.astro             # Link "Sobre o Modelo" no topo e na gaveta móvel
├── pages/
│   ├── index.astro                  # Card de chamada institucional para a nova página
│   └── sobre-conif/
│       └── index.astro              # Nova página explicativa dos pilares CONIF
tests/
└── web/
    └── sobre-conif.test.ts          # Testes automatizados de rota, navegação e acessibilidade
```

**Structure Decision**: Adota a convenção de rotas em diretórios do Astro (`src/pages/sobre-conif/index.astro`), garantindo URLs consistentes e limpas sem acoplamento a código backend ou ETL.

---

## Complexity Tracking

_Nenhuma violação constitucional identificada. Arquitetura 100% alinhada aos princípios de simplicidade e acessibilidade._
