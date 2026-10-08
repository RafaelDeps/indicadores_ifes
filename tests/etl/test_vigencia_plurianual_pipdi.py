from __future__ import annotations

from pathlib import Path

from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.core.logic.calculators.pillar2 import calcular_pipdi
from etl.core.logic.models.pillar2_models import (
    FonteFinanciamento,
    ProjetoSigpesqFinanciamento,
)
from tests.etl.conftest import criar_zip_canonico_fake
from tests.etl.fixtures.sigpesq_samples import (
    MOCK_SIGPESQ_PLURIANUAIS_RAW,
    criar_projeto_sigpesq_sample,
)


def test_extrair_projetos_sigpesq_projeta_ano_fim_com_duracao_meses(
    tmp_path: Path,
) -> None:
    """Verifica que projetos com datas.fim nulo e duracao_meses válida têm ano_fim projetado."""
    caminho_zip = tmp_path / "exports_canonical_plurianual.zip"
    criar_zip_canonico_fake(
        caminho_zip,
        dados={"campuses_canonical.json": [{"id": 1, "name": "Serra"}]},
        sigpesq_files=MOCK_SIGPESQ_PLURIANUAIS_RAW,
    )

    source = ZipCanonicalSource(caminho_zip=caminho_zip)
    projetos = source.extrair_projetos_sigpesq()

    assert len(projetos) == 3

    # PJ 8504: início 2025-01-15, fim null, duracao_meses 36 -> ano_fim 2027
    pj_8504 = next(p for p in projetos if p.codigo == "PJ 8504")
    assert pj_8504.ano_inicio == 2025
    assert pj_8504.duracao_meses == 36
    assert pj_8504.ano_fim == 2027
    assert pj_8504.campus_slug == "serra"
    assert pj_8504.valor_total == 15000000.0

    # PJ 9536: início 2025-06-01, fim null, duracao_meses 24 -> ano_fim 2027
    pj_9536 = next(p for p in projetos if p.codigo == "PJ 9536")
    assert pj_9536.ano_inicio == 2025
    assert pj_9536.duracao_meses == 24
    assert pj_9536.ano_fim == 2027

    # PJ FALLBACK: início 2024-03-01, fim null, duracao_meses null -> ano_fim 2024
    pj_fallback = next(p for p in projetos if p.codigo == "PJ FALLBACK")
    assert pj_fallback.ano_inicio == 2024
    assert pj_fallback.duracao_meses is None
    assert pj_fallback.ano_fim == 2024


def test_modelo_ativo_em_ano_plurianual() -> None:
    """Valida o método ativo_em_ano em ProjetoSigpesqFinanciamento para projetos plurianuais."""
    proj = criar_projeto_sigpesq_sample(
        codigo="PJ 8504",
        campus_slug="serra",
        ano_inicio=2025,
        ano_fim=2027,
        duracao_meses=36,
    )

    assert proj.ativo_em_ano(2024) is False
    assert proj.ativo_em_ano(2025) is True
    assert proj.ativo_em_ano(2026) is True
    assert proj.ativo_em_ano(2027) is True
    assert proj.ativo_em_ano(2028) is False


def test_calcular_pipdi_contabiliza_anos_vigencia_plurianual() -> None:
    """Valida que calcular_pipdi conta projetos plurianuais em todos os anos de vigência (ano_inicio até ano_fim)."""
    projetos = [
        # Início 2024, fim 2025 (2 anos)
        ProjetoSigpesqFinanciamento(
            codigo="PJ 7875",
            campus_slug="serra",
            ano_inicio=2024,
            ano_fim=2025,
            duracao_meses=22,
            valor_total=5898620.0,
            fontes=[FonteFinanciamento(fonte="FAPES", valor=5898620.0)],
        ),
        # Início 2025, duração 36 meses -> fim 2027 (vigente em 2025, 2026, 2027)
        ProjetoSigpesqFinanciamento(
            codigo="PJ 8504",
            campus_slug="serra",
            ano_inicio=2025,
            ano_fim=2027,
            duracao_meses=36,
            valor_total=15000000.0,
            fontes=[FonteFinanciamento(fonte="FINEP", valor=15000000.0)],
        ),
        # Outro campus: Vitória (não deve pontuar em Serra)
        ProjetoSigpesqFinanciamento(
            codigo="PJ VIT",
            campus_slug="vitoria",
            ano_inicio=2025,
            ano_fim=2027,
            duracao_meses=36,
            valor_total=100000.0,
            fontes=[FonteFinanciamento(fonte="FAPES", valor=100000.0)],
        ),
    ]

    # Em 2024: PJ 7875 ativo em Serra -> 1
    assert calcular_pipdi(None, "serra", 2024, projetos_sigpesq=projetos) == 1

    # Em 2025: PJ 7875 (até 2025) + PJ 8504 (início 2025) -> 2
    assert calcular_pipdi(None, "serra", 2025, projetos_sigpesq=projetos) == 2

    # Em 2026: PJ 8504 continua ativo (até 2027) -> 1
    assert calcular_pipdi(None, "serra", 2026, projetos_sigpesq=projetos) == 1

    # Em 2027: PJ 8504 continua ativo -> 1
    assert calcular_pipdi(None, "serra", 2027, projetos_sigpesq=projetos) == 1

    # Em 2028: PJ 8504 encerrado -> 0
    assert calcular_pipdi(None, "serra", 2028, projetos_sigpesq=projetos) == 0
