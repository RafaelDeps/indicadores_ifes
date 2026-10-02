from __future__ import annotations

import json
import zipfile
from pathlib import Path

import pytest

from etl.adapters.sinks.json_pilar_sink import formatar_arquivos_pilar
from etl.core.logic.models import AgregadosCampus, RegistroPilarJson
from etl.scripts.merge_listagens_indicadores import main, merge_arquivos

PILAR1_SERRA_2025 = "pilar1_serra_2025.json"


def _serializar(dados: dict) -> str:
    return json.dumps(dados, ensure_ascii=False, indent=2) + "\n"


def _indicadores_pilar1(
    *,
    ntpp: int | None = None,
    qspp: int | None = None,
    nep: int | None = None,
    nte: int | None = None,
    ntecpp: int | None = None,
) -> dict:
    return {
        "NTPP": {
            "descricao": "Numero Total de Projetos de Pesquisa",
            "projetos_pesquisa_registrados_execucao": ntpp,
            "total_projetos_NTPP": ntpp,
        },
        "QSPP": {
            "descricao": "Quantitativo de Servidores Desenvolvendo Projetos",
            "SUPP_servidores_unicos_participantes": qspp,
            "total_servidores_QSPP": qspp,
        },
        "PIES": {
            "descricao": "Percentual de Estudantes Envolvidos em Pesquisa",
            "NEP_estudantes_em_pesquisa": nep,
            "NTE_total_estudantes_matriculados": nte,
            "percentual_calculado_PIES": None,
        },
        "PICOT": {
            "descricao": "Percentual de Estudantes Cotistas Envolvidos em Pesquisa",
            "NTECPP_cotistas_em_pesquisa": ntecpp,
            "NEP_total_estudantes_em_pesquisa": nep,
            "percentual_calculado_PICOT": None,
        },
    }


def _registro_pilar1(campus: str, ano: int, **kwargs) -> RegistroPilarJson:
    dados = {
        "campus": "Serra",
        "ano_referencia": ano,
        "pilar": "Engajamento Academico e Inclusao",
        "indicadores": _indicadores_pilar1(**kwargs),
    }
    return RegistroPilarJson(
        nome=f"pilar1_{campus}_{ano}.json", conteudo=_serializar(dados)
    )


def _pilares_2_3(campus: str, ano: int) -> list[RegistroPilarJson]:
    agregados = AgregadosCampus(campus_nome="Serra")
    return [
        a
        for a in formatar_arquivos_pilar(campus, agregados, ano)
        if a.nome.startswith(("pilar2_", "pilar3_"))
    ]


def _escrever_zip(caminho: Path, registros: list[RegistroPilarJson]) -> None:
    with zipfile.ZipFile(caminho, "w", zipfile.ZIP_DEFLATED) as zf:
        for reg in sorted(registros, key=lambda r: r.nome):
            zinfo = zipfile.ZipInfo(reg.nome, date_time=(1980, 1, 1, 0, 0, 0))
            zinfo.external_attr = 0o644 << 16
            zf.writestr(zinfo, reg.conteudo.encode("utf-8"))


def _canonico_serra_2025_com_dados() -> list[RegistroPilarJson]:
    return [
        _registro_pilar1("serra", 2025, ntpp=3, qspp=2, nep=10),
        *_pilares_2_3("serra", 2025),
    ]


def _listagens_serra_2025() -> list[RegistroPilarJson]:
    # NTECPP agora é o cruzamento NEP × cotistas por nome (FR-012); nos
    # fixtures usa-se um valor de match plausível em vez da conta de cotistas.
    return [
        _registro_pilar1("serra", 2025, nte=1857, ntecpp=93),
        *_pilares_2_3("serra", 2025),
    ]


