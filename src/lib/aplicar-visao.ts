import type { VisaoPaginaGeral, VisaoPaginaDetalhe, VisaoMetrica } from './visao';

export function aplicarVisaoGeral(doc: Document, visao: VisaoPaginaGeral): void {
  // Atualiza os cartões de KPI no topo da Visão Geral
  for (const [sigla, kpi] of Object.entries(visao.kpis)) {
    const elValor = doc.querySelector(`[data-kpi-valor="${sigla}"]`);
    if (elValor) {
      elValor.textContent = kpi.valorFormatado;
      if (!kpi.disponivel) {
        elValor.classList.add('badge-indisponivel');
      } else {
        elValor.classList.remove('badge-indisponivel');
      }
    }

    const elUnidade = doc.querySelector(`[data-kpi-unidade="${sigla}"]`) as HTMLElement | null;
    if (elUnidade) {
      if (kpi.disponivel && kpi.unidade) {
        elUnidade.textContent = kpi.unidade;
        if (elUnidade.style) elUnidade.style.display = '';
      } else {
        elUnidade.textContent = '';
        if (elUnidade.style) elUnidade.style.display = 'none';
      }
    }
  }

  // Atualiza as métricas dentro dos cartões de pilar na Visão Geral
  for (const listaMetricas of Object.values(visao.pilares)) {
    for (const metrica of listaMetricas) {
      const elValor = doc.querySelector(`[data-metrica-valor="${metrica.sigla}"]`);
      if (elValor) {
        elValor.textContent = metrica.valorFormatado;
        if (!metrica.disponivel) {
          elValor.classList.add('badge-indisponivel');
        } else {
          elValor.classList.remove('badge-indisponivel');
        }
      }

      const elUnidade = doc.querySelector(`[data-metrica-unidade="${metrica.sigla}"]`);
      if (elUnidade) {
        elUnidade.textContent = metrica.disponivel && metrica.unidade ? metrica.unidade : '';
      }
    }
  }
}

export function aplicarVisaoPilar(doc: Document, metricas: VisaoMetrica[]): void {
  for (const m of metricas) {
    const elValor = doc.querySelector(`[data-card-valor="${m.sigla}"]`);
    if (elValor) {
      elValor.textContent = m.valorFormatado;
      if (!m.disponivel) {
        elValor.classList.add('badge-indisponivel');
      } else {
        elValor.classList.remove('badge-indisponivel');
      }
    }

    const elUnidade = doc.querySelector(`[data-card-unidade="${m.sigla}"]`);
    if (elUnidade) {
      elUnidade.textContent = m.disponivel && m.unidade ? m.unidade : '';
    }

    const elDelta = doc.querySelector(`[data-card-delta="${m.sigla}"]`);
    if (elDelta) {
      elDelta.textContent = m.deltaFormatado ?? 'Sem base anterior';
    }

    const elLink = doc.querySelector(`[data-card-link="${m.sigla}"]`);
    if (elLink && m.hrefDetalhe) {
      elLink.setAttribute('href', m.hrefDetalhe);
    }

    const elAviso = doc.querySelector(`[data-card-aviso="${m.sigla}"]`) as HTMLElement | null;
    if (elAviso) {
      if (m.avisoEmAndamento) {
        elAviso.textContent = m.avisoEmAndamento;
        if (elAviso.style) elAviso.style.display = '';
      } else {
        elAviso.textContent = '';
        if (elAviso.style) elAviso.style.display = 'none';
      }
    }
  }
}

export function aplicarVisaoDetalhe(doc: Document, visao: VisaoPaginaDetalhe): void {
  const elRotuloAno = doc.querySelector('[data-detalhe-ano-rotulo]');
  if (elRotuloAno) {
    elRotuloAno.textContent = `Resultado apurado (${visao.contexto.ano})`;
  }

  const elValor = doc.querySelector('[data-detalhe-valor]');
  if (elValor) {
    elValor.textContent = visao.metricaPrincipal.valorFormatado;
    if (!visao.metricaPrincipal.disponivel) {
      elValor.classList.add('badge-indisponivel');
    } else {
      elValor.classList.remove('badge-indisponivel');
    }
  }

  const elUnidade = doc.querySelector('[data-detalhe-unidade]') as HTMLElement | null;
  if (elUnidade) {
    if (visao.metricaPrincipal.disponivel && visao.metricaPrincipal.unidade) {
      elUnidade.textContent = visao.metricaPrincipal.unidade;
      if (elUnidade.style) elUnidade.style.display = '';
    } else {
      elUnidade.textContent = '';
      if (elUnidade.style) elUnidade.style.display = 'none';
    }
  }

  for (const comp of visao.componentes) {
    const elCompQtd = doc.querySelector(`[data-componente-qtd="${comp.sigla}"]`);
    if (elCompQtd) {
      elCompQtd.textContent = comp.quantidadeFormatada;
    }
  }
}
