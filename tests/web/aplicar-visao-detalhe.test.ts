import { describe, it, expect } from 'vitest';
import { datasetMock } from './fixtures/dataset-sample';
import { criarDomDetalheMock } from './fixtures/detalhe-fixtures';
import { computarVisaoDetalhe } from '../../src/lib/visao';
import {
  aplicarVisaoDetalhe,
  aplicarVisaoGrafico,
  aplicarVisaoHistorico,
} from '../../src/lib/aplicar-visao';

describe('aplicarVisaoDetalhe (Reatividade do Gráfico e Tabela)', () => {
  it('atualiza o gráfico SVG com os pontos e linha do campus selecionado e destaca o ano ativo', () => {
    const doc = criarDomDetalheMock();
    const visao = computarVisaoDetalhe(datasetMock, 'NTPP', { campus: 'serra', ano: 2026 });
    expect(visao).toBeDefined();

    aplicarVisaoGrafico(doc, visao!.grafico);

    const svg = doc.querySelector('[data-grafico-svg]');
    expect(svg).toBeDefined();

    // Serra tem anos 2024, 2025 e 2026 no datasetMock
    const pontos = doc.querySelectorAll('[data-ponto-ano]');
    expect(pontos).toHaveLength(3);

    const ponto2026 = doc.querySelector('[data-ponto-ano="2026"] .ponto');
    expect(ponto2026?.classList.contains('ponto-ativo')).toBe(true);

    const ponto2025 = doc.querySelector('[data-ponto-ano="2025"] .ponto');
    expect(ponto2025?.classList.contains('ponto-ativo')).toBe(false);

    // O path da linha deve ter sido recalculado com d
    const path = doc.querySelector('[data-grafico-linha]');
    expect(path?.getAttribute('d')).toContain('M');
  });

  it('atualiza a tabela histórica com as linhas e valores do campus selecionado', () => {
    const doc = criarDomDetalheMock();
    const visao = computarVisaoDetalhe(datasetMock, 'NTPP', { campus: 'serra', ano: 2026 });
    expect(visao).toBeDefined();

    aplicarVisaoHistorico(doc, visao!.historico);

    const linhas = doc.querySelectorAll('[data-historico-ano]');
    expect(linhas).toHaveLength(3);

    const linha2026 = doc.querySelector('[data-historico-ano="2026"]');
    expect(linha2026?.classList.contains('linha-ativa')).toBe(true);
  });

  it('exibe estado vazio no gráfico quando campus não tem dados suficientes', () => {
    const doc = criarDomDetalheMock();
    aplicarVisaoGrafico(doc, {
      sigla: 'NTPP',
      campus: 'vazio',
      anoAtivo: 2026,
      pontos: [],
      linhaD: '',
      escala: null,
      temDados: false,
    });

    const elVazio = doc.querySelector('[data-grafico-vazio]') as HTMLElement | null;
    expect(elVazio?.style.display).toBe('');

    const svg = doc.querySelector('[data-grafico-svg]') as HTMLElement | null;
    expect(svg?.style.display).toBe('none');
  });

  it('aplica a visão detalhe completa orquestrando banner, gráfico e histórico', () => {
    const doc = criarDomDetalheMock();
    const visao = computarVisaoDetalhe(datasetMock, 'NTPP', { campus: 'serra', ano: 2026 });
    expect(visao).toBeDefined();

    aplicarVisaoDetalhe(doc, visao!);

    const rotuloAno = doc.querySelector('[data-detalhe-ano-rotulo]');
    expect(rotuloAno?.textContent).toContain('2026');

    const valor = doc.querySelector('[data-detalhe-valor]');
    expect(valor?.textContent).toContain('18');
  });
});
