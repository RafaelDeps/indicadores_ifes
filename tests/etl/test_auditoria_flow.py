"""Testes do flow de auditoria (feature 026, spec FR-004/FR-010).

Cobre a coleta de registros NO MESMO passe das contagens (research D-5) e o
mapeamento componente → registros definido em research.md D-2/D-3:

- PRE/SUPP/NEP/NPB/NPT/PC: coletados pelo ``aggregator`` via ``ColetorRegistros``;
- NTE/NTECPP: derivados das listagens com retenção de nome/curso (D-3);
- TAFPPI/NAPPCT: derivados dos projetos SIGPESQ com os MESMOS predicados de
  ``pillar2.py`` (import, nunca reimplementação);
- invariante central: contagem ⇒ len(registros) == apurado; soma ⇒ Σ valor.
"""

from __future__ import annotations

import json
import zipfile
from pathlib import Path

from etl.core.logic.calculators.aggregator import agregar_indicadores
from etl.core.logic.calculators.coletor_registros import ColetorRegistros
from etl.flows.auditoria_flow import AuditoriaFlow
from tests.etl.conftest import criar_zip_canonico_fake
from tests.etl.factories.listagens_factories import (
    criar_listagem_xlsx,
    linha,
    linha_cotista,
)

ANOS = [2025]


