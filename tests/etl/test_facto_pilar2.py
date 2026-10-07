from __future__ import annotations

from datetime import date
from pathlib import Path
import tempfile

import pytest

from etl.adapters.sources.facto_csv_source import (
    FactoCsvSource,
    parse_brazilian_currency,
    parse_brazilian_date,
)
from etl.core.logic.models.facto import ProjetoFacto
from etl.core.logic.resolvers.campus_resolver import resolver_campi_facto


def test_parse_brazilian_currency() -> None:
    assert parse_brazilian_currency("1.256.355,65") == 1256355.65
    assert parse_brazilian_currency("R$ 4.782.532,05") == 4782532.05
    assert parse_brazilian_currency("500,00") == 500.00
    assert parse_brazilian_currency("0,00") == 0.0
    assert parse_brazilian_currency("") == 0.0
    assert parse_brazilian_currency(None) == 0.0


def test_parse_brazilian_date() -> None:
    assert parse_brazilian_date("30/12/2016") == date(2016, 12, 30)
    assert parse_brazilian_date("10/02/2025") == date(2025, 2, 10)
    assert parse_brazilian_date("") is None
    assert parse_brazilian_date("data_invalida") is None


def test_projeto_facto_properties() -> None:
    proj = ProjetoFacto(
        id="1",
        referencia="1 - Projeto Teste",
        coordenador="Coordenador",
        financiadora="FAPES",
        data_inicio=date(2024, 1, 1),
        data_vigencia=date(2026, 12, 31),
        data_encerramento=None,
        tipo_projeto="Pesquisa, Desenvolvimento e Inovação",
        categoria_projeto="Recurso público",
        instrumento_juridico="Convênio",
        instituicao_executora="Instituto Federal ... - Campus Serra",
        departamento="",
        processo="",
        valor_aprovado=100000.0,
        objetivo="",
        campus_slugs=("serra", "todos"),
    )

    assert proj.ano_inicio == 2024
    assert proj.eh_pdei is True
    assert proj.eh_parceria is True
    assert proj.ativo_em_ano(2024) is True
    assert proj.ativo_em_ano(2025) is True
    assert proj.ativo_em_ano(2026) is True
    assert proj.ativo_em_ano(2027) is False


def test_projeto_facto_non_pdei_exclusions() -> None:
    p_concurso = ProjetoFacto(
        id="2",
        referencia="Concurso Público",
        coordenador="",
        financiadora="IFES",
        data_inicio=date(2024, 1, 1),
        data_vigencia=date(2024, 12, 31),
        data_encerramento=None,
        tipo_projeto="Processo Seletivo",
        categoria_projeto="",
        instrumento_juridico="Contrato",
        instituicao_executora="Reitoria",
        departamento="",
        processo="",
        valor_aprovado=50000.0,
        objetivo="",
        campus_slugs=("todos",),
    )
    assert p_concurso.eh_pdei is False
    assert p_concurso.eh_parceria is False


def test_projeto_facto_blank_instrument_with_partner() -> None:
    p_blank = ProjetoFacto(
        id="3",
        referencia="IFES e MPT: Segurança nas Escolas",
        coordenador="Prof",
        financiadora="Ministério Público do Trabalho",
        data_inicio=date(2024, 1, 1),
        data_vigencia=date(2025, 12, 31),
        data_encerramento=None,
        tipo_projeto="Pesquisa, Desenvolvimento e Inovação",
        categoria_projeto="",
        instrumento_juridico="",
        instituicao_executora="Reitoria",
        departamento="",
        processo="",
        valor_aprovado=80000.0,
        objetivo="",
        campus_slugs=("todos",),
    )
    assert p_blank.eh_pdei is True
    assert p_blank.eh_parceria is True


