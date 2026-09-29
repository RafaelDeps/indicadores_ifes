from __future__ import annotations

import hashlib
import json
import zipfile
from pathlib import Path

from etl.main import main as main_etl
from etl.main_listagens import main as main_listagens
from etl.scripts.merge_listagens_indicadores import main as main_merge
from tests.etl.conftest import criar_zip_canonico_fake
from tests.etl.factories.listagens_factories import (
    COTA_RESERVA_PPI,
    INGRESSO_COTA,
    criar_listagem_xlsx,
    linha,
)

# Cenários (US1, FR-002..FR-005 / contracts/etl-cli.md §2):
#  1. etl.main  soft + canônico ausente + saída existe  → 0, AVISO, zip byte-idêntico
#  2. etl.main  soft + canônico ausente + saída não existe → 1 (ERRO)
#  3. etl.main  sem soft + canônico ausente → 1 (regressão contrato 006)
#  4. main_listagens soft + raw sem planilhas → 0, AVISO, zip não criado/sobrescrito
#  5. main_listagens soft + canônico ausente → 0, NTECPP null, AVISO "não recalculável"
#  6. main_listagens sem soft + sem planilhas → 1 (ERRO)
#  7. merge soft + zip de listagens ausente → 0, AVISO, indicadores.zip byte-idêntico
#  8. merge sem soft + zip ausente → 1 (ERRO)


def _sha256(caminho: Path) -> str:
    return hashlib.sha256(caminho.read_bytes()).hexdigest()


def _sem_soft(monkeypatch) -> None:
    monkeypatch.delenv("SOFT", raising=False)


# --- 1. etl.main soft + canônico ausente + saída existe ---------------------


