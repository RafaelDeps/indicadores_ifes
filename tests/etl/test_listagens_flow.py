from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

from etl.adapters.sinks.zip_indicadores_sink import ZipIndicadoresSink
from etl.adapters.sources.listagens_xlsx_source import ListagensXlsxSource
from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.flows.listagens_flow import CAMPOS_DERIVAVEIS_LISTAGENS, ListagensFlow
from tests.etl.conftest import criar_zip_canonico_fake
from tests.etl.factories.listagens_factories import criar_listagem_xlsx, linha


def _criar_2025_com_6_matriculados(pasta: Path) -> None:
    """Serra/2025: NTE=6 (A1,B2,C3,D4,E5,F6 únicos), cotistas=2 (A1,B2 com nomes
    "Ana Costa" e "Bruno Lima"), para conferência exata do match NTECPP.

    D4 (`Concluído`) conta no NTE mas não é cotista (ingresso Ampla, cota
    "Não possui"), então o NTECPP continua sendo 2. É o par que separa as duas
    portas: estar no denominador não implica estar no universo de cotistas."""
    criar_listagem_xlsx(
        pasta / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[
            linha(
                "A1",
                nome="Ana Costa",
                situacao="Formado",
                forma_ingresso="PS - Ação Afirmativa 1 - PPI",
                cota="Aluno de Escola Pública com renda <= 1,5 SM por pessoa",
            ),
            linha(
                "B2",
                nome="Bruno Lima",
                forma_ingresso="PS - Ação Afirmativa 1 - PPI",
                cota="Aluno de Escola Pública com renda <= 1,5 SM por pessoa",
            ),
            linha("C3"),
            linha("D4", situacao="Concluído"),
            linha("E5"),
        ],
    )
    criar_listagem_xlsx(
        pasta / "listagem_2025_2.xlsx",
        ano=2025,
        semestre=2,
        campus="Serra",
        linhas=[linha("B2"), linha("E5"), linha("F6")],
    )


def _criar_canonico_serra_2025(tmp_path: Path) -> ZipCanonicalSource:
    """Export canônico sintético: NEP=3 (Ana Costa, Bruno Lima, Carol Dias) em
    projeto de pesquisa ativo em 2025 no campus Serra."""
    caminho = tmp_path / "exports_canonical.zip"
    criar_zip_canonico_fake(
        caminho,
        {
            "campuses_canonical.json": [{"id": 1, "name": "Serra"}],
            "researchers_canonical.json": [
                {
                    "id": 90,
                    "name": "Profa Coordenadora",
                    "classification": "researcher",
                    "campus": {"id": 1, "name": "Serra"},
                }
            ],
            "students_canonical.json": [
                {
                    "id": 101,
                    "name": "Ana Costa",
                    "classification": "student",
                    "campus": {"id": 1, "name": "Serra"},
                },
                {
                    "id": 102,
                    "name": "Bruno Lima",
                    "classification": "student",
                    "campus": {"id": 1, "name": "Serra"},
                },
                {
                    "id": 103,
                    "name": "Carol Dias",
                    "classification": "student",
                    "campus": {"id": 1, "name": "Serra"},
                },
            ],
            "initiatives_canonical.json": [
                {
                    "id": 7,
                    "name": "Projeto Pesquisa 2025",
                    "status": "EM_ANDAMENTO",
                    "start_date": "2025-01-01",
                    "end_date": None,
                    "campus": {"id": 1, "name": "Serra"},
                    "team": [
                        {
                            "person_id": 90,
                            "person_name": "Profa Coordenadora",
                            "roles": ["Coordenador"],
                        },
                        {
                            "person_id": 101,
                            "person_name": "Ana Costa",
                            "roles": ["Student"],
                        },
                        {
                            "person_id": 102,
                            "person_name": "Bruno Lima",
                            "roles": ["Student"],
                        },
                        {
                            "person_id": 103,
                            "person_name": "Carol Dias",
                            "roles": ["Student"],
                        },
                    ],
                }
            ],
            "articles_canonical.json": [],
            "research_productions_canonical.json": [],
            "production_authors_canonical.json": [],
            "production_types_canonical.json": [],
        },
    )
    return ZipCanonicalSource(caminho)


