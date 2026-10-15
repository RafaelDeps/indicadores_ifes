# Research: Memória de Cálculo e Auditoria nas Páginas dos Pilares

**Feature**: 025-pillar-calculation-audit | **Date**: 2026-10-15

Não há NEEDS CLARIFICATION pendentes na spec (clarificações de 2026-10-15 resolvidas:
rastreabilidade híbrida, estado não persistido em URL, marcação herdada de `/dados`).
Este documento registra as decisões de design e suas alternativas.

---

## D-1. Onde a memória vive no DOM: célula do grid, fora do `<a>` do cartão

**Decision**: Cada célula do grid de indicadores passa a ser um contêiner
(`<div class="celula-indicador">`) com o `IndicatorCard` (que continua sendo um único
`<a>` inalterado) seguido do novo componente `MemoriaCalculo.astro` (um `<details>`).
Visualmente anexados (borda/raio compartilhados), semanticamente irmãos.

**Rationale**: O `IndicatorCard.astro` renderiza o cartão inteiro como `<a>` (linha 55).
Aninhar um `<details>`/`<button>` dentro de um `<a>` é HTML inválido e produz um alvo de
clique ambíguo — quebra acessibilidade e testes existentes (`cartaoIndicador.test.ts`).
Envolver o cartão num contêiner mantém o link intacto e o disclosure progressivo
(FR-012: página recolhida = aparência atual, apenas o `<details>` fechado se soma).

**Alternatives considered**:

- _Reescrever o cartão como `<div>` com link só no título_: muda a superfície de clique,
  quebra testes e comportamento existente sem ganho de auditoria.
- _Memória dentro de um drawer único por pilar_: rejeitada pela clarificação da spec
  (memória por indicador, proximidade número↔auditoria).
- _Página/tab de auditoria separada_: exige rota nova e navegação; o pedido pede
  disclosure progressivo na própria página.

## D-2. Fórmula substituída: decomposição reutilizada, resultado SEMPRE o publicado

**Decision**: A coluna/linha "fórmula aplicada" substitui os símbolos da fórmula declarada
pelos valores formatados das variáveis no contexto ativo, usando `decomporFormula`
(`src/lib/formula.ts`) — que já classifica `PIES = (NEP / NTE) × 100` como `fracao`
(numerador/denominador/multiplicador), `PIPRO = NPB + NPT` como `soma` e as demais como
`direta`. O **valor final exibido é sempre o valor canônico** do dataset
(`percentual_calculado_*`/`total_*`), nunca o resultado de um recálculo feito pela memória.
Quando qualquer variável da fórmula está sem valor no contexto, a avaliação substituída
mostra `Dado indisponível` no lugar do valor e uma nota transparente informa que a
avaliação não pôde ser reconstruída (edge case da spec), sem jamais imprimir `Infinity`,
`NaN` ou um resultado inventado (Princípio III).

**Rationale**: Recalcular `(NEP / NTE) × 100` e exibir o resultado criaria uma segunda
fonte de verdade que pode divergir do relatório por arredondamento — violação direta do
Princípio III. A substituição é ilustrativa; a apuração oficial é inquestionável.

**Alternatives considered**:

- _Exibir também o resultado recomputado ao lado do oficial_: convida comparação
  confusa e risco de divergência visual; rejeitado.
- _Parser de fórmulas genérico (AST)_: desnecessário; `decomporFormula` já cobre os 3
  formatos das 9 fórmulas reais (verificadas em `INDICADORES_META`), e adicioná-lo seria
  complexidade sem retorno (Princípio I).

## D-3. Mapeamento símbolo ↔ componente e o caso `direta`

**Decision**: O símbolo de cada `variaveisFormula` coincide com a `sigla` do
`Componente` produzido por `extrairMapeamentoIndicador` (NEP/NTE para PIES, NTECPP/NEP
para PICOT, TAFPPI/OCC para PINV, NAPPCT para PIPDI, NPB/NPT para PIPRO, PA/RM/DI/C/TC/PC/OGM
para PIPROT, CT/CL/CC para PIPROTR, SUPP para QSPP). A tabela de variáveis da memória lista
a união: símbolo+nome+unidade vindos de `variaveisFormula`, valor do componente homônimo.