def test_merge_sobrepoe_apenas_nte_e_ntecpp() -> None:
    merged = merge_arquivos(_listagens_serra_2025(), _canonico_serra_2025_com_dados())
    por_nome = {r.nome: r for r in merged}

    dados = json.loads(por_nome[PILAR1_SERRA_2025].conteudo)
    ind = dados["indicadores"]
    # Dados de pesquisa do canônico preservados intactos
    assert ind["NTPP"]["total_projetos_NTPP"] == 3
    assert ind["QSPP"]["total_servidores_QSPP"] == 2
    assert ind["PIES"]["NEP_estudantes_em_pesquisa"] == 10
    # Campos derivados preenchidos a partir das listagens
    assert ind["PIES"]["NTE_total_estudantes_matriculados"] == 1857
    assert ind["PICOT"]["NTECPP_cotistas_em_pesquisa"] == 93
    # Percentuais recalculados pelo merge a partir de NEP × NTE / NTECPP × NEP.
    # NEP=10 e NTE=1857 ⇒ 0,54% ⇒ 1; NTECPP=93 sobre NEP=10 ⇒ 930%.
    assert ind["PIES"]["percentual_calculado_PIES"] == 1
    assert ind["PICOT"]["percentual_calculado_PICOT"] == 930
    # Demais arquivos do pacote presentes
    for nome in ["pilar2_serra_2025.json", "pilar3_serra_2025.json"]:
        assert nome in por_nome


def test_merge_acrescenta_pilar1_inexistente_no_canonico() -> None:
    canonico = [_registro_pilar1("serra", 2024)]
    lista_2025 = [_registro_pilar1("serra", 2025, nte=1857, ntecpp=93)]

    merged = merge_arquivos(lista_2025, canonico)
    nomes = {r.nome for r in merged}

    assert "pilar1_serra_2024.json" in nomes
    assert PILAR1_SERRA_2025 in nomes
    lista_24_dados = json.loads(
        next(r for r in merged if r.nome == "pilar1_serra_2024.json").conteudo
    )
    assert lista_24_dados["indicadores"]["NTPP"]["total_projetos_NTPP"] is None


def test_merge_canonico_vence_para_pilar2_e_3() -> None:
    canonico = _canonico_serra_2025_com_dados()
    listagens = _listagens_serra_2025() + _pilares_2_3("serra", 2026)

    merged = merge_arquivos(listagens, canonico)
    por_nome = {r.nome: r for r in merged}

    # Pilar 2/3 existentes no canônico NÃO são substituídos pela versão listagens
    p2_can = next(r for r in canonico if r.nome == "pilar2_serra_2025.json")
    p3_can = next(r for r in canonico if r.nome == "pilar3_serra_2025.json")
    assert por_nome["pilar2_serra_2025.json"].conteudo == p2_can.conteudo
    assert por_nome["pilar3_serra_2025.json"].conteudo == p3_can.conteudo
    # Pilar 2/3 ausentes no canônico são acrescentados das listagens
    assert "pilar2_serra_2026.json" in por_nome
    assert "pilar3_serra_2026.json" in por_nome


def test_merge_deterministico_e_idempotente() -> None:
    canonico = _canonico_serra_2025_com_dados()
    listagens = _listagens_serra_2025()

    primeira = merge_arquivos(listagens, canonico)
    segunda = merge_arquivos(listagens, canonico)
    bytes_1 = [r.conteudo for r in primeira]
    bytes_2 = [r.conteudo for r in segunda]
    assert bytes_1 == bytes_2

    terceira = merge_arquivos(listagens, primeira)
    assert [r.conteudo for r in terceira] == bytes_1


def test_merge_rejeita_pilar1_com_estrutura_divergente() -> None:
    """Diff de chaves: shape diferente do canônico ⇒ merge recusado."""
    canonico = _canonico_serra_2025_com_dados()
    # Listagens com grupo QSPP ausente (estrutura divergente do canônico)
    dados = {
        "campus": "Serra",
        "ano_referencia": 2025,
        "pilar": "Engajamento Academico e Inclusao",
        "indicadores": {
            "NTPP": _indicadores_pilar1(nte=None)["NTPP"],
            "PIES": _indicadores_pilar1(nte=1857)["PIES"],
            "PICOT": _indicadores_pilar1(ntecpp=93)["PICOT"],
        },
    }
    divergente = [
        RegistroPilarJson(nome=PILAR1_SERRA_2025, conteudo=_serializar(dados))
    ]

    with pytest.raises(ValueError, match="diff de chaves"):
        merge_arquivos(divergente, canonico)


