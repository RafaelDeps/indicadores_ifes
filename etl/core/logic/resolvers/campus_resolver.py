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


CAMPI_CANONICOS_SLUGS: list[str] = [
    "serra",
    "vitoria",
    "vilavelha",
    "itapina",
    "colatina",
    "alegre",
    "guarapari",
    "vendanovadoimigrante",
    "cachoeirodeitapemirim",
    "saomateus",
    "cefor",
    "piuma",
    "cariacica",
    "linhares",
    "aracruz",
    "viana",
    "santateresa",
    "centroserrano",
    "presidentekennedy",
    "ibatiba",
    "novavenecia",
    "montanha",
    "barradesaofrancisco",
]


def resolver_campi_facto(
    instituicao: str, referencia: str = "", departamento: str = ""
) -> tuple[str, ...]:
    """
    Resolve os slugs dos campi aos quais um projeto da FACTO pertence.
    Retorna uma tupla de slugs (ex.: ('serra', 'todos'), ('cefor', 'todos'), ('todos',) ou () para externas).
    """
    n_inst = normalizar_slug(instituicao)
    if not n_inst:
        return ()

    # Verifica se pertence ao IFES
    is_ifes = ("espiritosanto" in n_inst) or ("ifes" in n_inst)
    if not is_ifes:
        return ()

    # Reitoria
    if "reitoria" in n_inst:
        n_ref = normalizar_slug(referencia)
        n_dept = normalizar_slug(departamento)
        if "cefor" in n_ref or "cefor" in n_dept:
            return ("cefor", "todos")
        for c in CAMPI_CANONICOS_SLUGS:
            if c in n_ref or c in n_dept:
                return (c, "todos")
        return ("todos",)

    # Campi específicos
    for c in CAMPI_CANONICOS_SLUGS:
        if c in n_inst:
            return (c, "todos")

    return ("todos",)


def resolver_campus_sigpesq(
    coord_campus: str = "",
    coord_nome: str = "",
    equipe: list[dict] | None = None,
    pesquisadores_campus_map: dict[str, str] | None = None,
) -> tuple[str, str]:
    """
    Resolve o campus de um projeto do SIGPESQ garantindo fidelidade e evitando vazamento entre campi:
    1. Se coord_campus indicar explicitamente um dos campi institucionais canônicos, atribui a ele.
    2. Se coord_campus indicar Reitoria, Proex, PRPPG ou afins, atribui a 'todos' (Reitoria).
    3. Se coord_campus for genérico ('IFES') ou ausente, busca a lotação do coordenador em pesquisadores_campus_map.
    4. Se houver membros da equipe com campus institucional explícito ou no mapa, resolve pela equipe.
    5. Se não for atribuível a um campus específico, atribui ao escopo institucional 'todos'.
    """
    norm_campus = normalizar_slug(coord_campus or "")

    # 1. Campus declarado no coordenador
    for c_slug in CAMPI_CANONICOS_SLUGS:
        if c_slug in norm_campus:
            return c_slug, coord_campus

    # 2. Reitoria / Proex / PRPPG
    if any(r in norm_campus for r in ["reitoria", "proex", "prppg"]):
        return "todos", "Reitoria"

    # 3. Coordenador no cadastro institucional
    norm_coord = normalizar_slug(coord_nome or "")
    if pesquisadores_campus_map and norm_coord in pesquisadores_campus_map:
        c_nome = pesquisadores_campus_map[norm_coord]
        return normalizar_slug(c_nome), c_nome

    # 4. Membros da equipe
    for m in equipe or []:
        m_inst = normalizar_slug(m.get("instituicao") or "")
        for c_slug in CAMPI_CANONICOS_SLUGS:
            if c_slug in m_inst:
                return c_slug, m.get("instituicao", "")
        m_nome = normalizar_slug(m.get("nome") or "")
        if pesquisadores_campus_map and m_nome in pesquisadores_campus_map:
            c_nome = pesquisadores_campus_map[m_nome]
            return normalizar_slug(c_nome), c_nome

    # 5. Institucional geral
    return "todos", "IFES (Institucional)"
