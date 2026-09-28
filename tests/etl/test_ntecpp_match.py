from __future__ import annotations

from etl.core.logic.calculators.ntecpp import calcular_ntecpp_match


def test_match_conta_intersecao_por_campus_ano() -> None:
    pesquisa = {"serra": {2025: {"ana costa", "bruno lima", "carol dias"}}}
    cotistas = {
        ("serra", 2025): {"ana costa", "bruno lima", "zeca"},
        ("vitoria", 2025): {"ana costa"},
    }

    resultado = calcular_ntecpp_match(pesquisa, cotistas)

    assert resultado[("serra", 2025)] == 2
    # Campus sem estudantes em pesquisa no canônico ⇒ null (não 0).
    assert resultado[("vitoria", 2025)] is None


def test_match_deduplica_nomes_repetidos() -> None:
    pesquisa = {"serra": {2025: {"ana costa"}}}
    # Cotista com o mesmo nome em dois semestres (deduplicado por nome).
    cotistas = {("serra", 2025): {"ana costa", "ana costa"}}

    assert calcular_ntecpp_match(pesquisa, cotistas)[("serra", 2025)] == 1


def test_match_intersecao_vazia_e_null_nao_zero() -> None:
    """Princípio III: cobertura parcial ⇒ vazio não pode ser lido como 0."""
    pesquisa = {"serra": {2025: {"bruno lima"}}}
    cotistas = {("serra", 2025): {"ana costa"}}

    assert calcular_ntecpp_match(pesquisa, cotistas)[("serra", 2025)] is None


def test_match_ignora_normalizacao_de_acentos_e_caixa() -> None:
    """A normalização é feita antes do cruzamento (fonte/canônico); o match só
    recebe conjuntos já normalizados."""
    pesquisa = {"serra": {2025: {"joao da silva"}}}
    cotistas = {("serra", 2025): {"joao da silva"}}

    assert calcular_ntecpp_match(pesquisa, cotistas)[("serra", 2025)] == 1


def test_match_sem_chave_de_cotistas_nao_produz_resultado() -> None:
    pesquisa = {"serra": {2025: {"ana costa"}}}
    assert calcular_ntecpp_match(pesquisa, {}) == {}


def test_match_nunca_ultrapassa_o_nep() -> None:
    """Por construção NTECPP ⊆ NEP do mesmo (escopo, ano)."""
    pesquisa = {"serra": {2025: {"ana costa", "bruno lima"}}}
    cotistas = {("serra", 2025): {"ana costa", "bruno lima", "extra fora do NEP"}}

    assert calcular_ntecpp_match(pesquisa, cotistas)[("serra", 2025)] == 2
    assert calcular_ntecpp_match(pesquisa, cotistas)[("serra", 2025)] <= len(
        pesquisa["serra"][2025]
    )
