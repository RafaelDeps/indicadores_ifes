from __future__ import annotations

from pathlib import Path

import pytest

from etl.adapters.sources.pinv_json_source import PinvJsonSource
from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.core.logic.calculators.pillar2 import calcular_pilar2, calcular_tafppi
from etl.core.logic.models.pillar2_models import (
    FonteFinanciamento,
    ProjetoSigpesqFinanciamento,
)


def test_tafppi_consolidacao_nova_ia_2025() -> None:
    """Valida que TAFPPI consolida integralmente PJ 8503 (R$ 10M) e PJ 8504 (R$ 15M) totalizando R$ 25M."""
    projetos = [
        ProjetoSigpesqFinanciamento(
            codigo="PJ 8503",
            titulo="FINEP PRÓ-INFRA 2024 - Núcleo Otimizado e Virtualizado de Apoio à Computação Científica",
            campus_slug="serra",
            ano_inicio=2025,
            ano_fim=2026,
            duracao_meses=24,
            valor_total=10000000.0,
            fontes=[FonteFinanciamento(fonte="FINEP", valor=10000000.0)],
        ),
        ProjetoSigpesqFinanciamento(
            codigo="PJ 8504",
            titulo="FINEP Centros Temáticos 2024 - Centro Temático de IA",
            campus_slug="serra",
            ano_inicio=2025,
            ano_fim=2027,
            duracao_meses=36,
            valor_total=15000000.0,
            fontes=[FonteFinanciamento(fonte="FINEP", valor=15000000.0)],
        ),
        ProjetoSigpesqFinanciamento(
            codigo="PJ 9536",
            titulo="Detecção de Deepfakes",
            campus_slug="serra",
            ano_inicio=2025,
            ano_fim=2027,
            duracao_meses=24,
            valor_total=150000.0,
            fontes=[FonteFinanciamento(fonte="FAPES", valor=150000.0)],
        ),
    ]

    total_serra_2025 = calcular_tafppi(
        projetos=None, campus_slug="serra", ano=2025, projetos_sigpesq=projetos
    )
    assert total_serra_2025 == 25150000.0


def test_tafppi_real_canonical_serra_2025() -> None:
    """Verifica que o TAFPPI de Serra em 2025 atinge exatamente R$ 26.332.461,50 com dados reais."""
    caminho_real = Path("data/canonical/exports_canonical.zip")
    if not caminho_real.is_file():
        pytest.skip("data/canonical/exports_canonical.zip não encontrado")

    source = ZipCanonicalSource(caminho_zip=caminho_real)
    projetos = source.extrair_projetos_sigpesq()

    val_2025_serra = calcular_tafppi(None, "serra", 2025, projetos_sigpesq=projetos)
    assert val_2025_serra == 26332461.50


def test_pinv_serra_preserva_occ_nulo(tmp_path: Path) -> None:
    """Verifica que o PINV do Campus Serra preserva OCC estritamente como None (Princípio III)."""
    pinv_source = PinvJsonSource(diretorio_base=Path("."))
    dados_serra = pinv_source.carregar_por_campus("serra")

    assert dados_serra is not None
    assert dados_serra.valores_por_ano[2024] == 496.78
    assert dados_serra.valores_por_ano[2025] == 1111.35
    assert dados_serra.valores_por_ano[2026] == 610.63

    pilar2_res = calcular_pilar2(
        projetos=None,
        campus_slug="serra",
        ano=2025,
        dados_pinv=dados_serra,
        projetos_sigpesq=[],
    )

    assert pilar2_res.percentual_calculado_pinv == 1111.35
    assert pilar2_res.occ_valor_orcamento_total_capital_custeio is None