def test_resolver_campi_facto() -> None:
    # Campus Serra
    slugs_serra = resolver_campi_facto(
        instituicao="Instituto Federal de Educação, Ciência e Tecnologia do Espirito Santo- Campus Serra",
        referencia="Projeto Automação",
        departamento="",
    )
    assert "serra" in slugs_serra
    assert "todos" in slugs_serra

    # Reitoria com CEFOR no título
    slugs_cefor = resolver_campi_facto(
        instituicao="Instituto Federal De Educação Ciencia E Tecnologia Do Espirito Santo - Reitoria",
        referencia="173 - Projeto EAD CEFOR - IFES",
        departamento="",
    )
    assert "cefor" in slugs_cefor
    assert "todos" in slugs_cefor

    # Reitoria geral
    slugs_reitoria = resolver_campi_facto(
        instituicao="Instituto Federal De Educação Ciencia E Tecnologia Do Espirito Santo - Reitoria",
        referencia="12 - Apoio e Fortalecimento do Mestrado Profissional",
        departamento="",
    )
    assert slugs_reitoria == ("todos",)

    # Instituição externa (não IFES)
    slugs_ifsp = resolver_campi_facto(
        instituicao="Instituto Federal de Educacao, Ciencia e Tecnologia de Sao Paulo - IFSP",
        referencia="Projeto São Paulo",
        departamento="",
    )
    assert slugs_ifsp == ()


def test_facto_csv_source_fallback_when_missing() -> None:
    source = FactoCsvSource(Path("/tmp/caminho_inexistente_pilar2"))
    projetos, avisos = source.extract()
    assert projetos == []
    assert any("AVISO" in a for a in avisos)


def test_facto_csv_source_parses_real_csv_if_present() -> None:
    real_path = Path("data/raw/pilar2")
    if not (real_path / "projetos.csv").exists():
        pytest.skip("data/raw/pilar2/projetos.csv ausente")

    source = FactoCsvSource(real_path)
    projetos, avisos = source.extract()
    assert len(projetos) >= 70
    assert any("serra" in p.campus_slugs for p in projetos)


def test_calcular_pipdi_filtering() -> None:
    from etl.core.logic.calculators.pillar2 import calcular_pilar2

    projetos = [
        # Ativo em 2024 e 2025 para Serra (PDeI)
        ProjetoFacto(
            id="101",
            referencia="Projeto Serra PDeI",
            coordenador="Coord 1",
            financiadora="FAPES",
            data_inicio=date(2024, 1, 1),
            data_vigencia=date(2025, 12, 31),
            data_encerramento=None,
            tipo_projeto="Pesquisa, Desenvolvimento e Inovação",
            categoria_projeto="Público",
            instrumento_juridico="Convênio",
            instituicao_executora="Campus Serra",
            departamento="",
            processo="",
            valor_aprovado=100000.0,
            objetivo="",
            campus_slugs=("serra", "todos"),
        ),
        # Ativo apenas em 2024 para Vitória (PDeI)
        ProjetoFacto(
            id="102",
            referencia="Projeto Vitoria PDeI",
            coordenador="Coord 2",
            financiadora="Empresa X",
            data_inicio=date(2024, 6, 1),
            data_vigencia=date(2024, 12, 31),
            data_encerramento=None,
            tipo_projeto="Inovação",
            categoria_projeto="Privado",
            instrumento_juridico="Acordo de Parceria",
            instituicao_executora="Campus Vitória",
            departamento="",
            processo="",
            valor_aprovado=50000.0,
            objetivo="",
            campus_slugs=("vitoria", "todos"),
        ),
        # Não é PDeI (Processo Seletivo) - deve ser ignorado
        ProjetoFacto(
            id="103",
            referencia="Vestibular",
            coordenador="Coord 3",
            financiadora="IFES",
            data_inicio=date(2024, 1, 1),
            data_vigencia=date(2026, 12, 31),
            data_encerramento=None,
            tipo_projeto="Processo Seletivo",
            categoria_projeto="",
            instrumento_juridico="Contrato",
            instituicao_executora="Reitoria",
            departamento="",
            processo="",
            valor_aprovado=20000.0,
            objetivo="",
            campus_slugs=("todos",),
        ),
    ]

    # Teste Serra 2024
    p2_serra_2024 = calcular_pilar2(projetos=projetos, campus_slug="serra", ano=2024)
    assert p2_serra_2024.nappct_acordos_parceria_firmados == 1
    assert p2_serra_2024.total_acumulado_pipdi == 1

    # Teste Serra 2025
    p2_serra_2025 = calcular_pilar2(projetos=projetos, campus_slug="serra", ano=2025)
    assert p2_serra_2025.nappct_acordos_parceria_firmados == 1

    # Teste Serra 2026 (expirado)
    p2_serra_2026 = calcular_pilar2(projetos=projetos, campus_slug="serra", ano=2026)
    assert p2_serra_2026.nappct_acordos_parceria_firmados == 0

    # Teste Vitoria 2025 (expirado em 2024)
    p2_vitoria_2025 = calcular_pilar2(projetos=projetos, campus_slug="vitoria", ano=2025)
    assert p2_vitoria_2025.nappct_acordos_parceria_firmados == 0

    # Teste Todos 2024 (Serra + Vitória)
    p2_todos_2024 = calcular_pilar2(projetos=projetos, campus_slug="todos", ano=2024)
    assert p2_todos_2024.nappct_acordos_parceria_firmados == 2


