import { describe, expect, it } from 'vitest';
import { gerarCsvSerieHistorica } from '../../src/lib/exportar-csv';

describe('Módulo de Exportação CSV (gerarCsvSerieHistorica)', () => {
  const dadosExemplo = {
    campus: 'Campus Serra',
    indicadorNome: 'Percentual de Estudantes na Pesquisa',
    sigla: 'PIES',
    unidade: '%',
    serie: [
      { ano: 2022, valor: 15.5 },
      { ano: 2023, valor: null, motivoIndisponivel: 'Sem dados apurados' },
      { ano: 2024, valor: 25 },
    ],
  };

  it('inicia com o caractere BOM UTF-8 para compatibilidade com Microsoft Excel', () => {
    const csv = gerarCsvSerieHistorica(dadosExemplo);
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('possui o cabeçalho oficial com separador ponto-e-vírgula', () => {
    const csv = gerarCsvSerieHistorica(dadosExemplo);
    const linhas = csv.replace('\uFEFF', '').split('\r\n');
    expect(linhas[0]).toBe('Campus;Ano;Indicador;Sigla;Valor;Unidade;Status');
  });

  it('formata valores decimais com vírgula e define Status "Apurado"', () => {
    const csv = gerarCsvSerieHistorica(dadosExemplo);
    const linhas = csv.replace('\uFEFF', '').split('\r\n');
    // Linha do ano 2022 (valor 15.5)
    expect(linhas[1]).toBe(
      'Campus Serra;2022;Percentual de Estudantes na Pesquisa;PIES;15,5;%;Apurado',
    );
    // Linha do ano 2024 (valor 25)
    expect(linhas[3]).toBe(
      'Campus Serra;2024;Percentual de Estudantes na Pesquisa;PIES;25;%;Apurado',
    );
  });

  it('nunca inventa zero para dados indisponíveis, deixando campo vazio e Status "Dado indisponível"', () => {
    const csv = gerarCsvSerieHistorica(dadosExemplo);
    const linhas = csv.replace('\uFEFF', '').split('\r\n');
    // Linha do ano 2023 (valor null)
    expect(linhas[2]).toBe(
      'Campus Serra;2023;Percentual de Estudantes na Pesquisa;PIES;;%;Dado indisponível',
    );
  });

  it('ordena os registros cronologicamente por ano', () => {
    const desordenado = {
      ...dadosExemplo,
      serie: [
        { ano: 2024, valor: 25 },
        { ano: 2020, valor: 10 },
      ],
    };
    const csv = gerarCsvSerieHistorica(desordenado);
    const linhas = csv.replace('\uFEFF', '').split('\r\n');
    expect(linhas[1]).toContain('2020');
    expect(linhas[2]).toContain('2024');
  });
});
