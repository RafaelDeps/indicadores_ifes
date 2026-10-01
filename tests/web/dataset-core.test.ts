import { describe, expect, it } from 'vitest';
import { datasetMock } from './fixtures/dataset-sample';
import {
  obterCampiDisponiveis,
  obterAnosDisponiveis,
  obterCampiParaSelect,
  obterAnosParaSelect,
  obterIndicadoresDoPilar,
  obterIndicadorCompleto,
} from '../../src/lib/dataset-core';

describe('dataset-core (núcleo puro isomórfico sem node:fs)', () => {
  it('obterCampiDisponiveis retorna a lista de campi do dataset', () => {
    const campi = obterCampiDisponiveis(datasetMock);
    expect(campi).toHaveLength(3);
    expect(campi.map((c) => c.slug)).toEqual(['todos', 'serra', 'vitoria']);
  });

  it('obterAnosDisponiveis retorna anos globais ou específicos de um campus', () => {
    expect(obterAnosDisponiveis(datasetMock)).toEqual([2024, 2025, 2026]);
    expect(obterAnosDisponiveis(datasetMock, 'serra')).toEqual([2024, 2025, 2026]);
    expect(obterAnosDisponiveis(datasetMock, 'vitoria')).toEqual([2025, 2026]);
  });

  it('obterCampiParaSelect coloca (Todos) em primeiro e ordena os demais alfabeticamente', () => {
    const opcoes = obterCampiParaSelect(datasetMock);
    expect(opcoes[0]).toEqual({ slug: 'todos', nome: '(Todos)' });
    expect(opcoes[1].slug).toBe('serra');
    expect(opcoes[2].slug).toBe('vitoria');
  });

  it('obterAnosParaSelect retorna anos em ordem decrescente', () => {
    const anos = obterAnosParaSelect(datasetMock);
    expect(anos).toEqual([2026, 2025, 2024]);
  });

  it('obterIndicadoresDoPilar extrai indicadores corretamente para dado campus e ano', () => {
    const pilar1_2024 = obterIndicadoresDoPilar(datasetMock, 1, 'serra', 2024);
    expect(pilar1_2024).toHaveLength(4);

    const ntpp = pilar1_2024.find((i) => i.sigla === 'NTPP');
    expect(ntpp).toBeDefined();
    expect(ntpp?.valores[0].valor).toBe(10);
    expect(ntpp?.valores[0].ano).toBe(2024);
    expect(ntpp?.valores[0].campus).toBe('serra');

    const pilar1_2025 = obterIndicadoresDoPilar(datasetMock, 1, 'serra', 2025);
    const ntpp2025 = pilar1_2025.find((i) => i.sigla === 'NTPP');
    expect(ntpp2025?.valores[0].valor).toBe(15);
  });

  it('obterIndicadoresDoPilar retorna "Dado indisponível" quando ano não existe no campus', () => {
    const pilar1_vitoria_2024 = obterIndicadoresDoPilar(datasetMock, 1, 'vitoria', 2024);
    const ntpp = pilar1_vitoria_2024.find((i) => i.sigla === 'NTPP');
    expect(ntpp?.valores[0].valor).toBeNull();
    expect(ntpp?.valores[0].motivoIndisponivel).toBeDefined();
  });

  it('obterIndicadorCompleto constrói a série histórica para todos os anos do campus', () => {
    const ntppCompleto = obterIndicadorCompleto(datasetMock, 'NTPP', 'serra');
    expect(ntppCompleto).toBeDefined();
    expect(ntppCompleto?.sigla).toBe('NTPP');
    expect(ntppCompleto?.valores).toHaveLength(3);
    expect(ntppCompleto?.valores.map((v) => v.ano)).toEqual([2024, 2025, 2026]);
    expect(ntppCompleto?.valores.map((v) => v.valor)).toEqual([10, 15, 18]);
  });
});