**Caso `direta`**: quando `expressaoDireta` é exatamente a sigla de um componente
(QSPP = SUPP, PIPDI = NAPPCT), a substituição é `valor = valor`. Quando é texto descritivo
(NTPP = "Projetos registrados em execução"), a linha de fórmula substituída exibe o texto
e a tabela de variáveis já mostra o componente de entrada (PRE) com seu valor — a memória
não inventa um símbolo que não existe no dicionário (edge case da spec).

**Rationale**: Reuso integral do dicionário existente; qualquer símbolo novo teria de ser
inventado, o que a spec proíbe.

**Alternatives considered**:

- _Tabela só com componentes (sem `variaveisFormula`)_: perderia unidades e descrições
  canônicas para variáveis de fórmula sem componente no ano (dicionário é a fonte estável).
- _Fuzzy matching de nomes_: frágil e desnecessário — os siglas já batem.

## D-4. Rastreabilidade: reuso total de `downloads.ts` + mapa pilar→artefatos

**Decision**: A `SecaoRastreabilidade.astro` recebe, em build time, a lista de artefatos do
pilar de `obterRastreabilidadePilar(pilar, raizRepo)` (novo módulo `rastreabilidade.ts`),
que reutiliza `carregarDownloads`, `portaoAberto`, `avisoVisitante`, `descobrirInsumos` e
`obterInsumosCadeia` de `src/lib/downloads.ts`. O mapa pilar→artefatos é uma constante
única e documentada:

- **Todos os pilares** → `indicadores.zip` (pacote agregado canônico) e
  `data/canonical/exports_canonical.zip` (origem da cadeia inteira);
- **Pilar 1** (engajamento: NTPP, QSPP, PIES, PICOT) → adicionalmente as
  `listagem_*.xlsx` de matrícula (alimentam NEP/NTE/PRE/SUPP);
- **Pilares 2 e 3** → pacote + export canônico (os valores vêm da base oficial
  consolidada no export; não há listagem de matrícula associada).

As citações dentro de cada memória de indicador usam o mesmo `rotulo`/`arquivo` da seção e
apontam (âncora `#rastreabilidade-pilar-N`) para ela. Disponibilidade, motivo em pt-BR e
portão fail-closed vêm de `ArtefatoDownload` — a rastreabilidade **não mantém marcação ou
rotulagem própria** (clarificação Q3, Opção A).

