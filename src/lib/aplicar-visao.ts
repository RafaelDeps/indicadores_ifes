import type {
  VisaoPaginaGeral,
  VisaoPaginaDetalhe,
  VisaoMetrica,
  VisaoGraficoDetalhe,
  VisaoHistoricoTabela,
} from './visao';

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
      // Se o valor já veio sufixado com a unidade ("23%"), o span fica vazio:
      // preenchê-lo renderia "23%%".
      elUnidade.textContent = m.disponivel && m.unidade && !m.unidadeJaNoValor ? m.unidade : '';
    }

    const elDelta = doc.querySelector(`[data-card-delta="${m.sigla}"]`);
    if (elDelta) {
      elDelta.textContent = m.deltaFormatado ?? 'Sem base anterior';
      const containerDelta = (elDelta as HTMLElement).closest
        ? (elDelta as HTMLElement).closest('.cartao-delta')
        : null;
      if (containerDelta) {
        if (m.deltaAcessivel) {
          containerDelta.setAttribute('aria-label', m.deltaAcessivel);
        } else if (!m.deltaFormatado || m.deltaFormatado === 'Sem base anterior') {
          containerDelta.setAttribute('aria-label', 'Sem base de comparação anterior');
        }
        containerDelta.classList.remove('positivo', 'negativo');
        if (m.deltaPositivo === true) containerDelta.classList.add('positivo');
        if (m.deltaPositivo === false) containerDelta.classList.add('negativo');
      }
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

export function aplicarVisaoGrafico(doc: Document, grafico: VisaoGraficoDetalhe): void {
  const elSvg = doc.querySelector('[data-grafico-svg]') as HTMLElement | null;
  const elVazio = doc.querySelector('[data-grafico-vazio]') as HTMLElement | null;

  if (!grafico.temDados || grafico.pontos.length === 0) {
    if (elSvg && elSvg.style) elSvg.style.display = 'none';
    if (elVazio && elVazio.style) elVazio.style.display = '';
    return;
  }

  if (elSvg && elSvg.style) elSvg.style.display = '';
  if (elVazio && elVazio.style) elVazio.style.display = 'none';

  // Atualiza linha do gráfico
  const elLinha = doc.querySelector('[data-grafico-linha]');
  if (elLinha) {
    elLinha.setAttribute('d', grafico.linhaD);
  }

  // Grupo de escala mantido vazio para evitar poluição visual
  const elEscala = doc.querySelector('[data-grafico-escala]');
  if (elEscala) {
    elEscala.innerHTML = '';
  }

  // Atualiza pontos de dados
  const elPontos = doc.querySelector('[data-grafico-pontos]');
  if (elPontos) {
    const ALTURA = 240;
    const MARGEM = 36;
    elPontos.innerHTML = grafico.pontos
      .map(
        (p) => `
      <g class="grupo-ponto" tabindex="0" data-ponto-ano="${p.ano}">
        <text class="rotulo-dado" x="${p.rotuloX}" y="${p.rotuloY}" text-anchor="middle">
          ${p.textoRotulo}
        </text>
        <text class="rotulo-ano" x="${p.x}" y="${ALTURA - MARGEM + 18}" text-anchor="middle">
          ${p.ano}
        </text>
        <circle class="ponto ${p.ativo ? 'ponto-ativo' : ''}" cx="${p.x}" cy="${p.y}" r="6">
          <title>${p.ano}: ${p.textoRotulo}</title>
        </circle>
      </g>
    `,
      )
      .join('');
  }
}

export function aplicarVisaoHistorico(doc: Document, historico: VisaoHistoricoTabela): void {
  const elCorpo = doc.querySelector('[data-historico-corpo]');
  if (!elCorpo) return;

  elCorpo.innerHTML = historico.linhas
    .map(
      (l) => `
      <tr data-historico-ano="${l.ano}" class="${l.ativo ? 'linha-ativa' : ''}">
        <th scope="row">${l.ano}</th>
        <td>
          ${l.valorFormatado}
          ${l.motivoIndisponivel ? `<span class="motivo-ano"> — ${l.motivoIndisponivel}</span>` : ''}
        </td>
      </tr>
    `,
    )
    .join('');
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
    // `unidadeJaNoValor` evita repetir o sufixo que já está em `valorFormatado`
    // (percentuais): o span some e o "%" do valor faz papel de unidade.
    const mostrarUnidade =
      visao.metricaPrincipal.disponivel &&
      !!visao.metricaPrincipal.unidade &&
      !visao.metricaPrincipal.unidadeJaNoValor;
    if (mostrarUnidade) {
      elUnidade.textContent = visao.metricaPrincipal.unidade;
      if (elUnidade.style) elUnidade.style.display = '';
    } else {
      elUnidade.textContent = '';
      if (elUnidade.style) elUnidade.style.display = 'none';
    }
  }

  // Atualização precisa de cada ano do componente usando chave composta
  for (const comp of visao.componentes) {
    if (comp.valoresPorAno) {
      for (const [ano, qtdStr] of Object.entries(comp.valoresPorAno)) {
        const elAno = doc.querySelector(
          `[data-componente-qtd="${comp.sigla}"][data-componente-ano="${ano}"]`,
        );
        if (elAno) {
          elAno.textContent = qtdStr;
        }
      }
    } else {
      const elCompQtd =
        doc.querySelector(
          `[data-componente-qtd="${comp.sigla}"][data-componente-ano="${visao.contexto.ano}"]`,
        ) ?? doc.querySelector(`[data-componente-qtd="${comp.sigla}"]`);
      if (elCompQtd) {
        elCompQtd.textContent = comp.quantidadeFormatada;
      }
    }
  }

  // Atualiza gráfico SVG e tabela histórica
  if (visao.grafico) {
    aplicarVisaoGrafico(doc, visao.grafico);
  }
  if (visao.historico) {
    aplicarVisaoHistorico(doc, visao.historico);
  }
}