def _fluxo(
    pasta: Path,
    saida: Path,
    fonte_canonica: ZipCanonicalSource | None = None,
) -> ListagensFlow:
    return ListagensFlow(
        source=ListagensXlsxSource(pasta),
        sink=ZipIndicadoresSink(saida, campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS),
        anos=[2025],
        fonte_canonica=fonte_canonica,
    )


def test_flow_gera_pacote_fim_a_fim(tmp_path: Path) -> None:
    pasta = tmp_path / "raw"
    pasta.mkdir()
    _criar_2025_com_6_matriculados(pasta)
    saida = tmp_path / "indicadores_listagens.zip"

    resultado = _fluxo(pasta, saida, _criar_canonico_serra_2025(tmp_path)).run()

    assert resultado.codigo_saida == 0
    assert resultado.total_arquivos == 3
    assert saida.exists()
    with zipfile.ZipFile(saida) as zf:
        dados = json.loads(zf.read("pilar1_serra_2025.json"))
    pies = dados["indicadores"]["PIES"]
    picot = dados["indicadores"]["PICOT"]
    assert pies["NTE_total_estudantes_matriculados"] == 6
    # NTECPP = match NEP × cotistas: Ana Costa e Bruno Lima coincidem (2);
    # Carol Dias não é cotista/não consta das listagens.
    assert picot["NTECPP_cotistas_em_pesquisa"] == 2
    assert pies["NEP_estudantes_em_pesquisa"] is None
    assert (
        dados["indicadores"]["NTPP"]["projetos_pesquisa_registrados_execucao"] is None
    )
    assert dados["indicadores"]["QSPP"]["SUPP_servidores_unicos_participantes"] is None


def test_flow_sem_fonte_canonica_ntecpp_null(tmp_path: Path) -> None:
    """Sem export canônico não há universo NEP para cruzar ⇒ NTECPP null."""
    pasta = tmp_path / "raw"
    pasta.mkdir()
    _criar_2025_com_6_matriculados(pasta)
    saida = tmp_path / "indicadores_listagens.zip"

    resultado = _fluxo(pasta, saida).run()

    assert resultado.codigo_saida == 0
    with zipfile.ZipFile(saida) as zf:
        dados = json.loads(zf.read("pilar1_serra_2025.json"))
    assert dados["indicadores"]["PICOT"]["NTECPP_cotistas_em_pesquisa"] is None
    assert dados["indicadores"]["PIES"]["NTE_total_estudantes_matriculados"] == 6


def test_flow_e_deterministico(tmp_path: Path) -> None:
    pasta = tmp_path / "raw"
    pasta.mkdir()
    _criar_2025_com_6_matriculados(pasta)
    saida1 = tmp_path / "r1.zip"
    saida2 = tmp_path / "r2.zip"

    assert _fluxo(pasta, saida1).run().codigo_saida == 0
    assert _fluxo(pasta, saida2).run().codigo_saida == 0

    def _sha(caminho: Path) -> str:
        return hashlib.sha256(caminho.read_bytes()).hexdigest()

    assert _sha(saida1) == _sha(saida2)
    # Saída byte a byte idêntica, não apenas hash
    assert saida1.read_bytes() == saida2.read_bytes()


def test_flow_avisa_semestre_ausente_mas_gera_pacote(tmp_path: Path) -> None:
    pasta = tmp_path / "raw"
    pasta.mkdir()
    criar_listagem_xlsx(
        pasta / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[linha("1")],
    )
    saida = tmp_path / "out.zip"
    resultado = _fluxo(pasta, saida).run()
    assert resultado.codigo_saida == 0
    assert any("listagem_2025_2" in a for a in resultado.avisos)
    assert saida.exists()


def test_flow_erro_sem_nenhum_arquivo(tmp_path: Path) -> None:
    pasta = tmp_path / "vazio"
    pasta.mkdir()
    saida = tmp_path / "out.zip"
    resultado = ListagensFlow(
        source=ListagensXlsxSource(pasta),
        sink=ZipIndicadoresSink(saida),
        anos=[2025],
    ).run()
    assert resultado.codigo_saida == 1
    assert not saida.exists()


def test_flow_erro_ano_requisitado_sem_arquivos(tmp_path: Path) -> None:
    pasta = tmp_path / "raw"
    pasta.mkdir()
    criar_listagem_xlsx(
        pasta / "listagem_2024_1.xlsx",
        ano=2024,
        semestre=1,
        campus="Serra",
        linhas=[linha("1")],
    )
    saida = tmp_path / "out.zip"
    resultado = ListagensFlow(
        source=ListagensXlsxSource(pasta),
        sink=ZipIndicadoresSink(saida),
        anos=[2025],
    ).run()
    assert resultado.codigo_saida == 1
    assert not saida.exists()


