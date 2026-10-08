from __future__ import annotations

import json
from typing import Any

from etl.core.logic.models import AgregadosCampus, RegistroPilarJson

NOMES_PILARES = {
    1: "Engajamento Academico e Inclusao",
    2: "Fomento e Conexao com o Ecossistema",
    3: "Produtividade e Propriedade Intelectual",
}

DESCRICOES = {
    "NTPP": "Numero Total de Projetos de Pesquisa",
    "QSPP": "Quantitativo de Servidores Desenvolvendo Projetos",
    "PIES": "Percentual de Estudantes Envolvidos em Pesquisa",
    "PICOT": "Percentual de Estudantes Cotistas Envolvidos em Pesquisa",
    "PINV": "Percentual de Investimento em Pesquisa, Pos e Inovacao",
    "PIPDI": "Quantidade de Acordos de Parceria para PDeI",
    "PIPRO": "Producao Intelectual",
    "PIPROT": "Quantidade Total de Ativos de Propriedade Intelectual",
    "PIPROTR": "Quantidade Total de Ativos Transferidos",
}


def _montar_pilar1(agregados: AgregadosCampus, ano: int) -> dict[str, Any]:
    p1 = agregados.pilar1
    return {
        "campus": agregados.campus_nome,
        "ano_referencia": ano,
        "pilar": NOMES_PILARES[1],
        "indicadores": {
            "NTPP": {
                "descricao": DESCRICOES["NTPP"],
                "projetos_pesquisa_registrados_execucao": p1.ntpp_projetos_pesquisa_ativos,
                "total_projetos_NTPP": p1.ntpp_projetos_pesquisa_ativos,
            },
            "QSPP": {
                "descricao": DESCRICOES["QSPP"],
                "SUPP_servidores_unicos_participantes": p1.qspp_docentes_pesquisa,
                "total_servidores_QSPP": p1.qspp_docentes_pesquisa,
            },
            "PIES": {
                "descricao": DESCRICOES["PIES"],
                "NEP_estudantes_em_pesquisa": p1.nep_estudantes_pesquisa,
                "NTE_total_estudantes_matriculados": p1.nte_total_estudantes_matriculados,
                "percentual_calculado_PIES": None,
            },
            "PICOT": {
                "descricao": DESCRICOES["PICOT"],
                "NTECPP_cotistas_em_pesquisa": p1.ntecpp_cotistas_pesquisa,
                "NEP_total_estudantes_em_pesquisa": p1.nep_estudantes_pesquisa,
                "percentual_calculado_PICOT": None,
            },
        },
    }


def _montar_pilar2(agregados: AgregadosCampus, ano: int) -> dict[str, Any]:
    p2 = agregados.pilar2
    return {
        "campus": agregados.campus_nome,
        "ano_referencia": ano,
        "pilar": NOMES_PILARES[2],
        "indicadores": {
            "PINV": {
                "descricao": DESCRICOES["PINV"],
                "TAFPPI_valor_total_aporte_pesquisa": p2.tafppi_valor_total_aporte_pesquisa,
                "OCC_valor_orcamento_total_capital_custeio": p2.occ_valor_orcamento_total_capital_custeio,
                "percentual_calculado_PINV": (
                    round(float(p2.percentual_calculado_pinv), 2)
                    if p2.percentual_calculado_pinv is not None
                    else None
                ),
            },
            "PIPDI": {
                "descricao": DESCRICOES["PIPDI"],
                "NAPPCT_acordos_parceria_firmados": p2.nappct_acordos_parceria_firmados,
                "total_acumulado_PIPDI": p2.total_acumulado_pipdi,
            },
        },
    }


def _montar_pilar3(agregados: AgregadosCampus, ano: int) -> dict[str, Any]:
    p3 = agregados.pilar3
    total_producao = p3.npb_producao_bibliografica + p3.npt_producao_tecnica
    return {
        "campus": agregados.campus_nome,
        "ano_referencia": ano,
        "pilar": NOMES_PILARES[3],
        "indicadores": {
            "PIPRO": {
                "descricao": DESCRICOES["PIPRO"],
                "NPB_producoes_academicas_bibliograficas": p3.npb_producao_bibliografica,
                "NPT_producoes_tecnicas_tecnologicas": p3.npt_producao_tecnica,
                "total_producao_PIPRO": total_producao,
            },
            "PIPROT": {
                "descricao": DESCRICOES["PIPROT"],
                "valores_totais_por_tipo": {
                    "PA_patentes_e_modelos_utilidade": 0,
                    "RM_registros_marca": None,
                    "DI_desenhos_industriais": 0,
                    "C_cultivares": None,
                    "TC_topografia_circuitos": None,
                    "PC_programas_computador": p3.pc_softwares,
                    "OGM_organismos_geneticamente_modificados": None,
                },
                "total_acumulado_PIPROT": p3.pc_softwares,
            },
            "PIPROTR": {
                "descricao": DESCRICOES["PIPROTR"],
                "valores_totais_por_tipo": {
                    "CT_contratos_transferencia_tecnologia": None,
                    "CL_contratos_licenciamento": None,
                    "CC_contratos_cessao": None,
                },
                "total_transferidos_PIPROTR": None,
            },
        },
    }


def formatar_arquivos_pilar(
    campus_slug: str, agregados: AgregadosCampus, ano: int
) -> list[RegistroPilarJson]:
    """
    Serializa os 3 arquivos JSON do campus para determinado ano de referência
    aderindo rigorosamente aos contratos de schema.
    """
    arquivos: list[RegistroPilarJson] = []

    construtores = [
        (1, _montar_pilar1),
        (2, _montar_pilar2),
        (3, _montar_pilar3),
    ]

    for numero_pilar, construtor in construtores:
        dados = construtor(agregados, ano)
        nome_arquivo = f"pilar{numero_pilar}_{campus_slug}_{ano}.json"
        conteudo = json.dumps(dados, ensure_ascii=False, indent=2) + "\n"
        arquivos.append(RegistroPilarJson(nome=nome_arquivo, conteudo=conteudo))

    return arquivos
