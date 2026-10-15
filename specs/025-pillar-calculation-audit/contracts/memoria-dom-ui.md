# Contract: DOM & UI da Memória de Cálculo e da Rastreabilidade

**Feature**: 025-pillar-calculation-audit | **Date**: 2026-10-15

Contratos de interface do usuário (aplicação estática Astro): hooks `data-*` que o
aplicador cliente escreve, marcação acessível exigida, e assinaturas das funções que
componentes e `contexto-cliente.ts` consomem. Cada item é verificável por teste
(Vitest, padrões do repositório).

---

## C-1. Funções puras (fonte de verdade da visão)

```ts
// src/lib/memoria.ts
export function computarVisaoMemoria(
  dataset: DatasetCompleto,
  sigla: string,
  contexto: ContextoFiltro,
): VisaoMemoria | undefined; // undefined quando o indicador/campus não existe no dataset

// src/lib/rastreabilidade.ts
export function obterRastreabilidadePilar(
  pilarNumero: 1 | 2 | 3,
  raizRepo?: string, // padrão: process.cwd() (build time apenas)
): RastreabilidadePilar;
```

Invariantes contratuais (ver data-model.md §Regras 1–8): fidelidade ao canônico,
`TEXTO_INDISPONIVEL` para ausência, substituição sem execução de divisão, cobertura
histórica = anos do campus, fail-closed no portão.

## C-2. Aplicador cliente

```ts
// src/lib/aplicar-memoria.ts
export function aplicarMemoria(doc: Document, memorias: VisaoMemoria[]): void;
```

- Preenche os hooks da C-3 **independentemente do estado `open` do `<details>`**.
- NÃO altera `open`, `aria-expanded` ou foco (estado nativo do `<details>`; clarificação Q2).
- NÃO reescreve hooks de outros blocos (`data-card-*`, `data-kpi-*`, `data-detalhe-*`).

## C-3. Hooks de DOM da memória (por indicador, prefixados pela sigla)

Contêiner raiz por indicador: `[data-memoria="{SIGLA}"]` (o `<details>`).

| Hook                                                                                              | Conteúdo escrito pelo aplicador                                                                                        |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `[data-memoria-variavel-valor="{SIGLA}"][data-memoria-simbolo="{SIMBOLO}"]`                       | valor bruto da variável no contexto ativo (`formatValor` ou `TEXTO_INDISPONIVEL`)                                      |
| `[data-memoria-variavel-linha="{SIMBOLO}"]` (atributo de `<tr>`)                                  | recebe/remove `data-memoria-indisponivel` conforme disponibilidade (estilização; nunca única fonte de informação)      |
| `[data-memoria-formula-declarada="{SIGLA}"]`                                                      | fórmula canônica de `INDICADORES_META.formula` (estática; escrita em build)                                            |
| `[data-memoria-formula-substituida="{SIGLA}"]`                                                    | fórmula com valores substituídos (ex.: `(1.234 / 45.678) × 100`), com `Dado indisponível` no lugar de valores ausentes |
| `[data-memoria-nota="{SIGLA}"]`                                                                   | texto da nota de avaliação não reconstruída; esvaziado/oculto quando a avaliação é completa                            |
| `[data-memoria-valor-final="{SIGLA}"]`                                                            | valor final apurado canônico (coincide com `data-card-valor` do cartão no mesmo contexto)                              |
| `[data-memoria-valor-final-unidade="{SIGLA}"]`                                                    | unidade; vazio quando `unidadeJaNoValor` (padrão anti "23%%")                                                          |
| `[data-memoria-hist-valor="{SIGLA}"][data-memoria-simbolo="{SIMBOLO}"][data-memoria-ano="{ANO}"]` | valor da variável no ano da coluna                                                                                     |
| `[data-memoria-hist-ano="{SIGLA}"]` (em `<th scope="col">`)                                       | recebe `aria-current` quando `ANO === contexto.ano` (destaque acessível; destaque visual nunca único sinal)            |

## C-4. Marcação acessível obrigatória (verificável por asserção de fonte)

`MemoriaCalculo.astro`:

- `<details class="memoria" data-memoria="{SIGLA}">` com `<summary>` rotulado
  **"Ver memória de cálculo"** em pt-BR (texto visível, não só ícone).
- Tabela de variáveis: `<table>` com `<caption>` acessível (ex.: "Variáveis da fórmula de
  {SIGLA} para {ano} — {campus}") e `<th scope="col">` em todas as colunas.
- Tabela histórica: `<caption>` próprio e `<th scope="col">` nos anos; cabeçalho do ano
  ativo com `aria-current`.
- Nenhum controle aninhado dentro do `<summary>` além do texto do rótulo.

`SecaoRastreabilidade.astro`:

- `<section id="{secaoId}" aria-labelledby="{secaoId}-titulo">` com `<h2>` pt-BR.
- Cada artefato disponível: `<a href="{base}{caminhoPublico}" download>` com o `rotulo`
  como texto do link; `atualizadoEmFormatado`, tamanho legível, `origem`/`revisao`
  quando existirem.
- Cada artefato indisponível: **nenhum `<a href>`**; motivo em pt-BR visível como texto.
- Portão fechado: aviso de `/dados` (`avisoVisitante`) exibido uma vez na seção
  (`role="status"`), sem identificadores internos; insumos brutos sem link.
- Citação dentro da memória: link de âncora `#{secaoId}` com o `rotulo` canônico do artefato.

## C-5. Integração em `contexto-cliente.ts`

- `sincronizarTela` detecta `[data-memoria]` na página, resolve o pilar pelo pathname
  (mesma lógica de `[data-card-valor]`), computa `computarVisaoMemoria` para cada
  indicador do pilar e chama `aplicarMemoria(document, memorias)`.
- Ordem no fluxo existente: após `aplicarVisaoPilar`, antes de `propagarLinksInternos`
  (para que âncoras de citação herdem `?campus=&ano=` como o restante dos links).
- `popstate` e seletores globais chegam à memória pelo mesmo caminho (nenhum listener
  novo além do já existente).

## C-6. Estrutura das páginas de pilar

```text
/pilar-{N}/index.astro
├── <div class="grade">                    # grid existente
│   └── <div class="celula-indicador">     # NOVO contêiner por indicador
│       ├── <IndicatorCard .../>           # <a> intacto (C-4/research D-1)
│       └── <MemoriaCalculo indicador={...} contextoInicial={...} />   # <details> recolhido
└── <SecaoRastreabilidade rastreabilidade={...} base={...} />          # build time, após o grid
```

- `contextoInicial` (build) = campus `serra` + ano padrão — o mesmo critério do cartão;
  o cliente corrige na primeira sincronização.
- A seção de rastreabilidade é build-time only: não participa da sincronização cliente.

## C-7. URLs e estado

- Nenhum parâmetro novo na URL (clarificação Q2): apenas `?campus=&ano=` existentes.
- Âncora `#rastreabilidade-pilar-{N}` é o único fragmento novo (citação nas memórias).
