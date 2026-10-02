"""`--anos` inválido é erro de CLI, não traceback — e jamais um pacote vazio.

`etl/main.py` já tratava `ValueError` na conversão de `--anos`; o
`etl/main_listagens.py` fazia a mesma conversão sem tratamento e estourava
`ValueError` cru. A assimetria é o defeito — um typo no CLI de um comando não
pode virar traceback só porque a conversão está em outro arquivo.

O caso `""` é o pior de todos, e é silencioso: a lista de anos fica vazia, o
filtro temporal não casa nada, o fluxo conclui com "0 arquivos gerados" e o
`ZipIndicadoresSink` **sobrescreve o pacote público com um zip de 0 entradas**,
exit 0. O pacote commitado deixa de existir e nada sinaliza. A causa é que
`validar_arquivos_pilar([])` não produz violação nenhuma: um pacote vazio é
"válido" por construção.

Nenhum teste aqui pode chamar `etl.main` sem `--entrada`/`--saida` explícitos:
o default é o export canônico do repositório e a saída default é o pacote
público.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from etl import main as etl_main
from etl import main_listagens as etl_main_listagens
from tests.etl.conftest import criar_zip_canonico_fake

ANOS_INVALIDOS = ["abc", "2025,abc", "2025,,x"]
ANOS_QUE_NAO_PRODUZEM_ANOS = ["", " ", ",", " , "]


def _entrada_inexistente(tmp_path: Path) -> str:
    caminho = tmp_path / "exports_canonical.zip"
    caminho.write_bytes(b"nao-e-zip")
    return str(caminho)


def _main_com_saida_isolada(anos: str, tmp_path: Path) -> int:
    return etl_main.main(
        [
            "--anos",
            anos,
            "--entrada",
            _entrada_inexistente(tmp_path),
            "--saida",
            str(tmp_path / "saida.zip"),
        ]
    )


@pytest.mark.parametrize("valor", ANOS_INVALIDOS)
def test_main_rejeita_anos_invalido_com_erro(
    capsys, tmp_path: Path, valor: str
) -> None:
    """Contrato: `ERRO:` no stderr + exit 1, sem traceback."""
    rc = _main_com_saida_isolada(valor, tmp_path)

    err = capsys.readouterr().err
    assert rc == 1
    assert err.startswith("ERRO:")
    assert "Traceback" not in err


@pytest.mark.parametrize("valor", ANOS_INVALIDOS)
def test_main_listagens_rejeita_anos_invalido_com_erro(
    capsys, tmp_path: Path, valor: str
) -> None:
    """Mesma mensagem e mesmo código de saída em `main_listagens`."""
    rc = etl_main_listagens.main(
        [
            "--anos",
            valor,
            "--entrada",
            str(tmp_path / "raw"),
            "--saida",
            str(tmp_path / "saida.zip"),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 1
    assert err.startswith("ERRO:")
    assert "Traceback" not in err


# --- `--anos` que não produz nenhum ano: rejeitar, nunca gerar pacote vazio ---


@pytest.mark.parametrize("valor", ANOS_QUE_NAO_PRODUZEM_ANOS)
def test_main_rejeita_anos_sem_anos(capsys, tmp_path: Path, valor: str) -> None:
    rc = _main_com_saida_isolada(valor, tmp_path)

    err = capsys.readouterr().err
    assert rc == 1
    assert err.startswith("ERRO:")
    assert "Traceback" not in err


@pytest.mark.parametrize("valor", ANOS_QUE_NAO_PRODUZEM_ANOS)
def test_main_nao_sobrescreve_o_pacote_com_zip_vazio(
    tmp_path: Path, valor: str
) -> None:
    """A defesa real: mesmo que a lista vazia escale, nada é escrito em disco."""
    # Entrada canônica **válida e completa**, para que o pipeline de fato
    # rodaria — só a lista de anos vazia o impede de produzir arquivos. Com um
    # canônico incompleto o fluxo falharia antes e o teste passaria pelo motivo
    # errado (não exerceria a defesa).
    pacote_entrada = tmp_path / "canonical_valido.zip"
    criar_zip_canonico_fake(
        pacote_entrada,
        {
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
        },
    )
    saida = tmp_path / "indicadores.zip"
    saida.write_bytes(b"pacote-que-existe-e-nao-deve-sumir")

    rc = etl_main.main(
        ["--anos", valor, "--entrada", str(pacote_entrada), "--saida", str(saida)]
    )

    assert rc == 1
    assert saida.read_bytes() == b"pacote-que-existe-e-nao-deve-sumir"


def test_main_listagens_anos_valido_nao_e_afetado(tmp_path: Path) -> None:
    """`--anos` bem formado continua seguindo para o pipeline (falha por outro motivo)."""
    rc = etl_main_listagens.main(
        [
            "--anos",
            "2025,2026",
            "--entrada",
            str(tmp_path / "raw"),
            "--saida",
            str(tmp_path / "saida.zip"),
        ]
    )
    assert rc == 1
