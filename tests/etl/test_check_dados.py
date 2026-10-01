from __future__ import annotations

import os
from pathlib import Path

from etl.scripts.check_dados import main
from tests.etl.factories.pacotes import escrever_zip, registro_pilar1

# Cenários (US3, FR-007..FR-009 / contracts/check-dados.md §2-§3.1):
#  1. contrato violado                          → 1 (ERRO:)
#  2. pacote em dia (mais novo que as entradas) → 0, sem AVISO: e sem INFO:
#  3. canônico mais novo que o pacote           → 0, AVISO: "possivelmente desatualizado"
#  4. zip de listagens mais novo que o pacote    → 0, AVISO: "proveniência"
#  5. planilha mais nova que o pacote           → 0, AVISO: "não incorporada"
#  6. todas as entradas ausentes (só o zip)     → 0, uma INFO: "apenas o contrato"
#  7. parcialmente presentes (só --canonical)   → comparação parcial + INFO: só ausentes
#  8. --raw sem planilhas conta ausente; com planilhas é comparado
#  9. --canonical "" suprime comparação e entra na INFO:
# 10. pacote mais novo que as listagens (ordem saudável do `make dados`) → 0, sem AVISO:

T0 = 1_700_000_000.0  # época de referência p/ os.utime (determinístico)


def _arquivo(caminho: Path, mtime: float) -> Path:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(b"a")
    os.utime(caminho, (mtime, mtime))
    return caminho


def _zip(caminho: Path, mtime: float) -> Path:
    """Zip **válido** e vazio, com o mtime pedido.

    Os cenários de frescor só precisavam de um arquivo presente e datado, e por
    isso usavam um byte solto. A Etapa 1.5 passa a **ler** o zip de listagens, e
    um arquivo que não é zip é erro de insumo, não ausência
    (contracts/check-dados.md §3.0) — um byte solto reprovaria o teste de frescor
    por um motivo que ele não testa. Vazio de propósito: cobertura vazia dos dois
    lados é perda vazia, que é o silêncio que os cenários esperam.
    """
    escrever_zip(caminho, [])
    os.utime(caminho, (mtime, mtime))
    return caminho


def _linhas_info(stderr: str) -> list[str]:
    return [linha for linha in stderr.splitlines() if linha.startswith("INFO:")]


# --- 1. Contrato violado → ERRO + exit 1 --------------------------------------


def test_check_dados_contrato_violado_erro(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    _arquivo(pacote, T0)
    escrever_zip(pacote, [registro_pilar1(chave_removida="pilar")])

    rc = main(["--pacote", str(pacote)])

    assert rc == 1
    assert "ERRO:" in capsys.readouterr().err


# --- 1.5. Cobertura de derivados (Etapa 1.5) — perda reprova -------------------


def test_check_dados_proveniencia_perda_reprova(tmp_path: Path, capsys) -> None:
    """Perda de cobertura: pacote com par a menos que a origem ⇒ ERRO: e exit ≠ 0.

    Usa --canonical "" e --raw "" para isolar a Etapa 1.5 da Etapa 2.
    """
    pacote = tmp_path / "indicadores.zip"
    origem = tmp_path / "listagens.zip"

    # Origem tem 1 par com derivados
    escrever_zip(origem, [registro_pilar1(nte=10, ntecpp=2)])
    # Pacote não tem esse par
    escrever_zip(pacote, [])

    os.utime(pacote, (T0, T0))
    os.utime(origem, (T0, T0))

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--listagens",
            str(origem),
            "--canonical",
            "",
            "--raw",
            "",
        ]
    )

    err = capsys.readouterr().err
    assert rc == 1
    assert "ERRO:" in err
    assert "proveniência" in err


