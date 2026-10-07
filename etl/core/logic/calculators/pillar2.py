from __future__ import annotations

from typing import TYPE_CHECKING

from etl.core.logic.models import AgregadosPilar2

if TYPE_CHECKING:
    from etl.core.logic.models.facto import ProjetoFacto


def calcular_pipdi(
    projetos: list[ProjetoFacto] | None, campus_slug: str, ano: int
) -> int | None:
    """
    Calcula NAPPCT (número de acordos de parceria firmados e vigentes) para o campus e ano.
    Retorna None se a fonte de dados FACTO estiver ausente (modo fallback).
    Se a fonte estiver presente, retorna o inteiro (>= 0).
    """
    if projetos is None:
        return None

    count = sum(
        1
        for p in projetos
        if campus_slug in p.campus_slugs and p.eh_parceria and p.ativo_em_ano(ano)
    )
    return count


def calcular_tafppi(
    projetos: list[ProjetoFacto] | None, campus_slug: str, ano: int
) -> float | None:
    """
    Calcula TAFPPI (total de aporte de fomento à pesquisa em R$) para o campus e ano.
    Atribui o montante integral do projeto exclusivamente ao seu ano de início (ano_inicio).
    Retorna None se a fonte estiver ausente ou se não houver novos projetos com aporte no ano.
    """
    if projetos is None:
        return None

    projetos_ano = [
        p
        for p in projetos
        if campus_slug in p.campus_slugs and p.eh_pdei and p.ano_inicio == ano
    ]
    if not projetos_ano:
        return None

    total = sum(p.valor_aprovado for p in projetos_ano)
    return round(total, 2)


def calcular_pilar2(
    projetos: list[ProjetoFacto] | None = None,
    campus_slug: str = "todos",
    ano: int | None = None,
) -> AgregadosPilar2:
    """
    Retorna as métricas do Pilar 2 (Fomento e Conexão com o Ecossistema).
    Em estrito cumprimento ao Princípio III da Constituição do IFES, indicadores
    orçamentários institucionais (OCC e percentual PINV) são estritamente None.
    """
    if projetos is None or ano is None:
        return AgregadosPilar2(
            tafppi_valor_total_aporte_pesquisa=None,
            occ_valor_orcamento_total_capital_custeio=None,
            percentual_calculado_pinv=None,
            nappct_acordos_parceria_firmados=None,
            total_acumulado_pipdi=None,
        )

    pipdi = calcular_pipdi(projetos, campus_slug, ano)
    tafppi = calcular_tafppi(projetos, campus_slug, ano)

    return AgregadosPilar2(
        tafppi_valor_total_aporte_pesquisa=tafppi,
        occ_valor_orcamento_total_capital_custeio=None,
        percentual_calculado_pinv=None,
        nappct_acordos_parceria_firmados=pipdi,
        total_acumulado_pipdi=pipdi,
    )

