from __future__ import annotations

import json
import zipfile
from pathlib import Path

from etl.adapters.sinks.zip_indicadores_sink import (
    CAMPOS_QUE_DEVEM_SER_NULOS,
    NOMES_PILARES,
    SIGLAS_POR_PILAR,
)


def test_indicadores_zip_fidelidade_e_schema() -> None:
    caminho_zip = Path("data/dist/indicadores.zip")
    assert caminho_zip.exists(), "data/dist/indicadores.zip deve existir"

    with zipfile.ZipFile(caminho_zip) as zf:
        nomes = zf.namelist()
        assert len(nomes) == 216, f"Esperado 216 arquivos, encontrado {len(nomes)}"

        for nome in nomes:
            conteudo = json.loads(zf.read(nome).decode("utf-8"))

            assert "campus" in conteudo
            assert "ano_referencia" in conteudo
            assert "pilar" in conteudo
            assert "indicadores" in conteudo

            partes = nome.replace(".json", "").split("_")
            pilar_num = int(partes[0].replace("pilar", ""))
            ano = int(partes[2])

            assert conteudo["ano_referencia"] == ano
            assert conteudo["pilar"] == NOMES_PILARES[pilar_num]

            indicadores = conteudo["indicadores"]
            for sigla in SIGLAS_POR_PILAR[pilar_num]:
                assert sigla in indicadores
                ind = indicadores[sigla]
                assert "descricao" in ind

                for campo, valor in ind.items():
                    if campo in CAMPOS_QUE_DEVEM_SER_NULOS:
                        assert valor is None, f"{nome}: {sigla}.{campo} deve ser null"
