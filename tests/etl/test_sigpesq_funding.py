from __future__ import annotations

from pathlib import Path

import pytest

from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.core.logic.calculators.pillar2 import calcular_tafppi
from etl.core.logic.models.pillar2_models import (
    FonteFinanciamento,
    ProjetoSigpesqFinanciamento,
)


def test_extrair_projetos_sigpesq_zip_sintetico(
    tmp_path: Path, mock_sigpesq_projetos_dict: dict[str, dict]
) -> None:
    """Verifica que o ZipCanonicalSource extrai os projetos de project_sigpesq_files_json/."""
    from tests.etl.conftest import criar_zip_canonico_fake

    caminho_zip = tmp_path / "exports_canonical.zip"
    criar_zip_canonico_fake(
        caminho_zip,
        dados={"campuses_canonical.json": [{"id": 1, "name": "Serra"}]},
        sigpesq_files=mock_sigpesq_projetos_dict,
    )

    source = ZipCanonicalSource(caminho_zip=caminho_zip)
    projetos = source.extrair_projetos_sigpesq()

    assert len(projetos) == 3
    codigos = {p.codigo for p in projetos}
    assert "PJ 7875" in codigos
    assert "PJ 9793" in codigos
    assert "PJ 8503" in codigos

    p_7875 = next(p for p in projetos if p.codigo == "PJ 7875")
    assert p_7875.ano_inicio == 2024
    assert p_7875.ano_fim == 2025
    assert p_7875.valor_total == 5898620.0
    assert p_7875.campus_slug == "serra"
    assert len(p_7875.fontes) == 1
    assert p_7875.fontes[0].fonte == "FAPES"


def test_calcular_tafppi_com_projetos_sigpesq() -> None:
    """Valida o cálculo do TAFPPI atribuindo montante apenas ao ano de início."""
    projetos = [
        ProjetoSigpesqFinanciamento(
            codigo="PJ 1",
            campus_slug="serra",
            ano_inicio=2024,
            ano_fim=2025,
            valor_total=1000.0,
            fontes=[FonteFinanciamento(fonte="FAPES", valor=1000.0)],
        ),
        ProjetoSigpesqFinanciamento(
            codigo="PJ 2",
            campus_slug="serra",
            ano_inicio=2024,
            ano_fim=2026,
            valor_total=2500.50,
            fontes=[FonteFinanciamento(fonte="FINEP", valor=2500.50)],
        ),
        ProjetoSigpesqFinanciamento(
            codigo="PJ 3",
            campus_slug="vitoria",
            ano_inicio=2024,
            ano_fim=2025,
            valor_total=5000.0,
            fontes=[FonteFinanciamento(fonte="CNPq", valor=5000.0)],
        ),
        ProjetoSigpesqFinanciamento(
            codigo="PJ 4",
            campus_slug="serra",
            ano_inicio=2025,
            ano_fim=2025,
            valor_total=700.0,
            fontes=[FonteFinanciamento(fonte="FAPES", valor=700.0)],
        ),
    ]

    # Serra 2024: PJ 1 (1000.0) + PJ 2 (2500.50) = 3500.50
    assert (
        calcular_tafppi(
            projetos=None,
            campus_slug="serra",
            ano=2024,
            projetos_sigpesq=projetos,
        )
        == 3500.50
    )

    # Serra 2025: PJ 4 (700.0)
    assert (
        calcular_tafppi(
            projetos=None,
            campus_slug="serra",
            ano=2025,
            projetos_sigpesq=projetos,
        )
        == 700.0
    )

    # Serra 2026: Nenhum projeto iniciado em 2026 para Serra -> None
    assert (
        calcular_tafppi(
            projetos=None,
            campus_slug="serra",
            ano=2026,
            projetos_sigpesq=projetos,
        )
        is None
    )

    # Vitória 2024: PJ 3 (5000.0)
    assert (
        calcular_tafppi(
            projetos=None,
            campus_slug="vitoria",
            ano=2024,
            projetos_sigpesq=projetos,
        )
        == 5000.0
    )

    # Institucional 'todos' 2024: PJ 1 + PJ 2 + PJ 3 = 8500.50
    assert (
        calcular_tafppi(
            projetos=None,
            campus_slug="todos",
            ano=2024,
            projetos_sigpesq=projetos,
        )
        == 8500.50
    )


def test_extrair_e_calcular_tafppi_real_canonical() -> None:
    """Verifica que o extrator no arquivo canônico real produz os valores esperados."""
    caminho_real = Path("data/canonical/exports_canonical.zip")
    if not caminho_real.is_file():
        pytest.skip("data/canonical/exports_canonical.zip não encontrado")

    source = ZipCanonicalSource(caminho_zip=caminho_real)
    projetos = source.extrair_projetos_sigpesq()

    assert len(projetos) > 0

    # Valores esperados para Serra e Todos
    val_2024 = calcular_tafppi(None, "serra", 2024, projetos_sigpesq=projetos)
    val_2025 = calcular_tafppi(None, "serra", 2025, projetos_sigpesq=projetos)
    val_2026 = calcular_tafppi(None, "serra", 2026, projetos_sigpesq=projetos)

    assert val_2024 == 12067095.28
    assert val_2025 == 28270178.52
    assert val_2026 == 17842650.00


def test_agregar_indicadores_com_sigpesq(mock_export_canonicos) -> None:
    """Verifica que agregar_indicadores consolida TAFPPI de projetos SIGPESQ para Serra e Todos."""
    from etl.core.logic.calculators.aggregator import agregar_indicadores

    projetos = [
        ProjetoSigpesqFinanciamento(
            codigo="PJ 1",
            campus_slug="serra",
            ano_inicio=2024,
            ano_fim=2025,
            valor_total=1000.0,
            fontes=[FonteFinanciamento(fonte="FAPES", valor=1000.0)],
        ),
        ProjetoSigpesqFinanciamento(
            codigo="PJ 2",
            campus_slug="vitoria",
            ano_inicio=2024,
            ano_fim=2025,
            valor_total=2000.0,
            fontes=[FonteFinanciamento(fonte="CNPq", valor=2000.0)],
        ),
    ]

    resultado, _ = agregar_indicadores(
        exportacao=mock_export_canonicos,
        anos=[2024],
        projetos_sigpesq=projetos,
    )

    assert resultado[2024]["serra"].pilar2.tafppi_valor_total_aporte_pesquisa == 1000.0
    assert (
        resultado[2024]["vitoria"].pilar2.tafppi_valor_total_aporte_pesquisa == 2000.0
    )
    assert resultado[2024]["todos"].pilar2.tafppi_valor_total_aporte_pesquisa == 3000.0
