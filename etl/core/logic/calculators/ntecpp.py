from __future__ import annotations


def calcular_ntecpp_match(
    nomes_estudantes_pesquisa: dict[str, dict[int, set[str]]],
    nomes_cotistas: dict[tuple[str, int], set[str]],
) -> dict[tuple[str, int], int | None]:
    """NTECPP por (campus, ano): estudantes cotistas (listagens) que também
    estão no conjunto NEP (estudantes em pesquisa, export canônico).

    O cruzamento é por nome normalizado (FR-012) — única chave disponível —
    e, por construção, o resultado nunca ultrapassa o NEP do mesmo escopo/ano.

    Regra de fidelidade (Princípio III): quando a interseção for vazia o valor
    publicado é ``None`` e não ``0`` — com cobertura parcial do cruzamento não
    é possível distinguir "nenhum cotista em pesquisa" de "nenhum nome
    coincidiu". Apenas interseções não vazias são publicadas como contagem.
    """
    resultado: dict[tuple[str, int], int | None] = {}
    for chave, nomes_cotista in nomes_cotistas.items():
        slug, ano = chave
        pesquisa = nomes_estudantes_pesquisa.get(slug, {}).get(ano, set())
        coincidentes = pesquisa & nomes_cotista
        resultado[chave] = len(coincidentes) if coincidentes else None
    return resultado
