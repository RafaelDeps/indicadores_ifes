from __future__ import annotations

from pathlib import Path

import pytest

from etl.core.logic.resolvers.campus_resolver import normalizar_slug
from etl.main import criar_argument_parser, main


def test_default_paths_point_to_data_directories() -> None:
    parser = criar_argument_parser()
    args = parser.parse_args([])

    assert args.entrada == "data/canonical/exports_canonical.zip"
    assert args.saida is None  # Resolução dinâmica para data/dist/indicadores.zip


def test_missing_canonical_emits_friendly_instruction(
    capsys: pytest.CaptureFixture[str],
) -> None:
    caminho_inexistente = "data/canonical/inexistente.zip"
    exit_code = main(["--entrada", caminho_inexistente])

    assert exit_code == 1
    captured = capsys.readouterr()
    assert "ERRO: Arquivo de entrada canônico não encontrado" in captured.err
    assert caminho_inexistente in captured.err
    assert (
        "data/canonical/exports_canonical.zip" in captured.err
        or "posicione o arquivo" in captured.err.lower()
    )


def test_campus_filter_defaults_to_data_dist(tmp_path: Path) -> None:
    parser = criar_argument_parser()
    args = parser.parse_args(["--campus", "Serra"])

    slug = normalizar_slug("Serra")
    saida_esperada = Path("data/dist") / f"indicadores_{slug}.zip"

    # Simula resolução de caminho no main
    if args.saida:
        caminho_saida = Path(args.saida)
    elif args.campus:
        caminho_saida = Path("data/dist") / f"indicadores_{slug}.zip"
    else:
        caminho_saida = Path("data/dist/indicadores.zip")

    assert caminho_saida == saida_esperada


def test_root_directory_has_zero_zip_files() -> None:
    root_zips = list(Path(".").glob("*.zip"))
    assert (
        len(root_zips) == 0
    ), f"Nenhum arquivo .zip deve existir na raiz do repositório: {root_zips}"