def test_pipdi_schema_validation() -> None:
    import json
    from etl.adapters.sinks.json_pilar_sink import _montar_pilar2
    from etl.adapters.sinks.zip_indicadores_sink import (
        RegistroPilarJson,
        validar_arquivos_pilar,
    )
    from etl.core.logic.models import AgregadosCampus, AgregadosPilar2

    p2 = AgregadosPilar2(
        tafppi_valor_total_aporte_pesquisa=150000.0,
        occ_valor_orcamento_total_capital_custeio=None,
        percentual_calculado_pinv=None,
        nappct_acordos_parceria_firmados=3,
        total_acumulado_pipdi=3,
    )
    agregados = AgregadosCampus(campus_nome="Serra", pilar2=p2)
    payload = _montar_pilar2(agregados, 2025)

    assert payload["campus"] == "Serra"
    assert payload["ano_referencia"] == 2025
    assert payload["pilar"] == "Fomento e Conexao com o Ecossistema"
    assert "PINV" in payload["indicadores"]
    assert "PIPDI" in payload["indicadores"]
    pipdi = payload["indicadores"]["PIPDI"]
    assert pipdi["NAPPCT_acordos_parceria_firmados"] == 3
    assert pipdi["total_acumulado_PIPDI"] == 3

    reg = RegistroPilarJson(
        nome="pilar2_serra_2025.json",
        conteudo=json.dumps(payload),
    )
    validar_arquivos_pilar([reg])


