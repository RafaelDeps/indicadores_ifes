from __future__ import annotations

from pathlib import Path

from etl.adapters.sinks.zip_indicadores_sink import ZipIndicadoresSink
from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.flows.indicadores_flow import IndicadoresFlow
from tests.etl.conftest import criar_zip_canonico_fake


def test_indicadores_flow_executa_e_grava_saida(tmp_path: Path) -> None:
    caminho_entrada = tmp_path / "exports_canonical.zip"
    caminho_saida = tmp_path / "indicadores.zip"

    dados = {
        "campuses_canonical.json": [{"id": 1, "name": "Serra"}],
        "initiatives_canonical.json": [
            {
                "id": 1,
                "name": "Proj Robótica",
                "status": "EM_ANDAMENTO",
                "start_date": "2025-01-01",
                "end_date": None,
                "campus": {"id": 1, "name": "Serra"},
                "team": [
                    {"person_id": 10, "person_name": "Prof", "roles": ["Coordenador"]}
                ],
            }
        ],
        "researchers_canonical.json": [
            {
                "id": 10,
                "name": "Prof",
                "classification": "researcher",
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "students_canonical.json": [],
        "articles_canonical.json": [],
        "productions_canonical.json": [],
        "production_authors_canonical.json": [],
        "production_types_canonical.json": [],
    }
    criar_zip_canonico_fake(caminho_entrada, dados)

    source = ZipCanonicalSource(caminho_entrada)
    sink = ZipIndicadoresSink(caminho_saida)

    flow = IndicadoresFlow(source=source, sink=sink, anos=[2025])
    resultado = flow.run()

    assert resultado.codigo_saida == 0
    assert caminho_saida.exists()
    assert (
        resultado.total_arquivos == 6
    )  # 3 pilares x 1 campus (Serra) + 3 pilares x institutional 'todos'
