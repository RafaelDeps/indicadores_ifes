/**
 * Transform — montagem dos 9 indicadores CONIF por campus×ano e para o
 * escopo institucional `todos`, com fidelidade estrita `null`/`0`
 * (FR-007…FR-010, data-model.md §3, contrato output-package.md).
 */
import { slugificarCampus } from '../lib/slugificar';
import { jsonCompacto } from './serialize';
import type { Campus, RegistroPilarJson, ValorMetrica } from './types';
import type { ResultadoIniciativas } from './initiatives';
import type { ResultadoProducoes } from './productions';

const ESCOPO_TODOS_NOME = 'Todos os Campi';
const ESCOPO_TODOS_SLUG = 'todos';

const NOMES_PILARES: Record<number, string> = {
  1: 'Engajamento Academico e Inclusao',
  2: 'Fomento e Conexao com o Ecossistema',
  3: 'Produtividade e Propriedade Intelectual',
};

const DESCRICOES = {
  NTPP: 'Numero Total de Projetos de Pesquisa',
  QSPP: 'Quantitativo de Servidores Desenvolvendo Projetos',
  PIES: 'Percentual de Estudantes Envolvidos em Pesquisa',
  PICOT: 'Percentual de Estudantes Cotistas Envolvidos em Pesquisa',
  PINV: 'Percentual de Investimento em Pesquisa, Pos e Inovacao',
  PIPDI: 'Quantidade de Acordos de Parceria para PDeI',
  PIPRO: 'Producao Intelectual',
  PIPROT: 'Quantidade Total de Ativos de Propriedade Intelectual',
  PIPROTR: 'Quantidade Total de Ativos Transferidos',
};

export interface AgregadosAno {
  ntpp: number;
  qspp: number;
  nep: number;
  npb: number;
  npt: number;
  pc: number;
}

export interface DadosAgregados {
  porCampusAno: Map<string, Map<number, AgregadosAno>>;
}

export function agregar(
  iniciativas: ResultadoIniciativas,
  producoes: ResultadoProducoes,
  anos: number[],
): DadosAgregados {
  const porCampusAno = new Map<string, Map<number, AgregadosAno>>();
  const escopos = new Set<string>([
    ...iniciativas.porCampusAno.keys(),
    ...producoes.porCampusAno.keys(),
  ]);

  for (const escopo of escopos) {
    const porAno = new Map<number, AgregadosAno>();
    for (const ano of anos) {
      const inici = iniciativas.porCampusAno.get(escopo)?.get(ano);
      const prod = producoes.porCampusAno.get(escopo)?.get(ano);
      porAno.set(ano, {
        ntpp: inici?.projetos ?? 0,
        qspp: inici?.staffIds.size ?? 0,
        nep: inici?.studentIds.size ?? 0,
        npb: prod?.npb ?? 0,
        npt: prod?.npt ?? 0,
        pc: prod?.pc ?? 0,
      });
    }
    porCampusAno.set(escopo, porAno);
  }

  return { porCampusAno };
}

function montarPilar1(a: AgregadosAno) {
  return {
    NTPP: {
      descricao: DESCRICOES.NTPP,
      projetos_pesquisa_registrados_execucao: a.ntpp as ValorMetrica,
      total_projetos_NTPP: a.ntpp as ValorMetrica,
    },
    QSPP: {
      descricao: DESCRICOES.QSPP,
      SUPP_servidores_unicos_participantes: a.qspp as ValorMetrica,
      total_servidores_QSPP: a.qspp as ValorMetrica,
    },
    PIES: {
      descricao: DESCRICOES.PIES,
      NEP_estudantes_em_pesquisa: a.nep as ValorMetrica,
      NTE_total_estudantes_matriculados: null,
      percentual_calculado_PIES: null,
    },
    PICOT: {
      descricao: DESCRICOES.PICOT,
      NTECPP_cotistas_em_pesquisa: null,
      NEP_total_estudantes_em_pesquisa: a.nep as ValorMetrica,
      percentual_calculado_PICOT: null,
    },
  };
}

function montarPilar2() {
  return {
    PINV: {
      descricao: DESCRICOES.PINV,
      TAFPPI_valor_total_aporte_pesquisa: null,
      OCC_valor_orcamento_total_capital_custeio: null,
      percentual_calculado_PINV: null,
    },
    PIPDI: {
      descricao: DESCRICOES.PIPDI,
      NAPPCT_acordos_parceria_firmados: null,
      total_acumulado_PIPDI: null,
    },
  };
}

function montarPilar3(a: AgregadosAno) {
  return {
    PIPRO: {
      descricao: DESCRICOES.PIPRO,
      NPB_producoes_academicas_bibliograficas: a.npb as ValorMetrica,
      NPT_producoes_tecnicas_tecnologicas: a.npt as ValorMetrica,
      total_producao_PIPRO: (a.npb + a.npt) as ValorMetrica,
    },
    PIPROT: {
      descricao: DESCRICOES.PIPROT,
      valores_totais_por_tipo: {
        PA_patentes_e_modelos_utilidade: 0 as ValorMetrica,
        RM_registros_marca: null,
        DI_desenhos_industriais: 0 as ValorMetrica,
        C_cultivares: null,
        TC_topografia_circuitos: null,
        PC_programas_computador: a.pc as ValorMetrica,
        OGM_organismos_geneticamente_modificados: null,
      },
      total_acumulado_PIPROT: a.pc as ValorMetrica,
    },
    PIPROTR: {
      descricao: DESCRICOES.PIPROTR,
      valores_totais_por_tipo: {
        CT_contratos_transferencia_tecnologia: null,
        CL_contratos_licenciamento: null,
        CC_contratos_cessao: null,
      },
      total_transferidos_PIPROTR: null,
    },
  };
}

function montarIndicadores(pilar: number, a: AgregadosAno) {
  switch (pilar) {
    case 1:
      return montarPilar1(a);
    case 2:
      return montarPilar2();
    case 3:
      return montarPilar3(a);
    default:
      throw new Error(`ERRO: pilar desconhecido ${pilar}`);
  }
}

export function montarArquivosPilar(
  agregados: DadosAgregados,
  campi: Campus[],
  anos: number[],
): RegistroPilarJson[] {
  const arquivos: RegistroPilarJson[] = [];
  const escopos = [
    ...campi.map((c) => ({ chave: c.name, nome: c.name, slug: slugificarCampus(c.name) })),
    { chave: ESCOPO_TODOS_SLUG, nome: ESCOPO_TODOS_NOME, slug: ESCOPO_TODOS_SLUG },
  ];

  for (const escopo of escopos) {
    for (const ano of anos) {
      const a = agregados.porCampusAno.get(escopo.chave)?.get(ano) ?? {
        ntpp: 0,
        qspp: 0,
        nep: 0,
        npb: 0,
        npt: 0,
        pc: 0,
      };
      for (const pilar of [1, 2, 3]) {
        arquivos.push({
          nome: `pilar${pilar}_${escopo.slug}_${ano}.json`,
          conteudo: jsonCompacto({
            campus: escopo.nome,
            ano_referencia: ano,
            pilar: NOMES_PILARES[pilar],
            indicadores: montarIndicadores(pilar, a),
          }),
        });
      }
    }
  }

  return arquivos;
}
