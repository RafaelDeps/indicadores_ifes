from __future__ import annotations

from etl.core.logic.calculators.listagens import (
    calcular_cotistas_por_campus_ano,
    calcular_nte_por_campus_ano,
)
from etl.core.logic.models import EstudanteListagem, ListagensExtraidas

# Constantes-teste idênticas às do contrato (classificacao_cota.md)
COTA_RESERVA = "Aluno de Escola Pública com renda <= 1,5 SM por pessoa"
COTA_RESERVA_PPI = "Aluno de Escola Pública com renda <= 1,5 SM por pessoa, autodeclarado preto, pardo ou indígena"


def _estudante(
    matricula: str,
    situacao: str = "Matriculado",
    forma_ingresso: str | None = "Ampla Concorrência",
    cota: str | None = "Não possui",
) -> EstudanteListagem:
    return EstudanteListagem(
        matricula=matricula,
        situacao=situacao,
        forma_ingresso=forma_ingresso,
        forma_matricula_cota=cota,
    )


def _extraidas(
    semestre1: list[EstudanteListagem],
    semestre2: list[EstudanteListagem] | None = None,
    slug: str = "serra",
    ano: int = 2025,
) -> ListagensExtraidas:
    extraidas = ListagensExtraidas()
    extraidas.por_campus_ano[(slug, ano)] = {1: semestre1}
    if semestre2 is not None:
        extraidas.por_campus_ano[(slug, ano)][2] = semestre2
    extraidas.nomes_campus[slug] = "Serra"
    return extraidas


def test_nte_matriculado_nos_dois_semestres_conta_uma_vez() -> None:
    aluno = _estudante(
        "2025001",
        forma_ingresso="M9 - Enem - Ampla Concorrência",
        cota="Ampla Concorrência",
    )
    extraidas = _extraidas(semestre1=[aluno], semestre2=[aluno])
    assert calcular_nte_por_campus_ano(extraidas)[("serra", 2025)] == 1


def test_nte_conta_matriculado_formado_e_concluido() -> None:
    extraidas = _extraidas(
        semestre1=[
            _estudante("m1", situacao="Matriculado"),
            _estudante("f1", situacao="Formado"),
            _estudante("c1", situacao="Concluído"),
            _estudante("x1", situacao="Cancelado"),
            _estudante("t1", situacao="Trancado"),
        ]
    )
    assert calcular_nte_por_campus_ano(extraidas)[("serra", 2025)] == 3


def test_nte_deduplica_entre_semestres_some_e_nao_multiplica() -> None:
    """Regra do denominador do PIES: +1 por matrícula, não +1 por linha.

    A planilha traz a mesma matrícula em `listagem_<ano>_1` e `_2`. Somar as
    linhas daria 2 para um estudante; o NTE tem de contar a matrícula única.
    Este teste usa o par repetido e dois Exclusive, para que a contagem só feche
    por deduplicação (não por omissão).
    """
    extraidas = _extraidas(
        semestre1=[
            _estudante("repetida"),  # aparece também no semestre 2
            _estudante("so_s1"),
        ],
        semestre2=[
            _estudante("repetida"),
            _estudante("so_s2"),
        ],
    )
    # 4 linhas com situação válida ⇒ 3 matrículas únicas. Se contasse por linha,
    # daria 4; se perdesse um dos exclusivos, daria 2.
    assert calcular_nte_por_campus_ano(extraidas)[("serra", 2025)] == 3


def test_nte_deduplica_entre_semestres_com_concluido() -> None:
    """A deduplicação vale para `Concluído` tanto quanto para `Matriculado`."""
    extraidas = _extraidas(
        semestre1=[_estudante("c1", situacao="Concluído")],
        semestre2=[_estudante("c1", situacao="Concluído")],
    )
    assert calcular_nte_por_campus_ano(extraidas)[("serra", 2025)] == 1


