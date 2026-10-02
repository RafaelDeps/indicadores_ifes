from __future__ import annotations

from pathlib import Path

from etl.scripts.cadeia_dados import main

# Cenários (contrato etl-cli.md §4/§5.6 — coerência da cadeia):
#  1. canônico + zip de listagens presentes            → pode rodar
#  2. canônico + planilhas presentes (sem zip ainda)  → pode rodar (etapa 2 cria o zip)
#  3. canônico presente, sem zip e sem planilhas       → BLOQUEIA (o merge não tem entrada)
#  4. canônico ausente, sem zip e sem planilhas        → pode rodar (o etl não reescreve)
#  5. bloqueio em soft  → AVISO:  e exit 3
#  6. bloqueio estrito  → ERRO:   e exit 3
#
# Cenário 3 é o defeito: sem o zip de listagens, a etapa 3 nada pode mesclar, e
# a etapa 1 já reescreveu o pacote sem NTE/NTECPP. Rodar a cadeia apagaria o
# último snapshot coerente em silêncio.

CODIGO_PODE_RODAR = 0
CODIGO_BLOQUEADO = 3


def _args(
    canonical: Path, listagens: Path, raw: Path, pacote: Path, soft: bool
) -> list[str]:
    argv = [
        "--canonical",
        str(canonical),
        "--listagens",
        str(listagens),
        "--raw",
        str(raw),
        "--pacote",
        str(pacote),
    ]
    if soft:
        argv.append("--soft")
    return argv


def _cenario(tmp_path: Path, *, canonical: bool, listagens: bool, planilhas: bool):
    """Monta um estado de disco e devolve os caminhos usados nos argumentos."""
    pasta = tmp_path / "dados"
    raw = pasta / "raw"
    raw.mkdir(parents=True, exist_ok=True)

    caminho_canonical = pasta / "exports_canonical.zip"
    caminho_listagens = pasta / "indicadores_listagens.zip"
    caminho_pacote = pasta / "indicadores.zip"

    if canonical:
        caminho_canonical.write_bytes(b"canonical")
    if listagens:
        caminho_listagens.write_bytes(b"listagens")
    if planilhas:
        (raw / "listagem_2025_1.xlsx").write_bytes(b"planilha")
    caminho_pacote.write_bytes(b"pacote")

    return caminho_canonical, caminho_listagens, raw, caminho_pacote


# --- 1. Zip de listagens já existe → a cadeia pode rodar -----------------------


def test_cadeia_pode_rodar_com_zip_de_listagens(tmp_path: Path) -> None:
    c, lst, raw, pac = _cenario(
        tmp_path, canonical=True, listagens=True, planilhas=False
    )

    assert main(_args(c, lst, raw, pac, soft=False)) == CODIGO_PODE_RODAR


# --- 2. Planilhas presentes: a etapa 2 criará o zip → pode rodar ---------------


def test_cadeia_pode_rodar_com_planilhas(tmp_path: Path) -> None:
    c, lst, raw, pac = _cenario(
        tmp_path, canonical=True, listagens=False, planilhas=True
    )

    assert main(_args(c, lst, raw, pac, soft=False)) == CODIGO_PODE_RODAR


# --- 3. Sem zip e sem planilhas: o merge não tem entrada → BLOQUEIA ------------


def test_cadeia_bloqueia_sem_entrada_para_o_merge(tmp_path: Path) -> None:
    c, lst, raw, pac = _cenario(
        tmp_path, canonical=True, listagens=False, planilhas=False
    )

    assert main(_args(c, lst, raw, pac, soft=False)) == CODIGO_BLOQUEADO


# --- 4. Canônico ausente: o etl não reescreve, logo nada a perder → pode rodar --


def test_cadeia_pode_rodar_sem_canonical(tmp_path: Path) -> None:
    c, lst, raw, pac = _cenario(
        tmp_path, canonical=False, listagens=False, planilhas=False
    )

    assert main(_args(c, lst, raw, pac, soft=False)) == CODIGO_PODE_RODAR


# --- 5. Bloqueio em modo soft → AVISO: e exit 3 --------------------------------


def test_cadeia_bloqueio_em_soft_avisa(tmp_path: Path, capsys) -> None:
    c, lst, raw, pac = _cenario(
        tmp_path, canonical=True, listagens=False, planilhas=False
    )

    rc = main(_args(c, lst, raw, pac, soft=True))

    err = capsys.readouterr().err
    assert rc == CODIGO_BLOQUEADO
    assert err.startswith("AVISO:")
    assert "listagens" in err
    assert "NTE" in err and "NTECPP" in err


# --- 6. Bloqueio no modo estrito → ERRO: e exit 3 -----------------------------


def test_cadeia_bloqueio_estrito_erro(tmp_path: Path, capsys) -> None:
    c, lst, raw, pac = _cenario(
        tmp_path, canonical=True, listagens=False, planilhas=False
    )

    rc = main(_args(c, lst, raw, pac, soft=False))

    err = capsys.readouterr().err
    assert rc == CODIGO_BLOQUEADO
    assert err.startswith("ERRO:")
    assert "listagens" in err
    assert "NTE" in err and "NTECPP" in err
