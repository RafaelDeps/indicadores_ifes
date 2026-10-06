"""Testes do portão de governança (feature 016, FR-016).

Cobre as regras P-1 a P-5 de `specs/016-download-data-files/contracts/
pagina-downloads.md` §C-2, e a regra Gg-5 (`contem`) que P-1 sozinho não cobre.

O portão tem uma propriedade que nenhum outro verificador do repositório tem: ele
decide se **dado pessoal** é publicado. Por isso os testes de falha importam
tanto quanto os de sucesso — um gate que falha aberto é pior do que um gate
ausente, porque falha aberto de forma silenciosa.
"""

from __future__ import annotations

import textwrap
from pathlib import Path

import pytest
import yaml

from etl.scripts.check_governanca import (
    Pendencia,
    avaliar_pendencias,
    main,
)

# Referência do projeto (contratos/pagina-downloads.md §C-2):
#   gate aberto, insumos copiados          -> OK:    stdout, exit 0
#   gate fechado (pendência listada)       -> AVISO: stdout, exit 0
#   registro de pendências ausente/ilegível-> ERRO:  stderr, exit 1
#   insumo declarado indisponível em disco -> ERRO:  stderr, exit 1


def _escrever_registro(
    raiz: Path, caminho: str, conteudo: str = "registrado\n"
) -> Path:
    destino = raiz / caminho
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(conteudo, encoding="utf-8")
    return destino


def _escrever_pendencias(
    raiz: Path,
    pendencias: list[dict],
    nome: str = "pendencias.yaml",
) -> Path:
    destino = raiz / ".specify" / "governanca" / nome
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(
        yaml.safe_dump({"pendencias": pendencias}, allow_unicode=True),
        encoding="utf-8",
    )
    return destino


@pytest.fixture()
def raiz(tmp_path: Path) -> Path:
    """Repositório mínimo: agregado e insumos brutos presentes.

    O agregado entra porque o portão o publica independente do veredito (P-3) e
    o valor padrão de `--agregado` aponta para ele. Um repositório real sempre o
    tem — versionado, e o `check_dados` valida seu contrato antes do deploy.
    """
    _escrever_registro(raiz_ := tmp_path, "reg-a.md")
    _escrever_registro(raiz_, "reg-b.md")
    _escrever_registro(raiz_, "data/dist/indicadores.zip", "zip-agregado")
    _escrever_registro(raiz_, "data/canonical/exports_canonical.zip", "zip-canonico")
    for ano in (2024, 2025):
        for semestre in (1, 2):
            _escrever_registro(
                raiz_, f"data/raw/listagem_{ano}_{semestre}.xlsx", "xlsx"
            )
    return raiz_


# --------------------------------------------------------------------------
# P-1 — o gate abre se, e somente se, toda pendência está resolvida
# --------------------------------------------------------------------------


def test_p1_gate_aberto_quando_todo_registro_existe(raiz: Path, capsys) -> None:
    """P-1: toda pendência com `registro` existente => gate aberto, exit 0."""
    pendencias = _escrever_pendencias(
        raiz,
        [
            {"id": "a", "descricao": "primeira", "registro": "reg-a.md"},
            {"id": "b", "descricao": "segunda", "registro": "reg-b.md"},
        ],
    )

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    captured = capsys.readouterr()
    assert codigo == 0, captured.err
    assert captured.out.startswith("OK:")
    assert captured.err == ""


def test_p1_gate_fechado_quando_um_registro_falta(raiz: Path, capsys) -> None:
    """P-1: um único `registro` ausente fecha o gate, mesmo com os demais OK."""
    pendencias = _escrever_pendencias(
        raiz,
        [
            {"id": "a", "descricao": "primeira", "registro": "reg-a.md"},
            {"id": "b", "descricao": "segunda", "registro": "reg-inexistente.md"},
        ],
    )

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    captured = capsys.readouterr()
    assert codigo == 0, "gate fechado é AVISO:, nunca falha de build (P-3)"
    assert captured.out.startswith("AVISO:")
    assert "b" in captured.out