def test_nte_nao_conta_quase_concluidos() -> None:
    """`Situação Matrícula` é lista positiva com igualdade exata.

    Os três valores abaixo existem de verdade nas planilhas (66, 87 e 0
    ocorrências, respectivamente) e NÃO são `Concluído`: o mais perigoso é
    `Não Concluído`, que contém a string procurada como sufixo.
    """
    extraidas = _extraidas(
        semestre1=[
            _estudante("c1", situacao="Concluído"),
            _estudante("c2", situacao="Concludente"),
            _estudante("c3", situacao="Não Concluído"),
            _estudante("c4", situacao="Concluido"),
            _estudante("c5", situacao="Estagiario (Concludente)"),
            _estudante("c6", situacao="Aguardando Colação de Grau"),
            _estudante("c7", situacao="Aguard. Solicitar Certificação"),
        ]
    )
    assert calcular_nte_por_campus_ano(extraidas)[("serra", 2025)] == 1


def test_nte_conta_uma_vez_quando_janela_divergente() -> None:
    extraidas = _extraidas(
        semestre1=[_estudante("2025001")],
        semestre2=[_estudante("2025001", situacao="Cancelado")],
    )
    assert calcular_nte_por_campus_ano(extraidas)[("serra", 2025)] == 1


def test_nte_por_campus_ano_separado() -> None:
    extraidas = _extraidas(
        semestre1=[_estudante("1"), _estudante("2")], slug="serra", ano=2024
    )
    extraidas.por_campus_ano[("vitoria", 2024)] = {1: [_estudante("9")]}
    extraidas.nomes_campus["vitoria"] = "Vitória"
    resultado = calcular_nte_por_campus_ano(extraidas)
    assert resultado[("serra", 2024)] == 2
    assert resultado[("vitoria", 2024)] == 1


def test_cotista_exige_ambas_colunas_de_cota() -> None:
    """Cenário sintético da spec US2: apenas 2 dos 4 são cotistas.

    (i) M9 × cota Ampla → não (coluna cota não-cota)
    (ii) M9 × Escola Pública → cotista (M9 não está na lista negativa de ingresso)
    (iii) PS Ação Afirmativa × Escola Pública PPI → cotista
    (iv) PS Ação Afirmativa × Não possui → não (coluna cota não-cota)
    """
    m9 = "M9 - Enem - Ampla Concorrência"
    amples = _estudante("i", forma_ingresso=m9, cota="Ampla Concorrência")
    so_cota_coluna = _estudante("ii", forma_ingresso=m9, cota=COTA_RESERVA)
    cotista = _estudante(
        "iii", forma_ingresso="PS - Ação Afirmativa 1 - PPI", cota=COTA_RESERVA_PPI
    )
    cotista_coluna_falsa = _estudante(
        "iv", forma_ingresso="PS - Ação Afirmativa 1 - PPI", cota="Não possui"
    )

    extraidas = _extraidas(
        semestre1=[amples, so_cota_coluna, cotista, cotista_coluna_falsa]
    )
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 2


def test_cotista_deduplicado_entre_semestres() -> None:
    cotista = _estudante(
        "2025001", forma_ingresso="PS - Ação Afirmativa 1 - PPI", cota=COTA_RESERVA
    )
    extraidas = _extraidas(semestre1=[cotista], semestre2=[cotista])
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 1


def test_ampla_ingresso_com_cota_reserva_nao_conta_como_cotista() -> None:
    """Caso-limite real (118 alunos): ingresso Ampla Concorrência × coluna cota reserva ⇒ excluído."""
    extraidas = _extraidas(
        semestre1=[
            _estudante("a", forma_ingresso="Ampla Concorrência", cota=COTA_RESERVA)
        ]
    )
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 0


def test_m9_rotulo_com_cota_ampla_nao_conta() -> None:
    extraidas = _extraidas(
        semestre1=[
            _estudante(
                "m9",
                forma_ingresso="M9 - Enem - Ampla Concorrência",
                cota="Ampla Concorrência",
            )
        ]
    )
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 0


