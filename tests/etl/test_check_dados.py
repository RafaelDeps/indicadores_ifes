from __future__ import annotations

import json
import os
import zipfile
from pathlib import Path

from etl.core.logic.models import RegistroPilarJson
from etl.scripts.check_dados import main

# Cenários (US3, FR-007..FR-009 / contracts/check-dados.md §2-§3.1):
#  1. contrato violado                          → 1 (ERRO:)
#  2. pacote em dia (mais novo que as entradas) → 0, sem AVISO: e sem INFO:
#  3. canônico mais novo que o pacote           → 0, AVISO: "possivelmente desatualizado"
#  4. zip de listagens mais antigo que o pacote → 0, AVISO: "proveniência"
#  5. planilha mais nova que o pacote           → 0, AVISO: "não incorporada"
#  6. todas as entradas ausentes (só o zip)     → 0, uma INFO: "apenas o contrato"
#  7. parcialmente presentes (só --canonical)   → comparação parcial + INFO: só ausentes
#  8. --raw sem planilhas conta ausente; com planilhas é comparado
#  9. --canonical "" suprime comparação e entra na INFO:

T0 = 1_700_000_000.0  # época de referência p/ os.utime (determinístico)


def _serializar(dados: dict) -> str:
    return json.dumps(dados, ensure_ascii=False, indent=2) + "\n"


def _registro_pilar1(
    campus: str = "serra",
    ano: int = 2025,
    *,
    nte: int | None = None,
    ntecpp: int | None = None,
    chave_removida: str | None = None,
) -> RegistroPilarJson:
    indicadores = {
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
    }
    dados: dict = {
        "campus": "Serra",
        "ano_referencia": ano,
        "pilar": "Engajamento Academico e Inclusao",
        "indicadores": indicadores,
    }
    if chave_removida:
        dados.pop(chave_removida, None)
    return RegistroPilarJson(
        nome=f"pilar1_{campus}_{ano}.json", conteudo=_serializar(dados)
    )


def _escrever_zip(caminho: Path, registros: list[RegistroPilarJson]) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(caminho, "w", zipfile.ZIP_DEFLATED) as zf:
        for reg in sorted(registros, key=lambda r: r.nome):
            zinfo = zipfile.ZipInfo(reg.nome, date_time=(1980, 1, 1, 0, 0, 0))
            zinfo.external_attr = 0o644 << 16
            zf.writestr(zinfo, reg.conteudo.encode("utf-8"))


def _arquivo(caminho: Path, mtime: float) -> Path:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(b"a")
    os.utime(caminho, (mtime, mtime))
    return caminho


def _linhas_info(stderr: str) -> list[str]:
    return [linha for linha in stderr.splitlines() if linha.startswith("INFO:")]


# --- 1. Contrato violado → ERRO + exit 1 --------------------------------------


def test_check_dados_contrato_violado_erro(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    _arquivo(pacote, T0)
    _escrever_zip(pacote, [_registro_pilar1(chave_removida="pilar")])

    rc = main(["--pacote", str(pacote)])

    assert rc == 1
    assert "ERRO:" in capsys.readouterr().err


# --- 2. Pacote em dia → 0, sem AVISO: e sem INFO: -----------------------------


def test_check_dados_pacote_em_dia_silencioso(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    _escrever_zip(pacote, [_registro_pilar1()])
    # Snapshot "em dia": todas as entradas com mtime == pacote (sem gap temporal).
    canonical = _arquivo(tmp_path / "canonical" / "exports_canonical.zip", T0)
    listagens = _arquivo(tmp_path / "listagens.zip", T0)
    planilha = _arquivo(tmp_path / "raw" / "listagem_2025_1.xlsx", T0)
    os.utime(pacote, (T0, T0))

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--canonical",
            str(canonical),
            "--listagens",
            str(listagens),
            "--raw",
            str(planilha.parent),
        ]
    )

    out = capsys.readouterr()
    assert rc == 0
    assert "AVISO:" not in out.err
    assert "INFO:" not in out.err
    assert "ERRO:" not in out.err


# --- 3. Canônico mais novo que o pacote → AVISO: possivelmente desatualizado ---


