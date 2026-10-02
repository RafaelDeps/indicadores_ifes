from __future__ import annotations

from etl.core.logic.calculators.aggregator import agregar_indicadores
from etl.core.logic.models import ExportCanonicos


def test_agregar_indicadores_todos_e_campi(
    mock_export_canonicos: ExportCanonicos,
) -> None:
    anos = [2025, 2026]
    resultado, avisos = agregar_indicadores(mock_export_canonicos, anos=anos)

    assert 2025 in resultado
    assert 2026 in resultado

    # Campi individuais + institutional 'todos'
    campi_2025 = resultado[2025]
    assert "serra" in campi_2025
    assert "vitoria" in campi_2025
    assert "todos" in campi_2025

    # Em 2025, Projeto 1 (Serra) está ativo; Projeto 2 (Vitória) está ativo
    assert campi_2025["serra"].pilar1.ntpp_projetos_pesquisa_ativos == 1
    assert campi_2025["vitoria"].pilar1.ntpp_projetos_pesquisa_ativos == 1
    # Institucional 'todos' consolida os 2 projetos
    assert campi_2025["todos"].pilar1.ntpp_projetos_pesquisa_ativos == 2


def test_agregar_indicadores_filtro_campus(
    mock_export_canonicos: ExportCanonicos,
) -> None:
    resultado, _ = agregar_indicadores(
        mock_export_canonicos, anos=[2025], campus_filtro="serra"
    )

    assert 2025 in resultado
    campi_2025 = resultado[2025]
    assert "serra" in campi_2025
    assert "vitoria" not in campi_2025
    assert "todos" not in campi_2025
