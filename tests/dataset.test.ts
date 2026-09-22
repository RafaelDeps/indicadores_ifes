import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'node:path';
import {
  carregarDataset,
  obterCampiDisponiveis,
  obterAnosDisponiveis,
  obterIndicadoresDoPilar,
  obterIndicadorCompleto,
  type DatasetCompleto,
} from '../src/lib/dataset';

describe('Orquestrador de Dataset Multi-Campus (src/lib/dataset.ts)', () => {
  const zipPath = path.resolve(process.cwd(), 'indicadores.zip');
  let dataset: DatasetCompleto;

  beforeAll(() => {
    dataset = carregarDataset(zipPath);
  });

  it('deve carregar o dataset a partir de indicadores.zip', () => {
    expect(dataset).toBeDefined();
    expect(dataset.campi.length).toBeGreaterThan(0);
    expect(dataset.anos.length).toBeGreaterThan(0);
  });

  it('deve identificar o campus Serra presente no zip', () => {
    const campi = obterCampiDisponiveis(dataset);
    const serra = campi.find((c) => c.slug === 'serra');
    expect(serra).toBeDefined();
    expect(serra?.nome).toBe('Serra');
  });

  it('deve listar anos disponíveis para o campus Serra', () => {
    const anos = obterAnosDisponiveis(dataset, 'serra');
    expect(anos).toContain(2026);
  });

  it('deve carregar os 4 indicadores do Pilar 1 para Serra em 2026 com valores e componentes', () => {
    const indicadoresP1 = obterIndicadoresDoPilar(dataset, 1, 'serra', 2026);
    expect(indicadoresP1.length).toBe(4);

    const ntpp = indicadoresP1.find((i) => i.sigla === 'NTPP');
    expect(ntpp).toBeDefined();
    expect(ntpp?.valores[0].valor).toBe(534);

    const qspp = indicadoresP1.find((i) => i.sigla === 'QSPP');
    expect(qspp).toBeDefined();
    expect(qspp?.valores[0].valor).toBe(202);

    const pies = indicadoresP1.find((i) => i.sigla === 'PIES');
    expect(pies).toBeDefined();
    // PIES percentual é null ("Dado indisponível"), componente NEP é 376, NTE é null
    expect(pies?.valores[0].valor).toBeNull();
    const nepComp = pies?.componentes.find((c) => c.sigla === 'NEP');
    expect(nepComp?.valores[0].quantidade).toBe(376);

    const picot = indicadoresP1.find((i) => i.sigla === 'PICOT');
    expect(picot).toBeDefined();
    expect(picot?.valores[0].valor).toBeNull();
  });

  it('deve carregar os 2 indicadores do Pilar 2 para Serra em 2026', () => {
    const indicadoresP2 = obterIndicadoresDoPilar(dataset, 2, 'serra', 2026);
    expect(indicadoresP2.length).toBe(2);

    const pinv = indicadoresP2.find((i) => i.sigla === 'PINV');
    expect(pinv?.valores[0].valor).toBeNull();

    const pipdi = indicadoresP2.find((i) => i.sigla === 'PIPDI');
    expect(pipdi?.valores[0].valor).toBeNull();
  });

  it('deve carregar os 3 indicadores do Pilar 3 para Serra em 2026 preservando zero estrito', () => {
    const indicadoresP3 = obterIndicadoresDoPilar(dataset, 3, 'serra', 2026);
    expect(indicadoresP3.length).toBe(3);

    const pipro = indicadoresP3.find((i) => i.sigla === 'PIPRO');
    expect(pipro?.valores[0].valor).toBe(75);

    const piprot = indicadoresP3.find((i) => i.sigla === 'PIPROT');
    // total_acumulado_PIPROT é 0 comprovado (não null!)
    expect(piprot?.valores[0].valor).toBe(0);

    // Subcomponente PA é 0 comprovado, RM é null
    const paComp = piprot?.componentes.find((c) => c.sigla === 'PA');
    expect(paComp?.valores[0].quantidade).toBe(0);
    const rmComp = piprot?.componentes.find((c) => c.sigla === 'RM');
    expect(rmComp?.valores[0].quantidade).toBeNull();

    const piprotr = indicadoresP3.find((i) => i.sigla === 'PIPROTR');
    expect(piprotr?.valores[0].valor).toBeNull();
  });

  it('deve retornar "Dado indisponível" (null) para o campus "todos" caso o arquivo oficial não exista no zip', () => {
    // No zip de teste atual não há pilar1_todos_2026.json
    const indicadoresP1Todos = obterIndicadoresDoPilar(dataset, 1, 'todos', 2026);
    const ntppTodos = indicadoresP1Todos.find((i) => i.sigla === 'NTPP');
    expect(ntppTodos?.valores[0].valor).toBeNull();
  });

  it('deve obter indicador completo por sigla com histórico', () => {
    const indicador = obterIndicadorCompleto(dataset, 'NTPP', 'serra');
    expect(indicador).toBeDefined();
    expect(indicador?.sigla).toBe('NTPP');
    expect(indicador?.valores.length).toBeGreaterThan(0);
  });
});
