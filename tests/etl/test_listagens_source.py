from __future__ import annotations

from pathlib import Path

import pytest

from etl.adapters.sources.listagens_xlsx_source import ListagensXlsxSource
from etl.core.logic.models import EstudanteListagem
from tests.etl.factories.listagens_factories import criar_listagem_xlsx, linha

HEADER_DIVERGENTE = (
    "Matrícula",
    "Nome",
    "Errado",
    "Situação Matrícula",
    "Sexo",
    "Nascimento",
    "Desc_Forma_Ingresso_Matricula",
    "Desc_Cota",
)


def _criar_cenario_2025(pasta: Path) -> None:
    criar_listagem_xlsx(
        pasta / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[
            linha(
                "2025001",
                forma_ingresso="PS - Ação Afirmativa 1 - PPI",
                cota="Aluno de Escola Pública com renda <= 1,5 SM por pessoa",
            ),
            linha("2025002"),
            linha(2025003, situacao="Formado"),
            linha("2025004", situacao="Concluído"),
            linha("2025005", situacao="Cancelado"),
        ],
    )
    criar_listagem_xlsx(
        pasta / "listagem_2025_2.xlsx",
        ano=2025,
        semestre=2,
        campus="Serra",
        linhas=[
            linha(
                "2025001",
                forma_ingresso="PS - Ação Afirmativa 1 - PPI",
                cota="Aluno de Escola Pública com renda <= 1,5 SM por pessoa",
            ),
            linha("2025002"),
            linha("2025006"),
        ],
    )


def test_source_agrupa_por_campus_ano_semestre(pasta_listagens: Path) -> None:
    _criar_cenario_2025(pasta_listagens)
    extraidas = ListagensXlsxSource(pasta_listagens).extract()

    assert ("serra", 2025) in extraidas.por_campus_ano
    por_semestre = extraidas.por_campus_ano[("serra", 2025)]
    assert sorted(por_semestre.keys()) == [1, 2]
    assert len(por_semestre[1]) == 5
    assert len(por_semestre[2]) == 3
    assert extraidas.nomes_campus["serra"] == "Serra"


def test_source_normaliza_matricula_numerica_para_str(pasta_listagens: Path) -> None:
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2024_1.xlsx",
        ano=2024,
        semestre=1,
        campus="Serra",
        linhas=[linha(2024001, situacao="Formado")],
    )
    extraidas = ListagensXlsxSource(pasta_listagens).extract()
    estudantes = extraidas.por_campus_ano[("serra", 2024)][1]
    assert estudantes[0].matricula == "2024001"


def test_source_rejeita_cabecalho_divergente(pasta_listagens: Path) -> None:
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[linha("2025001")],
        cabecalho=HEADER_DIVERGENTE,
    )
    with pytest.raises(ValueError, match="contrato"):
        ListagensXlsxSource(pasta_listagens).extract()


def test_source_avisa_semestre_ausente(pasta_listagens: Path) -> None:
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[linha("1")],
    )
    extraidas = ListagensXlsxSource(pasta_listagens).extract()
    assert extraidas.anos_encontrados == {2025}
    assert any("listagem_2025_2" in a for a in extraidas.avisos)


def test_source_avisa_divergencia_titulo_ano_semestre(pasta_listagens: Path) -> None:
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_1.xlsx",
        ano=2026,
        semestre=2,
        campus="Serra",
        linhas=[linha("1")],
    )
    extraidas = ListagensXlsxSource(pasta_listagens).extract()
    assert any("2026/2" in a or "título" in a for a in extraidas.avisos)


def test_source_extrai_campus_de_outro_titulo(pasta_listagens: Path) -> None:
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Cachoeiro de Itapemirim",
        linhas=[linha("1")],
        titulo="Campus Cachoeiro de Itapemirim – Todos os Cursos - Semestres letivo: 2025/1",
    )
    extraidas = ListagensXlsxSource(pasta_listagens).extract()
    assert ("cachoeirodeitapemirim", 2025) in extraidas.por_campus_ano