def test_check_dados_canonico_mais_novo_aviso(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    _escrever_zip(pacote, [_registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 + 100)
    listagens = _arquivo(tmp_path / "listagens.zip", T0 - 1000)
    os.utime(pacote, (T0, T0))

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--canonical",
            str(canonical),
            "--listagens",
            str(listagens),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 0
    assert "possivelmente desatualizado" in err
    assert "AVISO:" in err
    assert "INFO:" not in err


# --- 4. Zip de listagens mais antigo → AVISO: proveniência --------------------


def test_check_dados_listagens_mais_antigo_aviso_proveniencia(
    tmp_path: Path, capsys
) -> None:
    pacote = tmp_path / "indicadores.zip"
    _escrever_zip(pacote, [_registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 - 1000)
    listagens = _arquivo(tmp_path / "listagens.zip", T0 - 500)
    os.utime(pacote, (T0, T0))  # pacote mais recente que o zip de listagens

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--canonical",
            str(canonical),
            "--listagens",
            str(listagens),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 0
    assert "proveniência" in err
    assert "execução anterior" in err
    assert "INFO:" not in err


# --- 5. Planilha mais nova que o pacote → AVISO: não incorporada --------------


def test_check_dados_planilha_mais_nova_aviso(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    _escrever_zip(pacote, [_registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 - 1000)
    listagens = _arquivo(tmp_path / "listagens.zip", T0 - 1000)
    planilha = _arquivo(tmp_path / "raw" / "listagem_2025_1.xlsx", T0 + 100)
    os.utime(pacote, (T0, T0))

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--canonical",
            str(canonical),
            "--listagens",
            str(listagens),
            "--raw",
            str(planilha.parent),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 0
    assert "planilha" in err
    assert "não incorporada" in err
    assert "INFO:" not in err


# --- 6. Todas as entradas de frescor ausentes → uma INFO: ---------------------


def test_check_dados_todas_entradas_ausentes_info_unica(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    _escrever_zip(pacote, [_registro_pilar1()])

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--canonical",
            str(tmp_path / "sem" / "exports_canonical.zip"),
            "--listagens",
            str(tmp_path / "sem" / "indicadores_listagens.zip"),
            "--raw",
            str(tmp_path / "sem_raw"),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 0
    linhas = _linhas_info(err)
    assert len(linhas) == 1
    assert "apenas o contrato foi validado" in linhas[0]
    assert "exports_canonical.zip" in linhas[0]
    assert "indicadores_listagens.zip" in linhas[0]
    assert "listagem_*.xlsx" in linhas[0]
    assert "AVISO:" not in err
    assert "ERRO:" not in err


# --- 7. Parcialmente presentes: comparação só das presentes -------------------


def test_check_dados_parcial_info_so_ausentes(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    _escrever_zip(pacote, [_registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 - 1000)
    os.utime(pacote, (T0, T0))

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--canonical",
            str(canonical),
            "--listagens",
            str(tmp_path / "sem" / "indicadores_listagens.zip"),
            "--raw",
            str(tmp_path / "sem_raw"),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 0
    linhas = _linhas_info(err)
    assert len(linhas) == 1
    assert "indicadores_listagens.zip" in linhas[0]
    assert "listagem_*.xlsx" in linhas[0]
    assert "exports_canonical.zip" not in linhas[0]
    assert "AVISO:" not in err  # canônico presente e mais antigo → sem aviso


# --- 8. --raw sem planilhas conta como ausente; com planilhas é comparado -----


def test_check_dados_raw_sem_planilhas_conta_ausente(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    _escrever_zip(pacote, [_registro_pilar1()])
    # Entradas presentes "em dia" (mtime == pacote) → sem AVISO; o que falta é
    # apenas a planilha em --raw, que deve entrar na linha INFO:.
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0)
    listagens = _arquivo(tmp_path / "listagens.zip", T0)
    pasta_raw = tmp_path / "raw"
    pasta_raw.mkdir(parents=True, exist_ok=True)  # existe, porém sem planilhas
    os.utime(pacote, (T0, T0))

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--canonical",
            str(canonical),
            "--listagens",
            str(listagens),
            "--raw",
            str(pasta_raw),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 0
    linhas = _linhas_info(err)
    assert len(linhas) == 1
    assert "listagem_*.xlsx" in linhas[0]
    assert "AVISO:" not in err


def test_check_dados_raw_com_planilhas_e_comparado(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    _escrever_zip(pacote, [_registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 - 1000)
    listagens = _arquivo(tmp_path / "listagens.zip", T0 - 1000)
    planilha = _arquivo(tmp_path / "raw" / "listagem_2026_1.xlsx", T0 + 50)
    os.utime(pacote, (T0, T0))

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--canonical",
            str(canonical),
            "--listagens",
            str(listagens),
            "--raw",
            str(planilha.parent),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 0
    assert "não incorporada" in err  # planilha presente foi comparada → AVISO
    assert "INFO:" not in err


# --- 9. --canonical "" suprime a comparação e entra na INFO: ------------------


def test_check_dados_canonical_vazio_suprime_e_entra_na_info(
    tmp_path: Path, capsys
) -> None:
    pacote = tmp_path / "indicadores.zip"
    _escrever_zip(pacote, [_registro_pilar1()])
    # Listagens e planilha presentes "em dia" (mtime == pacote) → sem AVISO.
    listagens = _arquivo(tmp_path / "listagens.zip", T0)
    planilha = _arquivo(tmp_path / "raw" / "listagem_2025_1.xlsx", T0)
    os.utime(pacote, (T0, T0))

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--canonical",
            "",
            "--listagens",
            str(listagens),
            "--raw",
            str(planilha.parent),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 0
    linhas = _linhas_info(err)
    assert len(linhas) == 1
    assert "exports_canonical.zip" in linhas[0]
    assert (
        "AVISO:" not in err
    )  # listagens/planilha presentes e mais antigas → sem aviso