**Rationale**: `downloads.ts` já implementa exatamente as regras exigidas por FR-008
(existência real em disco, gate fail-closed com `contem`, cópia para `public/dados/`,
motivos sem jargão). Duplicar seria criar duas fontes de verdade que podem divergir — o
mesmo argumento do comentário do próprio módulo ("as duas pontas leem a mesma fonte para
não poderem divergir").

**Alternatives considered**:

- _Mapeamento por indicador (cada indicador → arquivo exato)_: a base atual não registra
  consumo por indicador (a cadeia é por etapa: `make etl`, `make etl-listagens`);
  inventar essa granularidade seria afirmar rastreabilidade que o registro não sustenta.
- _Link genérico para `/dados`_: rejeitado pela clarificação Q1 (Opção C exige
  seção por pilar + citação por memória).

## D-5. Atualização cliente: extensão de `sincronizarTela`

**Decision**: `contexto-cliente.ts` ganha um despacho paralelo ao de `[data-card-valor]`:
se a página contém `[data-memoria]`, calcula `computarVisaoMemoria` para cada indicador do
pilar (2–4 memórias) e chama `aplicarMemoria(document, memorias)`, que preenche os hooks
`data-memoria-*` **independentemente do `<details>` estar aberto ou fechado** — assim,
ao expandir depois de trocar contexto, os valores já estão corretos ("primeira pintura
correta", edge case da spec). O `<summary>` não é tocado pelo aplicador: abrir/fechar é
estado nativo do `<details>`, não vai para URL e não sobrevive a navegação (clarificação
Q2, Opção A). Dentro da mesma página, trocar ano/campus mantém o `<details>` aberto —
o aplicador não mexe no atributo `open`.

**Rationale**: É o mesmo ponto de extensão usado por KPIs, cartões e detalhe (features
013/021); custo por sincronização é desprezível (≤ 4 memórias × ≤ 7 anos).

**Alternatives considered**:

- _Recalcular memórias só quando abertas (lazy)_: exigiria listener de `toggle` +
  invalidação em cada troca de contexto; mais estados para errar, ganho nulo (cálculo é
  barato).
- _Renderizar a memória 100% no cliente (sem HTML inicial)_: perderia no-JS/SEO/estática
  e o padrão do site (build-time render + client sync).

## D-6. Formatação: reuso de `formatters.ts` + formatador de data de arquivo

**Decision**: Valores e anos usam `formatValor`/`formatAno`/`TEXTO_INDISPONIVEL`. A data de
atualização dos artefatos (`atualizadoEm: Date | null`, mtime do arquivo) ganha um
`formatDataArquivo(data: Date | null): string` em `formatters.ts` (`Intl.DateTimeFormat`
pt-BR, fuso UTC, coerente com `formatDate` existente), retornando `TEXTO_INDISPONIVEL`
para `null`. Bytes seguem rotulação simples em pt-BR (KB/MB com uma casa), sem casas
decimais inventadas além do padrão definido no módulo.

**Rationale**: Consistência de formato com o restante do site e com o Princípio III
(nenhuma data "aproximada" escrita à mão).

**Alternatives considered**:

- _Exibir ISO bruto_: hostil ao público-alvo (gestores/comunidade).
- _Dependência nova de formatação (ex.: `date-fns`)_: viola Princípio I; `Intl` nativo
  já cobre.

## D-7. Estratégia de testes (Princípio II — red → green → refactor)

**Decision**: Vitest em `tests/web/`, dois padrões já consagrados no repositório:

1. **Mocks de DOM em Node puro** (padrão `aplicar-visao.test.ts`/`ElementoMock`) para
   `aplicar-memoria.ts` e a integração de `sincronizarTela`;
2. **Asserções sobre o fonte `.astro`** (padrão `pagina-dados.test.ts`) para exigências
   estruturais de marcação (`<details>`, `aria-*`, `scope`, `caption`, rótulos pt-BR,
   ausência de link em item indisponível) em `MemoriaCalculo.astro` e
   `SecaoRastreabilidade.astro`.
   `memoria.test.ts` roda sobre o dataset real (`data/dist/indicadores.zip` via
   `carregarDataset`) quando presente, com fixture de fallback sintética para CI sem dados —
   mesma abordagem de `dataset.test.ts`/`visao.test.ts`. Nenhuma dependência nova (sem jsdom).

**Rationale**: Zero dependências novas (Princípio I); os dois padrões já validam este tipo
de exigência no projeto (013/016/023).

**Alternatives considered**:

- _jsdom/playwright_: dependência nova + custo de CI sem necessidade (nenhuma interação
  complexa; `<details>` é nativo).
- _Testar só funções puras e não a marcação_: FR-010/FR-011/FR-014 exigem propriedades de
  marcação/acessibilidade que só a asserção de fonte cobre.

## D-8. Cobertura do histórico multi-anual

**Decision**: A mini-tabela histórica deriva dos `valoresPorAno` já computados por
`obterIndicadorCompleto` (mesma fonte de `VisaoComponente.valoresPorAno` em
`computarVisaoDetalhe`): todas as colunas de ano disponíveis para o campus ativo, célula
`Dado indisponível` quando `quantidade === null`, ano ativo destacado (`data-memoria-ano-ativo`

- classe) e marcado também em texto acessível (`aria-current` na célula de cabeçalho do ano).

**Rationale**: Reuso direto do mecanismo que já alimenta o "Detalhamento por componente"
do detalhe; SC-007 (100% dos anos disponíveis) sai de graça e testável.

**Alternatives considered**:

- _Limitar a N anos_: arbitrário; o dataset tem 3 anos (2024–2026) e o SC pede 100%.
- _Reusar `HistoricalSeries.astro`_: o componente é por indicador (série do valor final),
  não por variável — a mini-tabela da memória é transposta (linhas = variáveis).