def test_flow_erro_cabecalho_corrompido_sem_saida_parcial(tmp_path: Path) -> None:
    pasta = tmp_path / "raw"
    pasta.mkdir()
    criar_listagem_xlsx(
        pasta / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[linha("1")],
        cabecalho=(
            "Matrícula",
            "Nome",
            "Curso",
            "Situação Matrícula",
            "Sexo",
            "Nascimento",
            "Desc_Forma_Ingresso_Matricula",
            "X",
        ),
    )
    saida = tmp_path / "out.zip"
    resultado = _fluxo(pasta, saida).run()
    assert resultado.codigo_saida == 1
    assert not saida.exists()
    assert resultado.erros


def test_flow_respeita_filtro_de_campus(tmp_path: Path) -> None:
    pasta = tmp_path / "raw"
    pasta.mkdir()
    criar_listagem_xlsx(
        pasta / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[linha("1")],
    )
    criar_listagem_xlsx(
        pasta / "listagem_2025_2.xlsx",
        ano=2025,
        semestre=2,
        campus="Vitória",
        linhas=[linha("9")],
    )
    saida = tmp_path / "out.zip"
    resultado = ListagensFlow(
        source=ListagensXlsxSource(pasta),
        sink=ZipIndicadoresSink(saida, campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS),
        anos=[2025],
        campus_filtro="Serra",
    ).run()
    assert resultado.codigo_saida == 0
    with zipfile.ZipFile(saida) as zf:
        nomes = zf.namelist()
    assert "pilar1_serra_2025.json" in nomes
    assert "pilar1_vitoria_2025.json" not in nomes


def test_flow_avisa_titulo_divergente_do_arquivo(tmp_path: Path) -> None:
    pasta = tmp_path / "raw"
    pasta.mkdir()
    criar_listagem_xlsx(
        pasta / "listagem_2025_1.xlsx",
        ano=2026,
        semestre=2,
        campus="Serra",
        linhas=[linha("1")],
    )
    saida = tmp_path / "out.zip"
    resultado = _fluxo(pasta, saida).run()
    assert resultado.codigo_saida == 0
    assert any("título" in a for a in resultado.avisos)
    assert saida.exists()


def test_flow_sem_dados_pessoais_no_pacote(tmp_path: Path) -> None:
    """Princípio IV: nenhum Nome/Matrícula/cota individual no pacote."""
    pasta = tmp_path / "raw"
    pasta.mkdir()
    criar_listagem_xlsx(
        pasta / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        campus="Serra",
        linhas=[
            linha("1234567", nome="NOME-PRIVADO-XYZ", cota="Ampla Concorrência"),
            linha(
                "7654321",
                nome="OUTRO-NOME",
                forma_ingresso="Ampla Concorrência",
                cota="Ampla Concorrência",
            ),
            # Cotista com nome distinto: é coletado em memória (match NTECPP)
            # mas jamais pode aparecer no pacote (Princípio IV).
            linha(
                "8888888",
                nome="COTISTA-SIGILOSO",
                forma_ingresso="PS - Ação Afirmativa 1 - PPI",
                cota="Aluno de Escola Pública com renda <= 1,5 SM por pessoa",
            ),
        ],
    )
    criar_listagem_xlsx(
        pasta / "listagem_2025_2.xlsx",
        ano=2025,
        semestre=2,
        campus="Serra",
        linhas=[linha("1234567", nome="NOME-PRIVADO-XYZ")],
    )
    saida = tmp_path / "out.zip"

    # Com fonte canônica (que não contém nomes coincidentes), o nome do cotista
    # é processado para o cruzamento; ainda assim não vaza para o pacote.
    resultado = _fluxo(pasta, saida, _criar_canonico_serra_2025(tmp_path)).run()
    assert resultado.codigo_saida == 0

    conteudo_zip = saida.read_bytes().decode("utf-8", errors="replace")
    for trecho in [
        "NOME-PRIVADO-XYZ",
        "OUTRO-NOME",
        "COTISTA-SIGILOSO",
        "1234567",
        "7654321",
        "8888888",
    ]:
        assert trecho not in conteudo_zip
