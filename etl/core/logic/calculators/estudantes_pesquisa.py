from __future__ import annotations

from etl.core.logic.calculators.papeis import eh_estudante_em_pesquisa
from etl.core.logic.models import ExportCanonicos, Pessoa
from etl.core.logic.normalizacao_nomes import normalizar_nome
from etl.core.logic.resolvers.campus_resolver import (
    normalizar_slug,
    resolver_campus_iniciativa,
)
from etl.core.logic.temporal.activity_filter import (
    iniciativa_ativa_em_ano,
    membro_ativo_em_ano,
)

ESCOPO_TODOS_SLUG = "todos"

TIPOS_PROJETO_PESQUISA = frozenset({"Research Project", "Projeto de Pesquisa"})


def nomes_estudantes_pesquisa_por_escopo_ano(
    exportacao: ExportCanonicos,
    registro_pessoas: dict[int, Pessoa],
    anos: list[int],
) -> dict[str, dict[int, set[str]]]:
    """Nomes normalizados dos estudantes em pesquisa por (escopo, ano).

    Espelha exatamente o ``students_unicos`` do ``aggregator`` (a definição do
    NEP publicado): para cada iniciativa do tipo projeto de pesquisa ativa no
    ano, cada membro ativo classificado como estudante entra no conjunto do
    escopo "todos" e do escopo do campus resolvido da iniciativa.

    Uso exclusivo do cruzamento NTECPP (FR-012); os nomes existem apenas em
    memória — nunca são serializados (Princípio IV).
    """
    slugs_campi = {normalizar_slug(c.name) for c in exportacao.campi}
    nomes: dict[str, dict[int, set[str]]] = {
        esc: {ano: set() for ano in anos}
        for esc in sorted(slugs_campi | {ESCOPO_TODOS_SLUG})
    }

    for ini in exportacao.iniciativas:
        if ini.initiative_type is not None:
            tipo = ini.initiative_type.get("name", "")
            if tipo not in TIPOS_PROJETO_PESQUISA:
                continue

        ref_campus, _ = resolver_campus_iniciativa(ini, registro_pessoas)
        slug = normalizar_slug(ref_campus.name) if ref_campus else None

        for ano in anos:
            if not iniciativa_ativa_em_ano(ini, ano):
                continue

            escopos = [ESCOPO_TODOS_SLUG]
            if slug and slug in nomes:
                escopos.append(slug)

            for esc in escopos:
                for membro in ini.team:
                    if not membro_ativo_em_ano(membro, ano, ini):
                        continue
                    pessoa = registro_pessoas.get(membro.person_id)
                    papeis = " ".join(membro.roles).lower()
                    if not eh_estudante_em_pesquisa(pessoa, papeis):
                        continue
                    nome = pessoa.name if pessoa else membro.person_name
                    normalizado = normalizar_nome(nome)
                    if normalizado:
                        nomes[esc][ano].add(normalizado)

    return nomes
