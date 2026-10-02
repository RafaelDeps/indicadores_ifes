import { describe, expect, it } from 'vitest';
import { datasetMock } from './fixtures/dataset-sample';
import { computarVisaoGeral, computarVisaoDetalhe } from '../../src/lib/visao';

describe('visao (computação pura das métricas por contexto)', () => {
  it('computa métricas da visão geral para serra em 2024', () => {
    const visao = computarVisaoGeral(datasetMock, { campus: 'serra', ano: 2024 });

    expect(visao.kpis.NTPP).toBeDefined();
    expect(visao.kpis.NTPP.valorFormatado).toBe('10');
    expect(visao.kpis.NTPP.unidade).toBe('projetos');
    expect(visao.kpis.NTPP.disponivel).toBe(true);

    expect(visao.kpis.QSPP.valorFormatado).toBe('20');
    expect(visao.kpis.NEP.valorFormatado).toBe('50');
    expect(visao.kpis.PIPRO.valorFormatado).toBe('40');
  });

  it('computa métricas da visão geral para serra em 2025 com deltas em relação a 2024', () => {
    const visao = computarVisaoGeral(datasetMock, { campus: 'serra', ano: 2025 });

    expect(visao.kpis.NTPP.valorFormatado).toBe('15');
    // Em 2024 era 10, em 2025 é 15 -> variação de +50%
    expect(visao.kpis.NTPP.deltaFormatado).toContain('+50');
    expect(visao.kpis.NTPP.deltaPositivo).toBe(true);
  });

  it('exibe "Dado indisponível" quando ano não possui apuração no campus', () => {
    const visao = computarVisaoGeral(datasetMock, { campus: 'vitoria', ano: 2024 });

    expect(visao.kpis.NTPP.valorFormatado).toBe('Dado indisponível');
    expect(visao.kpis.NTPP.disponivel).toBe(false);
  });

  it('computa métricas detalhadas com componentes de um indicador específico', () => {
    const detalhe = computarVisaoDetalhe(datasetMock, 'PIES', { campus: 'serra', ano: 2025 });

    expect(detalhe).toBeDefined();
    expect(detalhe?.sigla).toBe('PIES');
    expect(detalhe?.valorPrincipalFormatado).toBe('6%');
    expect(detalhe?.componentes).toHaveLength(2);

    const nep = detalhe?.componentes.find((c) => c.sigla === 'NEP');
    expect(nep?.quantidadeFormatada).toBe('60');

    const nte = detalhe?.componentes.find((c) => c.sigla === 'NTE');
    expect(nte?.quantidadeFormatada).toBe('1.000');
  });
});
