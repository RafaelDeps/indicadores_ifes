from __future__ import annotations

from etl.core.logic.calculators.pillar1 import calcular_pilar1
from etl.core.logic.calculators.pillar2 import calcular_pilar2
from etl.core.logic.calculators.pillar3 import calcular_pilar3
from etl.core.logic.models import (
    Artigo,
    Iniciativa,
    MembroEquipe,
    Pessoa,
    Producao,
    RefCampus,
    TipoProducao,
)


def test_calcular_pilar1_metricas_e_nulos() -> None:
    campus = RefCampus(id=1, name="Serra")
    pessoas_map = {
        1: Pessoa(id=1, name="Prof. Silva", classification="researcher", campus=campus),
        2: Pessoa(
            id=2, name="Prof. Santos", classification="researcher", campus=campus
        ),
        100: Pessoa(id=100, name="Aluno 1", classification="student", campus=campus),
        101: Pessoa(id=101, name="Aluno 2", classification="student", campus=campus),
    }

    iniciativas = [
        Iniciativa(
            id=10,
            name="Proj 1",
            start_date="2025-01-01",
            team=[
                MembroEquipe(
                    person_id=1, person_name="Prof. Silva", roles=["Coordenador"]
                ),
                MembroEquipe(person_id=100, person_name="Aluno 1", roles=["Student"]),
            ],
        ),
        Iniciativa(
            id=20,
            name="Proj 2",
            start_date="2025-01-01",
            team=[
                MembroEquipe(
                    person_id=1, person_name="Prof. Silva", roles=["Coordenador"]
                ),
                MembroEquipe(
                    person_id=2, person_name="Prof. Santos", roles=["Pesquisador"]
                ),
                MembroEquipe(person_id=101, person_name="Aluno 2", roles=["Student"]),
            ],
        ),
    ]

    p1 = calcular_pilar1(iniciativas, pessoas_map, ano=2025)

    assert p1.ntpp_projetos_pesquisa_ativos == 2
    assert p1.qspp_docentes_pesquisa == 2  # Prof 1 e Prof 2
    assert p1.nep_estudantes_pesquisa == 2  # Aluno 1 e Aluno 2

    # Princípio III: campos não coletados devem ser estritamente None
    assert p1.nte_total_estudantes_matriculados is None
    assert p1.percentual_calculado_pies is None
    assert p1.ntecpp_cotistas_pesquisa is None
    assert p1.percentual_calculado_picot is None


def test_calcular_pilar2_estritamente_nulo() -> None:
    p2 = calcular_pilar2()
    assert p2.tafppi_valor_total_aporte_pesquisa is None
    assert p2.occ_valor_orcamento_total_capital_custeio is None
    assert p2.percentual_calculado_pinv is None
    assert p2.nappct_acordos_parceria_firmados is None
    assert p2.total_acumulado_pipdi is None


def test_calcular_pilar3_metricas_e_fidelidade() -> None:
    artigos = [
        Artigo(id=1, title="Artigo 1", year=2025),
        Artigo(id=2, title="Artigo 2", year=2025),
    ]

    tipos_map = {
        1: TipoProducao(id=1, name="Programa de Computador"),
        2: TipoProducao(id=2, name="Protótipo"),
    }

    producoes = [
        Producao(id=10, title="App", year=2025, production_type_id=1),  # software
        Producao(
            id=20, title="Equipamento", year=2025, production_type_id=2
        ),  # produto técnico
    ]

    p3 = calcular_pilar3(artigos, producoes, tipos_map, ano=2025)

    assert p3.npb_artigos == 2
    assert p3.npb_livros == 0
    assert p3.npb_producao_bibliografica == 2

    assert p3.pc_softwares == 1
    assert p3.npt_produtos_tecnologicos == 1
    assert p3.npt_processos_tecnologicos == 0
    assert p3.npt_producao_tecnica == 1

    # Patentes ausentes são contagem comprovada 0 (numeral)
    assert p3.pa_patentes == 0

    # Ativos transferidos são estritamente None
    assert p3.total_transferidos_piprotr is None


def test_eh_pesquisador_em_pesquisa_classificacao_estrita() -> None:
    from etl.core.logic.calculators.papeis import eh_pesquisador_em_pesquisa

    ref = RefCampus(id=1, name="Serra")
    p_servidor = Pessoa(id=1, name="Prof", classification="researcher", campus=ref)
    p_externo = Pessoa(id=2, name="Externo", classification="outside_ifes", campus=None)
    p_aluno = Pessoa(id=3, name="Aluno", classification="student", campus=ref)
    p_sem_classif = Pessoa(id=4, name="Indefinido", classification=None, campus=ref)

    # Servidor institucional do IFES -> True
    assert eh_pesquisador_em_pesquisa(p_servidor, "pesquisador") is True
    assert eh_pesquisador_em_pesquisa(p_servidor, "coordenador") is True
    assert eh_pesquisador_em_pesquisa(p_servidor, "") is True

    # Colaborador externo outside_ifes -> SEMPRE False
    assert eh_pesquisador_em_pesquisa(p_externo, "researcher") is False
    assert eh_pesquisador_em_pesquisa(p_externo, "coordinator") is False
    assert eh_pesquisador_em_pesquisa(p_externo, "pesquisador") is False

    # Estudante -> SEMPRE False para QSPP
    assert eh_pesquisador_em_pesquisa(p_aluno, "student researcher") is False
    assert eh_pesquisador_em_pesquisa(p_aluno, "pesquisador discente") is False
    assert eh_pesquisador_em_pesquisa(p_aluno, "researcher") is False

    # Sem classificação ou pessoa ausente -> False
    assert eh_pesquisador_em_pesquisa(p_sem_classif, "pesquisador") is False
    assert eh_pesquisador_em_pesquisa(None, "pesquisador") is False
