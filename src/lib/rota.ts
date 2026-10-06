/**
 * Normaliza a rota corrente para comparação com caminhos do site (feature 016,
 * T020 — a correção que H-5 exige).
 *
 * ## O defeito
 *
 * No build estático, `Astro.url.pathname` **inclui o `base`**. Com
 * `base: '/indicadores_ifes'`, a página `/pilar-1/index.html` é renderizada com
 * `pathname === '/indicadores_ifes/pilar-1/'`, e a home com
 * `'/indicadores_ifes'`. Um `pathname.startsWith('/pilar-1')` é então
 * **sempre falso**, e `pathname === '/'` também.
 *
 * A consequência é que nenhuma página marca sua aba como atual no cabeçalho:
 * nem `Visão geral`, nem os pilares, nem `/dados/`. Todo link recebe
 * `aria-current={undefined}` e a classe `ativa` nunca é aplicada. O defeito é
 * anterior a esta feature e afetava as quatro abas — aqui ele só ficou visível
 * porque H-5 exige que `/dados/` **seja** marcada.
 *
 * A comparação também é sensível ao final: `/dados` sem barra é a mesma rota
 * que `/dados/`, e `startsWith` puro aceitaria ambas sem dificuldade.
 */

/**
 * Remove o `base` do início do caminho e devolve o caminho de rota.
 *
 * @param pathname `Astro.url.pathname`, com ou sem `base`.
 * @param base `import.meta.env.BASE_URL`, com ou sem barra final.
 * @returns caminho começando por `/`, ou `'/'` para a raiz.
 *
 * @example
 * rotaRelativa('/indicadores_ifes/dados/', '/indicadores_ifes/') // '/dados/'
 * rotaRelativa('/indicadores_ifes', '/indicadores_ifes/')        // '/'
 * rotaRelativa('/dados/', '/')                                    // '/dados/'
 */
export function rotaRelativa(pathname: string, base: string): string {
  let caminho = pathname || '/';

  // Normaliza o base para a forma `/prefixo` — sem barra duplicada e sem barra
  // final. `/` vira string vazia, que casa com qualquer caminho.
  const prefixo = base.replace(/\/+$/, '');

  if (prefixo && (caminho === prefixo || caminho.startsWith(`${prefixo}/`))) {
    caminho = caminho.slice(prefixo.length);
  }
  // Uma barra final só depois de cortar: cortar antes deixaria `/pilar-1` sem
  // a barra que distingue a rota da página de um possível filho sem diretório.
  if (!caminho.startsWith('/')) caminho = `/${caminho}`;
  if (caminho.length > 1) caminho = caminho.replace(/\/+$/, '');
  return caminho === '' ? '/' : caminho;
}

/**
 * Diz se a rota corrente está dentro de um segmento do site.
 *
 * Compara por segmento, e não por `startsWith` cru: `startsWith('/pilar-1')`
 * também casa com `/pilar-10`, que é outra página. A comparison é feita sobre a
 * rota já normalizada por {@link rotaRelativa}.
 *
 * @param pathname `Astro.url.pathname`.
 * @param base `import.meta.env.BASE_URL`.
 * @param segmento segmento do site, sem barra nas pontas.
 */
export function rotaDentroDe(pathname: string, base: string, segmento: string): boolean {
  const rota = rotaRelativa(pathname, base);
  if (rota === '/') return segmento === '';
  return rota === `/${segmento}` || rota.startsWith(`/${segmento}/`);
}