def test_none_ou_vazio_na_coluna_de_cota_nao_conta() -> None:
    extraidas = _extraidas(
        semestre1=[
            _estudante("n", forma_ingresso="PS - Ação Afirmativa 1 - PPI", cota=None),
            _estudante("v", forma_ingresso="PS - Ação Afirmativa 1 - PPI", cota="   "),
        ]
    )
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 0


def test_strip_na_classificacao() -> None:
    cotista = _estudante(
        "1",
        forma_ingresso="  PS - Ação Afirmativa 1 - PPI  ",
        cota="  Aluno de Escola Pública com renda <= 1,5 SM por pessoa  ",
    )
    extraidas = _extraidas(semestre1=[cotista])
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 1


def test_cotista_concluido_atravessa_o_portao_de_cota() -> None:
    """`Concluído` também vale para o portão de cota/NTECPP.

    A mesma constante decide quem entra no NTE e quem é retido como nome de
    cotista para o cruzamento NTECPP. Um concluinte que entrou por cota e ainda
    consta da listagem é cotista tanto quanto um matriculado — foi a decisão
    registrada: uma constante só, sem segunda lista.
    """
    extraidas = _extraidas(
        semestre1=[
            _estudante(
                "c1",
                situacao="Concluído",
                forma_ingresso="PS - Ação Afirmativa 1 - PPI",
                cota=COTA_RESERVA_PPI,
            )
        ]
    )
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 1


def test_cotista_nao_concluido_nao_atravessa_o_portao_de_cota() -> None:
    """O portão de cota tem de ser tão estrito quanto o NTE.

    `Não Concluído` contém a string `Concluído` como sufixo e `Concludente` é
    quase homônima. Se a comparação deixasse de ser exata, os dois entrariam
    como cotistas e inflariam o NTECPP (e, portanto, o PICOT).
    """
    nao_cotistas = [
        "Não Concluído",
        "Concludente",
        "Estagiario (Concludente)",
        "Cancelado",
        "Trancado",
        "Aguard. Solicitar Certificação",
        "Cancelamento Compulsório",
    ]
    extraidas = _extraidas(
        semestre1=[
            _estudante(
                f"x{i}",
                situacao=v,
                forma_ingresso="PS - Ação Afirmativa 1 - PPI",
                cota=COTA_RESERVA_PPI,
            )
            for i, v in enumerate(nao_cotistas)
        ]
    )
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 0


def test_cotista_deduplicado_entre_semestres_com_concluido() -> None:
    """Um concluinte presente nos dois semestres é +1, não +2, no portão de cota."""
    c = _estudante(
        "c1",
        situacao="Concluído",
        forma_ingresso="PS - Ação Afirmativa 1 - PPI",
        cota=COTA_RESERVA_PPI,
    )
    extraidas = _extraidas(semestre1=[c], semestre2=[c])
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 1


def test_ingresso_nao_de_cota_na_lista_negativa_preservada() -> None:
    """Valores da lista negativa de ingresso nunca contam como cotistas, mesmo com cota válida."""
    nao_cotas = [
        "Transferência Interna",
        "Transferência Externa",
        "Transferência Externa Ex-Ofício",
        "Portador de Diploma (Novo Curso)",
        "Análise de Currículo",
        "Graduação - Intercampi",
        "Aluno Intercambista",
        "Professores da Rede Pública",
        "Pós-Graduação - Ampla Concorrência",
    ]
    extraidas = _extraidas(
        semestre1=[
            _estudante(f"n{i}", forma_ingresso=v, cota=COTA_RESERVA)
            for i, v in enumerate(nao_cotas)
        ]
    )
    assert calcular_cotistas_por_campus_ano(extraidas)[("serra", 2025)] == 0
