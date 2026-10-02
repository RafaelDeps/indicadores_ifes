from __future__ import annotations

import zipfile
from pathlib import Path

from etl.main import criar_argument_parser, main
from tests.etl.conftest import criar_zip_canonico_fake


def test_cli_parser_defaults() -> None:
    parser = criar_argument_parser()
    args = parser.parse_args([])
    assert args.entrada == "data/canonical/exports_canonical.zip"
    assert args.saida is None
    assert args.campus is None
    assert args.anos == "2024,2025,2026"


def test_cli_parser_custom_args() -> None:
    parser = criar_argument_parser()
    args = parser.parse_args(
        [
            "--entrada",
            "custom_in.zip",
            "--saida",
            "custom_out.zip",
            "--campus",
            "Serra",
            "--anos",
            "2025,2026",
        ]
    )
    assert args.entrada == "custom_in.zip"
    assert args.saida == "custom_out.zip"
    assert args.campus == "Serra"
    assert args.anos == "2025,2026"


def test_cli_executa_campus_isolado(tmp_path: Path) -> None:
    caminho_entrada = tmp_path / "exports_canonical.zip"
    caminho_saida_campus = tmp_path / "indicadores_serra.zip"

    dados = {
        "campuses_canonical.json": [
            {"id": 1, "name": "Serra"},
            {"id": 2, "name": "Vitória"},
        ],
        "initiatives_canonical.json": [
            {
                "id": 1,
                "name": "Proj Serra",
                "status": "EM_ANDAMENTO",
                "start_date": "2025-01-01",
                "end_date": None,
                "campus": {"id": 1, "name": "Serra"},
                "team": [],
            }
        ],
        "researchers_canonical.json": [],
        "students_canonical.json": [],
        "articles_canonical.json": [],
        "productions_canonical.json": [],
        "production_authors_canonical.json": [],
        "production_types_canonical.json": [],
    }
    criar_zip_canonico_fake(caminho_entrada, dados)

    # Executa CLI com filtro para Serra
    codigo = main(
        [
            "--entrada",
            str(caminho_entrada),
            "--saida",
            str(caminho_saida_campus),
            "--campus",
            "Serra",
            "--anos",
            "2024,2025,2026",
        ]
    )

    assert codigo == 0
    assert caminho_saida_campus.exists()

    with zipfile.ZipFile(caminho_saida_campus) as zf:
        nomes = zf.namelist()
        # Exatamente 9 arquivos (3 pilares x 3 anos) do campus Serra
        assert len(nomes) == 9
        assert all("serra" in n for n in nomes)
        assert not any("vitoria" in n for n in nomes)
        assert not any("todos" in n for n in nomes)


def test_cli_campus_insensivel_a_acentuacao_e_caixa(tmp_path: Path) -> None:
    caminho_entrada = tmp_path / "exports_canonical.zip"
    caminho_saida = tmp_path / "indicadores_vitoria.zip"

    dados = {
        "campuses_canonical.json": [{"id": 2, "name": "Vitória"}],
        "initiatives_canonical.json": [],
        "researchers_canonical.json": [],
        "students_canonical.json": [],
        "articles_canonical.json": [],
        "productions_canonical.json": [],
        "production_authors_canonical.json": [],
        "production_types_canonical.json": [],
    }
    criar_zip_canonico_fake(caminho_entrada, dados)

    # Passa "vitoria" sem acento e minúsculo
    codigo = main(
        [
            "--entrada",
            str(caminho_entrada),
            "--saida",
            str(caminho_saida),
            "--campus",
            "vitoria",
            "--anos",
            "2025",
        ]
    )

    assert codigo == 0
    with zipfile.ZipFile(caminho_saida) as zf:
        assert len(zf.namelist()) == 3


def test_cli_campus_inexistente_retorna_erro(tmp_path: Path) -> None:
    caminho_entrada = tmp_path / "exports_canonical.zip"
    dados = {
        "campuses_canonical.json": [{"id": 1, "name": "Serra"}],
        "initiatives_canonical.json": [],
        "researchers_canonical.json": [],
        "students_canonical.json": [],
        "articles_canonical.json": [],
        "productions_canonical.json": [],
        "production_authors_canonical.json": [],
        "production_types_canonical.json": [],
    }
    criar_zip_canonico_fake(caminho_entrada, dados)

    codigo = main(
        [
            "--entrada",
            str(caminho_entrada),
            "--campus",
            "CampusFantasma",
        ]
    )
    assert codigo == 1
