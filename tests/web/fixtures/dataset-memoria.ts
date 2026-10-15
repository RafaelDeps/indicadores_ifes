import type { DatasetCompleto } from '../../src/lib/dataset';

/**
 * Dataset sintético para os testes da memória de cálculo (spec 025).
 *
 * Cenários cobertos:
 * - Campus `serra` com 3 anos (2024–2026) e todos os pilares;
 * - PIES 2026 sem o campo NEP (numerador ausente) → avaliação não
 *   reconstrutível com valor final ainda publicado;
 * - Campus `litoral` com apenas 2025 (anos distintos por campus, para o
 *   histórico multi-anual) e valores próprios;
 * - Nenhum `campusSlug: 'todos'` nas entradas → contexto consolidado sem
 *   valores (tudo "Dado indisponível").
 */
export const datasetMemoria: DatasetCompleto = {
  campi: [
    { slug: 'todos', nome: 'Todos os Campi', anos: [2024, 2025, 2026] },
    { slug: 'serra', nome: 'Serra', anos: [2024, 2025, 2026] },
    { slug: 'litoral', nome: 'Litoral', anos: [2025] },
  ],
  anos: [2024, 2025, 2026],
  entradas: [
    // Pilar 1 — Serra
    {
      pilarNumero: 1,
      campusSlug: 'serra',
      campusNome: 'Serra',
      ano: 2024,
      dados: {
        campus: 'Serra',
        ano_referencia: 2024,
        pilar: 'Pilar 1',
        indicadores: {
          NTPP: { total_projetos_NTPP: 10, projetos_pesquisa_registrados_execucao: 10 },
          QSPP: { total_servidores_QSPP: 20, SUPP_servidores_unicos_participantes: 20 },
          PIES: {
            percentual_calculado_PIES: 5.5,
            NEP_estudantes_em_pesquisa: 50,
            NTE_total_estudantes_matriculados: 900,
          },
          PICOT: {
            percentual_calculado_PICOT: 40.0,
            NTECPP_cotistas_em_pesquisa: 20,
            NEP_total_estudantes_em_pesquisa: 50,
          },
        },
      },
    },
    {
      pilarNumero: 1,
      campusSlug: 'serra',
      campusNome: 'Serra',
      ano: 2025,
      dados: {
        campus: 'Serra',
        ano_referencia: 2025,
        pilar: 'Pilar 1',
        indicadores: {
          NTPP: { total_projetos_NTPP: 15, projetos_pesquisa_registrados_execucao: 15 },
          QSPP: { total_servidores_QSPP: 25, SUPP_servidores_unicos_participantes: 25 },
          PIES: {
            percentual_calculado_PIES: 6.0,
            NEP_estudantes_em_pesquisa: 60,
            NTE_total_estudantes_matriculados: 1000,
          },
          PICOT: {
            percentual_calculado_PICOT: 50.0,
            NTECPP_cotistas_em_pesquisa: 30,
            NEP_total_estudantes_em_pesquisa: 60,
          },
        },
      },
    },
    {
      pilarNumero: 1,
      campusSlug: 'serra',
      campusNome: 'Serra',
      ano: 2026,
      dados: {
        campus: 'Serra',
        ano_referencia: 2026,
        pilar: 'Pilar 1',
        indicadores: {
          // PIES sem NEP: numerador ausente — avaliação não reconstrutível,
          // mas o percentual final (7%) continua publicado.
          PIES: {
            percentual_calculado_PIES: 7.0,
            NTE_total_estudantes_matriculados: 1000,
          },
        },
      },
    },
    // Pilar 2 — Serra
    {
      pilarNumero: 2,
      campusSlug: 'serra',
      campusNome: 'Serra',
      ano: 2024,
      dados: {
        campus: 'Serra',
        ano_referencia: 2024,
        pilar: 'Pilar 2',
        indicadores: {
          PINV: {
            percentual_calculado_PINV: 3.2,
            TAFPPI_valor_total_aporte_pesquisa: 32000,
            OCC_valor_orcamento_total_capital_custeio: 1000000,
          },
          PIPDI: { total_acumulado_PIPDI: 4, NAPPCT_acordos_parceria_firmados: 4 },
        },
      },
    },
    // Pilar 3 — Serra
    {
      pilarNumero: 3,
      campusSlug: 'serra',
      campusNome: 'Serra',
      ano: 2024,
      dados: {
        campus: 'Serra',
        ano_referencia: 2024,
        pilar: 'Pilar 3',
        indicadores: {
          PIPRO: {
            total_producao_PIPRO: 40,
            NPB_producoes_academicas_bibliograficas: 25,
            NPT_producoes_tecnicas_tecnologicas: 15,
          },
          PIPROT: {
            total_acumulado_PIPROT: 5,
            valores_totais_por_tipo: {
              PA_patentes_e_modelos_utilidade: 2,
              PC_programas_computador: 3,
            },
          },
          PIPROTR: {
            total_transferidos_PIPROTR: 1,
            valores_totais_por_tipo: { CT_contratos_transferencia_tecnologia: 1 },
          },
        },
      },
    },
    // Pilar 1 — Litoral (campus com um único ano)
    {
      pilarNumero: 1,
      campusSlug: 'litoral',
      campusNome: 'Litoral',
      ano: 2025,
      dados: {
        campus: 'Litoral',
        ano_referencia: 2025,
        pilar: 'Pilar 1',
        indicadores: {
          NTPP: { total_projetos_NTPP: 5, projetos_pesquisa_registrados_execucao: 5 },
          PIES: {
            percentual_calculado_PIES: 4.0,
            NEP_estudantes_em_pesquisa: 30,
            NTE_total_estudantes_matriculados: 750,
          },
        },
      },
    },
  ],
};
