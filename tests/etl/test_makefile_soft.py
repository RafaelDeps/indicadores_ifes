"""O `Makefile` e o Python precisam concordar sobre o que é "soft".

`etl/main.py::_modo_soft()` (e o mesmo em `main_listagens.py`,
`merge_listagens_indicadores.py` e `cadeia_dados.py`) só liga o modo soft para
`{1, true, yes, on}` — comparação de **valor**. O `Makefile` usava
`$(if $(SOFT),--soft,)`, que é uma comparação de **não-vazio**: qualquer valor
preenchido ligava o soft.

A divergência é silenciosa e fica no caminho de segurança: `SOFT=0 make dados`
era soft (e ainda mapeava o bloqueio da guarda de cadeia para exit 0), enquanto
`SOFT=0 python -m etl.main` era estrito — exatamente o oposto do que quem
escreve `SOFT=0` quer dizer.

O teste roda `make -n` (dry-run): as receitas não executam, mas as variáveis do
Make são expandidas, que é exatamente o que se quer verificar.
"""

from __future__ import annotations

import shutil
import subprocess

import pytest

#: Valores que o Python trata como soft (`_modo_soft`).
SOFT_VERDADEIROS = ["1", "true", "TRUE", "yes", "on"]

#: Valores preenchidos que o Python trata como estrito — nenhum pode virar
#: `--soft` nem o mapeamento de saída da guarda de cadeia.
SOFT_FALSOS = ["0", "false", "FALSE", "no", "off", "2", "x"]

pytestmark = pytest.mark.skipif(
    shutil.which("make") is None, reason="make não disponível neste ambiente"
)


def _make_dry_run(alvo: str, soft: str) -> str:
    """Saída do dry-run de `make <alvo> SOFT=<soft>` (receitas não executam)."""
    resultado = subprocess.run(
        ["make", "-n", alvo, f"SOFT={soft}"],
        capture_output=True,
        text=True,
        check=True,
    )
    return resultado.stdout


@pytest.mark.parametrize("alvo", ["etl", "etl-listagens", "merge-listagens", "dados"])
@pytest.mark.parametrize("soft", SOFT_VERDADEIROS)
def test_soft_verdadeiro_passa_a_flag(alvo: str, soft: str) -> None:
    assert "--soft" in _make_dry_run(alvo, soft)


@pytest.mark.parametrize("alvo", ["etl", "etl-listagens", "merge-listagens", "dados"])
@pytest.mark.parametrize("soft", SOFT_FALSOS)
def test_soft_falso_nao_passa_a_flag(alvo: str, soft: str) -> None:
    assert "--soft" not in _make_dry_run(alvo, soft)


def test_soft_vazio_nao_passa_a_flag() -> None:
    assert "--soft" not in _make_dry_run("etl", "")


@pytest.mark.parametrize(
    ("soft", "codigo"), [("1", "exit 0"), ("0", "exit 1"), ("false", "exit 1")]
)
def test_mapeamento_de_saida_da_guarda_segue_o_modo(soft: str, codigo: str) -> None:
    """`make dados` traduz o bloqueio (exit 3) da guarda no modo em que se está.

    Com soft a cadeia é pulada e `make dados` encerra em 0; no estrito encerra
    em 1, sempre sem executar nada.
    """
    assert codigo in _make_dry_run("dados", soft)
