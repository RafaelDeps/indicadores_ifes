from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

from etl.adapters.sinks.json_pilar_sink import formatar_arquivos_pilar
from etl.adapters.sinks.zip_indicadores_sink import (
    ZipIndicadoresSink,
    validar_arquivos_pilar,
)
from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.core.logic.models import AgregadosCampus, AgregadosPilar1, RegistroPilarJson
from tests.etl.conftest import criar_zip_canonico_fake


def test_zip_canonical_source_extrai_dados(tmp_path: Path) -> None:
    caminho_zip = tmp_path / "exports_canonical.zip"
    dados = {
        "campuses_canonical.json": [{"id": 1, "name": "Serra"}],
        "initiatives_canonical.json": [
            {
                "id": 1,
                "name": "Proj",
                "status": "EM_ANDAMENTO",
                "start_date": "2025-01-01",
                "end_date": None,
                "campus": {"id": 1, "name": "Serra"},
                "team": [],
            }
        ],
        "researchers_canonical.json": [
            {
                "id": 10,
                "name": "Prof",
                "classification": "researcher",
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "students_canonical.json": [
            {
                "id": 100,
                "name": "Aluno",
                "classification": "student",
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "articles_canonical.json": [
            {
                "id": 501,
                "title": "Artigo",
                "year": 2025,
                "type": "journal",
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "productions_canonical.json": [
            {
                "id": 601,
                "title": "Prod",
                "year": 2025,
                "production_type_id": 1,
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "production_authors_canonical.json": [
            {"production_id": 601, "researcher_id": 10}
        ],
        "production_types_canonical.json": [{"id": 1, "name": "Software"}],
    }
    criar_zip_canonico_fake(caminho_zip, dados)

    source = ZipCanonicalSource(caminho_zip)
    export_canonicos = source.extract()

    assert len(export_canonicos.campi) == 1
    assert len(export_canonicos.iniciativas) == 1
    assert len(export_canonicos.pessoas) == 1
    assert len(export_canonicos.estudantes) == 1


def test_zip_canonical_source_arquivo_faltante(tmp_path: Path) -> None:
    caminho_zip = tmp_path / "incompleto.zip"
    criar_zip_canonico_fake(caminho_zip, {"campuses_canonical.json": []})

    source = ZipCanonicalSource(caminho_zip)
    with pytest.raises(ValueError, match="Arquivo canônico obrigatório ausente"):
        source.extract()


def test_json_pilar_sink_e_validacao_schema() -> None:
    agregados = AgregadosCampus(campus_nome="Serra")
    arquivos = formatar_arquivos_pilar("serra", agregados, ano=2025)

    assert len(arquivos) == 3
    nomes = [a.nome for a in arquivos]
    assert "pilar1_serra_2025.json" in nomes
    assert "pilar2_serra_2025.json" in nomes
    assert "pilar3_serra_2025.json" in nomes

    # Não deve lançar erro de validação
    validar_arquivos_pilar(arquivos)


def test_zip_indicadores_sink_gera_zip_deterministico(tmp_path: Path) -> None:
    caminho_saida = tmp_path / "indicadores.zip"
    agregados = AgregadosCampus(campus_nome="Serra")
    arquivos = formatar_arquivos_pilar("serra", agregados, ano=2025)

    sink = ZipIndicadoresSink(caminho_saida)
    sink.load(arquivos)

    assert caminho_saida.exists()
    with zipfile.ZipFile(caminho_saida) as zf:
        infolist = zf.infolist()
        assert len(infolist) == 3
        # Timestamp DOS constante 1980-01-01
        for info in infolist:
            assert info.date_time == (1980, 1, 1, 0, 0, 0)
        # Nomes ordenados
        assert [info.filename for info in infolist] == sorted(
            [info.filename for info in infolist]
        )


def _registro_pilar1_com_nte(valor_nte, valor_ntecpp=None) -> RegistroPilarJson:
    """Registro pilar1 válido para testes de validação, com NTE opcionalmente preenchido."""
    dados = {
        "campus": "Serra",
        "ano_referencia": 2025,
        "pilar": "Engajamento Academico e Inclusao",
        "indicadores": {
            "NTPP": {
                "descricao": "Numero Total de Projetos de Pesquisa",
                "projetos_pesquisa_registrados_execucao": None,
                "total_projetos_NTPP": None,
            },
            "QSPP": {
                "descricao": "Quantitativo de Servidores Desenvolvendo Projetos",
                "SUPP_servidores_unicos_participantes": None,
                "total_servidores_QSPP": None,
            },
            "PIES": {
                "descricao": "Percentual de Estudantes Envolvidos em Pesquisa",
                "NEP_estudantes_em_pesquisa": None,
                "NTE_total_estudantes_matriculados": valor_nte,
                "percentual_calculado_PIES": None,
            },
            "PICOT": {
                "descricao": "Percentual de Estudantes Cotistas Envolvidos em Pesquisa",
                "NTECPP_cotistas_em_pesquisa": valor_ntecpp,
                "NEP_total_estudantes_em_pesquisa": None,
                "percentual_calculado_PICOT": None,
            },
        },
    }
    return RegistroPilarJson(nome="pilar1_serra_2025.json", conteudo=json.dumps(dados))


def test_validar_arquivos_pilar_default_ainda_exige_nulidade() -> None:
    """Comportamento padrão preservado: NTE/NTECPP preenchidos sem autorização = violação."""
    registro = _registro_pilar1_com_nte(valor_nte=1857, valor_ntecpp=616)
    with pytest.raises(ValueError, match="deve ser null"):
        validar_arquivos_pilar([registro])


def test_validar_arquivos_pilar_aceita_campos_derivaveis_quando_informados() -> None:
    registro = _registro_pilar1_com_nte(valor_nte=1857, valor_ntecpp=616)
    derivaveis = frozenset(
        {"NTE_total_estudantes_matriculados", "NTECPP_cotistas_em_pesquisa"}
    )
    # Autorizados os 2 campos do Pilar 1 → passa
    validar_arquivos_pilar([registro], campos_derivaveis=derivaveis)


def test_validar_arquivos_pilar_derivaveis_nao_liberam_outros_nulos() -> None:
    """Campos deriváveis não devem aceitar preenchimento em campos fora da autorização."""
    registro = _registro_pilar1_com_nte(valor_nte=1857, valor_ntecpp=616)
    derivaveis = frozenset({"NTE_total_estudantes_matriculados"})
    # NTECPP autorizado só NTE → NTECPP preenchido ainda viola
    with pytest.raises(ValueError, match="deve ser null"):
        validar_arquivos_pilar([registro], campos_derivaveis=derivaveis)


def test_sink_respeita_campos_derivaveis_no_load(tmp_path: Path) -> None:
    caminho_saida = tmp_path / "indicadores.zip"
    registro = _registro_pilar1_com_nte(valor_nte=1857)

    sink_padrao = ZipIndicadoresSink(caminho_saida)
    with pytest.raises(ValueError, match="deve ser null"):
        sink_padrao.load([registro])

    derivaveis = frozenset(
        {"NTE_total_estudantes_matriculados", "NTECPP_cotistas_em_pesquisa"}
    )
    sink_listagens = ZipIndicadoresSink(caminho_saida, campos_derivaveis=derivaveis)
    sink_listagens.load([registro])
    with zipfile.ZipFile(caminho_saida) as zf:
        dados = json.loads(zf.read("pilar1_serra_2025.json"))
    assert dados["indicadores"]["PIES"]["NTE_total_estudantes_matriculados"] == 1857


def test_formatar_arquivos_pilar_serializa_nte_e_ntecpp_do_modelo() -> None:
    agregados = AgregadosCampus(
        campus_nome="Serra",
        pilar1=AgregadosPilar1(
            ntpp_projetos_pesquisa_ativos=None,
            qspp_docentes_pesquisa=None,
            nep_estudantes_pesquisa=None,
            nte_total_estudantes_matriculados=1857,
            ntecpp_cotistas_pesquisa=616,
        ),
    )
    arquivos = formatar_arquivos_pilar("serra", agregados, ano=2025)
    pilar1 = next(a for a in arquivos if a.nome == "pilar1_serra_2025.json")
    dados = json.loads(pilar1.conteudo)
    assert dados["indicadores"]["PIES"]["NTE_total_estudantes_matriculados"] == 1857
    assert dados["indicadores"]["PICOT"]["NTECPP_cotistas_em_pesquisa"] == 616
    assert (
        dados["indicadores"]["NTPP"]["projetos_pesquisa_registrados_execucao"] is None
    )
    assert dados["indicadores"]["QSPP"]["SUPP_servidores_unicos_participantes"] is None
    assert dados["indicadores"]["PIES"]["NEP_estudantes_em_pesquisa"] is None