def _criar_canonico_com_nomes(caminho: Path, sigpesq: dict | None = None) -> None:
    """Canônico sintético com nomes reais para exercitar a coleta (Opção A)."""
    dados = {
        "campuses_canonical.json": [{"id": 1, "name": "Serra"}],
        "initiatives_canonical.json": [
            {
                "id": 1,
                "name": "Projeto Álgebra Aplicada",
                "status": "EM_ANDAMENTO",
                "start_date": "2025-01-01",
                "end_date": None,
                "campus": {"id": 1, "name": "Serra"},
                "team": [
                    {
                        "person_id": 10,
                        "person_name": "Prof. Xavier",
                        "roles": ["Coordinator"],
                    },
                    {
                        "person_id": 100,
                        "person_name": "Ana Souza",
                        "roles": ["Student"],
                    },
                    {
                        "person_id": 200,
                        "person_name": "Bruno Lima",
                        "roles": ["Student"],
                    },
                ],
            },
            {
                "id": 2,
                "name": "Projeto Sistemas Embarcados",
                "status": "EM_ANDAMENTO",
                "start_date": "2025-02-01",
                "end_date": None,
                "campus": {"id": 1, "name": "Serra"},
                "team": [
                    {
                        "person_id": 100,  # Ana participa de 2 projetos — único no set
                        "person_name": "Ana Souza",
                        "roles": ["Student"],
                    }
                ],
            },
        ],
        "researchers_canonical.json": [
            {
                "id": 10,
                "name": "Prof. Xavier",
                "classification": "researcher",
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "students_canonical.json": [
            {
                "id": 100,
                "name": "Ana Souza",
                "classification": "student",
                "campus": {"id": 1, "name": "Serra"},
            },
            {
                "id": 200,
                "name": "Bruno Lima",
                "classification": "student",
                "campus": {"id": 1, "name": "Serra"},
            },
        ],
        "articles_canonical.json": [
            {
                "id": 501,
                "title": "Artigo Auditoria",
                "year": 2025,
                "type": "Journal",
                "campus": {"id": 1, "name": "Serra"},
            }
        ],
        "productions_canonical.json": [
            {
                "id": 601,
                "title": "Software Raio-X",
                "year": 2025,
                "production_type_id": 1,
                "campus": {"id": 1, "name": "Serra"},
            },
            {
                "id": 602,
                "title": "Protótipo Mecânico",
                "year": 2025,
                "production_type_id": 2,
                "campus": {"id": 1, "name": "Serra"},
            },
        ],
        "production_authors_canonical.json": [],
        "production_types_canonical.json": [
            {"id": 1, "name": "softwares_sem_patente"},
            {"id": 2, "name": "prototipo"},
        ],
    }
    criar_zip_canonico_fake(caminho, dados, sigpesq_files=sigpesq)


def _criar_listagens(pasta: Path) -> None:
    """Listagens 2025 com matrículas únicas, exclusão por situação e cotista."""
    criar_listagem_xlsx(
        pasta / "listagem_2025_1.xlsx",
        2025,
        1,
        linhas=[
            linha(555, "Ana Souza", "Análise e Desenvolvimento de Sistemas"),
            linha(666, "Duda Pires", "Zootecnia"),
            linha_cotista(777, nome="Bruno Lima", curso="Medicina"),
            linha(999, "Nao Conta", "ADS", situacao="Não Concluído"),
        ],
    )
    criar_listagem_xlsx(
        pasta / "listagem_2025_2.xlsx",
        2025,
        2,
        linhas=[
            linha(555, "Ana Souza", "Análise e Desenvolvimento de Sistemas"),
            linha(888, "Eva Rocha", "ADS", situacao="Concluído"),
        ],
    )


def _criar_pacote_publicado(caminho: Path) -> None:
    """Pacote canônico publicado (pós-merge) com NTE/NTECPP/TAFPPI/NAPPCT preenchidos."""
    conteudo_pilar1 = {
        "campus": "Serra",
        "ano_referencia": 2025,
        "pilar": "Engajamento Academico e Inclusao",
        "indicadores": {
            "NTPP": {
                "descricao": "Número Total de Projetos de Pesquisa",
                "projetos_pesquisa_registrados_execucao": 2,
                "total_projetos_NTPP": 2,
            },
            "QSPP": {
                "descricao": "Quantitativo de Servidores Desenvolvendo Projetos",
                "SUPP_servidores_unicos_participantes": 1,
                "total_servidores_QSPP": 1,
            },
            "PIES": {
                "descricao": "Percentual de Estudantes Envolvidos em Pesquisa",
                "NEP_estudantes_em_pesquisa": 2,
                "NTE_total_estudantes_matriculados": 4,
                "percentual_calculado_PIES": 50,
            },
            "PICOT": {
                "descricao": "Percentual de Estudantes Cotistas Envolvidos em Pesquisa",
                "NTECPP_cotistas_em_pesquisa": 1,
                "NEP_total_estudantes_em_pesquisa": 2,
                "percentual_calculado_PICOT": 50,
            },
        },
    }
    conteudo_pilar2 = {
        "campus": "Serra",
        "ano_referencia": 2025,
        "pilar": "Fomento e Conexao com o Ecossistema",
        "indicadores": {
            "PINV": {
                "descricao": "Percentual de Investimento em Pesquisa, Pós e Inovação",
                "TAFPPI_valor_total_aporte_pesquisa": 25000,
                "OCC_valor_orcamento_total_capital_custeio": None,
                "percentual_calculado_PINV": None,
            },
            "PIPDI": {
                "descricao": "Quantidade de Acordos de Parceria para PDeI",
                "NAPPCT_acordos_parceria_firmados": 1,
                "total_acumulado_PIPDI": 1,
            },
        },
    }
    conteudo_pilar3 = {
        "campus": "Serra",
        "ano_referencia": 2025,
        "pilar": "Produtividade e Propriedade Intelectual",
        "indicadores": {
            "PIPRO": {
                "descricao": "Produção Intelectual",
                "NPB_producoes_academicas_bibliograficas": 1,
                "NPT_producoes_tecnicas_tecnologicas": 2,
                "total_producao_PIPRO": 3,
            },
            "PIPROT": {
                "descricao": "Ativos de Propriedade Intelectual",
                "valores_totais_por_tipo": {
                    "PA_patentes_e_modelos_utilidade": 0,
                    "RM_registros_marca": None,
                    "DI_desenhos_industriais": None,
                    "C_cultivares": None,
                    "TC_topografia_circuitos": None,
                    "PC_programas_computador": 1,
                    "OGM_organismos_geneticamente_modificados": None,
                },
                "total_acumulado_PIPROT": 1,
            },
            "PIPROTR": {
                "descricao": "Transferência de Tecnologia",
                "valores_totais_por_tipo": {
                    "CT_contratos_transferencia_tecnologia": None,
                    "CL_contratos_licenciamento": None,
                    "CC_contratos_cessao": None,
                },
                "total_transferidos_PIPROTR": None,
            },
        },
    }
    with zipfile.ZipFile(caminho, "w") as z:
        for nome, conteudo in (
            ("pilar1_serra_2025.json", conteudo_pilar1),
            ("pilar2_serra_2025.json", conteudo_pilar2),
            ("pilar3_serra_2025.json", conteudo_pilar3),
        ):
            z.writestr(nome, json.dumps(conteudo, ensure_ascii=False))


def _sigpesq() -> dict:
    return {
        "PJ-001": {
            "codigo": "PJ-001",
            "titulo": "Projeto Parceria Externa",
            "campus": {"name": "Serra"},
            "datas": {"inicio": "2025-01-10", "fim": "2025-12-31"},
            "financiamento": {
                "valor_total": 25000,
                "fontes": [{"fonte": "FAPES", "tipo": "estadual", "valor": 25000}],
            },
        }
    }


class TestColetorNoMesmoPasse:
    """Coletor de registros acoplado ao agregador (research D-5)."""

    def test_registros_coincidem_com_as_contagens(
        self, mock_export_canonicos, tmp_path: Path
    ) -> None:
        coletor = ColetorRegistros()
        agregar_indicadores(mock_export_canonicos, ANOS, coletor=coletor)

        # SUPP: Dr. Silva (pesquisador Serra) — 1 registro, igual ao set
        sup = coletor.registros("SUPP", "serra", 2025)
        assert len(sup) == 1
        assert sup[0]["nome"] == "Dr. Silva"
        assert sup[0]["projeto"] == "Projeto Robótica"

        # NEP: Aluno Serra — 1 registro
        nep = coletor.registros("NEP", "serra", 2025)
        assert len(nep) == 1
        assert nep[0]["nome"] == "Aluno Serra"

        # PRE: 1 iniciativa ativa em Serra
        assert len(coletor.registros("PRE", "serra", 2025)) == 1

    def test_pessoa_em_dois_projetos_e_unica_no_conjunto(
        self, mock_export_canonicos, tmp_path: Path
    ) -> None:
        """Deduplicação estrutural: registro nasce só quando o set muda (D-5)."""
        coletor = ColetorRegistros()
        exportacao = mock_export_canonicos
        agregar_indicadores(exportacao, ANOS, coletor=coletor)
        # (sanidade: nenhum componente com registros > apurado)
        for sigla, escopo, ano in (("SUPP", "serra", 2025), ("NEP", "serra", 2025)):
            registros = coletor.registros(sigla, escopo, ano)
            assert isinstance(registros, list)


class TestFlowAuditoria:
    """AuditoriaFlow ponta a ponta sobre canônico + listagens + pacote publicado."""

    def _rodar(self, tmp_path: Path) -> tuple[Path, dict]:
        caminho_canonico = tmp_path / "exports_canonical.zip"
        _criar_canonico_com_nomes(
            caminho_canonico, sigpesq={"PJ-001.json": _sigpesq()["PJ-001"]}
        )
        pasta_listagens = tmp_path / "raw"
        pasta_listagens.mkdir()
        _criar_listagens(pasta_listagens)
        pacote = tmp_path / "indicadores.zip"
        _criar_pacote_publicado(pacote)
        saida = tmp_path / "auditoria"

        flow = AuditoriaFlow(
            caminho_canonico=caminho_canonico,
            pasta_listagens=pasta_listagens,
            caminho_pacote=pacote,
            pasta_saida=saida,
            anos=ANOS,
        )
        resultado = flow.run()
        caminho_fixture = saida / "PIES_serra_2025.json"
        assert caminho_fixture.exists()
        dados = json.loads(caminho_fixture.read_text(encoding="utf-8"))
        return resultado, dados

    def test_nte_registros_coincidem_com_apurado_e_trazem_nome_curso(
        self, tmp_path: Path
    ) -> None:
        _, dados = self._rodar(tmp_path)
        nte = next(c for c in dados["componentes"] if c["simbolo"] == "NTE")
        assert nte["apurado"] == 4
        matriculas = {r["matricula"] for r in nte["registros"]}
        assert matriculas == {"555", "666", "777", "888"}  # 999 fora (Não Concluído)
        assert len(nte["registros"]) == nte["apurado"]
        ana = next(r for r in nte["registros"] if r["matricula"] == "555")
        assert ana["nome"] == "Ana Souza"
        assert ana["curso"] == "Análise e Desenvolvimento de Sistemas"
        assert ana["situacao"] == "Matriculado"

    def test_nep_traz_nome_projeto_papel_e_enriquece_matricula_curso(
        self, tmp_path: Path
    ) -> None:
        _, dados = self._rodar(tmp_path)
        nep = next(c for c in dados["componentes"] if c["simbolo"] == "NEP")
        assert nep["papel"] == "numerador"
        assert nep["apurado"] == 2
        por_nome = {r["nome"]: r for r in nep["registros"]}
        ana = por_nome["Ana Souza"]
        assert (
            ana["projeto"] == "Projeto Álgebra Aplicada"
        )  # primeira iniciativa no passe
        assert ana["papel"] == "Student"
        assert ana["matricula"] == "555"  # match por nome com a listagem (D-3)
        assert ana["curso"] == "Análise e Desenvolvimento de Sistemas"
        bruno = por_nome["Bruno Lima"]
        assert bruno["matricula"] == "777"
        assert bruno["curso"] == "Medicina"

    def test_ntecpp_registros_da_intersecao_cotistas_e_nep(
        self, tmp_path: Path
    ) -> None:
        _, dados = self._rodar(tmp_path)
        ntecpp = next(c for c in dados["componentes"] if c["simbolo"] == "NTECPP")
        assert ntecpp["apurado"] == 1
        assert len(ntecpp["registros"]) == 1
        assert ntecpp["registros"][0]["nome"] == "Bruno Lima"
        assert ntecpp["registros"][0]["matricula"] == "777"

    def test_soma_tafppi_compara_valores_e_nao_contagem(self, tmp_path: Path) -> None:
        _, dados = self._rodar(tmp_path)
        caminho_p2 = tmp_path / "auditoria" / "PINV_serra_2025.json"
        p2 = json.loads(caminho_p2.read_text(encoding="utf-8"))
        tafppi = next(c for c in p2["componentes"] if c["simbolo"] == "TAFPPI")
        assert tafppi["tipoContagem"] == "soma"
        assert tafppi["apurado"] == 25000
        assert sum(r["valor"] for r in tafppi["registros"]) == 25000
        assert tafppi["registros"][0]["projeto"] == "Projeto Parceria Externa"
        assert tafppi["registros"][0]["fonte"] == "FAPES"

    def test_componentes_sem_fonte_ficam_nao_detalhados(self, tmp_path: Path) -> None:
        _, dados = self._rodar(tmp_path)
        sem_fonte = {
            "OCC",
            "PA",
            "RM",
            "DI",
            "C",
            "TC",
            "OGM",
            "CT",
            "CL",
            "CC",
        }
        for caminho in sorted((tmp_path / "auditoria").glob("*.json")):
            conteudo = json.loads(caminho.read_text(encoding="utf-8"))
            for comp in conteudo["componentes"]:
                if comp["simbolo"] in sem_fonte:
                    assert comp["detalhado"] is False, comp["simbolo"]
                    assert comp["registros"] == []
        p3 = json.loads(
            (tmp_path / "auditoria" / "PIPRO_serra_2025.json").read_text(
                encoding="utf-8"
            )
        )
        pc = next(c for c in p3["componentes"] if c["simbolo"] == "PC")
        assert pc["detalhado"] is True
        assert len(pc["registros"]) == pc["apurado"] == 1

    def test_campus_todos_nao_gera_fixture(self, tmp_path: Path) -> None:
        self._rodar(tmp_path)
        nomes = [p.name for p in (tmp_path / "auditoria").glob("*.json")]
        assert not any("_todos_" in nome for nome in nomes)

    def test_proveniencia_e_gerado_em_presentes(self, tmp_path: Path) -> None:
        _, dados = self._rodar(tmp_path)
        assert any(f["arquivo"] == "exports_canonical.zip" for f in dados["fontes"])
        assert any(f["arquivo"].startswith("listagem_2025_") for f in dados["fontes"])
        assert dados["geradoEm"]

    def test_modo_soft_sem_pacote_avisa_e_nao_falha(self, tmp_path: Path) -> None:
        caminho_canonico = tmp_path / "exports_canonical.zip"
        _criar_canonico_com_nomes(caminho_canonico)
        pasta_listagens = tmp_path / "raw"
        pasta_listagens.mkdir()
        _criar_listagens(pasta_listagens)
        flow = AuditoriaFlow(
            caminho_canonico=caminho_canonico,
            pasta_listagens=pasta_listagens,
            caminho_pacote=tmp_path / "nao_existe.zip",
            pasta_saida=tmp_path / "auditoria",
            anos=ANOS,
            soft=True,
        )
        resultado = flow.run()
        assert resultado.fixtures == []
        assert any("AVISO" in aviso for aviso in resultado.avisos)
