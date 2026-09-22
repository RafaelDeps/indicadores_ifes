/**
 * Utilitário executado no cliente para sincronização de parâmetros de busca (?campus=...&ano=...)
 * na URL, suporte a histórico do navegador (popstate) e propagação automática de parâmetros
 * em todos os links internos.
 */

export function obterParametrosUrl(): { campus: string | null; ano: string | null } {
  if (typeof window === 'undefined') {
    return { campus: null, ano: null };
  }
  const params = new URLSearchParams(window.location.search);
  return {
    campus: params.get('campus'),
    ano: params.get('ano'),
  };
}

export function atualizarUrl(campus?: string | null, ano?: string | null, push = true): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (campus) {
    url.searchParams.set('campus', campus);
  } else if (campus === null) {
    url.searchParams.delete('campus');
  }

  if (ano) {
    url.searchParams.set('ano', ano);
  } else if (ano === null) {
    url.searchParams.delete('ano');
  }

  if (push) {
    window.history.pushState(null, '', url.toString());
  } else {
    window.history.replaceState(null, '', url.toString());
  }

  propagarParametrosNosLinksInternos();
}

/**
 * Anexa/atualiza os parâmetros ?campus=...&ano=... em todos os links internos da página
 */
export function propagarParametrosNosLinksInternos(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const { campus, ano } = obterParametrosUrl();
  if (!campus && !ano) return;

  const links = document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('//') || href.startsWith('/#')) return;

    try {
      const url = new URL(href, window.location.origin);
      if (campus && !url.searchParams.has('campus')) {
        url.searchParams.set('campus', campus);
      }
      if (ano && !url.searchParams.has('ano')) {
        url.searchParams.set('ano', ano);
      }
      link.setAttribute('href', url.pathname + url.search + url.hash);
    } catch {
      // Ignore URL parsing errors on special links
    }
  });
}

/**
 * Inicializa os ouvintes de evento de histórico e propagação de links
 */
export function inicializarSincronizacaoUrl(): void {
  if (typeof window === 'undefined') return;

  propagarParametrosNosLinksInternos();

  window.addEventListener('popstate', () => {
    propagarParametrosNosLinksInternos();
  });
}