def test_check_dados_proveniencia_vereditos(tmp_path: Path, capsys) -> None:
    """Três vereditos: perda vazia silencia; origem ausente emite INFO e sai 0;
    origem presente e íntegra não emite ERRO:"""
    # Caso 1: perda vazia (origem e pacote cobrem mesmo par) — sem ERRO/INFO de cobertura
    pacote = tmp_path / "pac1.zip"
    origem = tmp_path / "orig1.zip"
    escrever_zip(pacote, [registro_pilar1(nte=10, ntecpp=2)])
    escrever_zip(origem, [registro_pilar1(nte=10, ntecpp=2)])
    os.utime(pacote, (T0, T0))
    os.utime(origem, (T0, T0))

    rc1 = main(
        [
            "--pacote",
            str(pacote),
            "--listagens",
            str(origem),
            "--canonical",
            "",
            "--raw",
            "",
        ]
    )
    err1 = capsys.readouterr().err
    assert rc1 == 0
    assert "ERRO:" not in err1
    # A Etapa 1.5 silencia: nenhuma INFO de cobertura. A INFO de frescor que
    # aparece vem de --canonical "" e --raw "", e é da Etapa 2.
    assert "cobertura" not in err1

    # Caso 2: origem ausente (caminho inexistente) emite INFO e sai 0
    rc2 = main(
        [
            "--pacote",
            str(pacote),
            "--listagens",
            str(tmp_path / "sem" / "indicadores_listagens.zip"),
            "--canonical",
            "",
            "--raw",
            "",
        ]
    )
    err2 = capsys.readouterr().err
    assert rc2 == 0
    linhas_info = [linha for linha in err2.splitlines() if linha.startswith("INFO:")]
    assert any("cobertura de derivados não avaliada" in linha for linha in linhas_info)
    assert "ERRO:" not in err2

    # Caso 3: origem presente e íntegra não emite ERRO:
    pacote3 = tmp_path / "pac3.zip"
    origem3 = tmp_path / "orig3.zip"
    escrever_zip(pacote3, [registro_pilar1(nte=5, ntecpp=1)])
    escrever_zip(origem3, [registro_pilar1(nte=5, ntecpp=1)])
    os.utime(pacote3, (T0, T0))
    os.utime(origem3, (T0, T0))
    rc3 = main(
        [
            "--pacote",
            str(pacote3),
            "--listagens",
            str(origem3),
            "--canonical",
            "",
            "--raw",
            "",
        ]
    )
    err3 = capsys.readouterr().err
    assert rc3 == 0
    assert "ERRO:" not in err3


def test_check_dados_proveniencia_origem_ilegivel(tmp_path: Path, capsys) -> None:
    """Origem presente mas ilegível (não é zip) ⇒ ERRO: e saída ≠ 0. Não é INFO:"""
    pacote = tmp_path / "indicadores.zip"
    origem = tmp_path / "listagens.zip"
    escrever_zip(pacote, [registro_pilar1()])
    origem.write_bytes(b"NAO-E-ZIP")
    os.utime(pacote, (T0, T0))

    rc = main(
        [
            "--pacote",
            str(pacote),
            "--listagens",
            str(origem),
            "--canonical",
            "",
            "--raw",
            "",
        ]
    )
    err = capsys.readouterr().err
    assert rc == 1
    assert "ERRO:" in err
    assert "INFO:" not in err


# --- 2. Pacote em dia → 0, sem AVISO: e sem INFO: -----------------------------


