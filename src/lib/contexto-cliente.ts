import type { DatasetCompleto } from './dataset-core';
import { resolverContextoComAjuste } from './contexto';
import { computarVisaoGeral, computarVisaoPilar, computarVisaoDetalhe } from './visao';
import { aplicarVisaoGeral, aplicarVisaoPilar, aplicarVisaoDetalhe } from './aplicar-visao';

let datasetCache: DatasetCompleto | null = null;

export function extrairParametrosDeUrl(queryString: string): {
  campus: string | null;
  ano: string | null;
} {
  const search = queryString.startsWith('?') ? queryString : `?${queryString}`;
  const params = new URLSearchParams(search);
  return {
    campus: params.get('campus'),
    ano: params.get('ano'),
  };
}

export function construirUrlComParametros(
  urlCompleta: string,
  campus: string,
  ano: number,
): string {
  try {
    const url = new URL(urlCompleta, 'https://placeholder.local');
    if (campus && campus !== 'todos') {
      url.searchParams.set('campus', campus);
    } else {
      url.searchParams.delete('campus');
    }

    if (ano) {
      url.searchParams.set('ano', String(ano));
    } else {
      url.searchParams.delete('ano');
    }

    return url.pathname + url.search + url.hash;
  } catch {
    return urlCompleta;
  }
}

export function normalizarDestinoLink(
  href: string,
  campus: string,
  ano: number,
  basePath: string = '',
): string {
  if (
    !href ||
    href.startsWith('//') ||
    href.startsWith('#') ||
    href.startsWith('http:') ||
    href.startsWith('https:') ||
    href.startsWith('mailto:')
  ) {
    return href;
  }

  let destino = href;
  if (
    basePath &&
    destino.startsWith('/') &&
    !destino.startsWith(basePath + '/') &&
    destino !== basePath
  ) {
    destino = destino === '/' ? `${basePath}/` : `${basePath}${destino}`;
  }

  try {
    const url = new URL(destino, 'https://placeholder.local');
    if (campus && campus !== 'todos') {
      url.searchParams.set('campus', campus);
    } else {
      url.searchParams.delete('campus');
    }

    if (ano) {
      url.searchParams.set('ano', String(ano));
    } else {
      url.searchParams.delete('ano');
    }

    return url.pathname + url.search + url.hash;
  } catch {
    return destino;
  }
}

export function obterDatasetDoDOM(): DatasetCompleto | null {
  if (datasetCache) return datasetCache;
  if (typeof document === 'undefined') return null;

  const scriptEl = document.getElementById('dados-indicadores');
  if (!scriptEl || !scriptEl.textContent) return null;

  try {
    datasetCache = JSON.parse(scriptEl.textContent) as DatasetCompleto;
    return datasetCache;
  } catch (err) {
    console.error('Erro ao interpretar #dados-indicadores:', err);
    return null;
  }
}

export function atualizarSeletores(doc: Document, campus: string, ano: number): void {
  const idsCampus = ['filtro-campus-topo', 'filtro-campus-drawer'];
  for (const id of idsCampus) {
    const el = doc.getElementById(id) as HTMLSelectElement | null;
    if (el && el.value !== campus) el.value = campus;
  }

  const idsAno = ['filtro-ano-topo', 'filtro-ano-drawer'];
  for (const id of idsAno) {
    const el = doc.getElementById(id) as HTMLSelectElement | null;
    if (el && el.value !== String(ano)) el.value = String(ano);
  }

  doc.querySelectorAll<HTMLSelectElement>('[data-seletor-campus]').forEach((el) => {
    if (el.value !== campus) el.value = campus;
  });

  doc.querySelectorAll<HTMLSelectElement>('[data-seletor-ano]').forEach((el) => {
    if (el.value !== String(ano)) el.value = String(ano);
  });
}

export function propagarLinksInternos(doc: Document, campus: string, ano: number): void {
  if (typeof window === 'undefined') return;

  const repoName = 'indicadores_ifes';
  const path = window.location.pathname;
  const basePath =
    path.startsWith('/' + repoName) || path.includes('/' + repoName + '/') ? '/' + repoName : '';

  doc.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
    const raw = link.getAttribute('href');
    if (!raw) return;

    const normalizado = normalizarDestinoLink(raw, campus, ano, basePath);
    if (normalizado !== raw) {
      link.setAttribute('href', normalizado);
    }
  });
}

