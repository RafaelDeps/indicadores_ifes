import type { DatasetCompleto } from './dataset-core';
import { resolverContextoComAjuste } from './contexto';
import { computarVisaoGeral, computarVisaoPilar, computarVisaoDetalhe } from './visao';
import { aplicarVisaoGeral, aplicarVisaoPilar, aplicarVisaoDetalhe } from './aplicar-visao';
import { obterTemaSalvo, aplicarTema } from './tema';
import { criarIndiceBusca, pesquisarIndicadores } from './busca';

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
  let campusSolicitado = campusDesejado ?? paramsUrl.campus;
  if (!campusSolicitado || campusSolicitado === 'todos') {
    campusSolicitado = 'serra';
  }
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

  // Conecta botões de alternância de tema (Sol: Claro, Lua: Escuro)
  const botoesTema = document.querySelectorAll<HTMLButtonElement>('[data-btn-tema]');
  if (botoesTema.length > 0) {
    const temaInicial =
      (document.documentElement.getAttribute('data-theme') as 'claro' | 'escuro' | null) ||
      obterTemaSalvo();
    aplicarTema(document, temaInicial === 'escuro' ? 'escuro' : 'claro');

    botoesTema.forEach((btn) => {
      btn.addEventListener('click', () => {
        const modo = btn.getAttribute('data-btn-tema');
        if (modo === 'claro' || modo === 'escuro') {
          aplicarTema(document, modo);
        }
      });
    });
  }

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

  // Inicializa a busca rápida
  inicializarBuscaRapida(document);

  // Executa sincronização inicial da tela
  sincronizarTela(undefined, undefined, false);
}

export function inicializarBuscaRapida(doc: Document): void {
  const inputsBusca = doc.querySelectorAll('[data-busca-input]');
  if (inputsBusca.length === 0) return;

  const dataset = obterDatasetDoDOM() ?? undefined;
  const indice = criarIndiceBusca(dataset);

  inputsBusca.forEach((inputEl) => {
    const input = inputEl as HTMLInputElement;
    const container = input.closest('.busca-container');
    const ulResultados = container?.querySelector(
      '[data-busca-resultados]',
    ) as HTMLUListElement | null;
    if (!ulResultados) return;

    let indexSelecionado = -1;

    const fecharResultados = () => {
      ulResultados.innerHTML = '';
      ulResultados.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      indexSelecionado = -1;
    };

    const atualizarSelecaoVisual = (itens: HTMLElement[]) => {
      itens.forEach((el, idx) => {
        const selecionado = idx === indexSelecionado;
        el.setAttribute('aria-selected', selecionado ? 'true' : 'false');
        if (selecionado && typeof el.scrollIntoView === 'function') {
          el.scrollIntoView({ block: 'nearest' });
        }
      });
    };

    const executarNavegacao = (href: string) => {
      if (typeof window === 'undefined') return;
      const params = extrairParametrosDeUrl(window.location.search);
      const campus = params.campus ?? 'todos';
      const ano = params.ano ? parseInt(params.ano, 10) : 2026;
      const repoName = 'indicadores_ifes';
      const basePath = window.location.pathname.startsWith('/' + repoName) ? '/' + repoName : '';
      const normalizado = normalizarDestinoLink(href, campus, ano, basePath);
      window.location.href = normalizado;
    };

    input.addEventListener('input', () => {
      const termo = input.value.trim();
      if (!termo) {
        fecharResultados();
        return;
      }

      const resultados = pesquisarIndicadores(indice, termo);
      ulResultados.innerHTML = '';
      indexSelecionado = -1;

      if (resultados.length === 0) {
        const liVazio = doc.createElement('li');
        liVazio.className = 'busca-vazio';
        liVazio.setAttribute('role', 'option');
        liVazio.setAttribute('aria-disabled', 'true');
        liVazio.textContent = 'Nenhum indicador encontrado para o termo pesquisado';
        ulResultados.appendChild(liVazio);
      } else {
        resultados.slice(0, 6).forEach((r) => {
          const li = doc.createElement('li');
          li.className = 'busca-item';
          li.setAttribute('data-busca-item', '');
          li.setAttribute('role', 'option');
          li.setAttribute('aria-selected', 'false');
          li.setAttribute('data-href', `/pilar-${r.pilarNumero}/${r.slug}/`);

          const topo = doc.createElement('div');
          topo.className = 'busca-item-topo';

          const siglaSpan = doc.createElement('span');
          siglaSpan.className = 'busca-sigla';
          siglaSpan.textContent = r.sigla;

          const pilarSpan = doc.createElement('span');
          pilarSpan.className = 'busca-pilar';
          pilarSpan.textContent = `Pilar ${r.pilarNumero}`;

          topo.appendChild(siglaSpan);
          topo.appendChild(pilarSpan);

          const nomeSpan = doc.createElement('span');
          nomeSpan.className = 'busca-nome';
          nomeSpan.textContent = r.nome;

          li.appendChild(topo);
          li.appendChild(nomeSpan);

          li.addEventListener('click', () => {
            executarNavegacao(li.getAttribute('data-href') || `/pilar-${r.pilarNumero}/${r.slug}/`);
          });

          ulResultados.appendChild(li);
        });
      }

      ulResultados.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    });

    input.addEventListener('keydown', (e) => {
      const itens = Array.from(ulResultados.querySelectorAll('[data-busca-item]')) as HTMLElement[];
      if (itens.length === 0) {
        if (e.key === 'Escape') fecharResultados();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        indexSelecionado = (indexSelecionado + 1) % itens.length;
        atualizarSelecaoVisual(itens);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        indexSelecionado = (indexSelecionado - 1 + itens.length) % itens.length;
        atualizarSelecaoVisual(itens);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (indexSelecionado >= 0 && indexSelecionado < itens.length) {
          const href = itens[indexSelecionado].getAttribute('data-href');
          if (href) executarNavegacao(href);
        } else if (itens.length > 0) {
          const href = itens[0].getAttribute('data-href');
          if (href) executarNavegacao(href);
        }
      } else if (e.key === 'Escape') {
        fecharResultados();
      }
    });

    doc.addEventListener('click', (e) => {
      if (!container?.contains(e.target as Node)) {
        fecharResultados();
      }
    });
  });
}
