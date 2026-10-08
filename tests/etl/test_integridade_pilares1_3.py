from __future__ import annotations

from etl.core.logic.calculators.aggregator import agregar_indicadores
from etl.core.logic.models import (
    Campus,
    ExportCanonicos,
    Iniciativa,
    MembroEquipe,
    Pessoa,
    Producao,
    RefCampus,
    TipoProducao,
)


def test_ntpp_lideranca_multicampi() -> None:
    """Projetos multicampi sediados em Vitória (ex.: IntegraCAR) não pontuam no NTPP do Campus Serra."""
    ref_serra = RefCampus(id=1, name="Serra")
    ref_vitoria = RefCampus(id=2, name="Vitória")

    export = ExportCanonicos(
        campi=[Campus(id=1, name="Serra"), Campus(id=2, name="Vitória")],
        pessoas=[
            # Coordenador em Vitória
            Pessoa(
                id=10,
                name="Coord Vitória",
                classification="researcher",
                campus=ref_vitoria,
            ),
            # Pesquisador de Serra na equipe do projeto multicampi
            Pessoa(
                id=11, name="Pesq Serra", classification="researcher", campus=ref_serra
            ),
            # Pesquisador de Serra liderando projeto local
            Pessoa(
                id=12, name="Líder Serra", classification="researcher", campus=ref_serra
            ),
        ],
        estudantes=[],
        iniciativas=[
            # Projeto 1: Multicampi coordenado por Vitória com membros de Serra
            Iniciativa(
                id=100,
                name="IntegraCAR Multicampi",
                start_date="2025-01-01",
                end_date="2025-12-31",
                campus=ref_vitoria,
                team=[
                    MembroEquipe(
                        person_id=10, person_name="Coord Vitória", roles=["Coordenador"]
                    ),
                    MembroEquipe(
                        person_id=11, person_name="Pesq Serra", roles=["Pesquisador"]
                    ),
                ],
            ),
            # Projeto 2: Projeto local sediado em Serra
            Iniciativa(
                id=101,
                name="Projeto Local Serra",
                start_date="2025-01-01",
                end_date="2025-12-31",
                campus=ref_serra,
                team=[
                    MembroEquipe(
                        person_id=12, person_name="Líder Serra", roles=["Coordenador"]
                    ),
                ],
            ),
        ],
        artigos=[],
        producoes=[],
        autores_producao=[],
        tipos_producao=[],
    )

    resultado, _ = agregar_indicadores(export, anos=[2025])

    # NTPP de Serra deve conter apenas o Projeto Local Serra (1 projeto)
    assert resultado[2025]["serra"].pilar1.ntpp_projetos_pesquisa_ativos == 1

    # NTPP de Vitória deve conter o projeto multicampi (1 projeto)
    assert resultado[2025]["vitoria"].pilar1.ntpp_projetos_pesquisa_ativos == 1

    # NTPP institucional (todos) contém a soma de ambos (2 projetos)
    assert resultado[2025]["todos"].pilar1.ntpp_projetos_pesquisa_ativos == 2


def test_qspp_lotacao_institucional_serra() -> None:
    """Apenas pesquisadores com lotação formal no Campus Serra pontuam no QSPP de Serra."""
    ref_serra = RefCampus(id=1, name="Serra")
    ref_vitoria = RefCampus(id=2, name="Vitória")

    export = ExportCanonicos(
        campi=[Campus(id=1, name="Serra"), Campus(id=2, name="Vitória")],
        pessoas=[
            # Docente de Serra
            Pessoa(
                id=1,
                name="Docente Serra",
                classification="researcher",
                campus=ref_serra,
            ),
            # Docente de Vitória colaborando em projeto de Serra
            Pessoa(
                id=2,
                name="Docente Vitória",
                classification="researcher",
                campus=ref_vitoria,
            ),
        ],
        estudantes=[],
        iniciativas=[
            Iniciativa(
                id=10,
                name="Projeto Serra com Colaborador Externo",
                start_date="2025-01-01",
                end_date="2025-12-31",
                campus=ref_serra,
                team=[
                    MembroEquipe(
                        person_id=1, person_name="Docente Serra", roles=["Pesquisador"]
                    ),
                    MembroEquipe(
                        person_id=2,
                        person_name="Docente Vitória",
                        roles=["Pesquisador"],
                    ),
                ],
            )
        ],
        artigos=[],
        producoes=[],
        autores_producao=[],
        tipos_producao=[],
    )

    resultado, _ = agregar_indicadores(export, anos=[2025])

    # QSPP de Serra deve contar apenas o Docente Serra (1)
    assert resultado[2025]["serra"].pilar1.qspp_docentes_pesquisa == 1
    # QSPP institucional conta ambos (2)
    assert resultado[2025]["todos"].pilar1.qspp_docentes_pesquisa == 2


def test_integridade_pilar3_softwares_e_patentes_nulas() -> None:
    """Verifica que o Pilar 3 contabiliza softwares e mantém patentes zeradas e PIPROTR como None."""
    ref_serra = RefCampus(id=1, name="Serra")

    export = ExportCanonicos(
        campi=[Campus(id=1, name="Serra")],
        pessoas=[
            Pessoa(
                id=1, name="Autor Serra", classification="researcher", campus=ref_serra
            ),
        ],
        estudantes=[],
        iniciativas=[],
        artigos=[],
        producoes=[
            Producao(
                id=50,
                title="Software LaTeC",
                year=2025,
                campus=Campus(id=1, name="Serra"),
                production_type_id=1,
            )
        ],
        autores_producao=[],
        tipos_producao=[
            TipoProducao(id=1, name="Software"),
        ],
    )

    resultado, _ = agregar_indicadores(export, anos=[2025])

    pilar3_serra = resultado[2025]["serra"].pilar3
    assert pilar3_serra.pc_softwares == 1
    assert pilar3_serra.pa_patentes == 0
    assert pilar3_serra.total_transferidos_piprotr is None
