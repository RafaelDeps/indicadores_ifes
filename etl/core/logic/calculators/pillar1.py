from etl.core.logic.calculators.papeis import (
    eh_estudante_em_pesquisa,
    eh_pesquisador_em_pesquisa,
)
from etl.core.logic.models import AgregadosPilar1, Iniciativa, Pessoa
from etl.core.logic.resolvers.campus_resolver import normalizar_slug
from etl.core.logic.temporal.activity_filter import (
    iniciativa_ativa_em_ano,
    membro_ativo_em_ano,
)


def calcular_pilar1(
    iniciativas: list[Iniciativa],
    pessoas_map: dict[int, Pessoa],
    ano: int,
    campus: str | None = None,
) -> AgregadosPilar1:
    """
    Calcula as métricas do Pilar 1 (Engajamento Acadêmico e Inclusão):
    - NTPP: Total de projetos de pesquisa ativos no ano de referência.
    - QSPP: Total de servidores únicos (pesquisadores/coordenadores) participantes ativos
      lotados no campus (se campus fornecido) ou no IFES (se campus for None).
    - NEP: Total de estudantes únicos participantes ativos.
    - Demais campos (NTE, PIES, NTECPP, PICOT): estritamente None (Princípio III).
    """
    iniciativas_ativas = [
        ini for ini in iniciativas if iniciativa_ativa_em_ano(ini, ano)
    ]
    ntpp = len(iniciativas_ativas)

    pesquisadores_unicos: set[int] = set()
    estudantes_unicos: set[int] = set()
    campus_slug_alvo = normalizar_slug(campus) if campus else None

    for ini in iniciativas_ativas:
        for membro in ini.team:
            if not membro_ativo_em_ano(membro, ano, ini):
                continue

            pessoa = pessoas_map.get(membro.person_id)
            papeis_str = " ".join(membro.roles).lower()

            eh_pesquisador = eh_pesquisador_em_pesquisa(pessoa, papeis_str)
            eh_estudante = eh_estudante_em_pesquisa(pessoa, papeis_str)

            if eh_pesquisador:
                if campus_slug_alvo:
                    if (
                        pessoa
                        and pessoa.campus
                        and normalizar_slug(pessoa.campus.name) == campus_slug_alvo
                    ):
                        pesquisadores_unicos.add(membro.person_id)
                else:
                    pesquisadores_unicos.add(membro.person_id)
            elif eh_estudante:
                estudantes_unicos.add(membro.person_id)

    return AgregadosPilar1(
        ntpp_projetos_pesquisa_ativos=ntpp,
        qspp_docentes_pesquisa=len(pesquisadores_unicos),
        nep_estudantes_pesquisa=len(estudantes_unicos),
        nte_total_estudantes_matriculados=None,
        percentual_calculado_pies=None,
        ntecpp_cotistas_pesquisa=None,
        percentual_calculado_picot=None,
    )
