import { describe, expect, it } from 'vitest';
import { agregar, montarArquivosPilar } from '../../src/etl/pillars';
import { agregarIniciativas } from '../../src/etl/initiatives';
import { agregarProducoes } from '../../src/etl/productions';
import { criarRegistroPessoas } from '../../src/etl/people';
import type { ExportCanonicos } from '../../src/etl/types';
import {
  ANOS_ALVO,
  ARTIGOS_FIXTURE,
  AUTORES_PRODUCAO_FIXTURE,
  CAMPI_FIXTURE,
  INICIATIVAS_FIXTURE,
  PESSOAS_FIXTURE,
  PRODUCOES_FIXTURE,
  TIPOS_PRODUCAO_FIXTURE,
} from './fixtures';

function exportacaoFixture(): ExportCanonicos {
  return {
    iniciativas: INICIATIVAS_FIXTURE,
    pessoas: PESSOAS_FIXTURE,
    estudantes: [],
    campi: CAMPI_FIXTURE,
    artigos: ARTIGOS_FIXTURE,
    producoes: PRODUCOES_FIXTURE,
    autoresProducao: AUTORES_PRODUCAO_FIXTURE,
    tiposProducao: TIPOS_PRODUCAO_FIXTURE,
    avisos: [],
  };
}

function arquivosPorNome(): Map<string, ArquivoPilarBruto> {
  const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
  const agregados = agregar(
    agregarIniciativas(exportacaoFixture(), registro, ANOS_ALVO),
    agregarProducoes(exportacaoFixture(), registro, ANOS_ALVO),
    ANOS_ALVO,
  );
  const arquivos = montarArquivosPilar(agregados, CAMPI_FIXTURE, ANOS_ALVO);
  return new Map(arquivos.map((a) => [a.nome, JSON.parse(a.conteudo) as ArquivoPilarBruto]));
}

interface ArquivoPilarBruto {
  campus: string;
  ano_referencia: number;
  pilar: string;
  indicadores: Record<
    string,
    Record<string, unknown> & { valores_totais_por_tipo?: Record<string, unknown> }
  >;
}

describe('fidelidade estrita null/0 (Princípio III, FR-010)', () => {
  const porNome = arquivosPorNome();

  it('NTPP sem projetos ativos no ano = 0 verificado (não null)', () => {
    const p1 = porNome.get('pilar1_vilavelha_2024.json');
    expect(p1.indicadores.NTPP.total_projetos_NTPP).toBe(0);
    expect(p1.indicadores.NTPP.projetos_pesquisa_registrados_execucao).toBe(0);
  });

  it('PIES: NEP numérico; NTE e percentual estritamente null', () => {
    const p1 = porNome.get('pilar1_serra_2024.json');
    expect(p1.indicadores.PIES.NEP_estudantes_em_pesquisa).toBe(1);
    expect(p1.indicadores.PIES.NTE_total_estudantes_matriculados).toBeNull();
    expect(p1.indicadores.PIES.percentual_calculado_PIES).toBeNull();
  });

  it('PICOT: NEP preservado; NTECPP e percentual estritamente null', () => {
    const p1 = porNome.get('pilar1_serra_2024.json');
    expect(p1.indicadores.PICOT.NEP_total_estudantes_em_pesquisa).toBe(1);
    expect(p1.indicadores.PICOT.NTECPP_cotistas_em_pesquisa).toBeNull();
    expect(p1.indicadores.PICOT.percentual_calculado_PICOT).toBeNull();
  });

  it('PINV: TAFPPI, OCC e percentual todos null', () => {
    const p2 = porNome.get('pilar2_vitoria_2024.json');
    expect(p2.indicadores.PINV.TAFPPI_valor_total_aporte_pesquisa).toBeNull();
    expect(p2.indicadores.PINV.OCC_valor_orcamento_total_capital_custeio).toBeNull();
    expect(p2.indicadores.PINV.percentual_calculado_PINV).toBeNull();
  });

  it('PIPDI: NAPPCT e total acumulado todos null', () => {
    const p2 = porNome.get('pilar2_todos_2026.json');
    expect(p2.indicadores.PIPDI.NAPPCT_acordos_parceria_firmados).toBeNull();
    expect(p2.indicadores.PIPDI.total_acumulado_PIPDI).toBeNull();
  });

  it('PIPROT: PA/DI = 0 verificado; RM/C/TC/OGM = null; PC do dado', () => {
    const p3 = porNome.get('pilar3_serra_2024.json');
    const valores = p3.indicadores.PIPROT.valores_totais_por_tipo;
    expect(valores.PA_patentes_e_modelos_utilidade).toBe(0);
    expect(valores.DI_desenhos_industriais).toBe(0);
    expect(valores.RM_registros_marca).toBeNull();
    expect(valores.C_cultivares).toBeNull();
    expect(valores.TC_topografia_circuitos).toBeNull();
    expect(valores.OGM_organismos_geneticamente_modificados).toBeNull();
    expect(valores.PC_programas_computador).toBe(0);
    expect(p3.indicadores.PIPROT.total_acumulado_PIPROT).toBe(0);

    const p3Vitoria = porNome.get('pilar3_vitoria_2024.json');
    expect(p3Vitoria.indicadores.PIPROT.valores_totais_por_tipo.PC_programas_computador).toBe(1);
  });

  it('PIPROTR: todos os campos estritamente null', () => {
    const p3 = porNome.get('pilar3_serra_2024.json');
    expect(
      p3.indicadores.PIPROTR.valores_totais_por_tipo.CT_contratos_transferencia_tecnologia,
    ).toBeNull();
    expect(p3.indicadores.PIPROTR.valores_totais_por_tipo.CL_contratos_licenciamento).toBeNull();
    expect(p3.indicadores.PIPROTR.valores_totais_por_tipo.CC_contratos_cessao).toBeNull();
    expect(p3.indicadores.PIPROTR.total_transferidos_PIPROTR).toBeNull();
  });

  it('varredura geral: toda métrica é number (inteiro não negativo) ou null — jamais undefined/NaN/string', () => {
    const camposNaoCalculaveis = [
      'NTE_total_estudantes_matriculados',
      'percentual_calculado_PIES',
      'NTECPP_cotistas_em_pesquisa',
      'percentual_calculado_PICOT',
      'TAFPPI_valor_total_aporte_pesquisa',
      'OCC_valor_orcamento_total_capital_custeio',
      'percentual_calculado_PINV',
      'NAPPCT_acordos_parceria_firmados',
      'total_acumulado_PIPDI',
      'total_transferidos_PIPROTR',
    ];
    for (const [nome, dados] of porNome) {
      for (const [sigla, indicador] of Object.entries(dados.indicadores)) {
        for (const [campo, valor] of Object.entries(indicador)) {
          if (campo === 'descricao') {
            expect(typeof valor).toBe('string');
            continue;
          }
          if (campo === 'valores_totais_por_tipo') {
            for (const v of Object.values(valor as Record<string, unknown>)) {
              expect(v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0)).toBe(
                true,
              );
            }
            continue;
          }
          expect(valor === null || typeof valor === 'number').toBe(true);
          if (typeof valor === 'number') {
            expect(Number.isInteger(valor)).toBe(true);
            expect(valor).toBeGreaterThanOrEqual(0);
          }
          if (camposNaoCalculaveis.includes(campo)) {
            expect(valor, `${nome}/${sigla}/${campo}`).toBeNull();
          }
        }
      }
    }
  });
});
