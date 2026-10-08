from __future__ import annotations

from typing import TYPE_CHECKING

from etl.core.logic.models import AgregadosPilar2

if TYPE_CHECKING:
    from etl.core.logic.models.facto import ProjetoFacto
    from etl.core.logic.models.pillar2_models import (
        DadosPinvCampus,
        ProjetoSigpesqFinanciamento,
    )


PALAVRAS_CHAVE_PARCEIROS_EXTERNOS = (
    "cnpq",
    "fapes",
    "finep",
    "capes",
    "embrapii",
    "fnde",
    "funcitec",
    "facitec",
    "bandes",
    "mcti",
    "mec",
    "setec",
    "unicef",
    "tre",
    "banco mundial",
    "biobank",
    "rnp",
    "fundepes",
    "inova capixaba",
    "consed",
    "iphan",
    "ministério",
    "ministerio",
    "arcelor",
    "samarco",
    "mogai",
    "intelliway",
    "sanevix",
    "aratu",
    "google",
    "wise",
    "edp",
    "fiorot",
    "sigmais",
    "petrobras",
    "vale",
    "zaruc",
    "unisales",
    "empresa",
    "parceiro privado",
    "intechno",
    "apice",
)


def eh_parceria_externa_sigpesq(projeto: ProjetoSigpesqFinanciamento) -> bool:
    """
    Verifica se o projeto possui parceria ou financiamento de entidade externa.
    Exclui projetos que não possuem fontes ou que possuem apenas voluntariado / recursos internos.
    """
    if not projeto.fontes:
        return False

    for fonte in projeto.fontes:
        if not fonte.fonte:
            continue
        nome_fonte = fonte.fonte.lower()

        # Ignora voluntariado e sem financiamento
        if any(
            ign in nome_fonte
            for ign in (
                "voluntariado",
                "sem financiamento",
                "recursos próprios",
                "instituição própria",
            )
        ):
            continue

        # Verifica se contém palavra-chave de entidade externa
        if any(kw in nome_fonte for kw in PALAVRAS_CHAVE_PARCEIROS_EXTERNOS):
            return True

    return False


def calcular_pipdi(
    projetos: list[ProjetoFacto] | None = None,
    campus_slug: str = "todos",
    ano: int | None = None,
    projetos_sigpesq: list[ProjetoSigpesqFinanciamento] | None = None,
) -> int | None:
    """
    Calcula NAPPCT (número de acordos de parceria firmados e vigentes) para o campus e ano.
    Combina fontes FACTO e SIGPESQ.
    Retorna None se ambas as fontes de dados estiverem ausentes.
    Se alguma fonte estiver presente, retorna a contagem de acordos ativos no ano.
    """
    if ano is None:
        return None

    if projetos is None and projetos_sigpesq is None:
        return None

    count = 0

    if projetos is not None:
        count += sum(
            1
            for p in projetos
            if (campus_slug == "todos" or campus_slug in p.campus_slugs)
            and p.eh_parceria
            and p.ativo_em_ano(ano)
        )

    if projetos_sigpesq is not None:
        for ps in projetos_sigpesq:
            pertence_campus = campus_slug == "todos" or ps.campus_slug == campus_slug
            vigente = ps.ativo_em_ano(ano)
            if pertence_campus and vigente and eh_parceria_externa_sigpesq(ps):
                count += 1

    return count


def calcular_tafppi(
    projetos: list[ProjetoFacto] | None = None,
    campus_slug: str = "todos",
    ano: int | None = None,
    projetos_sigpesq: list[ProjetoSigpesqFinanciamento] | None = None,
) -> float | None:
    """
    Calcula TAFPPI (total de aporte de fomento à pesquisa em R$) para o campus e ano.
    Atribui o montante integral do projeto exclusivamente ao seu ano de início (ano_inicio).
    Combina dados de FACTO e SIGPESQ.
    Retorna None se ambas as fontes estiverem ausentes ou se não houver novos projetos com aporte no ano.
    """
    if ano is None:
        return None

    if projetos is None and projetos_sigpesq is None:
        return None

    total = 0.0
    encontrou_projetos = False

    if projetos is not None:
        for p in projetos:
            pertence_campus = campus_slug == "todos" or campus_slug in p.campus_slugs
            if pertence_campus and p.eh_pdei and p.ano_inicio == ano:
                if p.valor_aprovado and p.valor_aprovado > 0:
                    total += p.valor_aprovado
                    encontrou_projetos = True

    if projetos_sigpesq is not None:
        for ps in projetos_sigpesq:
            pertence_campus = campus_slug == "todos" or ps.campus_slug == campus_slug
            if pertence_campus and ps.ano_inicio == ano:
                if ps.valor_total and ps.valor_total > 0:
                    total += ps.valor_total
                    encontrou_projetos = True

    if not encontrou_projetos:
        return None

    return round(total, 2)


def obter_percentual_pinv(
    dados_pinv: DadosPinvCampus | None, ano: int | None
) -> float | None:
    """
    Extrai o percentual calculado de PINV para o ano especificado.
    Retorna None se os dados do campus estiverem ausentes ou se o ano não constar.
    """
    if dados_pinv is None or ano is None:
        return None
    val = dados_pinv.valores_por_ano.get(ano)
    if val is not None:
        return round(float(val), 2)
    return None


def calcular_pilar2(
    projetos: list[ProjetoFacto] | None = None,
    campus_slug: str = "todos",
    ano: int | None = None,
    dados_pinv: DadosPinvCampus | None = None,
    projetos_sigpesq: list[ProjetoSigpesqFinanciamento] | None = None,
) -> AgregadosPilar2:
    """
    Retorna as métricas do Pilar 2 (Fomento e Conexão com o Ecossistema).
    Em estrito cumprimento ao Princípio III da Constituição do IFES, indicadores
    orçamentários institucionais (OCC) são estritamente None.
    percentual_calculado_pinv é obtido a partir de dados_pinv quando disponível.
    """
    pinv = obter_percentual_pinv(dados_pinv, ano)

    if (projetos is None and projetos_sigpesq is None) or ano is None:
        return AgregadosPilar2(
            tafppi_valor_total_aporte_pesquisa=None,
            occ_valor_orcamento_total_capital_custeio=None,
            percentual_calculado_pinv=pinv,
            nappct_acordos_parceria_firmados=None,
            total_acumulado_pipdi=None,
        )

    pipdi = calcular_pipdi(
        projetos=projetos,
        campus_slug=campus_slug,
        ano=ano,
        projetos_sigpesq=projetos_sigpesq,
    )
    tafppi = calcular_tafppi(
        projetos=projetos,
        campus_slug=campus_slug,
        ano=ano,
        projetos_sigpesq=projetos_sigpesq,
    )

    return AgregadosPilar2(
        tafppi_valor_total_aporte_pesquisa=tafppi,
        occ_valor_orcamento_total_capital_custeio=None,
        percentual_calculado_pinv=pinv,
        nappct_acordos_parceria_firmados=pipdi,
        total_acumulado_pipdi=pipdi,
    )
