from __future__ import annotations

from etl.core.logic.models import Campus, Iniciativa, MembroEquipe, Pessoa, RefCampus
from etl.core.logic.resolvers.campus_resolver import (
    buscar_campus_por_nome_ou_slug,
    normalizar_slug,
    resolver_campus_iniciativa,
)
from etl.core.logic.resolvers.people_registry import (
    criar_registro_pessoas,
    pessoa_por_id,
)


def test_normalizar_slug() -> None:
    assert normalizar_slug("Vitória") == "vitoria"
    assert normalizar_slug("Vila Velha") == "vilavelha"
    assert normalizar_slug("São Mateus") == "saomateus"
    assert normalizar_slug("Serra") == "serra"
    assert normalizar_slug("") == ""


def test_campus_slug_property() -> None:
    c = Campus(id=1, name="Vitória")
    assert c.slug == "vitoria"


def test_buscar_campus_por_nome_ou_slug() -> None:
    campi = [Campus(id=1, name="Serra"), Campus(id=2, name="Vitória")]
    assert buscar_campus_por_nome_ou_slug("serra", campi) == Campus(id=1, name="Serra")
    assert buscar_campus_por_nome_ou_slug("vitoria", campi) == Campus(
        id=2, name="Vitória"
    )
    assert buscar_campus_por_nome_ou_slug("Vitória", campi) == Campus(
        id=2, name="Vitória"
    )
    assert buscar_campus_por_nome_ou_slug("Inexistente", campi) is None


def test_resolver_campus_hierarquia() -> None:
    campus_serra = RefCampus(id=1, name="Serra")
    campus_vitoria = RefCampus(id=2, name="Vitória")
    campus_cariacica = RefCampus(id=3, name="Cariacica")

    pessoas_map = {
        10: Pessoa(
            id=10, name="Coord", classification="researcher", campus=campus_vitoria
        ),
        20: Pessoa(
            id=20, name="Membro", classification="researcher", campus=campus_cariacica
        ),
        30: Pessoa(id=30, name="Sem Campus", classification="student", campus=None),
    }

    # Nível 1: Declarado diretamente
    ini1 = Iniciativa(id=1, name="Proj 1", campus=campus_serra)
    c, origem = resolver_campus_iniciativa(ini1, pessoas_map)
    assert c == campus_serra
    assert origem == "declarado"

    # Nível 2: Coordenador
    ini2 = Iniciativa(
        id=2,
        name="Proj 2",
        campus=None,
        team=[
            MembroEquipe(person_id=30, person_name="Sem Campus", roles=["Student"]),
            MembroEquipe(person_id=10, person_name="Coord", roles=["Coordenador"]),
        ],
    )
    c, origem = resolver_campus_iniciativa(ini2, pessoas_map)
    assert c == campus_vitoria
    assert origem == "coordenador"

    # Nível 3: Primeiro membro com campus
    ini3 = Iniciativa(
        id=3,
        name="Proj 3",
        campus=None,
        team=[
            MembroEquipe(person_id=30, person_name="Sem Campus", roles=["Student"]),
            MembroEquipe(person_id=20, person_name="Membro", roles=["Pesquisador"]),
        ],
    )
    c, origem = resolver_campus_iniciativa(ini3, pessoas_map)
    assert c == campus_cariacica
    assert origem == "membro_equipe"

    # Não resolvível
    ini4 = Iniciativa(
        id=4,
        name="Proj 4",
        campus=None,
        team=[
            MembroEquipe(person_id=30, person_name="Sem Campus", roles=["Student"]),
        ],
    )
    c, origem = resolver_campus_iniciativa(ini4, pessoas_map)
    assert c is None
    assert origem == "nao_resolvido"


def test_criar_registro_pessoas_e_colisoes() -> None:
    pesquisadores = [
        Pessoa(id=1, name="Dr. Silva", classification="researcher"),
        Pessoa(
            id=1, name="Dr. Silva Duplicado", classification="researcher"
        ),  # duplicação
    ]
    estudantes = [
        Pessoa(
            id=1, name="Silva Aluno", classification="student"
        ),  # colisão com pesquisador 1
        Pessoa(id=2, name="Aluno Único", classification="student"),
        Pessoa(
            id=2, name="Aluno Único Duplicado", classification="student"
        ),  # duplicação
    ]

    registro, avisos = criar_registro_pessoas(pesquisadores, estudantes)

    assert len(registro) == 2
    assert pessoa_por_id(registro, 1).classification == "researcher"
    assert pessoa_por_id(registro, 2).classification == "student"
    assert any("mantido como pesquisador" in a for a in avisos)
    assert any("pesquisador duplicado" in a for a in avisos)
    assert any("estudante duplicado" in a for a in avisos)