export function sincronizarTela(
  campusDesejado?: string,
  anoDesejado?: string | number,
  pushHistorico = false,
): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const dataset = obterDatasetDoDOM();
  if (!dataset) return;

  const paramsUrl = extrairParametrosDeUrl(window.location.search);
  const campusSolicitado = campusDesejado ?? paramsUrl.campus;
  const anoSolicitado = anoDesejado ?? paramsUrl.ano;

  const contexto = resolverContextoComAjuste(campusSolicitado, anoSolicitado, dataset);

  // Atualiza History API
  const novaUrl = construirUrlComParametros(window.location.href, contexto.campus, contexto.ano);
  if (contexto.ajustado) {
    window.history.replaceState(null, '', novaUrl);
  } else if (
    pushHistorico &&
    novaUrl !== window.location.pathname + window.location.search + window.location.hash
  ) {
    window.history.pushState(null, '', novaUrl);
  }

  // Atualiza controles na tela
  atualizarSeletores(document, contexto.campus, contexto.ano);

  // Aplica atualizações no DOM de acordo com a página atual
  if (document.querySelector('[data-kpi-valor]')) {
    const visao = computarVisaoGeral(dataset, contexto);
    aplicarVisaoGeral(document, visao);
  }

  if (document.querySelector('[data-card-valor]')) {
    const path = window.location.pathname;
    const pilarNum = path.includes('/pilar-2') ? 2 : path.includes('/pilar-3') ? 3 : 1;
    const metricasPilar = computarVisaoPilar(dataset, pilarNum, contexto);
    aplicarVisaoPilar(document, metricasPilar);
  }

  const elSiglaDetalhe = document.querySelector('[data-detalhe-sigla]');
  if (elSiglaDetalhe) {
    const sigla = elSiglaDetalhe.getAttribute('data-detalhe-sigla');
    if (sigla) {
      const visaoDetalhe = computarVisaoDetalhe(dataset, sigla, contexto);
      if (visaoDetalhe) {
        aplicarVisaoDetalhe(document, visaoDetalhe);
      }
    }
  }

  // Propaga parâmetros nos links internos
  propagarLinksInternos(document, contexto.campus, contexto.ano);
}

export function inicializarContextoCliente(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Escuta histórico de voltar/avançar
  window.addEventListener('popstate', () => {
    sincronizarTela(undefined, undefined, false);
  });

  // Conecta os seletores do topo e gaveta móvel
  const vincularSeletor = (
    seletorCampus: HTMLSelectElement | null,
    seletorAno: HTMLSelectElement | null,
  ) => {
    if (seletorCampus) {
      seletorCampus.addEventListener('change', () => {
        const anoAtual =
          (document.getElementById('filtro-ano-topo') as HTMLSelectElement)?.value ??
          (document.getElementById('filtro-ano-drawer') as HTMLSelectElement)?.value;
        sincronizarTela(seletorCampus.value, anoAtual, true);
      });
    }

    if (seletorAno) {
      seletorAno.addEventListener('change', () => {
        const campusAtual =
          (document.getElementById('filtro-campus-topo') as HTMLSelectElement)?.value ??
          (document.getElementById('filtro-campus-drawer') as HTMLSelectElement)?.value;
        sincronizarTela(campusAtual, seletorAno.value, true);
      });
    }
  };

  const selCampusTopo = document.getElementById('filtro-campus-topo') as HTMLSelectElement | null;
  const selAnoTopo = document.getElementById('filtro-ano-topo') as HTMLSelectElement | null;
  const selCampusDrawer = document.getElementById(
    'filtro-campus-drawer',
  ) as HTMLSelectElement | null;
  const selAnoDrawer = document.getElementById('filtro-ano-drawer') as HTMLSelectElement | null;

  vincularSeletor(selCampusTopo, selAnoTopo);
  vincularSeletor(selCampusDrawer, selAnoDrawer);

  // Conecta seletores locais na página de detalhe (YearLinks)
  document.querySelectorAll<HTMLSelectElement>('[data-seletor-campus]').forEach((seletor) => {
    seletor.addEventListener('change', () => {
      const anoAtual = (document.querySelector('[data-seletor-ano]') as HTMLSelectElement)?.value;
      sincronizarTela(seletor.value, anoAtual, true);
    });
  });

  document.querySelectorAll<HTMLSelectElement>('[data-seletor-ano]').forEach((seletor) => {
    seletor.addEventListener('change', () => {
      const campusAtual = (document.querySelector('[data-seletor-campus]') as HTMLSelectElement)
        ?.value;
      sincronizarTela(campusAtual, seletor.value, true);
    });
  });

  // Interceptor de cliques para manter integridade dos links relativos
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element)?.closest
        ? ((e.target as Element).closest('a[href]') as HTMLAnchorElement | null)
        : null;
      if (!a) return;
      const raw = a.getAttribute('href');
      if (!raw) return;

      const params = extrairParametrosDeUrl(window.location.search);
      if (params.campus || params.ano) {
        const repoName = 'indicadores_ifes';
        const basePath = window.location.pathname.startsWith('/' + repoName) ? '/' + repoName : '';
        const normalizado = normalizarDestinoLink(
          raw,
          params.campus ?? 'todos',
          params.ano ? parseInt(params.ano, 10) : 2026,
          basePath,
        );
        if (normalizado !== raw) {
          a.setAttribute('href', normalizado);
        }
      }
    },
    true,
  );

  // Executa sincronização inicial da tela
  sincronizarTela(undefined, undefined, false);
}