def test_p1_gate_aberto_quando_lista_vazia(raiz: Path, capsys) -> None:
    """P-1: `pendencias: []` não tem nada a resolver => gate aberto."""
    pendencias = _escrever_pendencias(raiz, [])

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    assert codigo == 0
    assert capsys.readouterr().out.startswith("OK:")


# --------------------------------------------------------------------------
# Gg-5 — `contem` distingue estados do mesmo arquivo (fail-closed)
# --------------------------------------------------------------------------


def test_gg5_registro_existente_sem_string_exigida_mantem_gate_fechado(
    raiz: Path, capsys
) -> None:
    """Gg-5: `registro` existe mas não contém a string => NÃO resolvida.

    Este é o caso da constitution: o arquivo existe desde 1.0.0, e a versão 2.0.0
    é o que autoriza publicar dado pessoal. Sem `contem`, o gate abriria com a
    emenda ausente.
    """
    _escrever_registro(raiz, "constitution.md", "**Version**: 1.1.0\n")
    pendencias = _escrever_pendencias(
        raiz,
        [
            {
                "id": "emenda",
                "descricao": "emenda da constitution",
                "registro": "constitution.md",
                "contem": "**Version**: 2.0.0",
            }
        ],
    )

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    captured = capsys.readouterr()
    assert codigo == 0
    assert captured.out.startswith("AVISO:")
    assert "emenda" in captured.out


def test_gg5_registro_com_string_exigida_abre_o_gate(raiz: Path, capsys) -> None:
    """Gg-5: `registro` existe E contém a string => resolvida."""
    _escrever_registro(raiz, "constitution.md", "**Version**: 2.0.0\n")
    pendencias = _escrever_pendencias(
        raiz,
        [
            {
                "id": "emenda",
                "descricao": "emenda da constitution",
                "registro": "constitution.md",
                "contem": "**Version**: 2.0.0",
            }
        ],
    )

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    assert codigo == 0
    assert capsys.readouterr().out.startswith("OK:")


# --------------------------------------------------------------------------
# P-2 — gate fechado omite os insumos, sem apagá-los e sem quebrar
# --------------------------------------------------------------------------


def test_p2_gate_fechado_nao_copia_insumos(raiz: Path, capsys) -> None:
    """P-2: com o gate fechado, `public/dados/` recebe só o agregado."""
    pendencias = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "ausente.md"}]
    )
    saida = raiz / "public" / "dados"
    _escrever_registro(raiz, "data/dist/indicadores.zip", "zip-agregado")

    codigo = main(
        [
            "--pendencias",
            str(pendencias),
            "--raiz",
            str(raiz),
            "--saida-insumos",
            str(saida),
        ]
    )

    assert codigo == 0
    assert sorted(p.name for p in saida.iterdir()) == ["indicadores.zip"]
    # Os insumos continuam intactos na origem: omitir ≠ apagar.
    assert (raiz / "data/canonical/exports_canonical.zip").exists()
    assert (raiz / "data/raw/listagem_2024_1.xlsx").exists()


