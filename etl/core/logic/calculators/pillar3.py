from __future__ import annotations

from etl.core.logic.models import AgregadosPilar3, Artigo, Producao, TipoProducao
from etl.core.logic.temporal.activity_filter import ano_valido


def calcular_pilar3(
    artigos: list[Artigo],
    producoes: list[Producao],
    tipos_map: dict[int, TipoProducao],
    ano: int,
) -> AgregadosPilar3:
    """
    Calcula as métricas do Pilar 3 (Produtividade e Propriedade Intelectual):
    - PIPRO:
      - NPB: Artigos publicados no ano (livros = 0).
      - NPT: Produtos e processos tecnológicos (excluindo softwares).
    - PIPROT:
      - PC: Softwares e programas de computador registrados/desenvolvidos.
      - PA: Patentes = 0 (contagem comprovada nula).
    - PIPROTR:
      - Contratos de transferência = None (estritamente não rastreados).
    """
    artigos_ano = [a for a in artigos if a.year == ano and ano_valido(a.year)]
    npb_artigos = len(artigos_ano)
    npb_livros = 0
    npb_total = npb_artigos + npb_livros

    producoes_ano = [p for p in producoes if p.year == ano and ano_valido(p.year)]

    pc_softwares = 0
    npt_produtos = 0
    npt_processos = 0

    for prod in producoes_ano:
        tipo = (
            tipos_map.get(prod.production_type_id) if prod.production_type_id else None
        )
        nome_tipo = tipo.name.lower() if tipo else ""

        if any(
            termo in nome_tipo
            for termo in [
                "software",
                "programa de computador",
                "aplicativo",
                "computador",
            ]
        ):
            pc_softwares += 1
        elif "processo" in nome_tipo:
            npt_processos += 1
        else:
            npt_produtos += 1

    npt_total = npt_produtos + npt_processos

    return AgregadosPilar3(
        npb_producao_bibliografica=npb_total,
        npb_artigos=npb_artigos,
        npb_livros=npb_livros,
        npt_producao_tecnica=npt_total,
        npt_produtos_tecnologicos=npt_produtos,
        npt_processos_tecnologicos=npt_processos,
        pc_softwares=pc_softwares,
        pa_patentes=0,
        total_transferidos_piprotr=None,
    )
