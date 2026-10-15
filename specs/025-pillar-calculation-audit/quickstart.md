# Quickstart: Validação da Memória de Cálculo e Auditoria

**Feature**: 025-pillar-calculation-audit

Guia de validação ponta a ponta. Referências: [contracts/memoria-dom-ui.md](./contracts/memoria-dom-ui.md),
[data-model.md](./data-model.md), [../spec.md](./spec.md).

## Pré-requisitos

```bash
make etl          # gera data/dist/indicadores.zip (o site avisa e degrada se ausente)
npm install       # dependências existentes (nenhuma nova)
```

## Executar

```bash
npm run dev       # http://localhost:4321/indicadores_ifes/ (ou raiz, conforme BASE_URL)
```

## Cenários de validação manual

### C1. Memória por indicador (US1 — P1)

1. Abra `/pilar-1/`. Confirme que os cartões estão idênticos ao estado atual e cada um tem
   o controle **"Ver memória de cálculo"** recolhido (FR-001, FR-012).
2. Expanda a memória do **PIES**. Confirme na tabela:
   - linhas **NEP** e **NTE** com nome, valor bruto do contexto ativo e unidade;
   - a fórmula declarada `PIES = (NEP / NTE) × 100` e a substituída
     `(valorNEP / valorNTE) × 100` com os números do contexto;
   - o **valor final** idêntico ao do cartão PIES no mesmo contexto (FR-005, SC-002).
3. Repita em NTPP (transcrição direta: dado de entrada + valor final, sem variáveis
   inventadas) e no PIPRO (soma `NPB + NPT` com valores substituídos).

### C2. Contexto dinâmico (FR-005)

1. Com a memória do PIES aberta, troque o **ano** e depois o **campus** nos seletores do
   cabeçalho, sem recarregar: variáveis, fórmula substituída, valor final e histórico
   atualizam juntos; a memória permanece aberta (clarificação Q2).
2. Cole um URL com `?campus=<outro>&ano=<outro>`: a memória já carrega correta.

### C3. Indisponibilidade (Princípio III)

1. Selecione um ano/campus sem apuração para um indicador: as células sem dado exibem
   **"Dado indisponível"** — nunca `0`, traço ou nota que pareça valor.
2. Se uma variável existir mas o valor não (avaliação não reconstrutível), a fórmula
   substituída mostra "Dado indisponível" no lugar e a nota transparente aparece — sem
   `Infinity`/`NaN` e sem resultado recalculado.

### C4. Histórico multi-anual (US2 — P2)

1. Na memória do PIES (Campus Serra), confirme que a mini-tabela cobre **todos** os anos
   disponíveis do campus (SC-007), com o ano ativo destacado de forma acessível
   (`aria-current` no cabeçalho do ano).
2. Troque o campus: as colunas de ano passam a refletir os anos daquele campus.

### C5. Rastreabilidade e downloads (US3 — P3)

1. Role até a seção **Rastreabilidade** do pilar: pacote agregado + export canônico
   (todos os pilares) e listagens de matrícula (Pilar 1), com rótulo, data de atualização
   e proveniência (origem/revisão quando existirem) — FR-007, FR-009.
2. Confirme que os links apontam para `…/dados/<arquivo>` (mesmos arquivos de `/dados`).
3. Nas citações dentro de cada memória, confirme o mesmo rótulo da seção e a âncora
   `#rastreabilidade-pilar-{N}` (≤ 2 interações até o download — SC-004).

### C6. Portão de governança fail-closed (Princípio IV, FR-008)

Simulação segura em teste automatizado (fixture de `pendencias.yaml` sem registro válido):
insumos brutos sem nenhum `<a href>`, motivo pt-BR sem jargão, pacote agregado disponível.
Em ambiente real, a checagem é: `/dados` e a rastreabilidade exibem **exatamente o mesmo
estado** para o mesmo arquivo (mesma fonte, zero divergência).

### C7. Acessibilidade e responsividade (US4 — P4, FR-010/FR-011)

1. Somente teclado: Tab até o `<summary>` do PIES → Enter/Espaço abre; foco visível;
   leitor de tela anuncia o `<details>` e as tabelas com `caption`/`scope`.
2. Viewport 360px: memória expandida contida em rolagem horizontal própria — **sem
   overflow da página**; alternar tema claro/escuro mantém contraste AA.
3. Nada depende só de cor (indisponibilidade tem texto; ano ativo tem `aria-current`).

## Validação automatizada

```bash
npm test          # vitest run tests/web — inclui os novos: memoria, aplicar-memoria,
                  # memoria-integracao, rastreabilidade (Princípio II: escritos antes do código)
npm run lint      # ESLint zero erros
npm run build     # build de produção (CI bloqueia deploy se falhar)
```

Testes mínimos que must pass (mapa com a spec):

| Teste                         | Cobre                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `memoria.test.ts`             | FR-002/003/004/006 — substituição, fidelidade, indisponibilidade, histórico                                              |
| `aplicar-memoria.test.ts`     | C-2/C-3 — hooks DOM, não mexe em `open`/foco                                                                             |
| `memoria-integracao.test.ts`  | FR-005 — `sincronizarTela` atualiza memória no pilar                                                                     |
| `rastreabilidade.test.ts`     | FR-007/008/009 — portão fail-closed, arquivo ausente, proveniência, pt-BR                                                |
| asserções de fonte (`.astro`) | FR-010/011/012/014 — `details/summary`, `caption`/`scope`, `aria-current`, sem `<a>` em item indisponível, rótulos pt-BR |

## Critério de aceite final

Todos os cenários C1–C7 verificados + `npm test`, `npm run lint` e `npm run build`
verdes ⇒ feature pronta para PR (com valores conferidos contra o relatório oficial —
Princípio III, passo 4 do workflow de qualidade).