def test_p2_gate_fechado_apaga_copia_de_execucao_anterior(raiz: Path, capsys) -> None:
    """P-2: fechar o portão remove o que uma execução aberta deixou lá.

    Este é o teste que decide se o portão é "fechado" ou apenas silencioso.
    `public/dados/` não é limpo entre execuções, e o Astro copia `public/` para
    `dist/` no início do build: se uma execução com o portão aberto deixou
    `exports_canonical.zip` ali, uma execução seguinte que apenas se recusasse a
    copiá-lo o serviria — com o log anunciando "omitidos".
    """
    aberto = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "reg-a.md"}]
    )
    saida = raiz / "public" / "dados"
    _escrever_registro(raiz, "data/dist/indicadores.zip", "zip-agregado")

    assert (
        main(
            [
                "--pendencias",
                str(aberto),
                "--raiz",
                str(raiz),
                "--saida-insumos",
                str(saida),
            ]
        )
        == 0
    )
    assert (
        saida / "exports_canonical.zip"
    ).exists(), "pré-condição: portão aberto publicou"

    fechado = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "ausente.md"}]
    )
    assert (
        main(
            [
                "--pendencias",
                str(fechado),
                "--raiz",
                str(raiz),
                "--saida-insumos",
                str(saida),
            ]
        )
        == 0
    )

    assert not (
        saida / "exports_canonical.zip"
    ).exists(), "cópia de dado pessoal sobreviveu ao fechamento do portão"
    assert not (saida / "listagem_2024_1.xlsx").exists()
    # Fechar o portão não tira o agregado: o site precisa dele (P-3).
    assert (saida / "indicadores.zip").exists()


def test_p2_limpeza_preserva_o_gitkeep(raiz: Path, capsys) -> None:
    """P-2: `public/dados/` é versionado só pelo `.gitkeep`; a limpeza o preserva."""
    pendencias = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "ausente.md"}]
    )
    saida = raiz / "public" / "dados"
    saida.mkdir(parents=True, exist_ok=True)
    (saida / ".gitkeep").write_text("", encoding="utf-8")
    _escrever_registro(raiz, "data/dist/indicadores.zip", "zip-agregado")

    codigo = main(
        [
            "--pendencias",
            str(pendencias),
            "--raiz",
            str(raiz),
            "--saida-insumos",
            str(saida),
        ]
    )

    assert codigo == 0
    assert (
        saida / ".gitkeep"
    ).exists(), ".gitkeep apagado: public/dados/ sairia do Git"


def test_p2_limpeza_remove_diretorio_onde_esperava_o_artefato(
    raiz: Path, capsys
) -> None:
    """P-2: um diretório onde o artefato deveria estar também sai.

    Sem remover, a cópia seguinte falha com `IsADirectoryError` e o artefato fica
    indisponível sem causa visível — o sintoma parece ser de dado ausente.
    """
    pendencias = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "reg-a.md"}]
    )
    saida = raiz / "public" / "dados"
    _escrever_registro(raiz, "data/dist/indicadores.zip", "zip-agregado")
    saida.mkdir(parents=True, exist_ok=True)
    (saida / "exports_canonical.zip").mkdir()

    codigo = main(
        [
            "--pendencias",
            str(pendencias),
            "--raiz",
            str(raiz),
            "--saida-insumos",
            str(saida),
        ]
    )

    assert codigo == 0
    assert (saida / "exports_canonical.zip").is_file()
    assert (saida / "indicadores.zip").is_file()


def test_p2_limpeza_nao_sai_de_public_dados(raiz: Path, capsys) -> None:
    """P-2: a limpeza é contida em `public/dados/` e não toca nos vizinhos."""
    pendencias = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "ausente.md"}]
    )
    saida = raiz / "public" / "dados"
    saida.mkdir(parents=True, exist_ok=True)
    (saida / "exports_canonical.zip").write_text("resto", encoding="utf-8")
    vizinho = raiz / "public" / "exports_canonical.zip"
    vizinho.write_text("vizinho", encoding="utf-8")
    _escrever_registro(raiz, "data/dist/indicadores.zip", "zip-agregado")

    codigo = main(
        [
            "--pendencias",
            str(pendencias),
            "--raiz",
            str(raiz),
            "--saida-insumos",
            str(saida),
        ]
    )

    assert codigo == 0
    assert vizinho.exists(), "a limpeza subiu um nível demais"
    # E a origem continua: limpar a saída não é apagar a fonte.
    assert (raiz / "data/canonical/exports_canonical.zip").exists()


