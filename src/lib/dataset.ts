import * as path from 'node:path';
import { extrairZip } from './zip';
import { slugificarCampus } from './slugificar';
import {
  INDICADORES_META,
  PILARES,
  type Indicador,
  type SiglaIndicador,
  type ValorAnual,
  type Componente,
} from '../data/indicadores';

export interface CampusInfo {
  slug: string;
  nome: string;
  anos: number[];
}

export interface ArquivoPilarRaw {
  campus: string;
  ano_referencia: number;
  pilar: string;
  indicadores: Record<string, Record<string, unknown>>;
}

export interface RegistroEntradaZip {
  pilarNumero: 1 | 2 | 3;
  campusSlug: string;
  campusNome: string;
  ano: number;
  dados: ArquivoPilarRaw;
}

export interface DatasetCompleto {
  campi: CampusInfo[];
  anos: number[];
  entradas: RegistroEntradaZip[];
}

const CAMINHO_PADRAO_ZIP = path.resolve(process.cwd(), 'indicadores.zip');

/**
 * Lê todos os arquivos `pilar{N}_{campus}_{year}.json` de dentro de `indicadores.zip`
 */
export function carregarDataset(caminhoZip = CAMINHO_PADRAO_ZIP): DatasetCompleto {
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

export function obterCampiDisponiveis(dataset: DatasetCompleto): CampusInfo[] {
  return dataset.campi;
}

export function obterAnosDisponiveis(dataset: DatasetCompleto, campusSlug?: string): number[] {
  if (!campusSlug) return dataset.anos;
  const campus = dataset.campi.find((c) => c.slug === campusSlug);
  return campus ? campus.anos : dataset.anos;
}

/**
 * Mapeia os dados brutos de um indicador específico para a estrutura tipada
 */
function extrairMapeamentoIndicador(
  sigla: SiglaIndicador,
  dadosBrutos: Record<string, unknown> | undefined,
  ano: number,
  campusSlug: string,
): { valor: number | null; componentes: Componente[] } {
  if (!dadosBrutos) {
    return { valor: null, componentes: [] };
  }

  let valor: number | null = null;
  const componentes: Componente[] = [];

  switch (sigla) {
    case 'NTPP': {
      valor =
        typeof dadosBrutos.total_projetos_NTPP === 'number'
          ? dadosBrutos.total_projetos_NTPP
          : null;
      const count =
        typeof dadosBrutos.projetos_pesquisa_registrados_execucao === 'number'
          ? dadosBrutos.projetos_pesquisa_registrados_execucao
          : null;
      componentes.push({
        sigla: 'PRE',
        nome: 'Projetos Registrados em Execução',
        valores: [{ ano, quantidade: count, campus: campusSlug }],
      });
      break;
    }
    case 'QSPP': {
      valor =
        typeof dadosBrutos.total_servidores_QSPP === 'number'
          ? dadosBrutos.total_servidores_QSPP
          : null;
      const count =
        typeof dadosBrutos.SUPP_servidores_unicos_participantes === 'number'
          ? dadosBrutos.SUPP_servidores_unicos_participantes
          : null;
      componentes.push({
        sigla: 'SUPP',
        nome: 'Servidores Únicos Participantes',
        valores: [{ ano, quantidade: count, campus: campusSlug }],
      });
      break;
    }
    case 'PIES': {
      valor =
        typeof dadosBrutos.percentual_calculado_PIES === 'number'
          ? dadosBrutos.percentual_calculado_PIES
          : null;
      const nep =
        typeof dadosBrutos.NEP_estudantes_em_pesquisa === 'number'
          ? dadosBrutos.NEP_estudantes_em_pesquisa
          : null;
      const nte =
        typeof dadosBrutos.NTE_total_estudantes_matriculados === 'number'
          ? dadosBrutos.NTE_total_estudantes_matriculados
          : null;
      componentes.push(
        {
          sigla: 'NEP',
          nome: 'Estudantes em Pesquisa',
          valores: [{ ano, quantidade: nep, campus: campusSlug }],
        },
        {
          sigla: 'NTE',
          nome: 'Total de Estudantes Matriculados',
          valores: [{ ano, quantidade: nte, campus: campusSlug }],
        },
      );
      break;
    }
    case 'PICOT': {
      valor =
        typeof dadosBrutos.percentual_calculado_PICOT === 'number'
          ? dadosBrutos.percentual_calculado_PICOT
          : null;
      const ntecpp =
        typeof dadosBrutos.NTECPP_cotistas_em_pesquisa === 'number'
          ? dadosBrutos.NTECPP_cotistas_em_pesquisa
          : null;
      const nep =
        typeof dadosBrutos.NEP_total_estudantes_em_pesquisa === 'number'
          ? dadosBrutos.NEP_total_estudantes_em_pesquisa
          : null;
      componentes.push(
        {
          sigla: 'NTECPP',
          nome: 'Estudantes Cotistas em Pesquisa',
          valores: [{ ano, quantidade: ntecpp, campus: campusSlug }],
        },
        {
          sigla: 'NEP',
          nome: 'Total de Estudantes em Pesquisa',
          valores: [{ ano, quantidade: nep, campus: campusSlug }],
        },
      );
      break;
    }
    case 'PINV': {
      valor =
        typeof dadosBrutos.percentual_calculado_PINV === 'number'
          ? dadosBrutos.percentual_calculado_PINV
          : null;
      const tafppi =
        typeof dadosBrutos.TAFPPI_valor_total_aporte_pesquisa === 'number'
          ? dadosBrutos.TAFPPI_valor_total_aporte_pesquisa
          : null;
      const occ =
        typeof dadosBrutos.OCC_valor_orcamento_total_capital_custeio === 'number'
          ? dadosBrutos.OCC_valor_orcamento_total_capital_custeio
          : null;
      componentes.push(
        {
          sigla: 'TAFPPI',
          nome: 'Total de Aporte em Pesquisa e Pós-Graduação',
          valores: [{ ano, quantidade: tafppi, campus: campusSlug }],
        },
        {
          sigla: 'OCC',
          nome: 'Orçamento Total de Capital e Custeio',
          valores: [{ ano, quantidade: occ, campus: campusSlug }],
        },
      );
      break;
    }
    case 'PIPDI': {
      valor =
        typeof dadosBrutos.total_acumulado_PIPDI === 'number'
          ? dadosBrutos.total_acumulado_PIPDI
          : null;
      const nappct =
        typeof dadosBrutos.NAPPCT_acordos_parceria_firmados === 'number'
          ? dadosBrutos.NAPPCT_acordos_parceria_firmados
          : null;
      componentes.push({
        sigla: 'NAPPCT',
        nome: 'Acordos de Parceria Firmados',
        valores: [{ ano, quantidade: nappct, campus: campusSlug }],
      });
      break;
    }
    case 'PIPRO': {
      valor =
        typeof dadosBrutos.total_producao_PIPRO === 'number'
          ? dadosBrutos.total_producao_PIPRO
          : null;
      const npb =
        typeof dadosBrutos.NPB_producoes_academicas_bibliograficas === 'number'
          ? dadosBrutos.NPB_producoes_academicas_bibliograficas
          : null;
      const npt =
        typeof dadosBrutos.NPT_producoes_tecnicas_tecnologicas === 'number'
          ? dadosBrutos.NPT_producoes_tecnicas_tecnologicas
          : null;
      componentes.push(
        {
          sigla: 'NPB',
          nome: 'Produções Acadêmicas Bibliográficas',
          valores: [{ ano, quantidade: npb, campus: campusSlug }],
        },
        {
          sigla: 'NPT',
          nome: 'Produções Técnicas e Tecnológicas',
          valores: [{ ano, quantidade: npt, campus: campusSlug }],
        },
      );
      break;
    }
    case 'PIPROT': {
      valor =
        typeof dadosBrutos.total_acumulado_PIPROT === 'number'
          ? dadosBrutos.total_acumulado_PIPROT
          : null;
      const totaisPorTipo =
        (dadosBrutos.valores_totais_por_tipo as Record<string, number | null>) || {};

      const tiposMeta: [string, string, string][] = [
        ['PA', 'Patentes e Modelos de Utilidade', 'PA_patentes_e_modelos_utilidade'],
        ['RM', 'Registros de Marca', 'RM_registros_marca'],
        ['DI', 'Desenhos Industriais', 'DI_desenhos_industriais'],
        ['C', 'Cultivares', 'C_cultivares'],
        ['TC', 'Topografia de Circuitos', 'TC_topografia_circuitos'],
        ['PC', 'Programas de Computador', 'PC_programas_computador'],
        ['OGM', 'Organismos Geneticamente Modificados', 'OGM_organismos_geneticamente_modificados'],
      ];

      for (const [siglaTipo, nomeTipo, chaveJson] of tiposMeta) {
        const q = typeof totaisPorTipo[chaveJson] === 'number' ? totaisPorTipo[chaveJson] : null;
        componentes.push({
          sigla: siglaTipo,
          nome: nomeTipo,
          valores: [{ ano, quantidade: q, campus: campusSlug }],
        });
      }
      break;
    }
    case 'PIPROTR': {
      valor =
        typeof dadosBrutos.total_transferidos_PIPROTR === 'number'
          ? dadosBrutos.total_transferidos_PIPROTR
          : null;
      const totaisPorTipo =
        (dadosBrutos.valores_totais_por_tipo as Record<string, number | null>) || {};

      const tiposTransf: [string, string, string][] = [
        ['CT', 'Contratos de Transferência de Tecnologia', 'CT_contratos_transferencia_tecnologia'],
        ['CL', 'Contratos de Licenciamento', 'CL_contratos_licenciamento'],
        ['CC', 'Contratos de Cessão', 'CC_contratos_cessao'],
      ];

      for (const [siglaTipo, nomeTipo, chaveJson] of tiposTransf) {
        const q = typeof totaisPorTipo[chaveJson] === 'number' ? totaisPorTipo[chaveJson] : null;
        componentes.push({
          sigla: siglaTipo,
          nome: nomeTipo,
          valores: [{ ano, quantidade: q, campus: campusSlug }],
        });
      }
      break;
    }
  }

  return { valor, componentes };
}

/**
 * Constrói a lista de indicadores de um pilar para dado campus e ano.
 */
export function obterIndicadoresDoPilar(
  dataset: DatasetCompleto,
  pilarNumero: 1 | 2 | 3,
  campusSlug = 'serra',
  ano?: number,
): Indicador[] {
  const pilar = PILARES.find((p) => p.numero === pilarNumero);
  if (!pilar) return [];

  const anoRef = ano ?? (obterAnosDisponiveis(dataset, campusSlug).slice(-1)[0] || 2026);

  // Procura o arquivo correspondente ao pilar, campus e ano
  const entrada = dataset.entradas.find(
    (e) => e.pilarNumero === pilarNumero && e.campusSlug === campusSlug && e.ano === anoRef,
  );

  return pilar.indicadoresSiglas.map((sigla) => {
    const meta = INDICADORES_META[sigla];
    const dadosBrutos = entrada?.dados?.indicadores?.[sigla];

    const { valor, componentes } = extrairMapeamentoIndicador(
      sigla,
      dadosBrutos,
      anoRef,
      campusSlug,
    );

    const valorAnual: ValorAnual = {
      ano: anoRef,
      valor,
      campus: campusSlug,
      motivoIndisponivel:
        valor === null ? 'Dado indisponível para o campus e ano selecionados.' : undefined,
    };

    return {
      sigla,
      slug: meta.slug,
      pilarNumero,
      nome: meta.nome,
      oQueMede: meta.oQueMede,
      finalidade: meta.finalidade,
      formula: meta.formula,
      tipoValor: meta.tipoValor,
      unidade: meta.unidade,
      icone: meta.icone,
      variaveisFormula: meta.variaveisFormula,
      polaridade: meta.polaridade,
      valores: [valorAnual],
      componentes,
      variaveis: componentes.map((c) => ({
        sigla: c.sigla,
        descricao: c.nome,
      })),
    };
  });
}

/**
 * Constrói o indicador completo (incluindo todos os anos disponíveis como série histórica)
 */
export function obterIndicadorCompleto(
  dataset: DatasetCompleto,
  sigla: string,
  campusSlug = 'serra',
): Indicador | undefined {
  const siglaUpper = sigla.toUpperCase() as SiglaIndicador;
  const meta = INDICADORES_META[siglaUpper];
  if (!meta) return undefined;

  const pilarNumero = meta.pilarNumero;
  const anosCampus = obterAnosDisponiveis(dataset, campusSlug);
  const anosOrdenados = anosCampus.length > 0 ? anosCampus : [2026];

  const valores: ValorAnual[] = [];
  const componentesMap = new Map<string, Componente>();

  for (const ano of anosOrdenados) {
    const entrada = dataset.entradas.find(
      (e) => e.pilarNumero === pilarNumero && e.campusSlug === campusSlug && e.ano === ano,
    );

    const dadosBrutos = entrada?.dados?.indicadores?.[siglaUpper];
    const { valor, componentes } = extrairMapeamentoIndicador(
      siglaUpper,
      dadosBrutos,
      ano,
      campusSlug,
    );

    valores.push({
      ano,
      valor,
      campus: campusSlug,
      motivoIndisponivel:
        valor === null ? 'Dado indisponível para o campus e ano selecionados.' : undefined,
    });

    for (const comp of componentes) {
      if (!componentesMap.has(comp.sigla)) {
        componentesMap.set(comp.sigla, {
          sigla: comp.sigla,
          nome: comp.nome,
          valores: [],
        });
      }
      componentesMap.get(comp.sigla)!.valores.push(...comp.valores);
    }
  }

  return {
    sigla: meta.sigla,
    slug: meta.slug,
    pilarNumero: meta.pilarNumero,
    nome: meta.nome,
    oQueMede: meta.oQueMede,
    finalidade: meta.finalidade,
    formula: meta.formula,
    tipoValor: meta.tipoValor,
    unidade: meta.unidade,
    icone: meta.icone,
    variaveisFormula: meta.variaveisFormula,
    polaridade: meta.polaridade,
    valores,
    componentes: Array.from(componentesMap.values()),
    variaveis: Array.from(componentesMap.values()).map((c) => ({
      sigla: c.sigla,
      descricao: c.nome,
    })),
  };
}

// Instância padrão carregada no build time para uso direto nos componentes Astro
export const datasetPadrao: DatasetCompleto = carregarDataset();
