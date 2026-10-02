from __future__ import annotations

from etl.core.logic.models import Pessoa


def criar_registro_pessoas(
    pesquisadores: list[Pessoa], estudantes: list[Pessoa]
) -> tuple[dict[int, Pessoa], list[str]]:
    """
    Cria um registro unificado de pessoas mapeado por ID.
    Regras de integridade:
    - Pesquisadores têm precedência sobre estudantes em colisões de ID.
    - Registros duplicados em uma mesma coleção mantêm a primeira ocorrência.
    """
    mapa: dict[int, Pessoa] = {}
    avisos: list[str] = []

    # Processa pesquisadores
    for p in pesquisadores:
        if p.id in mapa:
            avisos.append(
                f"AVISO: pesquisador duplicado ignorado (id: {p.id}, nome: {p.name})"
            )
            continue
        mapa[p.id] = p

    # Processa estudantes
    for e in estudantes:
        if e.id in mapa:
            existente = mapa[e.id]
            if existente.classification == "researcher":
                avisos.append(
                    f"AVISO: ID {e.id} presente em pesquisadores e estudantes — "
                    "mantido como pesquisador"
                )
            else:
                avisos.append(
                    f"AVISO: estudante duplicado ignorado (id: {e.id}, nome: {e.name})"
                )
            continue
        mapa[e.id] = e

    return mapa, avisos


def pessoa_por_id(registro: dict[int, Pessoa], pessoa_id: int) -> Pessoa | None:
    """Busca uma pessoa no registro pelo identificador único."""
    return registro.get(pessoa_id)