def test_p2_apenas_verificar_nao_copia_nada(raiz: Path, capsys) -> None:
    """P-2: `--apenas-verificar` não escreve em `public/dados/`."""
    pendencias = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "reg-a.md"}]
    )
    saida = raiz / "public" / "dados"
    saida.mkdir(parents=True, exist_ok=True)

    codigo = main(
        [
            "--pendencias",
            str(pendencias),
            "--raiz",
            str(raiz),
            "--saida-insumos",
            str(saida),
            "--apenas-verificar",
        ]
    )

    assert codigo == 0
    assert list(saida.iterdir()) == []


# --------------------------------------------------------------------------
# P-3 — gate fechado não impede o build
# --------------------------------------------------------------------------


def test_p3_gate_fechado_mantem_o_agregado_publicado(raiz: Path, capsys) -> None:
    """P-3: o agregado é publicado mesmo com o gate fechado (exit 0)."""
    pendencias = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "ausente.md"}]
    )
    saida = raiz / "public" / "dados"
    _escrever_registro(raiz, "data/dist/indicadores.zip", "zip-agregado")

    codigo = main(
        [
            "--pendencias",
            str(pendencias),
            "--raiz",
            str(raiz),
            "--saida-insumos",
            str(saida),
        ]
    )

    captured = capsys.readouterr()
    assert codigo == 0
    assert "indicadores.zip" in [p.name for p in saida.iterdir()]
    assert captured.out.count("OK:") == 1


# --------------------------------------------------------------------------
# P-4 — pendência sem registro é NÃO resolvida, nunca resolvida por omissão
# --------------------------------------------------------------------------


def test_p4_chave_registro_ausente_ou_nula_mantem_gate_fechado(
    raiz: Path, capsys
) -> None:
    """P-4: `registro` omitido ou `null` é pendência não resolvida.

    Uma chave ausente é a forma mais sutil de falha aberta: um YAML escrito sem
    `registro` não pode ser lido como "nada a verificar".
    """
    pendencias = _escrever_pendencias(
        raiz,
        [
            {"id": "sem-chave", "descricao": "não tem registro"},
            {"id": "nulo", "descricao": "registro nulo", "registro": None},
        ],
    )

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    captured = capsys.readouterr()
    assert codigo == 0
    assert captured.out.startswith("AVISO:")
    assert "sem-chave" in captured.out
    assert "nulo" in captured.out


# --------------------------------------------------------------------------
# P-5 — a saída nomeia quais pendências bloqueiam e como quitá-las
# --------------------------------------------------------------------------


def test_p5_saida_nomeia_quais_e_como_quitar(raiz: Path, capsys) -> None:
    """P-5: o `AVISO:` diz o id, a descrição e o caminho do registro faltante."""
    pendencias = _escrever_pendencias(
        raiz,
        [
            {
                "id": "emenda-principio-iv",
                "descricao": "Emenda MAJOR do Princípio IV",
                "registro": "constitution.md",
                "contem": "**Version**: 2.0.0",
            }
        ],
    )

    main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    saida = capsys.readouterr().out
    assert "emenda-principio-iv" in saida
    assert "Emenda MAJOR do Princípio IV" in saida
    assert "como quitar" in saida
    assert "constitution.md" in saida


def test_p5_relatorio_aviso_visitante_nao_vaza_para_o_log(raiz: Path, capsys) -> None:
    """Gg-6: `aviso_visitante` é para a página, não para o log do portão.

    O log do portão é lido por quem mantém; o aviso é lido por visitante. Um não
    substitui o outro, e o texto do visitante não pode carregar "1.1.0 -> 2.0.0".
    """
    pendencias = _escrever_pendencias(
        raiz,
        [
            {
                "id": "emenda",
                "descricao": "detalhe interno 1.1.0 -> 2.0.0",
                "registro": "ausente.md",
                "aviso_visitante": "Os arquivos de origem serão liberados em breve.",
            }
        ],
    )

    main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    saida = capsys.readouterr().out
    assert "detalhe interno" in saida
    assert "liberados em breve" not in saida


