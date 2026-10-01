"""Cobertura de derivados: perda pela subtração origem - pacote.

Contrato: `specs/012-gate-proveniencia-workflow-dados/contracts/check-dados.md` §3.

A regra é uma subtração de conjuntos de chaves `(campus, ano, campo)`, e nada
mais. Os casos abaixo existem para fixar os quatro limites onde ela pode estar
errada sem parecer errada:

| caso | o que fixa |
|---|---|
| (a) | subtração vazia quando os dois lados cobrem as mesmas chaves |
| (b) | par ausente no pacote é perda |
| (c) | par presente com derivado nulo é **a mesma** perda — e é o caso que a verificação anterior não via |
| (d) | derivado nulo nos **dois** lados não é perda: a origem também não produziu |
| (e) | par no pacote e não na origem não é perda: as listagens cobrem os semestres enviados, o canônico cobre todos os anos |
| (f) | perda é **por campo**: um dos derivados presente e o outro ausente acusa só o ausente |
| (g) | a ordem do relatório é estável entre execuções |

O caso (d) é o que impede uma lista de isenções: o escopo agregado tem derivado
nulo porque a origem também não o produz, e nenhuma linha de código cita nome de
campus, escopo ou ano.
"""

from __future__ import annotations

import json
from pathlib import Path

from etl.core.logic.cobertura_listagens import (
    cobertura_registros,
    pares_registros,
    registrar_perdas,
    subtrair_coberturas,
)
from etl.core.logic.models import RegistroPilarJson
from tests.etl.factories.pacotes import registro_pilar1

NTE = "NTE_total_estudantes_matriculados"
NTECPP = "NTECPP_cotistas_em_pesquisa"


def _lendo(registro: RegistroPilarJson) -> dict:
    return json.loads(registro.conteudo)


def _derivado(registro: RegistroPilarJson, campo: str):
    return _lendo(registro)["indicadores"]["PIES" if campo == NTE else "PICOT"][campo]


# --- (a) Cobertura igual dos dois lados: perda vazia ---------------------------


def test_perda_vazia_quando_os_dois_lados_cobrem_o_mesmo() -> None:
    origem = [registro_pilar1("serra", 2025, nte=10, ntecpp=2)]
    pacote = list(origem)

    assert (
        subtrair_coberturas(cobertura_registros(origem), cobertura_registros(pacote))
        == set()
    )


# --- (b) Par ausente no pacote: perda -----------------------------------------


def test_par_ausente_no_pacote_e_perda() -> None:
    origem = [registro_pilar1("serra", 2025, nte=10, ntecpp=2)]
    pacote: list[RegistroPilarJson] = []

    perdas = subtrair_coberturas(
        cobertura_registros(origem), cobertura_registros(pacote)
    )

    assert ("serra", 2025, NTE) in perdas
    assert ("serra", 2025, NTECPP) in perdas


# --- (c) Par presente com derivado nulo: MESMO veredito de (b) -----------------


def test_par_presente_com_derivado_nulo_e_a_mesma_perda() -> None:
    """Integração rodou e não escreveu, contra integração que não rodou.

    São causas diferentes para o mesmo estado observável. O relatório as
    distingue na **forma** (`arquivo ausente` contra `campo nulo`), mas o
    veredito é o mesmo — e é por isso que a regra mede valor, e não presença
    de arquivo.
    """
    origem = [registro_pilar1("serra", 2025, nte=10, ntecpp=2)]
    pacote = [registro_pilar1("serra", 2025, nte=None, ntecpp=None)]

    perdas = subtrair_coberturas(
        cobertura_registros(origem), cobertura_registros(pacote)
    )

    assert perdas == {("serra", 2025, NTE), ("serra", 2025, NTECPP)}


# --- (d) Derivado nulo nos DOIS lados: sem violação ----------------------------


def test_derivado_nulo_nos_dois_lados_nao_viola() -> None:
    """Escopo agregado tem derivado nulo porque a **origem** também não produziu.

    É o caso que matou a exigência de "derivado não nulo". Se a regra exigisse
    valor, ela reprovaria um pacote correto — e o portão tem de passar contra o
    pacote commitado.
    """
    registros = [registro_pilar1("todos", 2025, nte=None, ntecpp=None)]

    assert (
        subtrair_coberturas(
            cobertura_registros(registros), cobertura_registros(registros)
        )
        == set()
    )
    assert cobertura_registros(registros) == set()


# --- (e) Par no pacote e não na origem: sem violação ---------------------------


def test_par_no_pacote_e_nao_na_origem_nao_viola() -> None:
    """Direção é origem → pacote; o inverso é o estado normal.

    As listagens cobrem os semestres enviados; o canônico cobre todos os anos.
    Um par que existe no pacote sem existir na origem não é perda de nada.
    """
    origem: list[RegistroPilarJson] = []
    pacote = [registro_pilar1("serra", 2023, nte=5, ntecpp=1)]

    assert (
        subtrair_coberturas(cobertura_registros(origem), cobertura_registros(pacote))
        == set()
    )


