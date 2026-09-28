from __future__ import annotations

import re
import unicodedata

from etl.core.logic.models import Campus, Iniciativa, Pessoa, RefCampus


def normalizar_slug(texto: str) -> str:
    """Normaliza uma string para slug alfanumérico ASCII em minúsculas (sem acentos ou espaços)."""
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", texto)
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    minusculo = sem_acento.lower()
    return re.sub(r"[^a-z0-9]", "", minusculo)


def resolver_campus_iniciativa(
    iniciativa: Iniciativa, pessoas_map: dict[int, Pessoa]
) -> tuple[RefCampus | None, str]:
    """
    Resolve o campus de uma iniciativa através de hierarquia em 3 níveis:
    1. Campus declarado diretamente na iniciativa.
    2. Campus do coordenador do projeto (membro com papel Coordenador/Coordinator).
    3. Campus do primeiro membro da equipe que possuir vínculo de campus conhecido.

    Retorna uma tupla (RefCampus | None, origem_resolucao).
    """
    # 1. Campus declarado diretamente
    if iniciativa.campus and iniciativa.campus.id > 0:
        return iniciativa.campus, "declarado"

    # 2. Campus do coordenador
    coordenador_campus: RefCampus | None = None
    for membro in iniciativa.team:
        papeis_str = " ".join(membro.roles).lower()
        if "coord" in papeis_str:
            pessoa = pessoas_map.get(membro.person_id)
            if pessoa and pessoa.campus and pessoa.campus.id > 0:
                coordenador_campus = pessoa.campus
                break

    if coordenador_campus:
        return coordenador_campus, "coordenador"

    # 3. Primeiro membro com campus associado
    for membro in iniciativa.team:
        pessoa = pessoas_map.get(membro.person_id)
        if pessoa and pessoa.campus and pessoa.campus.id > 0:
            return pessoa.campus, "membro_equipe"

    return None, "nao_resolvido"


def buscar_campus_por_nome_ou_slug(termo: str, campi: list[Campus]) -> Campus | None:
    """Localiza um campus na lista comparando nome exato, minúsculo ou slug normalizado."""
    if not termo:
        return None

    slug_alvo = normalizar_slug(termo)
    for campus in campi:
        if campus.name.lower() == termo.lower() or campus.slug == slug_alvo:
            return campus

    return None
