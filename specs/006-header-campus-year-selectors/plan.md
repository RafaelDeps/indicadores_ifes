# Implementation Plan: Seletores de Campus e Ano no Cabeçalho

**Branch**: `006-header-campus-year-selectors` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-header-campus-year-selectors/spec.md`

## Summary

Implementação de dois seletores suspensos (_dropdowns_ / `<select>`) no cabeçalho da aplicação para filtragem por Campus e Ano com extração dinâmica a partir de `indicadores.zip`:

1. **Seletor de Campus**: Extrai dinamicamente todos os campi únicos a partir dos arquivos JSON no ZIP. Exibe obrigatoriamente `(Todos)` como primeira opção no topo, seguida pelos demais campi em estrita ordem alfabética (`pt-BR`).
2. **Seletor de Ano**: Extrai os anos de referência únicos do ZIP, ordenando-os em ordem estritamente decrescente (mais recente primeiro), adotando o ano mais recente como padrão inicial.
3. **Disposição Responsiva no Cabeçalho**:
   - **Desktop (`>= 768px`)**: Seletores exibidos na barra superior fixa do cabeçalho em `.cabecalho-filtros`.
   - **Mobile (`< 768px`)**: Seletores posicionados no topo do menu gaveta móvel (_Slide-Over Drawer_), logo acima dos links dos pilares, mantendo o topo do smartphone limpo.
4. **Sincronização e Persistência**: Alterações sincronizam parâmetros de URL (`?campus=...&ano=...`), persistindo a seleção na navegação entre páginas e no histórico do navegador.
5. **Acessibilidade & Qualidade**: Elementos com rótulos semânticos e foco WCAG 2.1 AA, sem dados pessoais (LGPD) e sem regressões nos 145 testes automatizados.

---

## Technical Context

**Language/Version**: Node.js `>= 20.0.0`, TypeScript `5.8+`  
**Primary Dependencies**: Astro `5.12+` (geração estática nativa SSG, sem frameworks pesados de cliente)  
**Storage**: Pacote `indicadores.zip` lido em tempo de compilação/execução via Node.js nativo (`zlib` / `fs`)  
**Testing**: Vitest `3.2+`  
**Target Platform**: Navegadores modernos (Desktop, Tablet e Mobile), hospedado estaticamente no GitHub Pages  
**Project Type**: Aplicação Web Estática (Astro SSG)  
**Performance Goals**: Tempo de renderização inicial < 1s, interação imediata dos seletores, zero dependências JS de terceiros  
**Constraints**: Conformidade estrita WCAG AA (contraste $\ge 4.5:1$, foco visível e alvo de toque $\ge 44px$ em mobile), fidelidade a dados oficiais, zero regressões nos 145 testes existentes  
**Scale/Scope**: Cabeçalho global em `BaseLayout.astro`, cobrindo todas as 13 páginas do site

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio Constitucional         | Exigência                                                                                  |                                       Avaliação de Conformidade                                       |
| :------------------------------- | :----------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------: |
| **I. Simplicity**                | Estrutura padrão Astro, dependências mínimas, sem React ou bibliotecas externas de estado. |        **PASS** — Implementação utilizando `<select>` HTML nativo, Astro e TypeScript padrão.         |
| **II. Test-First Development**   | Testes no Vitest antes da implementação das funções de extração, ordenação e marcação.     | **PASS** — Testes unitários para `obterCampiParaSelect`, `obterAnosParaSelect` e cabeçalho definidos. |
| **III. Fidelity to Report Data** | Nulo = "Dado indisponível"; valores oficiais nunca inventados ou estimados.                |        **PASS** — Os seletores alimentam consultas oficiais já vinculadas ao relatório CONIF.         |
| **IV. Aggregated Data Only**     | Apenas dados públicos agregados (sem identificação de pessoas/LGPD).                       |           **PASS** — Apenas nomes institucionais de campi e anos numéricos são manipulados.           |
| **V. Basic Quality**             | ESLint + Prettier com zero erros; textos em pt-BR; responsividade mobile verificada.       |                **PASS** — Rótulos em pt-BR e posicionamento otimizado no Drawer móvel.                |
| **VI. Automated Deployment**     | Build SSG automatizado com publicação via GitHub Pages após testes.                        |        **PASS** — `npm run build` estático garantido sem dependências de servidor em runtime.         |

---

## Project Structure

### Documentation (this feature)

```text
specs/006-header-campus-year-selectors/
├── plan.md              # Este arquivo (plano técnico e arquitetura)
├── research.md          # Decisões de extração, ordenação decrescente e layout mobile
├── data-model.md        # Entidades, tipos TypeScript e operações de dados
├── quickstart.md        # Roteiro de validação automatizada e manual
├── contracts/
│   └── ui-contract.md   # Contrato de interface, classes CSS e acessibilidade ARIA
└── checklists/
    └── requirements.md  # Checklist de conformidade de requisitos (16/16 aprovados)
```

### Source Code Layout

```text
src/
├── components/
│   ├── HeaderMarca.astro         # Marca institucional do IFES
│   ├── IndicatorCard.astro       # Cartão do indicador
│   └── BaseLayout.astro          # Layout com cabeçalho fixo, seletores e gaveta móvel
├── lib/
│   ├── dataset.ts                # Adição de obterCampiParaSelect e obterAnosParaSelect
│   ├── ano.ts                    # Adição de resolverContextoFiltro e validação de padrões
│   └── urlSync.ts                # Utilitários de propagação e sincronização de parâmetros
tests/
├── dataset.test.ts               # Testes de extração única e ordenação alfabética de campi
├── ano.test.ts                   # Testes de ordenação decrescente e ano padrão
└── header.test.ts                # Testes de renderização dos seletores no cabeçalho e drawer
```

**Structure Decision**: Reutilização direta da estrutura de layout e lib existente em `src/`, sem novas pastas ou abstrações desnecessárias, assegurando total aderência ao Princípio I da Constituição.

---

## Complexity Tracking

> Nenhuma violação das regras constitucionais identificada. Nenhuma dependência externa adicional necessária.
