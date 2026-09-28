from __future__ import annotations

from etl.core.logic.calculators.estudantes_pesquisa import (
    nomes_estudantes_pesquisa_por_escopo_ano,
)
from etl.core.logic.resolvers.people_registry import criar_registro_pessoas


def test_nomes_estudantes_pesquisa_refletem_o_nep(mock_export_canonicos) -> None:
    """A contagem de nomes por (escopo, ano) espelha o NEP (students_unicos)."""
    registro, _ = criar_registro_pessoas(
        mock_export_canonicos.pessoas, mock_export_canonicos.estudantes
    )
    nomes = nomes_estudantes_pesquisa_por_escopo_ano(
        mock_export_canonicos, registro, [2024, 2025, 2026]
    )

    # Iniciativa 1 (Robótica, Serra): estudante "Aluno Serra" ativo 2024–2026.
    for ano in (2024, 2025, 2026):
        assert nomes["serra"][ano] == {"aluno serra"}
        assert nomes["todos"][ano] == {"aluno serra"}
    # Iniciativa 2 (IA, Vitória via coordenadora): sem estudantes ⇒ conjunto vazio.
    assert nomes["vitoria"][2025] == set()


def test_nomes_omitidos_quando_membro_sem_pessoa_registrada() -> None:
    from etl.core.logic.models import (
        Campus,
        ExportCanonicos,
        Iniciativa,
        MembroEquipe,
    )

    exportacao = ExportCanonicos(
        campi=[Campus(id=1, name="Serra")],
        iniciativas=[
            Iniciativa(
                id=1,
                name="Projeto",
                status="em andamento",
                start_date="2025-01-01",
                team=[
                    MembroEquipe(person_id=1, person_name="", roles=["Student"]),
                    MembroEquipe(
                        person_id=2, person_name="Sem Cadastro", roles=["Student"]
                    ),
                ],
            )
        ],
    )
    registro = {}
    nomes = nomes_estudantes_pesquisa_por_escopo_ano(exportacao, registro, [2025])

    # Projeto sem campus resolvível ⇒ nome só no escopo "todos"; person_name
    # vazio é descartado (sem nome para cruzar).
    assert nomes["serra"][2025] == set()
    assert nomes["todos"][2025] == {"sem cadastro"}
