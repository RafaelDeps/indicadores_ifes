"""Falha de leitura do pacote sempre sai como `ERRO:`, nunca como traceback.

O `check-dados` é o portão de contrato do CI. Quando a exceção trazia o prefixo
`ERRO:` (a `ValueError` de `validar_arquivos_pilar`, que embute a mensagem no
texto), a linha saía correta; quando não trazia — `zipfile.BadZipFile` de um zip
corrompido, `KeyError` de JSON truncado — o `check-dados` cuspia a mensagem crua
em inglês da stdlib, sem `ERRO:`, e o log do gate ficava ambíguo sobre se aquilo
era uma falha do pacote ou do próprio verificador.

O contrato (`check-dados.md` §2) diz: violação ⇒ `ERRO:` + exit 1, pacote
ausente ⇒ `ERRO:` + exit 1. Zip ilegível é "pacote ausente" na prática — a
verificação não pode ser feita, e a mensagem precisa dizer isso.
"""

from __future__ import annotations

from pathlib import Path

from etl.scripts.check_dados import main
from tests.etl.factories.pacotes import escrever_zip, registro_pilar1

ZIP_CORROMPIDO = b"PK\x03\x04conteudo-que-nao-e-zip"


def _zip_corrompido(caminho: Path) -> Path:
    caminho.write_bytes(ZIP_CORROMPIDO)
    return caminho


def test_check_dados_zip_corrompido_erro_com_prefixo(tmp_path: Path, capsys) -> None:
    pacote = _zip_corrompido(tmp_path / "indicadores.zip")

    rc = main(["--pacote", str(pacote)])

    err = capsys.readouterr().err
    assert rc == 1
    assert err.startswith("ERRO:")
    assert "Traceback" not in err


def test_check_dados_zip_corrompido_nao_e_erro_de_frescor(
    tmp_path: Path, capsys
) -> None:
    """Um zip ilegível não pode ser reportado como problema de frescor/mtime."""
    pacote = _zip_corrompido(tmp_path / "indicadores.zip")

    main(["--pacote", str(pacote)])

    err = capsys.readouterr().err
    assert "AVISO:" not in err
    assert "INFO:" not in err


def test_check_dados_zip_vazio_erro_com_prefixo(tmp_path: Path, capsys) -> None:
    """Zip vazio (0 entradas) também é "pacote ausente" na prática."""
    pacote = tmp_path / "vazio.zip"
    pacote.write_bytes(b"")

    rc = main(["--pacote", str(pacote)])

    assert rc == 1
    assert capsys.readouterr().err.startswith("ERRO:")


def test_check_dados_erro_nao_duplica_prefixo(tmp_path: Path, capsys) -> None:
    """`ERRO:` não pode virar `ERRO: ERRO:` quando a exceção já vem prefixada."""
    pacote = tmp_path / "indicadores.zip"
    escrever_zip(pacote, [registro_pilar1(chave_removida="pilar")])

    rc = main(["--pacote", str(pacote)])

    err = capsys.readouterr().err
    assert rc == 1
    assert err.startswith("ERRO:")
    assert "ERRO: ERRO:" not in err
    # o payload real da validação continua no log
    assert "pilar" in err