# --------------------------------------------------------------------------
# Erros de infraestrutura — ERRO: em stderr, exit 1
# --------------------------------------------------------------------------


def test_registro_inexistente_vira_erro(tmp_path: Path, capsys) -> None:
    """Registro de pendências ausente é ERRO: + exit 1 (não AVISO: silencioso)."""
    codigo = main(
        ["--pendencias", str(tmp_path / "nao-existe.yaml"), "--raiz", str(tmp_path)]
    )

    captured = capsys.readouterr()
    assert codigo == 1
    assert captured.err.startswith("ERRO:")
    assert captured.out == ""


def test_yaml_ilegivel_vira_erro(tmp_path: Path, capsys) -> None:
    """YAML sintaticamente inválido é ERRO: + exit 1."""
    pendencias = tmp_path / "quebrado.yaml"
    pendencias.write_text(
        "pendencias: [\n  - id: a\n   descricao: desalinhado\n", "utf-8"
    )

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(tmp_path)])

    captured = capsys.readouterr()
    assert codigo == 1
    assert captured.err.startswith("ERRO:")


def test_yaml_sem_chave_pendencias_vira_erro(tmp_path: Path, capsys) -> None:
    """YAML válido mas sem `pendencias` é ERRO: — não pode ser lido como vazio.

    Um arquivo `{}` seria indistinguível de "ninguém escreveu nada", e a falha
    aberta resultante é exatamente o que o gate existe para evitar.
    """
    pendencias = tmp_path / "vazio.yaml"
    pendencias.write_text("outra_coisa: 1\n", encoding="utf-8")

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(tmp_path)])

    captured = capsys.readouterr()
    assert codigo == 1
    assert captured.err.startswith("ERRO:")


def test_registro_sem_caminho_absoluto_nao_escapa_da_raiz(
    tmp_path: Path, capsys
) -> None:
    """`registro` com `..` que resolve fora da raiz é ERRO: (fail-closed).

    Um `registro` apontando para fora do repositório faria o gate declarar
    "resolvida" por causa de um arquivo que o repositório não controla.
    """
    fora = tmp_path / "fora"
    fora.mkdir()
    (fora / "revisao.md").write_text("ok", encoding="utf-8")
    raiz = tmp_path / "raiz"
    raiz.mkdir()
    pendencias = _escrever_pendencias(
        raiz, [{"id": "p", "descricao": "d", "registro": "../fora/revisao.md"}]
    )

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    captured = capsys.readouterr()
    assert codigo == 1
    assert captured.err.startswith("ERRO:")


def test_ids_duplicados_viram_erro(raiz: Path, capsys) -> None:
    """Gg-1: `id` duplicado é ERRO: — dois registros para a mesma pendência."""
    pendencias = _escrever_pendencias(
        raiz,
        [
            {"id": "mesmo", "descricao": "primeira", "registro": "reg-a.md"},
            {"id": "mesmo", "descricao": "segunda", "registro": "reg-b.md"},
        ],
    )

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    captured = capsys.readouterr()
    assert codigo == 1
    assert "mesmo" in captured.err


# --------------------------------------------------------------------------
# Insumo declarado e ausente em disco
# --------------------------------------------------------------------------


def test_insumo_ausente_na_origem_e_erro(raiz: Path, capsys) -> None:
    """Insumo declarado no registro e ausente na origem é ERRO: + exit 1.

    Diferente de uma pendência: aqui o problema não é de governança, é de
    integridade do que se promete publicar. Não é omitido em silêncio.
    """
    pendencias = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "reg-a.md"}]
    )
    saida = raiz / "public" / "dados"
    _escrever_registro(raiz, "data/dist/indicadores.zip", "zip-agregado")

    codigo = main(
        [
            "--pendencias",
            str(pendencias),
            "--raiz",
            str(raiz),
            "--saida-insumos",
            str(saida),
            "--insumos",
            "data/canonical/exports_canonical.zip",
            "data/raw/ausente.xlsx",
        ]
    )

    captured = capsys.readouterr()
    assert codigo == 1
    assert "ausente.xlsx" in captured.err