def test_etl_soft_canonico_ausente_preserva_zip_existente(
    zip_existente: Path, canonical_ausente: Path, capsys, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    antes = _sha256(zip_existente)
    rc = main_etl(
        [
            "--entrada",
            str(canonical_ausente),
            "--saida",
            str(zip_existente),
            "--soft",
        ]
    )
    assert rc == 0
    assert _sha256(zip_existente) == antes
    assert "AVISO:" in capsys.readouterr().err


def test_etl_soft_por_variavel_ambiente_preserva_zip_existente(
    zip_existente: Path, canonical_ausente: Path, capsys, monkeypatch
) -> None:
    """FR-001: modo soft também ativo via env SOFT=1 (sem flag)."""
    monkeypatch.setenv("SOFT", "1")
    antes = _sha256(zip_existente)
    rc = main_etl(["--entrada", str(canonical_ausente), "--saida", str(zip_existente)])
    assert rc == 0
    assert _sha256(zip_existente) == antes
    assert "AVISO:" in capsys.readouterr().err


# --- 2. etl.main soft + canônico ausente + saída NÃO existe -----------------


def test_etl_soft_canonico_ausente_sem_saida_erro(
    tmp_path: Path, canonical_ausente: Path, capsys, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    saida = tmp_path / "nao_existe.zip"
    rc = main_etl(
        [
            "--entrada",
            str(canonical_ausente),
            "--saida",
            str(saida),
            "--soft",
        ]
    )
    assert rc == 1
    assert "ERRO:" in capsys.readouterr().err
    assert not saida.exists()


# --- 3. etl.main sem soft + canônico ausente → 1 (contrato 006) -------------


def test_etl_estrito_canonico_ausente_erro(
    canonical_ausente: Path, capsys, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    rc = main_etl(["--entrada", str(canonical_ausente)])
    assert rc == 1
    assert "ERRO:" in capsys.readouterr().err


# --- 4. main_listagens soft + raw sem planilhas ------------------------------


def test_listagens_soft_sem_planilhas_nao_cria_zip(
    dir_raw_vazio: Path, tmp_path: Path, capsys, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    saida = tmp_path / "indicadores_listagens.zip"
    rc = main_listagens(
        ["--entrada", str(dir_raw_vazio), "--saida", str(saida), "--soft"]
    )
    assert rc == 0
    assert "AVISO:" in capsys.readouterr().err
    assert not saida.exists()


def test_listagens_soft_sem_planilhas_nao_sobrescreve_zip_preexistente(
    dir_raw_vazio: Path, zip_existente: Path, capsys, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    antes = _sha256(zip_existente)
    rc = main_listagens(
        ["--entrada", str(dir_raw_vazio), "--saida", str(zip_existente), "--soft"]
    )
    assert rc == 0
    assert "AVISO:" in capsys.readouterr().err
    assert _sha256(zip_existente) == antes


# --- 5. main_listagens soft + canônico ausente → NTECPP null -----------------


def _raw_com_listagem_2025(tmp_path: Path) -> Path:
    raw = tmp_path / "raw"
    criar_listagem_xlsx(
        raw / "listagem_2025_1.xlsx",
        ano=2025,
        semestre=1,
        linhas=[
            linha(
                "1001",
                nome="Aluno Cotista",
                forma_ingresso=INGRESSO_COTA,
                cota=COTA_RESERVA_PPI,
            ),
            linha("1002"),
        ],
    )
    criar_listagem_xlsx(
        raw / "listagem_2025_2.xlsx",
        ano=2025,
        semestre=2,
        linhas=[
            linha(
                "1003",
                nome="Aluna Cotista",
                forma_ingresso=INGRESSO_COTA,
                cota=COTA_RESERVA_PPI,
            )
        ],
    )
    return raw


def test_listagens_soft_canonico_ausente_ntecpp_null(
    tmp_path: Path, capsys, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    raw = _raw_com_listagem_2025(tmp_path)
    saida = tmp_path / "listagens.zip"
    canonical_ausente = tmp_path / "nao_existe_canonico.zip"
    relatorio = tmp_path / "run_report.md"

    rc = main_listagens(
        [
            "--entrada",
            str(raw),
            "--saida",
            str(saida),
            "--canonical",
            str(canonical_ausente),
            "--relatorio",
            str(relatorio),
            "--soft",
        ]
    )
    err = capsys.readouterr().err
    assert rc == 0
    assert "não recalculável a partir do zip" in err

    with zipfile.ZipFile(saida) as zf:
        nomes = zf.namelist()
        pilar1 = next(n for n in nomes if n.startswith("pilar1_serra_"))
        dados = json.loads(zf.read(pilar1))
    assert (
        dados["indicadores"]["PICOT"]["NTECPP_cotistas_em_pesquisa"] is None
    ), "NTECPP deve permanecer null (nunca 0) sem universo de nomes"


# --- 6. main_listagens sem soft + sem planilhas → 1 --------------------------


def test_listagens_estrito_sem_planilhas_erro(
    dir_raw_vazio: Path, tmp_path: Path, capsys, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    saida = tmp_path / "indicadores_listagens.zip"
    rc = main_listagens(["--entrada", str(dir_raw_vazio), "--saida", str(saida)])
    assert rc == 1
    assert "ERRO:" in capsys.readouterr().err
    assert not saida.exists()


# --- 7. merge soft + zip de listagens ausente → 0, zip intocado -------------


def test_merge_soft_sem_listagens_preserva_zip(
    zip_existente: Path, tmp_path: Path, capsys, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    listagens_ausente = tmp_path / "nao_existe_listagens.zip"
    antes = _sha256(zip_existente)
    rc = main_merge(
        [
            "--listagens",
            str(listagens_ausente),
            "--canonical",
            str(zip_existente),
            "--saida",
            str(zip_existente),
            "--soft",
        ]
    )
    assert rc == 0
    assert "AVISO:" in capsys.readouterr().err
    assert _sha256(zip_existente) == antes


# --- 8. merge sem soft + zip ausente → 1 -------------------------------------


def test_merge_estrito_sem_listagens_erro(
    zip_existente: Path, tmp_path: Path, capsys, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    rc = main_merge(
        [
            "--listagens",
            str(tmp_path / "nao_existe_listagens.zip"),
            "--canonical",
            str(zip_existente),
            "--saida",
            str(tmp_path / "merged.zip"),
        ]
    )
    assert rc == 1
    assert "ERRO:" in capsys.readouterr().err


# --- Regressão: soft + entradas presentes ⇒ saída idêntica ao estrito --------
# (tasks.md "Regressão crítica": o soft não altera o caminho de sucesso — FR-010)


def _dados_canonico_serra() -> dict[str, list[dict]]:
    return {
        "campuses_canonical.json": [{"id": 1, "name": "Serra"}],
        "initiatives_canonical.json": [
            {
                "id": 1,
                "name": "Proj Serra",
                "status": "EM_ANDAMENTO",
                "start_date": "2025-01-01",
                "end_date": None,
                "campus": {"id": 1, "name": "Serra"},
                "team": [],
            }
        ],
        "researchers_canonical.json": [],
        "students_canonical.json": [],
        "articles_canonical.json": [],
        "productions_canonical.json": [],
        "production_authors_canonical.json": [],
        "production_types_canonical.json": [],
    }


def test_etl_soft_com_entradas_presentes_saida_identica(
    tmp_path: Path, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    entrada = tmp_path / "exports_canonical.zip"
    criar_zip_canonico_fake(entrada, _dados_canonico_serra())

    saida_estrito = tmp_path / "out_estrito.zip"
    saida_soft = tmp_path / "out_soft.zip"
    base = ["--entrada", str(entrada), "--anos", "2025"]

    assert main_etl([*base, "--saida", str(saida_estrito)]) == 0
    assert main_etl([*base, "--saida", str(saida_soft), "--soft"]) == 0

    assert _sha256(saida_estrito) == _sha256(saida_soft)


def test_merge_soft_com_entradas_presentes_saida_identica(
    tmp_path: Path, monkeypatch
) -> None:
    _sem_soft(monkeypatch)
    from etl.adapters.sinks.json_pilar_sink import formatar_arquivos_pilar
    from etl.core.logic.models import AgregadosCampus, RegistroPilarJson

    def _serializar(dados: dict) -> str:
        return json.dumps(dados, ensure_ascii=False, indent=2) + "\n"

    def _pilar1(nte: int, ntecpp: int) -> RegistroPilarJson:
        return RegistroPilarJson(
            nome="pilar1_serra_2025.json",
            conteudo=_serializar(
                {
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
                            "NTE_total_estudantes_matriculados": nte,
                            "percentual_calculado_PIES": None,
                        },
                        "PICOT": {
                            "descricao": "Percentual de Estudantes Cotistas Envolvidos em Pesquisa",
                            "NTECPP_cotistas_em_pesquisa": ntecpp,
                            "NEP_total_estudantes_em_pesquisa": None,
                            "percentual_calculado_PICOT": None,
                        },
                    },
                }
            ),
        )

    def _escrever_zip(caminho: Path, registros: list[RegistroPilarJson]) -> None:
        with zipfile.ZipFile(caminho, "w", zipfile.ZIP_DEFLATED) as zf:
            for reg in sorted(registros, key=lambda r: r.nome):
                zinfo = zipfile.ZipInfo(reg.nome, date_time=(1980, 1, 1, 0, 0, 0))
                zinfo.external_attr = 0o644 << 16
                zf.writestr(zinfo, reg.conteudo.encode("utf-8"))

    listagens = [_pilar1(1857, 93)]
    canonical = [_pilar1(0, 0)]
    # Canônico com pilares 2/3 no shape do contrato (P3 com zeros estruturais).
    for p in formatar_arquivos_pilar(
        "serra", AgregadosCampus(campus_nome="Serra"), 2025
    ):
        if p.nome.startswith(("pilar2_", "pilar3_")):
            canonical.append(p)

    zip_list = tmp_path / "listagens.zip"
    zip_can = tmp_path / "canonico.zip"
    _escrever_zip(zip_list, listagens)
    _escrever_zip(zip_can, canonical)

    out_estrito = tmp_path / "out_estrito.zip"
    out_soft = tmp_path / "out_soft.zip"
    base = ["--listagens", str(zip_list), "--canonical", str(zip_can)]

    assert main_merge([*base, "--saida", str(out_estrito)]) == 0
    assert main_merge([*base, "--saida", str(out_soft), "--soft"]) == 0
    assert _sha256(out_estrito) == _sha256(out_soft)
