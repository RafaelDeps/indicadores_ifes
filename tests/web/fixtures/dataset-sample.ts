import type { DatasetCompleto } from '../../src/lib/dataset';

export const datasetMock: DatasetCompleto = {
  campi: [
    { slug: 'todos', nome: 'Todos os Campi', anos: [2024, 2025, 2026] },
    { slug: 'serra', nome: 'Serra', anos: [2024, 2025, 2026] },
    { slug: 'vitoria', nome: 'Vitória', anos: [2025, 2026] }, // Caso de teste: Vitória só tem 2025 e 2026
  ],
  anos: [2024, 2025, 2026],
  entradas: [
    // Pilar 1 - Serra
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
          NTPP: { total_projetos_NTPP: 18, projetos_pesquisa_registrados_execucao: 18 },
          QSPP: { total_servidores_QSPP: 28, SUPP_servidores_unicos_participantes: 28 },
          PIES: {
            percentual_calculado_PIES: 7.0,
            NEP_estudantes_em_pesquisa: 70,
            NTE_total_estudantes_matriculados: 1000,
          },
          PICOT: {
            percentual_calculado_PICOT: 55.0,
            NTECPP_cotistas_em_pesquisa: 38,
            NEP_total_estudantes_em_pesquisa: 70,
          },
        },
      },
    },
    // Pilar 2 - Serra
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
    {
      pilarNumero: 2,
      campusSlug: 'serra',
      campusNome: 'Serra',
      ano: 2025,
      dados: {
        campus: 'Serra',
        ano_referencia: 2025,
        pilar: 'Pilar 2',
        indicadores: {
          PINV: {
            percentual_calculado_PINV: 4.5,
            TAFPPI_valor_total_aporte_pesquisa: 45000,
            OCC_valor_orcamento_total_capital_custeio: 1000000,
          },
          PIPDI: { total_acumulado_PIPDI: 6, NAPPCT_acordos_parceria_firmados: 6 },
        },
      },
    },
    {
      pilarNumero: 2,
      campusSlug: 'serra',
      campusNome: 'Serra',
      ano: 2026,
      dados: {
        campus: 'Serra',
        ano_referencia: 2026,
        pilar: 'Pilar 2',
        indicadores: {
          PINV: {
            percentual_calculado_PINV: 5.0,
            TAFPPI_valor_total_aporte_pesquisa: 50000,
            OCC_valor_orcamento_total_capital_custeio: 1000000,
          },
          PIPDI: { total_acumulado_PIPDI: 8, NAPPCT_acordos_parceria_firmados: 8 },
        },
      },
    },
    // Pilar 3 - Serra
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
    {
      pilarNumero: 3,
      campusSlug: 'serra',
      campusNome: 'Serra',
      ano: 2025,
      dados: {
        campus: 'Serra',
        ano_referencia: 2025,
        pilar: 'Pilar 3',
        indicadores: {
          PIPRO: {
            total_producao_PIPRO: 50,
            NPB_producoes_academicas_bibliograficas: 30,
            NPT_producoes_tecnicas_tecnologicas: 20,
          },
          PIPROT: {
            total_acumulado_PIPROT: 7,
            valores_totais_por_tipo: {
              PA_patentes_e_modelos_utilidade: 3,
              PC_programas_computador: 4,
            },
          },
          PIPROTR: {
            total_transferidos_PIPROTR: 2,
            valores_totais_por_tipo: { CT_contratos_transferencia_tecnologia: 2 },
          },
        },
      },
    },
    {
      pilarNumero: 3,
      campusSlug: 'serra',
      campusNome: 'Serra',
      ano: 2026,
      dados: {
        campus: 'Serra',
        ano_referencia: 2026,
        pilar: 'Pilar 3',
        indicadores: {
          PIPRO: {
            total_producao_PIPRO: 60,
            NPB_producoes_academicas_bibliograficas: 35,
            NPT_producoes_tecnicas_tecnologicas: 25,
          },
          PIPROT: {
            total_acumulado_PIPROT: 9,
            valores_totais_por_tipo: {
              PA_patentes_e_modelos_utilidade: 4,
              PC_programas_computador: 5,
            },
          },
          PIPROTR: {
            total_transferidos_PIPROTR: 3,
            valores_totais_por_tipo: { CT_contratos_transferencia_tecnologia: 3 },
          },
        },
      },
    },
  ],
};