# --- (f) Perda é por campo, não por par ---------------------------------------


def test_perda_acusa_somente_o_campo_ausente() -> None:
    """A integração escreve os dois derivados na mesma passagem, mas a regra é
    por campo: um derivado presente protege o outro de ser acusado."""
    origem = [registro_pilar1("serra", 2025, nte=10, ntecpp=2)]
    pacote = [registro_pilar1("serra", 2025, nte=10, ntecpp=None)]

    perdas = subtrair_coberturas(
        cobertura_registros(origem), cobertura_registros(pacote)
    )

    assert perdas == {("serra", 2025, NTECPP)}


# --- (g) Ordenação estável entre execuções ------------------------------------


def test_ordem_do_relatorio_e_estavel_entre_execucoes() -> None:
    """Um relatório que embaralha a ordem a cada execução não pode ser
    comparado entre logs de execução diferentes."""
    origem = [
        registro_pilar1("serra", 2026, nte=1, ntecpp=1),
        registro_pilar1("serra", 2024, nte=2, ntecpp=2),
        registro_pilar1("alice", 2025, nte=3, ntecpp=3),
        registro_pilar1("serra", 2025, nte=4, ntecpp=4),
    ]
    pacote: list[RegistroPilarJson] = []
    cobertura_origem = cobertura_registros(origem)

    primeira = registrar_perdas(
        cobertura_origem, cobertura_registros(pacote), pares_no_pacote=set()
    )
    segunda = registrar_perdas(
        cobertura_origem, cobertura_registros(pacote), pares_no_pacote=set()
    )

    assert [linha.chave for linha in primeira] == [linha.chave for linha in segunda]
    # Ordenada por (campus, ano, campo), não pela ordem de inserção.
    assert [linha.chave for linha in primeira] == sorted(
        linha.chave for linha in primeira
    )


# --- (h) A forma distingue "arquivo ausente" de "campo nulo" -------------------


def test_forma_distingue_arquivo_ausente_de_campo_nulo() -> None:
    """A ação corretiva difere: uma forma é "a integração não rodou", a outra é
    "a integração rodou e não escreveu". O veredito é o mesmo; a causa não."""
    origem = [registro_pilar1("serra", 2025, nte=10, ntecpp=2)]
    sem_arquivo = registrar_perdas(
        cobertura_registros(origem), cobertura_registros([]), pares_no_pacote=set()
    )
    nulos = [registro_pilar1("serra", 2025)]
    com_arquivo_nulo = registrar_perdas(
        cobertura_registros(origem),
        cobertura_registros(nulos),
        pares_no_pacote=pares_registros(nulos),
    )

    assert {linha.forma for linha in sem_arquivo} == {"arquivo ausente"}
    assert {linha.forma for linha in com_arquivo_nulo} == {"campo nulo"}
    assert [linha.chave for linha in sem_arquivo] == [
        linha.chave for linha in com_arquivo_nulo
    ]


# --- (i) Registro fora do padrão de nome não é cobertura -----------------------


def test_registro_fora_do_padrao_de_nome_nao_conta_como_cobertura() -> None:
    """O canônico também vai para o mesmo zip, e tem outros pilares.

    Um `pilar2_*.json` não tem NTE/NTECPP de listagem; contá-lo como cobertura
    faria o portão pedir algo que o arquivo não pode ter.
    """
    registros = [
        RegistroPilarJson(
            nome="pilar2_serra_2025.json",
            conteudo=json.dumps({"indicadores": {}}),
        ),
        RegistroPilarJson(
            nome="pilar1_serra_2025.json",
            conteudo=registro_pilar1("serra", 2025).conteudo,
        ),
    ]

    assert cobertura_registros(registros) == set()


# --- (j) JSON truncado: erro, não cobertura vazia ------------------------------


def test_json_truncado_e_erro_e_nao_cobertura_vazia() -> None:
    """Cobertura vazia silenciosa é o pior resultado possível: o portão passaria
    sobre um insumo corrompido."""
    registros = [RegistroPilarJson(nome="pilar1_serra_2025.json", conteudo='{"indic')]

    try:
        cobertura_registros(registros)
    except ValueError as erro:
        assert "pilar1_serra_2025.json" in str(erro)
    else:
        raise AssertionError("JSON truncado deveria ter levantado ValueError")


# --- (k) Nomes de escopo, campus e ano não aparecem na regra -------------------


def test_regra_nao_depende_de_nome_de_campus_escopo_ou_ano() -> None:
    """Verificação por **inspeção** de fonte, não por teste de comportamento.

    Um teste passaria com uma lista de isenções por nome: o campus do teste
    seria isento e o teste verde. O que impede a lista de isenções é não haver
    nome nenhum no código — então a verificação é ler o módulo.
    """
    fonte = Path(cobertura_registros.__code__.co_filename).read_text(encoding="utf-8")

    for nome in ("serra", "todos", "alice"):
        assert f'"{nome}"' not in fonte
        assert f"'{nome}'" not in fonte
