from __future__ import annotations

from etl.core.logic.calculators.aggregator import agregar_indicadores
from etl.core.logic.models import ExportCanonicos, RefCampus


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


def test_qspp_restricao_lotacao_campus_e_escopo_todos(
    ref_serra: RefCampus, ref_vitoria: RefCampus
) -> None:
    from etl.core.logic.models import (
        Campus,
        Iniciativa,
        MembroEquipe,
        Pessoa,
    )

    pessoas = [
        Pessoa(id=1, name="Prof. Serra", classification="researcher", campus=ref_serra),
        Pessoa(
            id=2,
            name="Prof. Vitória",
            classification="researcher",
            campus=ref_vitoria,
        ),
        Pessoa(id=3, name="Prof. Externo", classification="outside_ifes", campus=None),
        Pessoa(id=5, name="Prof. Sem Campus", classification="researcher", campus=None),
    ]
    estudantes = [
        Pessoa(id=4, name="Aluno Serra", classification="student", campus=ref_serra),
    ]

    iniciativas = [
        Iniciativa(
            id=100,
            name="Projeto Robótica Serra",
            initiative_type={"name": "Research Project"},
            start_date="2025-01-01",
            end_date="2025-12-31",
            campus=ref_serra,
            team=[
                MembroEquipe(
                    person_id=1, person_name="Prof. Serra", roles=["Coordinator"]
                ),
                MembroEquipe(
                    person_id=2, person_name="Prof. Vitória", roles=["Researcher"]
                ),
                MembroEquipe(
                    person_id=3, person_name="Prof. Externo", roles=["Researcher"]
                ),
                MembroEquipe(
                    person_id=4,
                    person_name="Aluno Serra",
                    roles=["Student Researcher"],
                ),
                MembroEquipe(
                    person_id=5,
                    person_name="Prof. Sem Campus",
                    roles=["Researcher"],
                ),
            ],
        )
    ]

    export = ExportCanonicos(
        campi=[Campus(id=1, name="Serra"), Campus(id=2, name="Vitória")],
        pessoas=pessoas,
        estudantes=estudantes,
        iniciativas=iniciativas,
        artigos=[],
        producoes=[],
        autores_producao=[],
        tipos_producao=[],
    )

    resultado, avisos = agregar_indicadores(export, anos=[2025])

    # No campus Serra:
    # Apenas Prof. Serra (id 1) deve pontuar no QSPP local!
    pilar1_serra = resultado[2025]["serra"].pilar1
    assert pilar1_serra.ntpp_projetos_pesquisa_ativos == 1
    assert pilar1_serra.qspp_docentes_pesquisa == 1
    assert pilar1_serra.nep_estudantes_pesquisa == 1

    # No campus Vitória:
    # Não há projeto sediado em Vitória
    pilar1_vitoria = resultado[2025]["vitoria"].pilar1
    assert pilar1_vitoria.ntpp_projetos_pesquisa_ativos == 0
    assert pilar1_vitoria.qspp_docentes_pesquisa == 0

    # No escopo 'todos':
    # Pesquisadores únicos do IFES (id 1, id 2, id 5) = 3
    # Externo (id 3) e Aluno (id 4) NÃO pontuam em QSPP
    pilar1_todos = resultado[2025]["todos"].pilar1
    assert pilar1_todos.ntpp_projetos_pesquisa_ativos == 1
    assert pilar1_todos.qspp_docentes_pesquisa == 3
    assert pilar1_todos.nep_estudantes_pesquisa == 1

    # Aviso emitido para pesquisador sem campus
    assert any("sem campus" in a.lower() for a in avisos)
