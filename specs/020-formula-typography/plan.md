# Implementation Plan: Renderização Tipográfica de Fórmulas Matemáticas

**Branch**: `feat/new_pages` | **Date**: 2026-10-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/020-formula-typography/spec.md`

---

## Summary

Esta funcionalidade substitui a renderização de fórmulas em texto monoespaçado puro (`<code>`) nas páginas de detalhe de indicadores (`/pilar-X/<sigla>/`) por um componente visual tipográfico e acessível (`FormulaEquacao.astro`). Fórmulas com divisão/razão (como PIES, PICOT e PINV) passam a ser exibidas como frações matemáticas reais com numerador e denominador empilhados e traço horizontal contínuo. Variáveis ganham correlação interativa (hover e foco via teclado) com as respectivas linhas da tabela de variáveis. Acessibilidade total é garantida por meio de transcrições em áudio para leitores de tela (`.sr-only`), contraste estrito WCAG AA em ambos os temas e zero adição de dependências pesadas de terceiros.

---

## Technical Context

**Language/Version**: TypeScript / Node.js 20+ (Frontend)  
**Primary Dependencies**: Astro 5.x, CSS Flexbox nativo  
**Storage**: N/A (transformação e apresentação de dados estáticos do catálogo de indicadores)  
**Testing**: Vitest (`npm run test:web`)  
**Target Platform**: GitHub Pages / Navegadores modernos  
**Project Type**: Componente visual de frontend e módulo de parsing léxico puro  
**Performance Goals**: Tempo de renderização < 1ms; 0 KB de dependências externas adicionadas; scripts clientes < 1.5 KB  
**Constraints**: Semântica HTML5, acessibilidade para leitores de tela (`sr-only`), conformidade com design tokens (`tokens.css`), conformidade com a Constituição (Princípios I, II e V)  
**Scale/Scope**: 9 indicadores com fórmulas nos Pilares 1, 2 e 3.

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                          | Descrição                                             |  Status  | Justificativa                                                                                                     |
| :--------------------------------- | :---------------------------------------------------- | :------: | :---------------------------------------------------------------------------------------------------------------- |
| **I. Simplicidade**                | Estrutura padrão sem dependências desnecessárias.     | **PASS** | Usa CSS Flexbox nativo e parser puro em TypeScript sem bibliotecas pesadas de equações (KaTeX/MathJax).           |
| **II. Desenvolvimento Test-First** | Testes antes do código com Vitest.                    | **PASS** | Módulo de parsing (`formula.ts`) e o componente (`FormulaEquacao.astro`) são testados antes da integração.        |
| **III. Fidelidade aos Dados**      | Nunca inventar ou alterar regras de cálculo.          | **PASS** | As regras matemáticas oficiais do CONIF são estritamente preservadas; apenas a apresentação visual é aprimorada.  |
| **IV. Dados Agregados Apenas**     | Conformidade com LGPD.                                | **PASS** | As fórmulas lidam exclusivamente com símbolos e variáveis metodológicas sem dados pessoais.                       |
| **V. Acessibilidade e Inclusão**   | Contraste WCAG AA, foco por teclado e leitor de tela. | **PASS** | Transcrição fonética completa em `.sr-only`, variáveis focáveis via `Tab` e contraste validado em ambos os temas. |

---

## Project Structure

### Documentation (this feature)

```text
specs/020-formula-typography/
├── plan.md              # Este arquivo de plano de implementação
├── research.md          # Decisões de arquitetura e abordagem semântica (Fase 0)
├── data-model.md        # Modelagem de dados da fórmula decomposta (Fase 1)
├── quickstart.md        # Guia de validação e comandos de teste (Fase 1)
├── contracts/
│   └── formula-contract.md # Contrato de UI, atributos e classes CSS
└── checklists/
    └── requirements.md  # Checklist de validação da especificação
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── FormulaEquacao.astro     # Novo componente visual de equação matemática
│   └── IndicadorDetalhe.astro   # Integração da nova equação e atributos na tabela
├── lib/
│   └── formula.ts               # Parser léxico determinístico e gerador de texto acessível
tests/
└── web/
    ├── formula.test.ts          # Testes unitários do parser de fórmulas e texto acessível
    └── formula-equacao.test.ts  # Testes de integração do componente visual e correlação
```

**Structure Decision**: Segregação limpa entre a lógica pura de parsing (`src/lib/formula.ts`) e a camada de apresentação (`src/components/FormulaEquacao.astro`), facilitando testes rápidos e manutenção isolada.

---

## Complexity Tracking

_Nenhuma violação constitucional identificada. Arquitetura 100% alinhada à simplicidade e acessibilidade._
