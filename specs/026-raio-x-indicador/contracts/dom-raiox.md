# Contract: DOM, funções e integração do Raio-X

**Feature**: 026-raio-x-indicador | **Date**: 2026-10-15

Contrato de interface do usuário: hooks `data-raiox-*`, estrutura acessível do diálogo,
assinaturas dos módulos frontend e integração com as páginas existentes. Verificável por
testes Vitest (mocks de DOM em Node puro + asserções de fonte, padrões do repositório).

---

## A. Funções puras (`src/lib/raiox.ts`)

```ts
export function normalizarBuscaRaiox(termo: string): string; // NFD + sem diacríticos + lowercase (D-10)
export function filtrarRegistros(
  registros: RegistroRaiox[],
  campos: string[],
  termo: string,
): RegistroRaiox[]; // match em qualquer campo textual
export function ordenarRegistros(
  registros: RegistroRaiox[],
  campo: string,
  direcao: 'asc' | 'desc',
): RegistroRaiox[]; // estável; null por último
export function paginarRegistros(
  registros: RegistroRaiox[],
  pagina: number,
  porPagina: 25 | 50 | 100,
): { fatia: RegistroRaiox[]; totalPaginas: number };
export function construirResumo(componente: ComponenteRaiox): ResumoRaiox; // selo (D-4)
export async function buscarFixture(
  base: string,
  indicador: string,
  campus: string,
  ano: number,
): Promise<FixtureRaiox>; // 404 ⇒ erro específico "sem fixture"
```

## B. Hooks de DOM (aplicador `src/lib/aplicar-raiox.ts`)

Diálogo único por página: `[data-raiox-dialog]`. Abas: `[data-raiox-tab="{SIMBOLO}"]`,
painéis `[data-raiox-panel="{SIMBOLO}"]`. Tabela: `[data-raiox-corpo="{SIMBOLO}"]`
(`<tbody>`), cabeçalhos ordenáveis `[data-raiox-coluna="{campo}"]` com `aria-sort`.
Controles: busca `[data-raiox-busca]`, paginação `[data-raiox-pagina]` /
`[data-raiox-por-pagina]`, export `[data-raiox-exportar]`, fechar `[data-raiox-fechar]`.

| Hook                                | Conteúdo                                                                                                       |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `[data-raiox-titulo]`               | "Raio-X do Indicador — {SIGLA} · {campusNome} · {ano}"                                                         |
| `[data-raiox-selo="{SIMBOLO}"]`     | "Exibindo N registros listados \| Total apurado: A ✓ (Conferido)" ou estado de divergência com os dois números |
| `[data-raiox-contador="{SIMBOLO}"]` | "Exibindo Y de N registros"                                                                                    |
| `[data-raiox-rodape-formula]`       | fórmula declarada com valores substituídos + valor final publicado (FR-007)                                    |
| `[data-raiox-proveniencia]`         | fontes + data de geração (US3)                                                                                 |
| `[data-raiox-aviso-dados]`          | marcação pt-BR de dados pessoais (FR-013), quando aplicável                                                    |
| `[data-raixo-*]` (estado)           | `data-raiox-estado` ∈ {carregando, pronto, sem-detalhamento, sem-fixture, erro}                                |

Regras: nenhum micrado no HTML inicial; estado de carregamento/erro legíveis; a aplicação
nunca escreve fora do diálogo; troca de contexto com o drawer aberto re-busca e re-aplica
(nunca conteúdo misto de contextos).

## C. Gatilho (`src/components/BotaoRaioX.astro`)

- `<button type="button" data-raiox-trigger="{SIGLA}">` com rótulo pt-BR
  ("[🔍 Raio-X do Indicador]" / "Auditar dados brutos") e rótulo acessível.
- Renderizado **apenas** quando `portaoAberto()` (build) — portão fechado ⇒ sem gatilho
  (fail-closed, FR-011); posição: célula do cartão de pilar FORA do `<a>` (`.celula-indicador`,
  lição da 025) e área de ações da página de detalhe.
- Atributos de contexto atuais (`data-raiox-contexto-campus/ano` não são necessários: o
  cliente lê o contexto da URL no momento de abrir — mesmos parâmetros `?campus=&ano=`).

## D. Acessibilidade do diálogo (FR-014)

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` no título; abas com
  `role="tablist"/tab/tabpanel` e navegação por setas; `aria-sort` nos cabeçalhos ordenáveis.
- Foco preso no diálogo (TAB cicla); ESC fecha; botão "Fechar" explícito; foco devolvido ao
  disparador que abriu.
- Teclado completo: buscar, trocar aba, ordenar, paginar, exportar, fechar — tudo alcançável
  e operável sem mouse; foco visível (`:focus-visible` nos tokens).
- Tabela contida em rolagem própria a partir de 360px; temas claro/escuro via tokens.
- Texto todo em pt-BR (FR-015); "Dado indisponível" para células nulas (Princípio III).

## E. Integração nas páginas

- Pilar (`/pilar-{1,2,3}/index.astro`): célula do indicador = cartão + memória (025) +
  `BotaoRaioX` + `RaioXDrawer` (um por página, no fim do body).
- Detalhe (`/pilar-{N}/[sigla]/`): `BotaoRaioX` na área de ações + `RaioXDrawer`.
- Visibilidade do gatilho: `portaoAberto()` em build (mesma fonte de `/dados` e da
  rastreabilidade 025); sem gatilho quando fechado (FR-011).

## F. Cliente (`src/lib/raiox-cliente.ts`)

- `inicializarRaiox(doc)`: liga os gatilhos → abre diálogo → resolve contexto da URL
  (`resolverContextoComAjuste`) → `buscarFixture` → `aplicarRaiox`.
- ESC/foco/fechar conforme D; troca de contexto (popstate/seletores) com drawer aberto ⇒
  re-busca; navegação ⇒ fecha.
- Módulo importado pelo script cliente das páginas afetadas (padrão `contexto-cliente.ts`).
