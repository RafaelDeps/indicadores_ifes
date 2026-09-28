from __future__ import annotations

from etl.core.logic.models import Pessoa


def eh_pesquisador_em_pesquisa(pessoa: Pessoa | None, papeis_str: str) -> bool:
    """Classifica um membro de iniciativa como pesquisador (QSPP).

    Espelha exatamente a regra do `aggregator` (staff_unicos) para que o
    cruzamento NTECPP permaneça consistente com o NEP publicado.
    """
    return (
        (pessoa is not None and pessoa.classification == "researcher")
        or "coord" in papeis_str
        or "pesquisador" in papeis_str
        or "researcher" in papeis_str
    )


def eh_estudante_em_pesquisa(pessoa: Pessoa | None, papeis_str: str) -> bool:
    """Classifica um membro de iniciativa como estudante (NEP).

    Espelha exatamente a regra do `aggregator` (students_unicos) para que o
    cruzamento NTECPP permaneça consistente com o NEP publicado.
    """
    return (
        (pessoa is not None and pessoa.classification == "student")
        or "student" in papeis_str
        or "estudante" in papeis_str
        or "bolsista" in papeis_str
    )