def test_merge_rejeita_valor_invalido_para_campo_derivado() -> None:
    canonico = _canonico_serra_2025_com_dados()
    dados = {
        "campus": "Serra",
        "ano_referencia": 2025,
        "pilar": "Engajamento Academico e Inclusao",
        "indicadores": _indicadores_pilar1(nte=True, ntecpp=93),
    }
    invalido = [RegistroPilarJson(nome=PILAR1_SERRA_2025, conteudo=_serializar(dados))]

    with pytest.raises(ValueError, match="valor inválido"):
        merge_arquivos(invalido, canonico)


def test_merge_rejeita_campo_derivado_ausente_em_ambos() -> None:
    """Campo derivado ausente nos DOIS pacotes ⇒ recusa, não KeyError.

    O diff de chaves (`_chaves`) compara a forma de listagens e canônico entre
    si; ele não garante que o campo exista. Se `NTECPP_cotistas_em_pesquisa`
    faltar dos dois lados, as formas são iguais, o merge passa pela verificação
    de estrutura e a linha 113 levanta `KeyError` — que o `except ValueError` do
    `main` não pega, então o CLI morre com traceback em vez de `ERRO:` + 1.
    """
    indicadores = _indicadores_pilar1(nte=1857, ntecpp=93)
    del indicadores["PICOT"]["NTECPP_cotistas_em_pesquisa"]

    dados = {
        "campus": "Serra",
        "ano_referencia": 2025,
        "pilar": "Engajamento Academico e Inclusao",
        "indicadores": indicadores,
    }
    sem_ntecpp = [
        RegistroPilarJson(nome=PILAR1_SERRA_2025, conteudo=_serializar(dados))
    ]

    # As formas são idênticas (ambos sem o campo) — o diff de chaves NÃO barra.
    canonico = sem_ntecpp
    with pytest.raises(ValueError, match="ausente"):
        merge_arquivos(sem_ntecpp, canonico)