def test_tafppi_aggregation_start_year() -> None:
    from etl.core.logic.calculators.pillar2 import calcular_pilar2

    projetos = [
        # Serra 2024: PDeI, 120.000,50
        ProjetoFacto(
            id="201",
            referencia="Proj 1",
            coordenador="C1",
            financiadora="FAPES",
            data_inicio=date(2024, 3, 1),
            data_vigencia=date(2026, 12, 31),
            data_encerramento=None,
            tipo_projeto="Pesquisa Aplicada",
            categoria_projeto="",
            instrumento_juridico="Convênio",
            instituicao_executora="Campus Serra",
            departamento="",
            processo="",
            valor_aprovado=120000.50,
            objetivo="",
            campus_slugs=("serra", "todos"),
        ),
        # Serra 2024: PDeI, 80.000,00
        ProjetoFacto(
            id="202",
            referencia="Proj 2",
            coordenador="C2",
            financiadora="CNPq",
            data_inicio=date(2024, 5, 1),
            data_vigencia=date(2025, 12, 31),
            data_encerramento=None,
            tipo_projeto="Desenvolvimento e Inovação",
            categoria_projeto="",
            instrumento_juridico="Acordo",
            instituicao_executora="Campus Serra",
            departamento="",
            processo="",
            valor_aprovado=80000.0,
            objetivo="",
            campus_slugs=("serra", "todos"),
        ),
        # Serra 2024: Concurso Público (não PDeI), 50.000,00 -> Ignorar
        ProjetoFacto(
            id="203",
            referencia="Proj 3",
            coordenador="C3",
            financiadora="MEC",
            data_inicio=date(2024, 1, 1),
            data_vigencia=date(2024, 12, 31),
            data_encerramento=None,
            tipo_projeto="Concurso Público",
            categoria_projeto="",
            instrumento_juridico="Contrato",
            instituicao_executora="Campus Serra",
            departamento="",
            processo="",
            valor_aprovado=50000.0,
            objetivo="",
            campus_slugs=("serra", "todos"),
        ),
        # Vitória 2025: PDeI, 30.000,00
        ProjetoFacto(
            id="204",
            referencia="Proj 4",
            coordenador="C4",
            financiadora="Empresa Privada",
            data_inicio=date(2025, 2, 1),
            data_vigencia=date(2025, 12, 31),
            data_encerramento=None,
            tipo_projeto="Inovação Tecnológica",
            categoria_projeto="",
            instrumento_juridico="Termo de Cooperação",
            instituicao_executora="Campus Vitória",
            departamento="",
            processo="",
            valor_aprovado=30000.0,
            objetivo="",
            campus_slugs=("vitoria", "todos"),
        ),
    ]

    # Serra 2024: soma dos 2 projetos PDeI iniciados em 2024
    p2_serra_2024 = calcular_pilar2(projetos=projetos, campus_slug="serra", ano=2024)
    assert p2_serra_2024.tafppi_valor_total_aporte_pesquisa == 200000.50

    # Serra 2025: nenhum projeto iniciado em 2025 -> None (dado indisponível)
    p2_serra_2025 = calcular_pilar2(projetos=projetos, campus_slug="serra", ano=2025)
    assert p2_serra_2025.tafppi_valor_total_aporte_pesquisa is None

    # Vitória 2024: nenhum projeto -> None
    p2_vitoria_2024 = calcular_pilar2(projetos=projetos, campus_slug="vitoria", ano=2024)
    assert p2_vitoria_2024.tafppi_valor_total_aporte_pesquisa is None

    # Vitória 2025: 30.000,00
    p2_vitoria_2025 = calcular_pilar2(projetos=projetos, campus_slug="vitoria", ano=2025)
    assert p2_vitoria_2025.tafppi_valor_total_aporte_pesquisa == 30000.0

    # Todos 2024: 200.000,50
    p2_todos_2024 = calcular_pilar2(projetos=projetos, campus_slug="todos", ano=2024)
    assert p2_todos_2024.tafppi_valor_total_aporte_pesquisa == 200000.50

    # Todos 2025: 30.000,00
    p2_todos_2025 = calcular_pilar2(projetos=projetos, campus_slug="todos", ano=2025)
    assert p2_todos_2025.tafppi_valor_total_aporte_pesquisa == 30000.0

    # Todos 2026: nenhum projeto iniciado -> None
    p2_todos_2026 = calcular_pilar2(projetos=projetos, campus_slug="todos", ano=2026)
    assert p2_todos_2026.tafppi_valor_total_aporte_pesquisa is None


def test_tafppi_occ_pinv_strictly_null() -> None:
    from etl.adapters.sinks.json_pilar_sink import _montar_pilar2
    from etl.adapters.sinks.zip_indicadores_sink import (
        RegistroPilarJson,
        validar_arquivos_pilar,
    )
    from etl.core.logic.calculators.pillar2 import calcular_pilar2
    from etl.core.logic.models import AgregadosCampus

    p2 = calcular_pilar2(projetos=[], campus_slug="serra", ano=2024)
    assert p2.occ_valor_orcamento_total_capital_custeio is None
    assert p2.percentual_calculado_pinv is None

    agregados = AgregadosCampus(campus_nome="Serra", pilar2=p2)
    payload = _montar_pilar2(agregados, 2024)
    pinv = payload["indicadores"]["PINV"]
    assert pinv["OCC_valor_orcamento_total_capital_custeio"] is None
    assert pinv["percentual_calculado_PINV"] is None

    # Validação do pacote no sink
    import json

    reg = RegistroPilarJson(
        nome="pilar2_serra_2024.json",
        conteudo=json.dumps(payload),
    )
    validar_arquivos_pilar([reg])


