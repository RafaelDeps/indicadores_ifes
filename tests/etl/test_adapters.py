from __future__ import annotations

import zipfile
from pathlib import Path

import pytest

from etl.adapters.sinks.json_pilar_sink import formatar_arquivos_pilar
from etl.adapters.sinks.zip_indicadores_sink import (
    ZipIndicadoresSink,
    validar_arquivos_pilar,
)
from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.core.logic.models import AgregadosCampus
from tests.etl.conftest import criar_zip_canonico_fake


def test_zip_canonical_source_extrai_dados(tmp_path: Path) -> None:
    caminho_zip = tmp_path / "exports_canonical.zip"
    dados = {
        "campuses_canonical.json": [{"id": 1, "name": "Serra"}],
        "initiatives_canonical.json": [
            {
                "id": 1,
                "name": "Proj",
                "status": "EM_ANDAMENTO",
                "start_date": "2025-01-01",
                "end_date": None,
                "campus": {"id": 1, "name": "Serra"},
                "team": [],
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
        "students_canonical.json": [
            {
                "id": 100,
                "name": "Aluno",
                "classification": "student",
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "articles_canonical.json": [
            {
                "id": 501,
                "title": "Artigo",
                "year": 2025,
                "type": "journal",
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "productions_canonical.json": [
            {
                "id": 601,
                "title": "Prod",
                "year": 2025,
                "production_type_id": 1,
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "production_authors_canonical.json": [
            {"production_id": 601, "researcher_id": 10}
        ],
        "production_types_canonical.json": [{"id": 1, "name": "Software"}],
    }
    criar_zip_canonico_fake(caminho_zip, dados)

    source = ZipCanonicalSource(caminho_zip)
    export_canonicos = source.extract()

    assert len(export_canonicos.campi) == 1
    assert len(export_canonicos.iniciativas) == 1
    assert len(export_canonicos.pessoas) == 1
    assert len(export_canonicos.estudantes) == 1


def test_zip_canonical_source_arquivo_faltante(tmp_path: Path) -> None:
    caminho_zip = tmp_path / "incompleto.zip"
    criar_zip_canonico_fake(caminho_zip, {"campuses_canonical.json": []})

    source = ZipCanonicalSource(caminho_zip)
    with pytest.raises(ValueError, match="Arquivo canônico obrigatório ausente"):
        source.extract()


def test_json_pilar_sink_e_validacao_schema() -> None:
    agregados = AgregadosCampus(campus_nome="Serra")
    arquivos = formatar_arquivos_pilar("serra", agregados, ano=2025)

    assert len(arquivos) == 3
    nomes = [a.nome for a in arquivos]
    assert "pilar1_serra_2025.json" in nomes
    assert "pilar2_serra_2025.json" in nomes
    assert "pilar3_serra_2025.json" in nomes

    # Não deve lançar erro de validação
    validar_arquivos_pilar(arquivos)


def test_zip_indicadores_sink_gera_zip_deterministico(tmp_path: Path) -> None:
    caminho_saida = tmp_path / "indicadores.zip"
    agregados = AgregadosCampus(campus_nome="Serra")
    arquivos = formatar_arquivos_pilar("serra", agregados, ano=2025)

    sink = ZipIndicadoresSink(caminho_saida)
    sink.load(arquivos)

    assert caminho_saida.exists()
    with zipfile.ZipFile(caminho_saida) as zf:
        infolist = zf.infolist()
        assert len(infolist) == 3
        # Timestamp DOS constante 1980-01-01
        for info in infolist:
            assert info.date_time == (1980, 1, 1, 0, 0, 0)
        # Nomes ordenados
        assert [info.filename for info in infolist] == sorted(
            [info.filename for info in infolist]
        )
