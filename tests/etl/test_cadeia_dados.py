from __future__ import annotations

from pathlib import Path

from etl.scripts.cadeia_dados import main
from tests.etl.factories.pacotes import escrever_zip, registro_pilar1

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


def _derivado(ano: int) -> list:
    """Um registro de pilar com derivado preenchido — o que o merge escreve."""
    return [registro_pilar1("serra", ano, nte=10, ntecpp=2)]


def _cenario(
    tmp_path: Path,
    *,
    canonical: bool,
    listagens: bool,
    planilhas: bool,
    anos_pacote: tuple[int, ...] = (2025,),
    anos_listagens: tuple[int, ...] | None = None,
    listagens_ilegivel: bool = False,
):
    """Monta um estado de disco e devolve os caminhos usados nos argumentos.

    **FIXTURE (spec 012, T012).** Antes esta função gravava bytes que não são
    zip — `b"listagens"`, `b"pacote"`. Isso servia quando a guarda só perguntava
    `listagens.exists()`, e deixa de servir quando ela passa a **ler** a cobertura
    de dentro do zip: bytes soltos seriam lidos como insumo corrompido, e um
    teste verde sobre eles não provaria nada sobre a regra nova. Por isso o
    pacote e o zip de listagens passam a ser zips de verdade, montados pela
    fábrica, e a cobertura de cada lado é explícita.

    `anos_pacote` são os anos cujo derivado o pacote **tem hoje** — o que a
    cadeia reduziria. `anos_listagens` são os que o zip de listagens cobre; por
    omissão cobre exatamente o que o pacote tem, que é o estado saudável. As
    planilhas vão uma para cada ano de `anos_pacote`, porque é essa a condição
    para que a etapa 2 consiga repor o que a etapa 1 tiraria.

    O canônico vai como zip vazio: a guarda não o abre (`canonical.exists()`),
    mas gravar `b"canonical"` num ficheiro chamado `.zip` é um insumo que mente
    sobre si.
    """
    pasta = tmp_path / "dados"
    raw = pasta / "raw"
    raw.mkdir(parents=True, exist_ok=True)

    caminho_canonical = pasta / "exports_canonical.zip"
    caminho_listagens = pasta / "indicadores_listagens.zip"
    caminho_pacote = pasta / "indicadores.zip"

    cobertura_listagens = anos_pacote if anos_listagens is None else anos_listagens

    if canonical:
        escrever_zip(caminho_canonical, [])
    if listagens:
        if listagens_ilegivel:
            caminho_listagens.write_bytes(b"PK\x03\x04conteudo-que-nao-e-zip")
        else:
            escrever_zip(
                caminho_listagens,
                [r for ano in cobertura_listagens for r in _derivado(ano)],
            )
    if planilhas:
        for ano in anos_pacote:
            (raw / f"listagem_{ano}_1.xlsx").write_bytes(b"planilha")
    escrever_zip(caminho_pacote, [r for ano in anos_pacote for r in _derivado(ano)])

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


# --- 3.1 Cobertura (spec 012, US2): o zip existir não basta, tem de cobrir ------
#
# Até aqui a guarda perguntava `listagens.exists()`. A pergunta certa é outra: a
# cadeia vai **reduzir** a cobertura que o pacote hoje tem? Um zip de listagens
# que cobre 1 ano não repõe os 3 que o pacote publica, e rodar a cadeia apagaria
# os outros dois sem que nada reclamasse.


def test_cadeia_bloqueia_quando_nao_consegue_ler_o_pacote(
    tmp_path: Path, capsys
) -> None:
    """Uma guarda que não consegue ler o que se propõe preservar não pode dizer
    que a cadeia não o degrada. Bloqueia, com o mesmo código de sempre."""
    c, lst, raw, pac = _cenario(
        tmp_path, canonical=True, listagens=True, planilhas=False
    )
    pac.write_bytes(b"PK\x03\x04conteudo-que-nao-e-zip")

    rc = main(_args(c, lst, raw, pac, soft=False))

    assert rc == CODIGO_BLOQUEADO
    assert capsys.readouterr().err.startswith("ERRO:")