def test_indicadores_flow_with_missing_facto_dir(tmp_path: Path) -> None:
    from etl.adapters.sinks.zip_indicadores_sink import ZipIndicadoresSink
    from etl.adapters.sources.facto_csv_source import FactoCsvSource
    from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
    from etl.flows.indicadores_flow import IndicadoresFlow
    from tests.etl.conftest import criar_zip_canonico_fake

    caminho_entrada = tmp_path / "exports_canonical.zip"
    caminho_saida = tmp_path / "indicadores.zip"
    dados = {
        "campuses_canonical.json": [{"id": 1, "name": "Serra"}],
        "initiatives_canonical.json": [],
        "researchers_canonical.json": [],
        "students_canonical.json": [],
        "articles_canonical.json": [],
        "productions_canonical.json": [],
        "production_authors_canonical.json": [],
        "production_types_canonical.json": [],
    }
    criar_zip_canonico_fake(caminho_entrada, dados)

    missing_facto = FactoCsvSource(tmp_path / "caminho_inexistente_pilar2")
    flow = IndicadoresFlow(
        source=ZipCanonicalSource(caminho_entrada),
        sink=ZipIndicadoresSink(caminho_saida),
        anos=[2024],
        facto_source=missing_facto,
    )
    resultado = flow.run()
    assert resultado.codigo_saida == 0
    assert any("AVISO" in a for a in resultado.avisos)


def test_indicadores_flow_with_facto_source(tmp_path: Path) -> None:
    import json
    import zipfile
    from etl.adapters.sinks.zip_indicadores_sink import ZipIndicadoresSink
    from etl.adapters.sources.facto_csv_source import FactoCsvSource
    from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
    from etl.flows.indicadores_flow import IndicadoresFlow
    from tests.etl.conftest import criar_zip_canonico_fake

    caminho_entrada = tmp_path / "exports_canonical.zip"
    caminho_saida = tmp_path / "indicadores.zip"
    dados = {
        "campuses_canonical.json": [{"id": 1, "name": "Serra"}],
        "initiatives_canonical.json": [],
        "researchers_canonical.json": [],
        "students_canonical.json": [],
        "articles_canonical.json": [],
        "productions_canonical.json": [],
        "production_authors_canonical.json": [],
        "production_types_canonical.json": [],
    }
    criar_zip_canonico_fake(caminho_entrada, dados)

    facto_dir = tmp_path / "facto_raw"
    facto_dir.mkdir()
    csv_content = (
        "id;Referência do projeto;Coordenador;Financiadora;Data de início;Data de vigência;Data de encerramento;Tipo de Projeto;Categoria de Projeto;Instrumento Jurídico;Instituição executora;Departamento;Processo e sub-processo;Valor aprovado;Objetivo / Objeto / Título\n"
        '101;"Projeto Robótica Serra";"Prof A";"FAPES";"01/01/2024";"31/12/2024";;"Pesquisa Aplicada";"Público";"Convênio";"Instituto Federal de Educação, Ciência e Tecnologia do Espirito Santo- Campus Serra";"";"";"150.000,00";"Obj"\n'
    )
    (facto_dir / "projetos.csv").write_text(csv_content, encoding="utf-8")


    flow = IndicadoresFlow(
        source=ZipCanonicalSource(caminho_entrada),
        sink=ZipIndicadoresSink(caminho_saida),
        anos=[2024],
        facto_source=FactoCsvSource(facto_dir),
    )
    resultado = flow.run()
    assert resultado.codigo_saida == 0

    with zipfile.ZipFile(caminho_saida) as zf:
        conteudo = json.loads(zf.read("pilar2_serra_2024.json").decode("utf-8"))
        pipdi = conteudo["indicadores"]["PIPDI"]
        pinv = conteudo["indicadores"]["PINV"]
        assert pipdi["NAPPCT_acordos_parceria_firmados"] == 1
        assert pipdi["total_acumulado_PIPDI"] == 1
        assert pinv["TAFPPI_valor_total_aporte_pesquisa"] == 150000.0
        assert pinv["OCC_valor_orcamento_total_capital_custeio"] is None
        assert pinv["percentual_calculado_PINV"] is None