def test_merge_cli_rejeita_listagens_corrompido(tmp_path: Path, capsys) -> None:
    """Entrada corrompida ⇒ `ERRO:` + exit 1 (contrato §3), não traceback."""
    corrompido = tmp_path / "listagens.zip"
    corrompido.write_bytes(b"PK\x03\x04nao-e-zip")
    saida = tmp_path / "saida.zip"

    rc = main(
        [
            "--listagens",
            str(corrompido),
            "--canonical",
            str(corrompido),
            "--saida",
            str(saida),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 1
    assert err.startswith("ERRO:")
    assert not saida.exists()


def test_merge_cli_rejeita_canonico_corrompido(tmp_path: Path, capsys) -> None:
    """Canônico corrompido também é falha fatal, não `AVISO:` + merge parcial."""
    listagens_ok = tmp_path / "indicadores_listagens.zip"
    _escrever_zip(listagens_ok, _listagens_serra_2025())
    corrompido = tmp_path / "indicadores.zip"
    corrompido.write_bytes(b"PK\x03\x04nao-e-zip")
    saida = tmp_path / "saida.zip"

    rc = main(
        [
            "--listagens",
            str(listagens_ok),
            "--canonical",
            str(corrompido),
            "--saida",
            str(saida),
        ]
    )

    err = capsys.readouterr().err
    assert rc == 1
    assert err.startswith("ERRO:")
    assert not saida.exists()


def test_merge_cli_escreve_zip_deterministico(tmp_path: Path) -> None:
    zip_can = tmp_path / "indicadores.zip"
    zip_list = tmp_path / "indicadores_listagens.zip"
    saida = tmp_path / "merged.zip"
    _escrever_zip(zip_can, _canonico_serra_2025_com_dados())
    _escrever_zip(zip_list, _listagens_serra_2025())

    rc = main(
        [
            "--listagens",
            str(zip_list),
            "--canonical",
            str(zip_can),
            "--saida",
            str(saida),
        ]
    )
    assert rc == 0
    with zipfile.ZipFile(saida) as zf:
        dados = json.loads(zf.read(PILAR1_SERRA_2025))
    assert dados["indicadores"]["PIES"]["NTE_total_estudantes_matriculados"] == 1857
    assert dados["indicadores"]["PICOT"]["NTECPP_cotistas_em_pesquisa"] == 93
    assert dados["indicadores"]["NTPP"]["total_projetos_NTPP"] == 3


def test_merge_cli_sem_canonico_parte_das_listagens(tmp_path: Path) -> None:
    zip_list = tmp_path / "indicadores_listagens.zip"
    saida = tmp_path / "merged.zip"
    _escrever_zip(zip_list, _listagens_serra_2025())

    rc = main(
        [
            "--listagens",
            str(zip_list),
            "--canonical",
            str(tmp_path / "nao_existe.zip"),
            "--saida",
            str(saida),
        ]
    )
    assert rc == 0
    assert saida.exists()
    with zipfile.ZipFile(saida) as zf:
        dados = json.loads(zf.read(PILAR1_SERRA_2025))
    assert dados["indicadores"]["PIES"]["NTE_total_estudantes_matriculados"] == 1857


def test_merge_cli_erro_quando_listagens_ausente(tmp_path: Path) -> None:
    zip_can = tmp_path / "indicadores.zip"
    saida = tmp_path / "merged.zip"
    _escrever_zip(zip_can, _canonico_serra_2025_com_dados())

    rc = main(
        [
            "--listagens",
            str(tmp_path / "nao_existe.zip"),
            "--canonical",
            str(zip_can),
            "--saida",
            str(saida),
        ]
    )
    assert rc == 1
    assert not saida.exists()


# ---------------------------------------------------------------------------
# Recalculo dos percentuais PIES/PICOT pelo merge (PRINCIPIO II: testes antes
# da implementacao).
#
# O fluxo canonico NAO tem NTE (vem das listagens) e por isso emite
# `percentual_calculado_PIES`/`_PICOT` como null. Apos o merge os dois
# ingredientes estao no mesmo arquivo, logo o percentual passa a ser
# publicavel. Referencia de formula: `src/data/indicadores.ts`
# (`PIES = (NEP / NTE) x 100`, `PICOT = (NTECPP / NEP) x 100`).
# ---------------------------------------------------------------------------


def _pilar1_do_merge(
    *, nep: int | None, nte: int | None, ntecpp: int | None
) -> tuple[RegistroPilarJson, RegistroPilarJson]:
    """Par (canonico, listagens) de um pilar1 com NEP/NTE/NTECPP controlados."""
    return (
        _registro_pilar1("serra", 2025, nep=nep),
        _registro_pilar1("serra", 2025, nte=nte, ntecpp=ntecpp),
    )


def _merge_percentuais(*, nep: int | None, nte: int | None, ntecpp: int | None) -> dict:
    canonico, listagens = _pilar1_do_merge(nep=nep, nte=nte, ntecpp=ntecpp)
    merged = merge_arquivos([listagens], [canonico])
    dados = json.loads(next(r for r in merged if r.nome == PILAR1_SERRA_2025).conteudo)
    return dados["indicadores"]


def test_merge_recalcula_percentuais_com_numerador_e_denominador() -> None:
    # Valores reais de Serra/2025: 422/1857 = 22,72% e 93/422 = 22,04%.
    ind = _merge_percentuais(nep=422, nte=1857, ntecpp=93)

    assert ind["PIES"]["percentual_calculado_PIES"] == 23
    assert ind["PICOT"]["percentual_calculado_PICOT"] == 22


def test_merge_percentual_e_inteiro() -> None:
    """O contrato de saida aceita `int >= 0`; float seria violacao de fidelidade."""
    ind = _merge_percentuais(nep=422, nte=1857, ntecpp=93)

    for grupo, campo in (
        ("PIES", "percentual_calculado_PIES"),
        ("PICOT", "percentual_calculado_PICOT"),
    ):
        valor = ind[grupo][campo]
        assert isinstance(valor, int)
        assert not isinstance(valor, bool)


def test_merge_percentual_arredonda_meia_para_cima() -> None:
    """1/8 = 12,5% — arredondamento bancário (12) publicaria o valor errado."""
    ind = _merge_percentuais(nep=1, nte=8, ntecpp=None)

    assert ind["PIES"]["percentual_calculado_PIES"] == 13


def test_merge_percentual_pies_null_sem_denominador_nte() -> None:
    """NTE ausente (campus/ano sem listagens) deixa o percentual não publicável."""
    ind = _merge_percentuais(nep=422, nte=None, ntecpp=93)

    assert ind["PIES"]["NTE_total_estudantes_matriculados"] is None
    assert ind["PIES"]["percentual_calculado_PIES"] is None


def test_merge_percentual_picot_null_quando_ntecpp_e_null() -> None:
    """NTECPP null = interseção vazia (Princípio III): não se publica 0%."""
    ind = _merge_percentuais(nep=422, nte=1857, ntecpp=None)

    assert ind["PIES"]["percentual_calculado_PIES"] == 23
    assert ind["PICOT"]["NTECPP_cotistas_em_pesquisa"] is None
    assert ind["PICOT"]["percentual_calculado_PICOT"] is None


def test_merge_percentual_null_quando_denominador_e_zero() -> None:
    """Divisão por zero não é publicável como 0% — seria um número inventado."""
    ind = _merge_percentuais(nep=0, nte=0, ntecpp=0)

    assert ind["PIES"]["percentual_calculado_PIES"] is None
    assert ind["PICOT"]["percentual_calculado_PICOT"] is None


def test_merge_percentual_picot_null_quando_nep_e_zero() -> None:
    ind = _merge_percentuais(nep=0, nte=1857, ntecpp=5)

    assert ind["PIES"]["percentual_calculado_PIES"] == 0
    assert ind["PICOT"]["percentual_calculado_PICOT"] is None


def test_merge_percentual_zerado_quando_numerador_e_zero() -> None:
    """0 é um valor real aqui (NEP=0 => 0% de participação), não um placeholder."""
    ind = _merge_percentuais(nep=0, nte=1857, ntecpp=None)

    assert ind["PIES"]["percentual_calculado_PIES"] == 0


def test_merge_nao_recalcula_percentual_de_pilar1_so_de_listagens() -> None:
    """Sem par canônico não há NEP; o arquivo entra verbatim, com percentual null."""
    lista_2025 = [_registro_pilar1("serra", 2025, nte=1857, ntecpp=93)]

    merged = merge_arquivos(lista_2025, [_registro_pilar1("serra", 2024)])
    entrada = next(r for r in merged if r.nome == PILAR1_SERRA_2025)

    assert entrada.conteudo == lista_2025[0].conteudo


def test_merge_cli_publica_percentuais_no_pacote(tmp_path: Path) -> None:
    """Prova de ponta a ponta: o sink aceita os percentuais e o pacote os contém."""
    zip_list = tmp_path / "listagens.zip"
    zip_can = tmp_path / "canonico.zip"
    saida = tmp_path / "saida.zip"
    _escrever_zip(zip_list, [_registro_pilar1("serra", 2025, nte=1857, ntecpp=93)])
    _escrever_zip(zip_can, [_registro_pilar1("serra", 2025, nep=422)])

    rc = main(
        [
            "--listagens",
            str(zip_list),
            "--canonical",
            str(zip_can),
            "--saida",
            str(saida),
        ]
    )

    assert rc == 0
    with zipfile.ZipFile(saida) as zf:
        dados = json.loads(zf.read(PILAR1_SERRA_2025))
    ind = dados["indicadores"]
    assert ind["PIES"]["percentual_calculado_PIES"] == 23
    assert ind["PICOT"]["percentual_calculado_PICOT"] == 22


def test_merge_cli_aceita_percentual_zero(tmp_path: Path) -> None:
    """0% é publicável (NEP=0 com NTE>0) e não pode ser barrado pela validação."""
    zip_list = tmp_path / "listagens.zip"
    zip_can = tmp_path / "canonico.zip"
    saida = tmp_path / "saida.zip"
    _escrever_zip(zip_list, [_registro_pilar1("serra", 2025, nte=1857, ntecpp=None)])
    _escrever_zip(zip_can, [_registro_pilar1("serra", 2025, nep=0)])

    rc = main(
        [
            "--listagens",
            str(zip_list),
            "--canonical",
            str(zip_can),
            "--saida",
            str(saida),
        ]
    )

    assert rc == 0
    with zipfile.ZipFile(saida) as zf:
        dados = json.loads(zf.read(PILAR1_SERRA_2025))
    assert dados["indicadores"]["PIES"]["percentual_calculado_PIES"] == 0
