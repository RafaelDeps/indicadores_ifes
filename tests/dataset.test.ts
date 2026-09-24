import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  carregarDataset,
  obterCampiDisponiveis,
  obterAnosDisponiveis,
  obterIndicadoresDoPilar,
  obterIndicadorCompleto,
  type DatasetCompleto,
} from '../src/lib/dataset';
import { extrairZip } from '../src/lib/zip';
import { gravarZipAtomico } from '../src/etl/zipwriter';

describe('Orquestrador de Dataset Multi-Campus (src/lib/dataset.ts)', () => {
  const zipPath = path.resolve(process.cwd(), 'indicadores.zip');
  let dataset: DatasetCompleto;
  let bruto: Map<string, string>;

  beforeAll(() => {
    dataset = carregarDataset(zipPath);
    bruto = extrairZip(zipPath);
  });

  interface ArquivoPilarBruto {
    campus: string;
    ano_referencia: number;
    pilar: string;
    indicadores: Record<string, Record<string, unknown>>;
  }

  function brutoPilar(numero: number, campus: string, ano: number): ArquivoPilarBruto {
    const conteudo = bruto.get(`pilar${numero}_${campus}_${ano}.json`);
    if (!conteudo) throw new Error(`arquivo pilar${numero}_${campus}_${ano}.json ausente no zip`);
    return JSON.parse(conteudo) as ArquivoPilarBruto;
  }

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

  it('deve carregar os 4 indicadores do Pilar 1 para Serra em 2026 fiéis ao arquivo do pacote', () => {
    const bruto1 = brutoPilar(1, 'serra', 2026);
    const indicadoresP1 = obterIndicadoresDoPilar(dataset, 1, 'serra', 2026);
    expect(indicadoresP1.length).toBe(4);

    // fidelidade estrita (Princípio III): o dataset reflete exatamente o JSON do pacote
    const ntpp = indicadoresP1.find((i) => i.sigla === 'NTPP');
    expect(ntpp).toBeDefined();
    expect(ntpp?.valores[0].valor).toBe(bruto1.indicadores.NTPP.total_projetos_NTPP);

    const qspp = indicadoresP1.find((i) => i.sigla === 'QSPP');
    expect(qspp).toBeDefined();
    expect(qspp?.valores[0].valor).toBe(bruto1.indicadores.QSPP.total_servidores_QSPP);

    // PIES: percentual é null ("Dado indisponível" — contrato 004); NEP espelha o pacote
    const pies = indicadoresP1.find((i) => i.sigla === 'PIES');
    expect(pies).toBeDefined();
    expect(pies?.valores[0].valor).toBeNull();
    const nepComp = pies?.componentes.find((c) => c.sigla === 'NEP');
    expect(nepComp?.valores[0].quantidade).toBe(bruto1.indicadores.PIES.NEP_estudantes_em_pesquisa);

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

  it('deve carregar os 3 indicadores do Pilar 3 para Serra em 2026 preservando zeros estritos e nulls', () => {
    const bruto3 = brutoPilar(3, 'serra', 2026);
    const indicadoresP3 = obterIndicadoresDoPilar(dataset, 3, 'serra', 2026);
    expect(indicadoresP3.length).toBe(3);

    const pipro = indicadoresP3.find((i) => i.sigla === 'PIPRO');
    expect(pipro?.valores[0].valor).toBe(bruto3.indicadores.PIPRO.total_producao_PIPRO);

    const piprot = indicadoresP3.find((i) => i.sigla === 'PIPROT');
    expect(piprot?.valores[0].valor).toBe(bruto3.indicadores.PIPROT.total_acumulado_PIPROT);

    // componentes espelham valores_totais_por_tipo do pacote (0 verificado ou null)
    const valoresTipo = bruto3.indicadores.PIPROT.valores_totais_por_tipo as Record<
      string,
      unknown
    >;
    const paComp = piprot?.componentes.find((c) => c.sigla === 'PA');
    expect(paComp?.valores[0].quantidade).toBe(valoresTipo.PA_patentes_e_modelos_utilidade);
    expect(paComp?.valores[0].quantidade).toBe(0); // PA é contagem zero verificada (contrato)
    const rmComp = piprot?.componentes.find((c) => c.sigla === 'RM');
    expect(rmComp?.valores[0].quantidade).toBeNull(); // RM não rastreada (contrato)

    const piprotr = indicadoresP3.find((i) => i.sigla === 'PIPROTR');
    expect(piprotr?.valores[0].valor).toBeNull();
  });

  it('deve carregar o escopo institucional "todos" a partir dos arquivos dedicados', () => {
    const bruto1 = brutoPilar(1, 'todos', 2026);
    const indicadoresP1Todos = obterIndicadoresDoPilar(dataset, 1, 'todos', 2026);
    const ntppTodos = indicadoresP1Todos.find((i) => i.sigla === 'NTPP');
    expect(ntppTodos?.valores[0].valor).toBe(bruto1.indicadores.NTPP.total_projetos_NTPP);
  });

  it('deve retornar "Dado indisponível" (null) para o campus "todos" caso o arquivo oficial não exista no zip', () => {
    // pacote hermético sem os arquivos dedicados de "todos"
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dataset-sem-todos-'));
    const semTodos = [...bruto.entries()]
      .filter(([nome]) => !nome.includes('_todos_'))
      .map(([nome, conteudo]) => ({ nome, conteudo }));
    const caminhoTemp = path.join(tmp, 'sem-todos.zip');
    gravarZipAtomico(caminhoTemp, semTodos);

    const datasetSemTodos = carregarDataset(caminhoTemp);
    const indicadoresP1Todos = obterIndicadoresDoPilar(datasetSemTodos, 1, 'todos', 2026);
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
