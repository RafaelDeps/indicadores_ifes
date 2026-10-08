from __future__ import annotations

import json
from pathlib import Path

import pytest

from etl.adapters.sinks.json_pilar_sink import formatar_arquivos_pilar
from etl.adapters.sinks.zip_indicadores_sink import validar_arquivos_pilar
from etl.core.logic.models import (
    AgregadosCampus,
    AgregadosPilar2,
    RegistroPilarJson,
)

SCHEMA_PILAR2_PATH = Path(
    "specs/017-pillar2-pinv-pipdi-etl/contracts/pilar2-schema.json"
)


def _validar_com_schema(dados: dict) -> None:
    """Validação básica estrutural contra o contrato de Pilar 2."""
    assert dados["pilar"] == "Fomento e Conexao com o Ecossistema"
    assert "PINV" in dados["indicadores"]
    assert "PIPDI" in dados["indicadores"]

    pinv = dados["indicadores"]["PINV"]
    assert pinv["OCC_valor_orcamento_total_capital_custeio"] is None
    if pinv["percentual_calculado_PINV"] is not None:
        assert isinstance(pinv["percentual_calculado_PINV"], (int, float))
        assert pinv["percentual_calculado_PINV"] >= 0

    pipdi = dados["indicadores"]["PIPDI"]
    if pipdi["NAPPCT_acordos_parceria_firmados"] is not None:
        assert isinstance(pipdi["NAPPCT_acordos_parceria_firmados"], int)
        assert pipdi["NAPPCT_acordos_parceria_firmados"] >= 0


def test_contrato_pilar2_com_pinv_preenchido() -> None:
    """Verifica arquivo de Pilar 2 com percentual PINV numérico (ex.: Serra)."""
    campus = AgregadosCampus(
        campus_nome="Serra",
        pilar2=AgregadosPilar2(
            tafppi_valor_total_aporte_pesquisa=12067095.28,
            occ_valor_orcamento_total_capital_custeio=None,
            percentual_calculado_pinv=496.78,
            nappct_acordos_parceria_firmados=15,
            total_acumulado_pipdi=15,
        ),
    )

    arquivos = formatar_arquivos_pilar(campus_slug="serra", agregados=campus, ano=2024)
    arq_pilar2 = next(a for a in arquivos if "pilar2" in a.nome)

    dados = json.loads(arq_pilar2.conteudo)
    _validar_com_schema(dados)
    assert dados["indicadores"]["PINV"]["percentual_calculado_PINV"] == 496.78
    assert (
        dados["indicadores"]["PINV"]["OCC_valor_orcamento_total_capital_custeio"]
        is None
    )

    # Deve passar pela validação do sink
    validar_arquivos_pilar([arq_pilar2])


def test_contrato_pilar2_com_pinv_nulo() -> None:
    """Verifica arquivo de Pilar 2 sem arquivo do campus (PINV null, ex.: Vitória)."""
    campus = AgregadosCampus(
        campus_nome="Vitória",
        pilar2=AgregadosPilar2(
            tafppi_valor_total_aporte_pesquisa=None,
            occ_valor_orcamento_total_capital_custeio=None,
            percentual_calculado_pinv=None,
            nappct_acordos_parceria_firmados=None,
            total_acumulado_pipdi=None,
        ),
    )

    arquivos = formatar_arquivos_pilar(
        campus_slug="vitoria", agregados=campus, ano=2024
    )
    arq_pilar2 = next(a for a in arquivos if "pilar2" in a.nome)

    dados = json.loads(arq_pilar2.conteudo)
    _validar_com_schema(dados)
    assert dados["indicadores"]["PINV"]["percentual_calculado_PINV"] is None
    assert (
        dados["indicadores"]["PINV"]["OCC_valor_orcamento_total_capital_custeio"]
        is None
    )

    # Deve passar pela validação do sink
    validar_arquivos_pilar([arq_pilar2])


def test_violacao_principio_iii_occ_nao_nulo_rejeitado() -> None:
    """Garante que OCC preenchido é estritamente rejeitado pelo validador do sink."""
    conteudo_invalido = {
        "campus": "Serra",
        "ano_referencia": 2024,
        "pilar": "Fomento e Conexao com o Ecossistema",
        "indicadores": {
            "PINV": {
                "descricao": "Percentual de Investimento em Pesquisa, Pos e Inovacao",
                "TAFPPI_valor_total_aporte_pesquisa": 1000.0,
                "OCC_valor_orcamento_total_capital_custeio": 500000.0,  # VIOLAÇÃO!
                "percentual_calculado_PINV": 496.78,
            },
            "PIPDI": {
                "descricao": "Quantidade de Acordos de Parceria para PDeI",
                "NAPPCT_acordos_parceria_firmados": 1,
                "total_acumulado_PIPDI": 1,
            },
        },
    }

    registro = RegistroPilarJson(
        nome="pilar2_serra_2024.json",
        conteudo=json.dumps(conteudo_invalido),
    )

    with pytest.raises(ValueError, match="violação de fidelidade"):
        validar_arquivos_pilar([registro])
