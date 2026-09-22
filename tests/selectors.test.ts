import { describe, expect, it } from 'vitest';
import {
  latestValue,
  seriesFor,
  valuesForYear,
  valuesForCampusAndYear,
  obterIndicadoresPorPilar,
  obterIndicadorPorSigla,
} from '../src/lib/selectors';
import type { Indicador } from '../src/data/indicadores';

function criarIndicador(sobrescrever: Partial<Indicador> = {}): Indicador {
  return {
    sigla: 'NTPP',
    slug: 'ntpp',
    nome: 'Indicador de teste',
    oQueMede: 'Mede algo.',
    formula: 'X / Y * 100',
    variaveis: [],
    polaridade: 'maior-e-melhor',
    dataAtualizacao: null,
    valores: [],
    componentes: [],
    ...sobrescrever,
  };
}

describe('latestValue', () => {
  it('retorna o valor do ano mais recente com dado disponível', () => {
    const indicador = criarIndicador({
      valores: [
        { ano: 2022, valor: 10 },
        { ano: 2023, valor: null, motivoIndisponivel: 'Não informado' },
        { ano: 2024, valor: 30 },
      ],
    });
    expect(latestValue(indicador)).toEqual({ ano: 2024, valor: 30 });
  });

  it('recua para o ano mais recente disponível quando os últimos não têm dado', () => {
    const indicador = criarIndicador({
      valores: [
        { ano: 2022, valor: 10 },
        { ano: 2023, valor: null, motivoIndisponivel: 'Não informado' },
      ],
    });
    expect(latestValue(indicador)).toEqual({ ano: 2022, valor: 10 });
  });

  it('retorna null quando nenhum ano tem dado', () => {
    const indicador = criarIndicador({
      valores: [{ ano: 2023, valor: null, motivoIndisponivel: 'Não informado' }],
    });
    expect(latestValue(indicador)).toBeNull();
  });

  it('retorna null quando não há anos', () => {
    expect(latestValue(criarIndicador())).toBeNull();
  });
});

describe('seriesFor', () => {
  it('retorna todos os anos em ordem crescente, incluindo anos sem dado', () => {
    const valores = [
      { ano: 2023, valor: null, motivoIndisponivel: 'Não informado' },
      { ano: 2021, valor: 8 },
      { ano: 2022, valor: 10 },
    ];
    const serie = seriesFor(criarIndicador({ valores }));
    expect(serie.map((v) => v.ano)).toEqual([2021, 2022, 2023]);
    expect(serie[2].valor).toBeNull();
  });

  it('retorna série vazia quando não há valores', () => {
    expect(seriesFor(criarIndicador())).toEqual([]);
  });
});

describe('valuesForYear', () => {
  it('retorna o valor do ano solicitado', () => {
    const indicador = criarIndicador({
      valores: [
        { ano: 2022, valor: 10 },
        { ano: 2023, valor: 12 },
      ],
    });
    expect(valuesForYear(indicador, 2023)).toEqual({ ano: 2023, valor: 12 });
  });

  it('retorna o estado indisponível do ano sem dado', () => {
    const indicador = criarIndicador({
      valores: [{ ano: 2023, valor: null, motivoIndisponivel: 'Não informado' }],
    });
    expect(valuesForYear(indicador, 2023)).toEqual({
      ano: 2023,
      valor: null,
      motivoIndisponivel: 'Não informado',
    });
  });

  it('retorna null para ano fora da série', () => {
    expect(valuesForYear(criarIndicador({ valores: [{ ano: 2023, valor: 1 }] }), 1999)).toBeNull();
  });
});

describe('valuesForCampusAndYear', () => {
  it('retorna o valor para o campus e ano correspondentes', () => {
    const indicador = criarIndicador({
      valores: [
        { ano: 2026, campus: 'serra', valor: 534 },
        { ano: 2026, campus: 'vitoria', valor: 120 },
      ],
    });
    const res = valuesForCampusAndYear(indicador, 'serra', 2026);
    expect(res).toEqual({ ano: 2026, campus: 'serra', valor: 534 });
  });

  it('retorna null se não houver registro para o campus e ano', () => {
    const indicador = criarIndicador({
      valores: [{ ano: 2026, campus: 'serra', valor: 534 }],
    });
    expect(valuesForCampusAndYear(indicador, 'inexistente', 2026)).toBeNull();
  });
});

describe('obterIndicadoresPorPilar e obterIndicadorPorSigla', () => {
  it('deve retornar os indicadores dos 3 pilares a partir do dataset padrão', () => {
    const p1 = obterIndicadoresPorPilar(1, 'serra', 2026);
    expect(p1.length).toBe(4);
    expect(p1.map((i) => i.sigla)).toEqual(['NTPP', 'QSPP', 'PIES', 'PICOT']);

    const p2 = obterIndicadoresPorPilar(2, 'serra', 2026);
    expect(p2.length).toBe(2);
    expect(p2.map((i) => i.sigla)).toEqual(['PINV', 'PIPDI']);

    const p3 = obterIndicadoresPorPilar(3, 'serra', 2026);
    expect(p3.length).toBe(3);
    expect(p3.map((i) => i.sigla)).toEqual(['PIPRO', 'PIPROT', 'PIPROTR']);
  });

  it('deve obter indicador por sigla com metadados e histórico completo', () => {
    const ntpp = obterIndicadorPorSigla('NTPP', 'serra');
    expect(ntpp).toBeDefined();
    expect(ntpp?.sigla).toBe('NTPP');
    expect(ntpp?.pilarNumero).toBe(1);

    const piprot = obterIndicadorPorSigla('piprot', 'serra');
    expect(piprot).toBeDefined();
    expect(piprot?.sigla).toBe('PIPROT');
    expect(piprot?.pilarNumero).toBe(3);
  });
});