def test_gate_aberto_copia_todos_os_insumos_declarados(raiz: Path, capsys) -> None:
    """Gate aberto: agregado e insumos brutos chegam a `public/dados/`."""
    pendencias = _escrever_pendencias(
        raiz, [{"id": "a", "descricao": "p", "registro": "reg-a.md"}]
    )
    saida = raiz / "public" / "dados"
    _escrever_registro(raiz, "data/dist/indicadores.zip", "zip-agregado")

    codigo = main(
        [
            "--pendencias",
            str(pendencias),
            "--raiz",
            str(raiz),
            "--saida-insumos",
            str(saida),
            "--insumos",
            "data/canonical/exports_canonical.zip",
            "data/raw/listagem_2024_1.xlsx",
        ]
    )

    assert codigo == 0, capsys.readouterr().err
    assert sorted(p.name for p in saida.iterdir()) == [
        "exports_canonical.zip",
        "indicadores.zip",
        "listagem_2024_1.xlsx",
    ]


# --------------------------------------------------------------------------
# Unidade — avaliação de pendências isolada da I/O
# --------------------------------------------------------------------------


def test_avaliar_pendencias_presente_marca_resolvida(raiz: Path) -> None:
    """`avaliar_pendencias` resolve contra o disco, sem I/O de cópia."""
    resultado = avaliar_pendencias(
        [Pendencia(id="a", descricao="d", registro="reg-a.md", contem=None)],
        raiz=raiz,
    )

    assert resultado.aberto is True
    assert resultado.pendencias[0].resolvida is True


def test_avaliar_pendencias_devolve_motivo_por_pendencia(raiz: Path) -> None:
    """Cada pendência não resolvida carrega o motivo — nada de booleano nu."""
    resultado = avaliar_pendencias(
        [
            Pendencia(id="ok", descricao="d", registro="reg-a.md", contem=None),
            Pendencia(
                id="sem-conteudo",
                descricao="d",
                registro="reg-a.md",
                contem="**Version**: 2.0.0",
            ),
            Pendencia(id="sem-registro", descricao="d", registro=None, contem=None),
        ],
        raiz=raiz,
    )

    assert resultado.aberto is False
    por_id = {p.id: p for p in resultado.pendencias}
    assert por_id["ok"].resolvida is True
    assert por_id["ok"].motivo is None
    assert por_id["sem-conteudo"].motivo is not None
    assert "2.0.0" in por_id["sem-conteudo"].motivo
    assert por_id["sem-registro"].motivo is not None


def test_registro_vazio_e_pendencia_nao_resolvida(raiz: Path) -> None:
    """`registro: ""` não é um caminho: é pendência não resolvida."""
    resultado = avaliar_pendencias(
        [Pendencia(id="vazio", descricao="d", registro="", contem=None)], raiz=raiz
    )

    assert resultado.aberto is False


def test_leitor_ignora_comentarios_e_chaves_desconhecidas(raiz: Path, capsys) -> None:
    """Comentários e chaves futuras não quebram a leitura (Gg-1 tolerante)."""
    pendencias = raiz / ".specify" / "governanca" / "comentado.yaml"
    pendencias.parent.mkdir(parents=True, exist_ok=True)
    pendencias.write_text(
        textwrap.dedent("""\
            # comentário de topo
            pendencias:
              - id: a
                descricao: primeira
                registro: reg-a.md
                chave_do_futuro: ignorada
                contem: reg
            """),
        encoding="utf-8",
    )

    codigo = main(["--pendencias", str(pendencias), "--raiz", str(raiz)])

    assert codigo == 0
    assert capsys.readouterr().out.startswith("OK:")