def test_check_dados_pacote_em_dia_silencioso(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    escrever_zip(pacote, [registro_pilar1()])
    # Snapshot "em dia": todas as entradas com mtime == pacote (sem gap temporal).
    canonical = _arquivo(tmp_path / "canonical" / "exports_canonical.zip", T0)
    listagens = _zip(tmp_path / "listagens.zip", T0)
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
    escrever_zip(pacote, [registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 + 100)
    listagens = _zip(tmp_path / "listagens.zip", T0 - 1000)
    # `--raw` explícito: sem ele a pasta padrão `data/raw` do repositório seria
    # lida, e a presença de planilhas no checkout local (gitignored) decides se
    # sai a linha INFO: — o teste ficaria verde aqui e vermelho no CI.
    planilha = _arquivo(tmp_path / "raw" / "listagem_2025_1.xlsx", T0 - 1000)
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
    assert "possivelmente desatualizado" in err
    assert "AVISO:" in err
    assert "INFO:" not in err


# --- 4. Zip de listagens mais novo → AVISO: proveniência ----------------------


def test_check_dados_listagens_mais_novo_aviso_proveniencia(
    tmp_path: Path, capsys
) -> None:
    pacote = tmp_path / "indicadores.zip"
    escrever_zip(pacote, [registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 - 1000)
    listagens = _zip(tmp_path / "listagens.zip", T0 + 500)
    # `--raw` explícito: ver comentário no cenário 3.
    planilha = _arquivo(tmp_path / "raw" / "listagem_2025_1.xlsx", T0 - 1000)
    os.utime(pacote, (T0, T0))  # listagens mais recente que o pacote

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
    assert "proveniência" in err
    assert "merge" in err
    assert "INFO:" not in err


# --- 5. Planilha mais nova que o pacote → AVISO: não incorporada --------------


def test_check_dados_planilha_mais_nova_aviso(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    escrever_zip(pacote, [registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 - 1000)
    listagens = _zip(tmp_path / "listagens.zip", T0 - 1000)
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
    escrever_zip(pacote, [registro_pilar1()])

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
    # Duas linhas, e não uma: a ausência da origem é registrada duas vezes, em
    # camadas diferentes (contracts/check-dados.md §3.1). A da Etapa 1.5 diz que a
    # cobertura não foi avaliada; a da Etapa 2 segue listando a entrada ausente
    # entre as três. Nenhuma das duas é erro.
    cobertura = [
        linha for linha in linhas if "cobertura de derivados não avaliada" in linha
    ]
    frescor = [linha for linha in linhas if "frescor não avaliado" in linha]
    assert len(cobertura) == 1
    assert len(frescor) == 1
    assert "indicadores_listagens.zip" in cobertura[0]
    assert "apenas o contrato foi validado" in frescor[0]
    assert "exports_canonical.zip" in frescor[0]
    assert "indicadores_listagens.zip" in frescor[0]
    assert "listagem_*.xlsx" in frescor[0]
    assert "AVISO:" not in err
    assert "ERRO:" not in err


# --- 7. Parcialmente presentes: comparação só das presentes -------------------


def test_check_dados_parcial_info_so_ausentes(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    escrever_zip(pacote, [registro_pilar1()])
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
    assert len(linhas) == 2  # a da Etapa 1.5 e a da Etapa 2 (ver cenário 6)
    frescor = [linha for linha in linhas if "frescor não avaliado" in linha]
    assert len(frescor) == 1
    assert "indicadores_listagens.zip" in frescor[0]
    assert "listagem_*.xlsx" in frescor[0]
    assert "exports_canonical.zip" not in frescor[0]
    assert "AVISO:" not in err  # canônico presente e mais antigo → sem aviso


# --- 8. --raw sem planilhas conta como ausente; com planilhas é comparado -----


def test_check_dados_raw_sem_planilhas_conta_ausente(tmp_path: Path, capsys) -> None:
    pacote = tmp_path / "indicadores.zip"
    escrever_zip(pacote, [registro_pilar1()])
    # Entradas presentes "em dia" (mtime == pacote) → sem AVISO; o que falta é
    # apenas a planilha em --raw, que deve entrar na linha INFO:.
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0)
    listagens = _zip(tmp_path / "listagens.zip", T0)
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
    escrever_zip(pacote, [registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 - 1000)
    listagens = _zip(tmp_path / "listagens.zip", T0 - 1000)
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
    escrever_zip(pacote, [registro_pilar1()])
    # Listagens e planilha presentes "em dia" (mtime == pacote) → sem AVISO.
    listagens = _zip(tmp_path / "listagens.zip", T0)
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


# --- 10. Ordem saudável do `make dados` → silêncio -----------------------------
#
# `make dados` roda etl → etl-listagens → merge-listagens, e o merge é a última
# etapa a escrever o pacote. O pacote fica, portanto, SEMPRE mais novo que o zip
# de listagens num fluxo bem-sucedido. A regra de proveniência não pode acusar
# essa ordem — seria um falso positivo garantido em toda execução completa.


def test_check_dados_ordem_saudavel_do_make_dados_silencioso(
    tmp_path: Path, capsys
) -> None:
    pacote = tmp_path / "indicadores.zip"
    escrever_zip(pacote, [registro_pilar1()])
    canonical = _arquivo(tmp_path / "exports_canonical.zip", T0 - 1000)
    listagens = _zip(tmp_path / "listagens.zip", T0 - 500)
    planilha = _arquivo(tmp_path / "raw" / "listagem_2025_1.xlsx", T0 - 1000)
    os.utime(pacote, (T0, T0))  # merge por último: pacote mais novo que tudo

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
    assert "AVISO:" not in err
    assert "proveniência" not in err
    assert "INFO:" not in err
