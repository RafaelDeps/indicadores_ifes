from __future__ import annotations

from etl.core.logic.calculators.pillar2 import (
    calcular_pipdi,
    eh_parceria_externa_sigpesq,
)
from etl.core.logic.models.pillar2_models import (
    FonteFinanciamento,
    ProjetoSigpesqFinanciamento,
)


def test_eh_parceria_externa_sigpesq() -> None:
    """Testa se projetos com fontes externas são elegíveis e projetos internos/voluntários são excluídos."""
    p_externo = ProjetoSigpesqFinanciamento(
        codigo="PJ 1",
        campus_slug="serra",
        ano_inicio=2024,
        ano_fim=2025,
        valor_total=1000.0,
        fontes=[FonteFinanciamento(fonte="FAPES", valor=1000.0)],
    )
    assert eh_parceria_externa_sigpesq(p_externo) is True

    p_empresa = ProjetoSigpesqFinanciamento(
        codigo="PJ 2",
        campus_slug="serra",
        ano_inicio=2024,
        ano_fim=2025,
        valor_total=50000.0,
        fontes=[FonteFinanciamento(fonte="ArcelorMittal", valor=50000.0)],
    )
    assert eh_parceria_externa_sigpesq(p_empresa) is True

    p_voluntario = ProjetoSigpesqFinanciamento(
        codigo="PJ 3",
        campus_slug="serra",
        ano_inicio=2024,
        ano_fim=2025,
        valor_total=0.0,
        fontes=[FonteFinanciamento(fonte="Voluntariado (sem financiamento)")],
    )
    assert eh_parceria_externa_sigpesq(p_voluntario) is False

    p_interno = ProjetoSigpesqFinanciamento(
        codigo="PJ 4",
        campus_slug="serra",
        ano_inicio=2024,
        ano_fim=2025,
        valor_total=0.0,
        fontes=[FonteFinanciamento(fonte="IFES (Instituto Federal do Espírito Santo)")],
    )
    assert eh_parceria_externa_sigpesq(p_interno) is False

    p_vazio = ProjetoSigpesqFinanciamento(
        codigo="PJ 5",
        campus_slug="serra",
        ano_inicio=2024,
        ano_fim=2025,
        valor_total=0.0,
        fontes=[],
    )
    assert eh_parceria_externa_sigpesq(p_vazio) is False


def test_calcular_pipdi_vigencia_e_campus() -> None:
    """Valida cálculo de NAPPCT com filtro temporal de vigência e escopo de campus."""
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
            ano_inicio=2025,
            ano_fim=2026,
            valor_total=2000.0,
            fontes=[FonteFinanciamento(fonte="FINEP", valor=2000.0)],
        ),
        ProjetoSigpesqFinanciamento(
            codigo="PJ 3",
            campus_slug="vitoria",
            ano_inicio=2024,
            ano_fim=2026,
            valor_total=3000.0,
            fontes=[FonteFinanciamento(fonte="Samarco", valor=3000.0)],
        ),
        ProjetoSigpesqFinanciamento(
            codigo="PJ 4",
            campus_slug="serra",
            ano_inicio=2024,
            ano_fim=2026,
            valor_total=0.0,
            fontes=[FonteFinanciamento(fonte="Voluntariado")],
        ),
    ]

    # Serra 2024: apenas PJ 1 (PJ 4 é voluntário) -> 1
    assert (
        calcular_pipdi(
            projetos=None, campus_slug="serra", ano=2024, projetos_sigpesq=projetos
        )
        == 1
    )

    # Serra 2025: PJ 1 (vigente até 2025) + PJ 2 (inicia em 2025) -> 2
    assert (
        calcular_pipdi(
            projetos=None, campus_slug="serra", ano=2025, projetos_sigpesq=projetos
        )
        == 2
    )

    # Serra 2026: PJ 2 (vigente até 2026) -> 1
    assert (
        calcular_pipdi(
            projetos=None, campus_slug="serra", ano=2026, projetos_sigpesq=projetos
        )
        == 1
    )

    # Vitória 2024: PJ 3 -> 1
    assert (
        calcular_pipdi(
            projetos=None, campus_slug="vitoria", ano=2024, projetos_sigpesq=projetos
        )
        == 1
    )

    # Institucional Todos 2024: PJ 1 (Serra) + PJ 3 (Vitória) -> 2
    assert (
        calcular_pipdi(
            projetos=None, campus_slug="todos", ano=2024, projetos_sigpesq=projetos
        )
        == 2
    )


def test_agregar_indicadores_pipdi_sigpesq(mock_export_canonicos) -> None:
    """Verifica que o agregador preenche NAPPCT e total_acumulado_PIPDI para cada campus e todos."""
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
            ano_fim=2024,
            valor_total=2000.0,
            fontes=[FonteFinanciamento(fonte="CNPq", valor=2000.0)],
        ),
    ]

    resultado, _ = agregar_indicadores(
        exportacao=mock_export_canonicos,
        anos=[2024],
        projetos_sigpesq=projetos,
    )

    pilar2_serra = resultado[2024]["serra"].pilar2
    assert pilar2_serra.nappct_acordos_parceria_firmados == 1
    assert pilar2_serra.total_acumulado_pipdi == 1

    pilar2_vitoria = resultado[2024]["vitoria"].pilar2
    assert pilar2_vitoria.nappct_acordos_parceria_firmados == 1
    assert pilar2_vitoria.total_acumulado_pipdi == 1

    pilar2_todos = resultado[2024]["todos"].pilar2
    assert pilar2_todos.nappct_acordos_parceria_firmados == 2
    assert pilar2_todos.total_acumulado_pipdi == 2
