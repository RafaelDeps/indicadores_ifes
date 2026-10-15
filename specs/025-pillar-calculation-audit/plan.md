# Implementation Plan: Memória de Cálculo e Auditoria nas Páginas dos Pilares

**Branch**: `025-pillar-calculation-audit` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/025-pillar-calculation-audit/spec.md`

## Summary

Adicionar, às três páginas de pilar (`/pilar-1`, `/pilar-2`, `/pilar-3`), uma **memória de
cálculo** expansível por indicador (tabela estilo planilha com variáveis, valores brutos do
contexto ativo ano/campus, unidades, fórmula com valores substituídos e valor final apurado,
mais mini-tabela histórica multi-anual) e uma **seção de rastreabilidade** por pilar com
downloads dos arquivos de origem e proveniência, herdando as regras de portão de governança
fail-closed da página `/dados`. Tudo deriva do dataset canônico já entregue ao navegador e dos
metadados/componentes já mapeados (`INDICADORES_META`, `extrairMapeamentoIndicador`,
`decomporFormula`, `carregarDownloads`), sem novas fontes de dados, backend ou dependências.

## Technical Context

**Language/Version**: TypeScript 5 (Astro 5.12, `strict`), Node.js para scripts/build

**Primary Dependencies**: Astro 5 (estático, sem runtime de servidor); sem dependências novas —
reuso de `src/lib/{dataset-core,visao,aplicar-visao,formula,formatters,downloads,contexto-cliente}.ts`
e componentes Astro existentes

**Storage**: N/A (site estático; dados como assets produzidos no build — `data/dist/indicadores.zip`
embutido como JSON em `<script id="dados-indicadores">` e artefatos copiados para `public/dados/`)

**Testing**: Vitest (`npm test` → `vitest run tests/web`), padrão do repositório: mocks de DOM
em Node puro (sem jsdom) + asserções sobre o fonte `.astro`; ETL não é tocado por esta feature

**Target Platform**: Navegadores modernos (desktop e mobile, 360px+); GitHub Pages (subcaminho
`/indicadores_ifes/`), temas claro/escuro

**Project Type**: Site estático Astro (frontend only; ETL Python não é alterado)

**Performance Goals**: Expansão da memória instantânea (dados já no DOM/cliente); sincronização
de contexto recalcula no máximo as memórias dos indicadores do pilar (≤ 4) por troca de filtro —
custo desprezível frente ao já existente

**Constraints**: Fidelidade absoluta ao relatório (Princípio III: nenhum valor inventado,
"Dado indisponível" para ausência); portão de governança fail-closed para insumos brutos
(Princípio IV); sem dado individual renderizado; todo texto em pt-BR; WCAG 2.1 AA; sem
dependências novas; disclosure progressivo (página recolhida = aparência atual)

**Scale/Scope**: 3 páginas de pilar × 2–4 indicadores (9 no total), 1 memória por indicador,
1 seção de rastreabilidade por página de pilar, 1 módulo de visão novo + 1 aplicador DOM +
2 componentes Astro novos

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                       | Avaliação | Evidência                                                                                                                                                                                                                                                           |
| ------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Simplicity                   | ✅ PASS   | Estrutura Astro padrão (`src/pages`, `src/components`, `src/lib`); zero dependências novas; sem camadas ou abstrações além do módulo de visão + aplicador já padronizados no projeto (`visao.ts`/`aplicar-visao.ts`)                                                |
| II. Test-First (NON-NEGOTIABLE) | ✅ PASS   | Vitest; testes de `memoria.ts` (substituição, indisponibilidade, fidelidade) e `aplicar-memoria` escritos ANTES do código (red → green → refactor); ver quickstart.md §Validação automatizada                                                                       |
| III. Fidelity to Report Data    | ✅ PASS   | A memória só exibe valores canônicos (`extrairMapeamentoIndicador`/`obterIndicadorCompleto`); a fórmula substituída é transcrição transparente e o valor final exibido é SEMPRE o publicado — nunca um recálculo; ausência = `TEXTO_INDISPONIVEL`                   |
| IV. Aggregated Data Only + gate | ✅ PASS   | Memória renderiza apenas agregados por indicador/variável/ano/campus; insumos brutos só na rastreabilidade, via `carregarDownloads`/`portaoAberto` (fail-closed, mesmo registro `pendencias.yaml`); sem marcação própria (herda `/dados`); nada em nível individual |
| V. Basic Quality                | ✅ PASS   | Rótulos pt-BR; tabelas contidas com rolagem horizontal própria a partir de 360px; `<details>/<summary>` nativo + `scope`/`caption`; contraste via `tokens.css` existentes; ESLint/Prettier zero erros antes do merge                                                |
| VI. Automated Deployment        | ✅ PASS   | CI existente (lint + `npm test` + build) continua bloqueando o deploy; nenhum novo job                                                                                                                                                                              |
| Static only                     | ✅ PASS   | Memória calculada no cliente a partir do JSON embutido; rastreabilidade resolvida em build time com `fs` (mesmo padrão de `/dados`); nenhum backend                                                                                                                 |
| Privacy review (Princípio IV)   | ✅ PASS   | Nenhuma transformação de dado individual: a feature consome o dataset agregado e o registro de pendências existentes; revisão registrada neste check                                                                                                                |

**Pós-Phase 1 (re-check)**: ✅ PASS — o design não introduz violações: nenhum dado novo é
criado (só visualização), nenhum artefato novo é servido (reusa `public/dados/`), e o modelo
`VisaoMemoria` não carrega campos que permitam exibir algo diferente do valor canônico
(`valorFinalFormatado` é sempre derivado do dataset, nunca calculado).

## Project Structure

### Documentation (this feature)

```text
specs/025-pillar-calculation-audit/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões e alternativas
├── data-model.md        # Phase 1 — entidades da memória e rastreabilidade
├── quickstart.md        # Phase 1 — guia de validação ponta a ponta
├── contracts/           # Phase 1 — contratos de interface (DOM + funções)
│   └── memoria-dom-ui.md
└── tasks.md             # Phase 2 (/speckit.tasks — não criado aqui)
```

### Source Code (repository root)

```text
src/
├── pages/
│   └── pilar-{1,2,3}/
│       └── index.astro              # MODIFICADO: célula do grid = cartão + MemoriaCalculo; + SecaoRastreabilidade
├── components/
│   ├── MemoriaCalculo.astro         # NOVO: <details>/<summary> com tabelas da memória por indicador
│   ├── SecaoRastreabilidade.astro   # NOVO: seção compartilhada por pilar (downloads + proveniência)
│   └── IndicatorCard.astro          # SEM ALTERAÇÃO estrutural (segue sendo <a>; memória vive fora do link)
└── lib/
    ├── memoria.ts                   # NOVO: computarVisaoMemoria + tipos (build e cliente)
    ├── aplicar-memoria.ts           # NOVO: aplicarMemoria(doc, memorias) — hooks data-memoria-*
    ├── rastreabilidade.ts           # NOVO: obterRastreabilidadePilar(pilar, raizRepo) — reusa downloads.ts
    ├── contexto-cliente.ts          # MODIFICADO: sincronizarTela despacha aplicarMemoria em páginas de pilar
    └── (demais módulos reutilizados sem alteração: visao, formula, formatters, downloads, dataset-core)

tests/web/
├── memoria.test.ts                  # NOVO: substituição de fórmula, fidelidade, indisponibilidade, histórico
├── aplicar-memoria.test.ts          # NOVO: hooks DOM (mocks Node puro, padrão aplicar-visao.test.ts)
├── memoria-integracao.test.ts       # NOVO: sincronizarTela atualiza memória em página de pilar
└── rastreabilidade.test.ts          # NOVO: portão fechado/aberto, arquivo ausente, proveniência, pt-BR
```

**Structure Decision**: Estrutura única existente do Astro (sem opções). Módulos de visão puros
em `src/lib/` (testáveis sem DOM), componentes Astro para marcação, hooks `data-*` para o
aplicador cliente — exatamente o padrão já consagrado por `visao.ts`/`aplicar-visao.ts`/
`contexto-cliente.ts` nas features 013/021/022.

## Complexity Tracking

> Sem violações de constituição — seção vazia por decisão.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| —         | —          | —                                    |
