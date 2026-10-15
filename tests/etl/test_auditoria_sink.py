"""Testes do sink de fixtures de auditoria (feature 026, contracts/fixture-auditoria.md).

Cobre a serialização determinística em data/dist/auditoria/{INDICADOR}_{campus}_{ano}.json,
validação de esquema, contrato de campos e comportamento fail-closed.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from etl.adapters.sinks.json_auditoria_sink import JsonAuditoriaSink


def _criar_fixture_sintetica(
    indicador: str = "PIES",
    campus: str = "serra",
    ano: int = 2025,
    campus_nome: str = "Serra",
) -> dict:
    return {
        "indicador": indicador,
        "campus": campus,
        "campusNome": campus_nome,
        "ano": ano,
        "geradoEm": "2026-10-15T12:00:00Z",
        "fontes": [
            {"arquivo": "exports_canonical.zip", "revisao": "abc1234"},
            {"arquivo": "listagem_2025_1.xlsx", "revisao": "2025-1"},
        ],
        "componentes": [
            {
                "papel": "numerador",
                "simbolo": "NEP",
                "rotulo": "Estudantes em Pesquisa",
                "unidade": "Estudantes",
                "tipoContagem": "contagem",
                "apurado": 2,
                "detalhado": True,
                "campos": ["nome", "projeto", "papel", "matricula", "curso"],
                "registros": [
                    {
                        "nome": "Ana Souza",
                        "projeto": "Projeto Álgebra Aplicada",
                        "papel": "Student",
                        "matricula": "555",
                        "curso": "ADS",
                    },
                    {
                        "nome": "Bruno Lima",
                        "projeto": "Projeto Robótica",
                        "papel": "Student",
                        "matricula": "777",
                        "curso": "Medicina",
                    },
                ],
            },
            {
                "papel": "denominador",
                "simbolo": "NTE",
                "rotulo": "Total de Estudantes Matriculados",
                "unidade": "Estudantes",
                "tipoContagem": "contagem",
                "apurado": 4,
                "detalhado": True,
                "campos": ["matricula", "nome", "curso", "situacao"],
                "registros": [
                    {
                        "matricula": "555",
                        "nome": "Ana Souza",
                        "curso": "ADS",
                        "situacao": "Matriculado",
                    },
                    {
                        "matricula": "666",
                        "nome": "Duda Pires",
                        "curso": "Zootecnia",
                        "situacao": "Matriculado",
                    },
                    {
                        "matricula": "777",
                        "nome": "Bruno Lima",
                        "curso": "Medicina",
                        "situacao": "Matriculado",
                    },
                    {
                        "matricula": "888",
                        "nome": "Eva Rocha",
                        "curso": "ADS",
                        "situacao": "Concluído",
                    },
                ],
            },
        ],
    }


class TestJsonAuditoriaSink:
    def test_salva_arquivo_com_nome_correto(self, tmp_path: Path) -> None:
        sink = JsonAuditoriaSink(pasta_saida=tmp_path)
        fixture = _criar_fixture_sintetica(indicador="PIES", campus="serra", ano=2025)
        caminho = sink.salvar(fixture)

        assert caminho.name == "PIES_serra_2025.json"
        assert caminho.exists()
        conteudo = json.loads(caminho.read_text(encoding="utf-8"))
        assert conteudo["indicador"] == "PIES"
        assert conteudo["campus"] == "serra"
        assert conteudo["ano"] == 2025
        assert len(conteudo["componentes"]) == 2

    def test_determinismo_mesmos_dados_geram_mesmos_bytes(self, tmp_path: Path) -> None:
        sink1 = JsonAuditoriaSink(pasta_saida=tmp_path / "saida1")
        sink2 = JsonAuditoriaSink(pasta_saida=tmp_path / "saida2")
        fixture = _criar_fixture_sintetica()

        caminho1 = sink1.salvar(fixture)
        caminho2 = sink2.salvar(fixture)

        assert caminho1.read_bytes() == caminho2.read_bytes()
        # Quebra de linha final obrigatória
        assert caminho1.read_bytes().endswith(b"\n")

    def test_rejeita_campus_todos(self, tmp_path: Path) -> None:
        sink = JsonAuditoriaSink(pasta_saida=tmp_path)
        fixture = _criar_fixture_sintetica(campus="todos")
        with pytest.raises(ValueError, match="campus 'todos' não é permitido"):
            sink.salvar(fixture)

    def test_componente_nao_detalhado_registros_vazios(self, tmp_path: Path) -> None:
        sink = JsonAuditoriaSink(pasta_saida=tmp_path)
        fixture = {
            "indicador": "PINV",
            "campus": "serra",
            "campusNome": "Serra",
            "ano": 2025,
            "geradoEm": "2026-10-15T12:00:00Z",
            "fontes": [{"arquivo": "exports_canonical.zip", "revisao": None}],
            "componentes": [
                {
                    "papel": "denominador",
                    "simbolo": "OCC",
                    "rotulo": "Orçamento Total de Capital e Custeio",
                    "unidade": "R$",
                    "tipoContagem": "soma",
                    "apurado": None,
                    "detalhado": False,
                    "campos": [],
                    "registros": [],
                }
            ],
        }
        caminho = sink.salvar(fixture)
        dados = json.loads(caminho.read_text(encoding="utf-8"))
        comp = dados["componentes"][0]
        assert comp["detalhado"] is False
        assert comp["registros"] == []
        assert comp["campos"] == []
