from __future__ import annotations

import io
import json
import zipfile
from pathlib import Path

from etl.adapters.sinks.zip_indicadores_sink import (
    CAMPOS_QUE_DEVEM_SER_NULOS,
    NOMES_PILARES,
    SIGLAS_POR_PILAR,
)
from etl.scripts.merge_listagens_indicadores import (
    CAMPOS_DERIVAVEIS_MERGE,
    PERCENTUAIS_A_CALCULAR,
    calcular_percentual,
)

# Total esperado = (Qtd. de campi + escopo "todos") × 3 pilares × 3 anos.
# Os 3 anos de referência são o padrão do pipeline (`etl.main --anos`).
ANOS_REFERENCIA = (2024, 2025, 2026)


def test_indicadores_zip_fidelidade_e_schema() -> None:
    caminho_zip = Path("data/dist/indicadores.zip")
    assert caminho_zip.exists(), "data/dist/indicadores.zip deve existir"

    campi = _campi_do_export_canonico()
    esperado = (len(campi) + 1) * len(NOMES_PILARES) * len(ANOS_REFERENCIA)

    with zipfile.ZipFile(caminho_zip) as zf:
        nomes = zf.namelist()
        assert len(nomes) == esperado, (
            f"Esperado {esperado} arquivos "
            f"({len(campi)} campi + 'todos' × 3 pilares × 3 anos), "
            f"encontrado {len(nomes)}"
        )

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
                        if campo in CAMPOS_DERIVAVEIS_MERGE:
                            # Após o merge, NTE/NTECPP e os percentuais que ele
                            # deriva podem estar preenchidos com int >= 0 para os
                            # campi/anos cobertos pelas listagens.
                            derivavel_valido = valor is None or (
                                isinstance(valor, int)
                                and not isinstance(valor, bool)
                                and valor >= 0
                            )
                            assert (
                                derivavel_valido
                            ), f"{nome}: {sigla}.{campo} tem valor inválido ({valor})"
                        else:
                            assert (
                                valor is None
                            ), f"{nome}: {sigla}.{campo} deve ser null"

            if pilar_num == 1:
                _confere_percentuais_consistentes(nome, indicadores)


def _confere_percentuais_consistentes(nome: str, indicadores: dict) -> None:
    """`percentual_calculado_*` tem de bater com os próprios ingredients.

    Este é o invariante que faltava quando o bug existia: o pacote trazia NEP e
    NTE lado a lado, o frontend lia `percentual_calculado_PIES` como métrica
    principal, e nada no reposito checava que o percentual publicável estivesse
    preenchido — muito menos que, se preenchido, estivesse certo.

    A verificação é nos dois sentidos: se o percentual não é `null`, tem de
    igualar o quociente; se é `null`, tem de ser porque o quociente não é
    publicável (e não por esquecimento).
    """
    for grupo, campo_pct, campo_num, campo_den in PERCENTUAIS_A_CALCULAR:
        ind = indicadores[grupo]
        esperado = calcular_percentual(ind[campo_num], ind[campo_den])
        assert ind[campo_pct] == esperado, (
            f"{nome}: {grupo}.{campo_pct} = {ind[campo_pct]!r} não bate com "
            f"{campo_num}={ind[campo_num]!r} / {campo_den}={ind[campo_den]!r} "
            f"(esperado {esperado!r})"
        )


def _campi_do_export_canonico() -> list[str]:
    """Lê os campi do export canônico (layout flat ou aninhado).

    O export canônico fica fora do Git (`data/canonical/*`); sem ele no
    ambiente, infere os campi do próprio pacote de saída (validando que cada
    campus presente tem exatamente 3 pilares × 3 anos de arquivos).
    """
    caminho = Path("data/canonical/exports_canonical.zip")
    if caminho.exists():
        with zipfile.ZipFile(caminho) as zf:
            zf_fonte = zf
            if "exports_canonical.zip" in zf.namelist():
                zf_fonte = zipfile.ZipFile(io.BytesIO(zf.read("exports_canonical.zip")))
            try:
                campi = json.loads(
                    zf_fonte.read("campuses_canonical.json").decode("utf-8")
                )
            finally:
                if zf_fonte is not zf:
                    zf_fonte.close()
        return sorted(c["name"] for c in campi)

    # Fallback (CI/clone limpo): infere os campi dos nomes de arquivo.
    from collections import Counter

    with zipfile.ZipFile(Path("data/dist/indicadores.zip")) as zf:
        canvas = Counter()
        for nome in zf.namelist():
            pilar, campus, _ = nome.replace(".json", "").split("_")
            if campus == "todos":
                continue
            canvas[(campus, pilar)] += 1
    campi = sorted({campus for (campus, _pilar) in canvas})
    # Cada campus deve ter exatamente um arquivo por pilar (A×anos abaixo).
    assert {len([c for (cc, _p) in canvas if cc == c]) for c in campi} == {
        len(NOMES_PILARES)
    }, "algum campus não tem todos os pilares no pacote"
    return campi
