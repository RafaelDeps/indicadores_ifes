from __future__ import annotations

import json
from pathlib import Path

from etl.adapters.sources.pinv_json_source import PinvJsonSource
from etl.core.logic.calculators.pillar2 import obter_percentual_pinv
from etl.core.logic.models.pillar2_models import DadosPinvCampus


def test_carregar_pinv_sucesso(tmp_path: Path, mock_pinv_serra_dict: dict) -> None:
    """Verifica que o PinvJsonSource carrega corretamente um arquivo válido."""
    pinv_file = tmp_path / "pinv_serra.json"
    pinv_file.write_text(json.dumps(mock_pinv_serra_dict), encoding="utf-8")

    source = PinvJsonSource(diretorio_base=tmp_path)
    resultado = source.carregar_por_campus("serra")

    assert resultado is not None
    assert isinstance(resultado, DadosPinvCampus)
    assert resultado.campus == "Serra"
    assert resultado.campus_slug == "serra"
    assert resultado.unidade == "%"
    assert resultado.valores_por_ano[2024] == 496.78
    assert resultado.valores_por_ano[2025] == 1111.35
    assert resultado.valores_por_ano[2026] == 610.63


def test_carregar_pinv_arquivo_ausente(tmp_path: Path) -> None:
    """Quando o arquivo do campus não existe, deve retornar None sem erro."""
    source = PinvJsonSource(diretorio_base=tmp_path)
    resultado = source.carregar_por_campus("vitoria")
    assert resultado is None


def test_carregar_pinv_fallback_raw(tmp_path: Path, mock_pinv_serra_dict: dict) -> None:
    """Quando ausente na raiz, busca em data/raw/pilar2/ como fallback."""
    raw_dir = tmp_path / "raw" / "pilar2"
    raw_dir.mkdir(parents=True, exist_ok=True)
    pinv_file = raw_dir / "pinv_serra.json"
    pinv_file.write_text(json.dumps(mock_pinv_serra_dict), encoding="utf-8")

    source = PinvJsonSource(diretorio_base=tmp_path)
    resultado = source.carregar_por_campus("serra")

    assert resultado is not None
    assert resultado.campus_slug == "serra"
    assert resultado.valores_por_ano[2024] == 496.78


def test_obter_percentual_pinv() -> None:
    """Testa a extração do percentual para um ano específico a partir dos dados do campus."""
    dados = DadosPinvCampus(
        indicador="PINV",
        campus="Serra",
        campus_slug="serra",
        unidade="%",
        valores_por_ano={2024: 496.78, 2025: 1111.35, 2026: 610.63},
    )

    assert obter_percentual_pinv(dados, 2024) == 496.78
    assert obter_percentual_pinv(dados, 2025) == 1111.35
    assert obter_percentual_pinv(dados, 2026) == 610.63
    assert obter_percentual_pinv(dados, 2023) is None
    assert obter_percentual_pinv(None, 2024) is None


def test_agregar_indicadores_com_pinv_campus(mock_export_canonicos) -> None:
    """Verifica que agregar_indicadores atribui PINV ao campus correto e None aos demais."""
    from etl.core.logic.calculators.aggregator import agregar_indicadores

    dados_serra = DadosPinvCampus(
        indicador="PINV",
        campus="Serra",
        campus_slug="serra",
        unidade="%",
        valores_por_ano={2024: 496.78, 2025: 1111.35, 2026: 610.63},
    )

    resultado, _ = agregar_indicadores(
        exportacao=mock_export_canonicos,
        anos=[2024, 2025, 2026],
        dados_pinv_por_campus={"serra": dados_serra},
    )

    # Serra tem os percentuais
    assert resultado[2024]["serra"].pilar2.percentual_calculado_pinv == 496.78
    assert resultado[2025]["serra"].pilar2.percentual_calculado_pinv == 1111.35
    assert resultado[2026]["serra"].pilar2.percentual_calculado_pinv == 610.63

    # Vitória não tem arquivo, deve ser None
    assert resultado[2024]["vitoria"].pilar2.percentual_calculado_pinv is None
    # Todos (institucional) sem arquivo, deve ser None
    assert resultado[2024]["todos"].pilar2.percentual_calculado_pinv is None
