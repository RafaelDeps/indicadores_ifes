import * as fs from 'node:fs';
import * as path from 'node:path';
import { extrairZip } from './zip';
import { slugificarCampus } from './slugificar';
import {
  type CampusInfo,
  type ArquivoPilarRaw,
  type RegistroEntradaZip,
  type DatasetCompleto,
  type CampusOpcao,
  obterCampiDisponiveis as coreObterCampiDisponiveis,
  obterAnosDisponiveis as coreObterAnosDisponiveis,
  obterCampiParaSelect as coreObterCampiParaSelect,
  obterAnosParaSelect as coreObterAnosParaSelect,
} from './dataset-core';

export * from './dataset-core';

const CAMINHO_PADRAO_ZIP = path.resolve(process.cwd(), 'data/dist/indicadores.zip');

/**
 * Lê todos os arquivos `pilar{N}_{campus}_{year}.json` de dentro de `indicadores.zip`
 */
export function carregarDataset(caminhoZip = CAMINHO_PADRAO_ZIP): DatasetCompleto {
  if (!fs.existsSync(caminhoZip)) {
    console.warn(
      `[Aviso] Pacote de indicadores não encontrado em ${caminhoZip}. Execute 'make etl' para gerar o dataset.`,
    );
    return {
      campi: [{ slug: 'todos', nome: 'Todos os Campi', anos: [] }],
      anos: [],
      entradas: [],
    };
  }

  const mapaArquivos = extrairZip(caminhoZip);
  const entradas: RegistroEntradaZip[] = [];
  const campiMap = new Map<string, { nome: string; anos: Set<number> }>();
  const todosAnos = new Set<number>();

  for (const [nomeArquivo, conteudo] of mapaArquivos.entries()) {
    const match = nomeArquivo.match(/^pilar([123])_([a-zA-Z0-9_-]+)_(\d{4})\.json$/);
    if (!match) continue;

    const pilarNumero = parseInt(match[1], 10) as 1 | 2 | 3;
    const campusSlugArquivo = match[2].toLowerCase();
    const ano = parseInt(match[3], 10);

    try {
      const dados = JSON.parse(conteudo) as ArquivoPilarRaw;
      const campusNome = dados.campus || campusSlugArquivo;
      const campusSlug = slugificarCampus(campusSlugArquivo);

      entradas.push({
        pilarNumero,
        campusSlug,
        campusNome,
        ano,
        dados,
      });

      if (!campiMap.has(campusSlug)) {
        campiMap.set(campusSlug, { nome: campusNome, anos: new Set() });
      }
      campiMap.get(campusSlug)!.anos.add(ano);
      todosAnos.add(ano);
    } catch (e) {
      console.error(`Erro ao decodificar ${nomeArquivo}:`, e);
    }
  }

  // Sempre garantir a presença de "todos" como opção institucional
  if (!campiMap.has('todos')) {
    campiMap.set('todos', {
      nome: 'Todos os Campi',
      anos: new Set(todosAnos),
    });
  }

  const campi: CampusInfo[] = Array.from(campiMap.entries()).map(([slug, info]) => ({
    slug,
    nome: info.nome,
    anos: Array.from(info.anos).sort((a, b) => a - b),
  }));

  return {
    campi,
    anos: Array.from(todosAnos).sort((a, b) => a - b),
    entradas,
  };
}

// Instância padrão carregada no build time para uso direto nos componentes Astro
export const datasetPadrao: DatasetCompleto = carregarDataset();

export function obterCampiDisponiveis(dataset?: DatasetCompleto): CampusInfo[] {
  return coreObterCampiDisponiveis(dataset ?? datasetPadrao);
}

export function obterAnosDisponiveis(dataset?: DatasetCompleto, campusSlug?: string): number[] {
  return coreObterAnosDisponiveis(dataset ?? datasetPadrao, campusSlug);
}

export function obterCampiParaSelect(dataset?: DatasetCompleto): CampusOpcao[] {
  return coreObterCampiParaSelect(dataset ?? datasetPadrao);
}

export function obterAnosParaSelect(dataset?: DatasetCompleto): number[] {
  return coreObterAnosParaSelect(dataset ?? datasetPadrao);
}
