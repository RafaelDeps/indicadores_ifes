# Data Model: Memória de Cálculo e Auditoria nas Páginas dos Pilares

**Feature**: 025-pillar-calculation-audit | **Date**: 2026-10-15

Modelo em duas camadas: **visão** (derivada, só leitura, calculada de dataset canônico no
build e no cliente) e **rastreabilidade** (derivada de disco + portão de governança no
build). Nenhuma entidade nova persiste dados; tudo é projeção do que já existe.

---

## Entidades reutilizadas (sem alteração)

| Entidade                                                  | Origem                                                                             | Papel nesta feature                                                                               |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `DatasetCompleto`                                         | `src/lib/dataset-core.ts`                                                          | Única fonte de valores (cliente: JSON embutido `#dados-indicadores`; build: `datasetPadrao`)      |
| `IndicadorMeta` / `INDICADORES_META`                      | `src/data/indicadores.ts`                                                          | `formula`, `variaveisFormula` (símbolo/descrição/unidade), `unidade`, `tipoValor`, `slug`, `nome` |
| `Componente` / `ValorComponente`                          | `src/lib/dataset-core.ts` (`extrairMapeamentoIndicador`, `obterIndicadorCompleto`) | Valores por variável, por ano e campus; `quantidade: number \| null`                              |
| `ContextoFiltro`                                          | `src/lib/dataset-core.ts`                                                          | `{ campus, ano }` ativo (URL `?campus=&ano=`)                                                     |
| `FormulaEstruturada`                                      | `src/lib/formula.ts` (`decomporFormula`)                                           | Classificação `fracao`/`soma`/`direta` da fórmula declarada                                       |
| `ArtefatoDownload`                                        | `src/lib/downloads.ts`                                                             | Disponibilidade real, motivo pt-BR, `atualizadoEm`, `bytes`, `caminhoPublico`                     |
| `InsumoCadeia`                                            | `src/lib/downloads.ts` (`obterInsumosCadeia`)                                      | `origem` e `revisao` para proveniência                                                            |
| `PendenciaGovernanca` / `portaoAberto` / `avisoVisitante` | `src/lib/downloads.ts`                                                             | Portão fail-closed (mesmo `pendencias.yaml` de `/dados`)                                          |

## Entidades novas

### `VisaoMemoria` — projeção auditável de um indicador num contexto

```ts
interface VisaoMemoria {
  sigla: string; // ex.: 'PIES'
  slug: string; // ex.: 'pies'
  pilarNumero: 1 | 2 | 3;
  contexto: ContextoFiltro; // contexto em que os valores foram apurados
  variaveis: VisaoVariavelMemoria[];
  formulaDeclarada: string; // texto canônico de INDICADORES_META.formula
  formulaSubstituida: string; // símbolos trocados por valores formatados
  formulaSubstituidaAcessivel: string; // leitura pt-BR para leitores de tela
  valorFinalFormatado: string; // SEMPRE o valor canônico publicado ou TEXTO_INDISPONIVEL
  disponivel: boolean; // valorFinal !== null
  unidade?: string; // omitida quando indisponível (padrão VisaoMetrica)
  unidadeJaNoValor: boolean; // percentuais: '%' já embutido no valor
  nota?: string; // presente quando a avaliação não pôde ser reconstruída
  historico: VisaoMemoriaHistorico;
}
```

### `VisaoVariavelMemoria` — uma linha da tabela de variáveis

```ts
interface VisaoVariavelMemoria {
  simbolo: string; // de variaveisFormula ou da sigla do componente
  nome: string; // descrição canônica; nunca inventada
  unidade: string; // unidade declarada (ex.: 'Estudantes', 'R$', 'Projetos')
  valorFormatado: string; // valor bruto do contexto ativo ou TEXTO_INDISPONIVEL
  disponivel: boolean; // quantidade !== null
  motivoIndisponivel?: string; // propagado do ValorComponente, quando existir
}
```

### `VisaoMemoriaHistorico` — mini-tabela multi-anual (linhas = variáveis)

```ts
interface VisaoMemoriaHistorico {
  anos: number[]; // todos os anos disponíveis p/ o campus, crescente
  anoAtivo: number; // contexto.ano
  linhas: Array<{
    simbolo: string;
    valoresPorAno: Record<number, string>; // formatado ou TEXTO_INDISPONIVEL
  }>;
}
```

### `RastreabilidadePilar` — seção compartilhada por página de pilar