def test_source_lanca_erro_quando_nao_ha_arquivos(pasta_listagens: Path) -> None:
    with pytest.raises(ValueError, match="nenhum arquivo"):
        ListagensXlsxSource(pasta_listagens).extract()


def test_source_lanca_erro_arquivo_corrompido(pasta_listagens: Path) -> None:
    (pasta_listagens / "listagem_2025_1.xlsx").write_text(
        "isto não é um xlsx valido", encoding="utf-8"
    )
    with pytest.raises(ValueError, match="listagem_2025_1"):
        ListagensXlsxSource(pasta_listagens).extract()


def test_source_avisa_linha_sem_matricula(pasta_listagens: Path) -> None:
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[
            [
                None,
                "Aluno Sem Matrícula",
                "Curso",
                "Matriculado",
                "M",
                "2000-01-01",
                "Ampla Concorrência",
                "Não possui",
            ]
        ],
    )
    extraidas = ListagensXlsxSource(pasta_listagens).extract()
    assert any("matrícula" in a.lower() for a in extraidas.avisos)


def test_source_descarta_nome_e_mantem_somente_campos_agregaveis(
    pasta_listagens: Path,
) -> None:
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[linha("1", nome="JUCA PRIVADO")],
    )
    extraidas = ListagensXlsxSource(pasta_listagens).extract()
    estudante: EstudanteListagem = extraidas.por_campus_ano[("serra", 2025)][1][0]
    assert estudante.matricula == "1"
    assert not any("JUCA PRIVADO" in a for a in [""])


def test_source_remove_espacos_dos_textos(pasta_listagens: Path) -> None:
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[
            [
                "    2025001   ",
                "  Nome  ",
                "  Curso  ",
                "  Matriculado  ",
                "  F  ",
                "  2000-01-01  ",
                "  PS - Ação Afirmativa 1 - PPI  ",
                "  Aluno de Escola Pública com renda <= 1,5 SM por pessoa  ",
            ]
        ],
    )
    extraidas = ListagensXlsxSource(pasta_listagens).extract()
    estudante = extraidas.por_campus_ano[("serra", 2025)][1][0]
    assert estudante.matricula == "2025001"
    assert estudante.situacao == "Matriculado"
    assert estudante.forma_ingresso == "PS - Ação Afirmativa 1 - PPI"


def test_source_colhe_apenas_nomes_de_cotistas_para_o_match(
    pasta_listagens: Path,
) -> None:
    """FR-012/Princípio IV: nomes de cotistas são retidos (normalizados, em
    memória) apenas para o cruzamento NTECPP; não-cotistas não entram."""
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[
            linha(
                "A1",
                nome="Ana da Costa",
                forma_ingresso="PS - Ação Afirmativa 1 - PPI",
                cota="Aluno de Escola Pública com renda <= 1,5 SM por pessoa",
            ),
            linha(
                "B2",
                nome="Ana da Costa",
                forma_ingresso="PS - Ação Afirmativa 1 - PPI",
                cota="Aluno de Escola Pública com renda <= 1,5 SM por pessoa",
            ),
            linha("C3", nome="Não cotista"),
        ],
    )
    extraidas = ListagensXlsxSource(pasta_listagens).extract()

    assert extraidas.nomes_cotistas == {("serra", 2025): {"ana da costa"}}
    # O registro agregável continua sem nome (Princípio IV).
    assert all(
        e.matricula in {"A1", "B2", "C3"}
        for e in extraidas.por_campus_ano[("serra", 2025)][1]
    )


def test_source_avisa_campus_divergente_entre_semestres(pasta_listagens: Path) -> None:
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[linha("1")],
    )
    criar_listagem_xlsx(
        pasta_listagens / "listagem_2025_2.xlsx",
        ano=2025,
        semestre=2,
        campus="Vitória",
        linhas=[linha("9")],
    )
    extraidas = ListagensXlsxSource(pasta_listagens).extract()
    assert any("campus divergente" in a for a in extraidas.avisos)
    assert ("serra", 2025) in extraidas.por_campus_ano
    assert ("vitoria", 2025) in extraidas.por_campus_ano