def test_cadeia_bloqueia_quando_listagens_cobrem_menos_que_o_pacote(
    tmp_path: Path, capsys
) -> None:
    """Único cenário do quickstart que muda de veredito: 0 → 3 (FR-010)."""
    c, lst, raw, pac = _cenario(
        tmp_path,
        canonical=True,
        listagens=True,
        planilhas=False,
        anos_pacote=(2024, 2025, 2026),
        anos_listagens=(2024,),
    )

    rc = main(_args(c, lst, raw, pac, soft=False))

    err = capsys.readouterr().err
    assert rc == CODIGO_BLOQUEADO
    assert err.startswith("ERRO:")
    # Nomeia os pares perdidos — o Blocking tell, não só o código.
    assert "2025" in err
    assert "2026" in err
    assert "2024" not in err


def test_cadeia_bloqueia_com_zip_de_listagens_ilegivel(tmp_path: Path, capsys) -> None:
    """Zip ilegível **e** sem planilha utilizável bloqueia (spec 012, §3.0).

    Presente com erro não é ausência. Tratar como ausência devolveria "a cadeia
    pode rodar" sobre um insumo corrompido — e a etapa 3 leria esse arquivo.
    """
    c, lst, raw, pac = _cenario(
        tmp_path,
        canonical=True,
        listagens=True,
        planilhas=False,
        listagens_ilegivel=True,
    )

    rc = main(_args(c, lst, raw, pac, soft=False))

    assert rc == CODIGO_BLOQUEADO
    assert capsys.readouterr().err.startswith("ERRO:")


def test_cadeia_livra_pacote_sem_cobertura_de_derivados(tmp_path: Path) -> None:
    """Pacote sem derivado não tem cobertura a perder → a guarda **libera**.

    Este é o teste que impede a guarda de virar bloqueio permanente depois da
    primeira execução: um pacote recém-gerado do canônico puro tem derivado nulo
    em todos os registros, e a cadeia tem de continuar rodando nele.
    """
    c, lst, raw, pac = _cenario(
        tmp_path,
        canonical=True,
        listagens=False,
        planilhas=False,
        anos_pacote=(),
    )

    assert main(_args(c, lst, raw, pac, soft=False)) == CODIGO_PODE_RODAR


def test_cadeia_livra_quando_a_planilha_do_ano_repoe_o_par(tmp_path: Path) -> None:
    """Cobertura reposta por planilha bruta cujo nome tem o ano → libera.

     Guarda de regressão contra a guarda ficar restritiva demais: o caminho
    _suportado_ do repositório é enviar a planilha nova e rodar a cadeia, e esse
     caminho não pode ser bloqueado.
    """
    c, lst, raw, pac = _cenario(
        tmp_path,
        canonical=True,
        listagens=False,
        planilhas=True,
        anos_pacote=(2024, 2025, 2026),
    )

    assert main(_args(c, lst, raw, pac, soft=False)) == CODIGO_PODE_RODAR


def test_cadeia_bloqueio_em_soft_avisa_e_nao_toca_o_pacote(
    tmp_path: Path, capsys
) -> None:
    """Modo tolerante com a mesma entrada degradada: avisa, sai 3, não toca.

    O arquivo do pacote é conferido em **conteúdo e data**: a garantia do soft é o
    não-toque, e uma guarda que bloqueia mas mexe no pacote não está preservando
    nada.
    """
    c, lst, raw, pac = _cenario(
        tmp_path,
        canonical=True,
        listagens=True,
        planilhas=False,
        anos_pacote=(2024, 2025, 2026),
        anos_listagens=(2024,),
    )
    antes_bytes = pac.read_bytes()
    antes_mtime = pac.stat().st_mtime

    rc = main(_args(c, lst, raw, pac, soft=True))

    err = capsys.readouterr().err
    assert rc == CODIGO_BLOQUEADO
    assert err.startswith("AVISO:")
    assert pac.read_bytes() == antes_bytes
    assert pac.stat().st_mtime == antes_mtime


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
