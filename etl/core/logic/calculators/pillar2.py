from __future__ import annotations

from etl.core.logic.models import AgregadosPilar2


def calcular_pilar2() -> AgregadosPilar2:
    """
    Retorna as métricas do Pilar 2 (Fomento e Conexão com o Ecossistema).
    Em estrito cumprimento ao Princípio III da Constituição do IFES, indicadores
    orçamentários e de parcerias não coletáveis no modelo canônico são estritamente None.
    """
    return AgregadosPilar2(
        tafppi_valor_total_aporte_pesquisa=None,
        occ_valor_orcamento_total_capital_custeio=None,
        percentual_calculado_pinv=None,
        nappct_acordos_parceria_firmados=None,
        total_acumulado_pipdi=None,
    )
