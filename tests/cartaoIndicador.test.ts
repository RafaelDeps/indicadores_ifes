import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import IndicatorCard from '../src/components/IndicatorCard.astro';
import type { Indicador } from '../src/data/indicadores';

const MOCK_INDICADOR: Indicador = {
  sigla: 'TESTE',
  slug: 'teste-ind',
  nome: 'Indicador de Teste para Validação',
  oQueMede: 'Mede aspectos de teste.',
  finalidade: 'Garantir a cobertura de testes.',
  formula: 'X / Y',
  unidade: 'projetos',
  icone: 'academic',
  pilarNumero: 1,
  polaridade: 'maior_melhor',
  variaveis: [],
  valores: [
    { ano: 2024, campus: 'serra', valor: 10 },
    { ano: 2025, campus: 'serra', valor: 15 },
    { ano: 2026, campus: 'serra', valor: 20 },
  ],
};

const MOCK_INDICADOR_NULO: Indicador = {
  sigla: 'NULO',
  slug: 'nulo-ind',
  nome: 'Indicador com Dado Indisponível',
  oQueMede: 'Mede algo sem dados.',
  formula: 'A + B',
  icone: 'patent',
  pilarNumero: 2,
  polaridade: 'maior_melhor',
  variaveis: [],
  valores: [{ ano: 2026, campus: 'serra', valor: null }],
};

async function renderizar(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(IndicatorCard, { props });
}

describe('IndicatorCard (User Story 3)', () => {
  it('renderiza a estrutura canônica com classes cartao-indicador e cartao-cabecalho', async () => {
    const html = await renderizar({ indicador: MOCK_INDICADOR, ano: 2026, campus: 'serra' });

    expect(html).toContain('cartao-indicador');
    expect(html).toContain('cartao-cabecalho');
    expect(html).toContain('TESTE');
    expect(html).toContain('Indicador de Teste para Validação');
  });

  it('renderiza o ícone temático SVG inline dentro de .icone-container', async () => {
    const html = await renderizar({ indicador: MOCK_INDICADOR, ano: 2026, campus: 'serra' });

    expect(html).toContain('icone-container');
    expect(html).toContain('<svg');
  });

  it('exibe o valor numérico em destaque com unidade e número correto', async () => {
    const html = await renderizar({ indicador: MOCK_INDICADOR, ano: 2026, campus: 'serra' });

    expect(html).toContain('cartao-valor');
    expect(html).toContain('valor-numero');
    expect(html).toContain('20');
    expect(html).toContain('projetos');
  });

  it('exibe badge "Dado indisponível" quando o valor for nulo e nunca exibe 0', async () => {
    const html = await renderizar({ indicador: MOCK_INDICADOR_NULO, ano: 2026, campus: 'serra' });

    expect(html).toContain('badge-indisponivel');
    expect(html).toContain('Dado indisponível');
    expect(html).not.toMatch(/<span[^>]*class="valor-numero"[^>]*>\s*0\s*<\/span>/);
  });

  it('exibe variação delta relativa formatada quando há ano anterior', async () => {
    // 2025: 15 -> 2026: 20. Diff = +5, Perc = +33.3%
    const html = await renderizar({ indicador: MOCK_INDICADOR, ano: 2026, campus: 'serra' });

    expect(html).toContain('cartao-delta');
    expect(html).toMatch(/▲\s*\+33,3%/);
  });

  it('exibe "Sem base anterior" quando não há dados do ano anterior', async () => {
    const html = await renderizar({ indicador: MOCK_INDICADOR, ano: 2024, campus: 'serra' });

    expect(html).toContain('cartao-delta');
    expect(html).toContain('Sem base anterior');
  });

  it('contém rodapé com link "Ver detalhes" preservando campus e ano', async () => {
    const html = await renderizar({ indicador: MOCK_INDICADOR, ano: 2026, campus: 'serra' });

    expect(html).toContain('cartao-rodape');
    expect(html).toContain('Ver detalhes');
    expect(html).toMatch(/href="\/pilar-1\/teste-ind\/\?campus=serra(&amp;|&#38;|&)ano=2026"/);
  });
});
