from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

from etl.core.logic.models import (
    Artigo,
    AutorProducao,
    Campus,
    ExportCanonicos,
    Iniciativa,
    MembroEquipe,
    Pessoa,
    Producao,
    RefCampus,
    TipoProducao,
)


@pytest.fixture
def campus_serra() -> Campus:
    return Campus(id=1, name="Serra")


@pytest.fixture
def pasta_listagens(tmp_path: Path) -> Path:
    """Diretório temporário para os arquivos de listagem dos testes."""
    pasta = tmp_path / "listagens"
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


@pytest.fixture
def dir_raw_vazio(tmp_path: Path) -> Path:
    """Diretório de entrada sem nenhuma planilha de listagem (modo soft)."""
    pasta = tmp_path / "raw_vazio"
    pasta.mkdir(parents=True, exist_ok=True)
    return pasta


@pytest.fixture
def zip_existente(tmp_path: Path) -> Path:
    """Zip de saída pré-criado com conteúdo conhecido (comparação sha256)."""
    caminho = tmp_path / "pacote_existente.zip"
    caminho.write_bytes(b"conteudo-conhecido-011-do-teste")
    return caminho


@pytest.fixture
def canonical_ausente(tmp_path: Path) -> Path:
    """Caminho em tmp que NÃO contém exports_canonical.zip."""
    return tmp_path / "nao_existe" / "exports_canonical.zip"


@pytest.fixture
def campus_vitoria() -> Campus:
    return Campus(id=2, name="Vitória")


@pytest.fixture
def ref_serra() -> RefCampus:
    return RefCampus(id=1, name="Serra")


@pytest.fixture
def ref_vitoria() -> RefCampus:
    return RefCampus(id=2, name="Vitória")


@pytest.fixture
def mock_export_canonicos(
    ref_serra: RefCampus, ref_vitoria: RefCampus
) -> ExportCanonicos:
    return ExportCanonicos(
        campi=[Campus(id=1, name="Serra"), Campus(id=2, name="Vitória")],
        pessoas=[
            Pessoa(
                id=10, name="Dr. Silva", classification="researcher", campus=ref_serra
            ),
            Pessoa(
                id=20,
                name="Dra. Santos",
                classification="researcher",
                campus=ref_vitoria,
            ),
        ],
        estudantes=[
            Pessoa(
                id=100, name="Aluno Serra", classification="student", campus=ref_serra
            ),
            Pessoa(
                id=10, name="Silva Aluno", classification="student", campus=ref_serra
            ),  # colisão com pesquisador 10
        ],
        iniciativas=[
            Iniciativa(
                id=1,
                name="Projeto Robótica",
                status="EM_ANDAMENTO",
                start_date="2024-01-15",
                end_date="2026-12-31",
                campus=ref_serra,
                team=[
                    MembroEquipe(
                        person_id=10, person_name="Dr. Silva", roles=["Coordenador"]
                    ),
                    MembroEquipe(
                        person_id=100, person_name="Aluno Serra", roles=["Student"]
                    ),
                ],
            ),
            Iniciativa(
                id=2,
                name="Projeto IA",
                status="EM_ANDAMENTO",
                start_date="2025-06-01",
                end_date=None,
                campus=None,  # resolvível via coordenador
                team=[
                    MembroEquipe(
                        person_id=20, person_name="Dra. Santos", roles=["Coordenador"]
                    ),
                ],
            ),
        ],
        artigos=[
            Artigo(id=501, title="Artigo Robótica", year=2025, campus=ref_serra),
            Artigo(id=502, title="Artigo IA", year=2026, campus=ref_vitoria),
        ],
        producoes=[
            Producao(
                id=601,
                title="Software Robô",
                year=2025,
                production_type_id=1,
                campus=ref_serra,
            ),
            Producao(
                id=602,
                title="Protótipo Mecânico",
                year=2026,
                production_type_id=2,
                campus=ref_vitoria,
            ),
        ],
        autores_producao=[
            AutorProducao(production_id=601, researcher_id=10),
            AutorProducao(production_id=602, researcher_id=20),
        ],
        tipos_producao=[
            TipoProducao(id=1, name="Programa de Computador"),
            TipoProducao(id=2, name="Protótipo"),
        ],
    )


def criar_zip_canonico_fake(
    caminho_zip: Path,
    dados: dict[str, list[dict]],
    sigpesq_files: dict[str, dict] | None = None,
) -> None:
    """Utilitário de teste para criar um exports_canonical.zip sintético."""
    caminho_zip.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(caminho_zip, "w") as z:
        for nome_arquivo, registros in dados.items():
            z.writestr(
                nome_arquivo, json.dumps(registros, ensure_ascii=False, indent=2)
            )
        if sigpesq_files:
            for nome_arquivo, conteudo in sigpesq_files.items():
                z.writestr(
                    nome_arquivo, json.dumps(conteudo, ensure_ascii=False, indent=2)
                )


@pytest.fixture
def mock_pinv_serra_dict() -> dict:
    """Dados sintéticos para teste do leitor de PINV por campus."""
    return {
        "indicador": "PINV",
        "nome": "Percentual de Investimento em Pesquisa, Pós e Inovação",
        "pilar": 2,
        "campus": "Serra",
        "campus_slug": "serra",
        "unidade": "%",
        "valores_por_ano": {
            "2024": 496.78,
            "2025": 1111.35,
            "2026": 610.63,
        },
    }


@pytest.fixture
def mock_sigpesq_projetos_dict() -> dict[str, dict]:
    """Dados sintéticos de projetos de pesquisa do SIGPESQ para testes de Pilar 2."""
    return {
        "project_sigpesq_files_json/PJ_7875.json": {
            "codigo": "PJ 7875",
            "titulo": "Definição de Processo de Desenvolvimento de Software ConectaFAPES",
            "coordenador": {
                "nome": "Paulo Sérgio dos Santos Júnior",
                "campus": "Serra",
            },
            "datas": {"inicio": "2024-03-01", "fim": "2025-12-31"},
            "financiamento": {
                "valor_total": 5898620.0,
                "moeda": "BRL",
                "fontes": [
                    {
                        "fonte": "FAPES",
                        "valor": 5898620.0,
                        "tipo": "Contrato de Projeto",
                    }
                ],
            },
        },
        "project_sigpesq_files_json/PJ_9793.json": {
            "codigo": "PJ 9793",
            "titulo": "Metodologia Integrada ArcelorMittal",
            "coordenador": {
                "nome": "Dirceu Soares Júnior",
                "campus": "Ifes – Campus Serra",
            },
            "datas": {"inicio": "2024-06-01", "fim": "2025-05-31"},
            "financiamento": {
                "valor_total": 269855.28,
                "moeda": "BRL",
                "fontes": [
                    {
                        "fonte": "ArcelorMittal",
                        "valor": 269855.28,
                        "tipo": "Acordo",
                    }
                ],
            },
        },
        "project_sigpesq_files_json/PJ_8503.json": {
            "codigo": "PJ 8503",
            "titulo": "Núcleo Otimizado e Virtualizado FINEP",
            "coordenador": {
                "nome": "Karin Satie Komati",
                "campus": "Serra",
            },
            "datas": {"inicio": "2025-01-15", "fim": "2026-12-31"},
            "financiamento": {
                "valor_total": 10000000.0,
                "moeda": "BRL",
                "fontes": [
                    {
                        "fonte": "FINEP",
                        "valor": 10000000.0,
                        "tipo": "Financiamento público",
                    }
                ],
            },
        },
    }