```ts
interface RastreabilidadePilar {
  pilarNumero: 1 | 2 | 3;
  secaoId: string; // ex.: 'rastreabilidade-pilar-1' (âncora das citações)
  portaoAberto: boolean;
  avisoPortao: string | null; // avisoVisitante(...) quando fechado; null quando aberto
  artefatos: ItemRastreabilidade[];
}

interface ItemRastreabilidade {
  id: string;
  arquivo: string; // ex.: 'listagem_2025_1.xlsx'
  rotulo: string; // rótulo pt-BR canônico (mesmo de /dados — FR-009)
  natureza: 'agregado' | 'dado-pessoal';
  caminhoPublico: string; // ex.: 'dados/listagem_2025_1.xlsx'
  disponivel: boolean; // existe em disco ∧ (agregado ∨ portão aberto)
  motivoIndisponivel: string | null;
  bytes: number | null;
  atualizadoEmFormatado: string; // Intl pt-BR / UTC; TEXTO_INDISPONIVEL se null
  origem: string | null; // de InsumoCadeia.origem quando aplicável
  revisao: string | null; // de InsumoCadeia.revisao quando existir
  anos: number[];
  campi: string[];
}
```

### Constante de mapeamento (research D-4)

```ts
// rastreabilidade.ts — única fonte do mapa pilar → artefatos
const MAPA_PILAR_ARTEFATOS: Record<1 | 2 | 3, string[]> = {
  1: [
    'data/dist/indicadores.zip',
    'data/canonical/exports_canonical.zip',
    'data/raw/listagem_*.xlsx',
  ],
  2: ['data/dist/indicadores.zip', 'data/canonical/exports_canonical.zip'],
  3: ['data/dist/indicadores.zip', 'data/canonical/exports_canonical.zip'],
};
```

---

## Regras de validação e invariantes

1. **Fidelidade (Princípio III)** — `valorFinalFormatado` é derivado exclusivamente do
   dataset (`obterIndicadorCompleto(...).valores[contexto.ano].valor`); a memória não
   calcula, arredonda ou corrige nenhum valor. Teste de fidelidade: para cada indicador ×
   contexto com dados, `VisaoMemoria.valorFinalFormatado === formatValor(valorCanônico)`.
2. **Indisponibilidade** — qualquer `null` vira `TEXTO_INDISPONIVEL` ('Dado indisponível');
   proibido `0`, `—`, `''` como substituto em célula de valor.
3. **Fórmula substituída** — só substitui símbolo por valor quando o componente homônimo
   tem valor no contexto; caso contrário insere `Dado indisponível` no lugar do valor e
   popula `nota` (texto transparente, pt-BR). Proibido produzir `Infinity`/`NaN` — não há
   divisão executada, apenas substituição textual (D-2).
4. **Cobertura histórica (SC-007)** — `historico.anos` contém exatamente os anos do campus
   ativo em `DatasetCompleto`; célula faltante vira `Dado indisponível`.
5. **Portão fail-closed (Princípio IV)** — `ItemRastreabilidade.disponivel === false`
   quando o arquivo não existe **ou** (natureza `dado-pessoal` ∧ portão fechado); nesse
   caso o contrato de DOM proíbe renderizar `<a href>` (o motivo é exibido no lugar).
6. **Sem dado individual (Princípio IV)** — nenhum campo do modelo carrega registro em
   nível individual; `Componente.valores` é agregado por ano/campus por construção do ETL.
7. **Consistência de rótulo (FR-009)** — a citação na memória usa o mesmo `arquivo`/`rotulo`
   do `ItemRastreabilidade` correspondente (mesma fonte: `downloads.ts`).
8. **Contexto** — todo `VisaoMemoria` carrega o `ContextoFiltro` em que foi apurada; o
   aplicador só escreve hooks cujo contexto confere (sem valores órfãos de outra seleção).

## Transições de estado

| Estado                      | Onde vive                                         | Transições                                                                                                                                              |
| --------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Memória recolhida/aberta    | atributo `open` do `<details>` (cliente, efêmero) | aberta por ativação do `<summary>` (teclado/mouse); **nunca** escrita pelo aplicador; recolhida ao carregar/navegar (clarificação Q2); não vai para URL |
| Contexto ativo              | URL `?campus=&ano=`                               | troca por seletores globais → `sincronizarTela` recalcula memórias do pilar e reescreve hooks; memória aberta permanece aberta                          |
| Disponibilidade de artefato | disco + `pendencias.yaml` (build)                 | imutável em runtime; mudar exige rebuild (portão fail-closed)                                                                                           |
