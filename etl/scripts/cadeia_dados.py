#!/usr/bin/env python3
"""Verifica se a cadeia `make dados` pode rodar sem degradar o pacote público.

Contratos: `specs/011-etl-soft-mode-frescor/contracts/etl-cli.md` §4/§5.6 e
`specs/012-gate-proveniencia-workflow-dados/contracts/check-dados.md` §3.0.

O pacote `indicadores.zip` é **saída de uma cadeia** (etl → etl-listagens →
merge-listagens), não de uma etapa isolada. O merge é quem acrescenta
`NTE_total_estudantes_matriculados` e `NTECPP_cotistas_em_pesquisa`; a etapa 1
regenera o pacote **apenas** do export canônico, que não carrega esses campos.

Logo, se a etapa 1 reescrever o pacote e o merge não tiver entrada para
repor esses campos, o último snapshot coerente é apagado em silêncio — e o
`AVISO:` da etapa 3 chega a anunciar "pacote existente preservado" sobre um
pacote que já havia sido sobrescrito.

Este guarda é a pré-condição de cadeia: se o merge não tiver entrada, a cadeia
inteira não roda. No modo soft o pacote é preservado por não-toque (exit 0 com
`AVISO:`); no modo estrito a falha é antecipada, antes de tocar em nada.

**A entrada que importa é a que cobre, e não a que existe** (spec 012). A
pergunta deixou de ser "o zip de listagens está presente?" e passou a ser "a
cadeia vai **reduzir** a cobertura de derivados que o pacote publicado hoje
tem?". Um zip de listagens que cobre um ano, contra um pacote que publica três,
é entrada insuficiente — e era exatamente esse o estado que a guarda antiga
aceitava, porque só olhava a existência do arquivo.

A medição é a **mesma função** que a Etapa 1.5 do `check-dados` usa
(`cobertura_registros`, `subtrair_coberturas`): a regra é uma subtração de
cobertura por campo derivado, e duas cópias dela voltariam a ser a divergência
silenciosa que a feature existe para fechar.
"""

from __future__ import annotations

import argparse
import sys
import zipfile
from pathlib import Path

# Garante que a raiz do repositório esteja no sys.path para execução direta
raiz_repo = str(Path(__file__).resolve().parent.parent.parent)
if raiz_repo not in sys.path:
    sys.path.insert(0, raiz_repo)

from etl.adapters.sinks.zip_indicadores_sink import ler_registros_zip  # noqa: E402
from etl.adapters.sources.listagens_xlsx_source import PADRAO_ARQUIVO  # noqa: E402
from etl.core.logic.cobertura_listagens import (  # noqa: E402
    cobertura_registros,
    subtrair_coberturas,
)

PADRAO_CANONICAL = "data/canonical/exports_canonical.zip"
PADRAO_LISTAGENS = "data/dist/indicadores_listagens.zip"
PADRAO_RAW = "data/raw"
PADRAO_PACOTE = "data/dist/indicadores.zip"

PADRAO_PLANILHAS = "listagem_*.xlsx"

#: Saída 0 — a cadeia pode rodar; nenhuma mensagem é emitida.
CODIGO_PODE_RODAR = 0
#: Saída 3 — a cadeia foi bloqueada por incoerência; a mensagem já diz se foi
#: `AVISO:` (soft, preserva o pacote) ou `ERRO:` (estrito, nada foi tocado).
CODIGO_BLOQUEADO = 3

#: Insumo que existe e não pôde ser lido. `BadZipFile` não herda de `OSError`
#: (herda de `Exception`), e `cobertura_registros` transforma JSON truncado em
#: `ValueError` nomeando o arquivo — os três entram pelo mesmo tratamento.
ENTRADA_ILEGIVEL = (OSError, ValueError, zipfile.BadZipFile)

_MOTIVO = (
    "a cadeia merge-listagens não terá entrada: '{listagens}' está ausente e "
    "'{raw}' não contém nenhuma {planilhas}. Rodar a etapa 1 reescreveria "
    "'{pacote}' sem NTE_total_estudantes_matriculados e "
    "NTECPP_cotistas_em_pesquisa, e o merge não poderia repô-los — o último "
    "snapshot coerente seria apagado em silêncio."
)

_MOTIVO_PACOTE_ILEGIVEL = (
    "não foi possível ler o pacote '{pacote}' para medir a cobertura que ele "
    "tem hoje ({erro}). Uma guarda que não consegue ler o que pretende "
    "preservar não tem como dizer que a cadeia não o degrada."
)

_MOTIVO_COBERTURA = (
    "a cadeia vai reduzir a cobertura de derivados que '{pacote}' tem hoje: "
    "perde {perdas}{sobre}. '{listagens}' não cobre esses pares e '{raw}' não "
    "tem planilha {planilhas} que os reponha. Rodar a etapa 1 reescreveria "
    "'{pacote}' sem esses valores, e o merge não poderia repô-los — o último "
    "snapshot coerente seria apagado em silêncio."
)

_SOBRE_ZIP_ILEGIVEL = (
    " (o zip de listagens existe mas não pôde ser lido, então nada foi creditado "
    "a ele)"
)


def criar_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Verifica se a cadeia 'make dados' pode rodar sem degradar o pacote "
            "público (o merge precisa ter entrada para repor NTE/NTECPP)."
        )
    )
    parser.add_argument(
        "--canonical",
        default=PADRAO_CANONICAL,
        help=f"Export canônico de entrada da etapa 1 (padrão: {PADRAO_CANONICAL})",
    )
    parser.add_argument(
        "--listagens",
        default=PADRAO_LISTAGENS,
        help=f"Zip de listagens de entrada da etapa 3 (padrão: {PADRAO_LISTAGENS})",
    )
    parser.add_argument(
        "--raw",
        default=PADRAO_RAW,
        help=f"Pasta com planilhas {PADRAO_PLANILHAS} (padrão: {PADRAO_RAW})",
    )
    parser.add_argument(
        "--pacote",
        default=PADRAO_PACOTE,
        help=f"Pacote público a preservar (padrão: {PADRAO_PACOTE})",
    )
    parser.add_argument(
        "--soft",
        action="store_true",
        help=(
            "Modo soft (opt-in): bloqueia com AVISO: + exit 3 preservando o "
            "pacote por não-toque (default: bloqueia com ERRO: + exit 3)"
        ),
    )
    return parser


def tem_planilhas(pasta_raw: Path) -> bool:
    """True se a pasta contém ao menos uma planilha de listagem."""
    return any(pasta_raw.glob(PADRAO_PLANILHAS))


def anos_das_planilhas(pasta_raw: Path) -> set[int]:
    """Anos declarados no **nome** das planilhas de `pasta_raw`.

    O nome é a única fonte barata: o campus está no título dentro da planilha, e
    abrir seis livros para descobrir o que a guarda precisa é trabalho de
    pipeline, não de pré-condição.
    """
    anos: set[int] = set()
    for planilha in pasta_raw.glob(PADRAO_PLANILHAS):
        achado = PADRAO_ARQUIVO.match(planilha.name)
        if achado is not None:
            anos.add(int(achado.group(1)))
    return anos


def cobertura_de_entrada(
    listagens: Path, raw: Path, cobertura_pacote: set[tuple[str, int, str]]
) -> tuple[set[tuple[str, int, str]], bool]:
    """Cobertura que a etapa 3 conseguirá reproduzir depois da etapa 1.

    É a união de duas fontes:

    - o **zip de listagens** já existente, lido registro a registro;
    - os **anos com planilha bruta** em `raw`, dos quais a etapa 2 produzirá um
      zip equivalente.

    **A planilha vale para todos os campi daquele ano**, e essa é a decisão de
    direção: superestimar o que a cadeia consegue repor. O erro possível é
    deixar passar uma cadeia que não reponha tudo; o erro oposto — bloquear por
    falta de um campus que a planilha talvez traga — tornaria a guarda um
    obstáculo permanente no caminho suportado do repositório, que é enviar a
    planilha e rodar.

    O segundo valor devolvido é `True` quando o zip existe e não pôde ser lido.
    Presente com erro não é ausência: a cadeia não tem como saber o que ele
    cobriria, e dizê-lo na mensagem muda a ação corretiva de "envie as
    planilhas" para "conserte o zip".
    """
    cobertura: set[tuple[str, int, str]] = set()
    zip_ilegivel = False
    if listagens.exists():
        try:
            cobertura |= cobertura_registros(ler_registros_zip(listagens))
        except ENTRADA_ILEGIVEL:
            zip_ilegivel = True
    anos_raw = anos_das_planilhas(raw)
    if anos_raw:
        cobertura |= {chave for chave in cobertura_pacote if chave[1] in anos_raw}
    return cobertura, zip_ilegivel


def _formatar_pares(chaves: set[tuple[str, int, str]]) -> str:
    """`serra/2025, serra/2026` — pares ordenados, sem repetir por campo.

    Ordenar e deduplicar não é cortesia de leitura: a mensagem de bloqueio é
    comparada entre execuções, e um relatório que embaralha a ordem não pode ser.
    """
    pares = sorted({(campus, ano) for campus, ano, _ in chaves})
    return ", ".join(f"{campus}/{ano}" for campus, ano in pares)


def avaliar_cadeia(
    *, canonical: Path, listagens: Path, raw: Path, pacote: Path
) -> str | None:
    """Retorna o motivo do bloqueio, ou ``None`` se a cadeia pode rodar.

    Bloqueia quando a etapa 1 vai reescrever o pacote (canônico presente) e a
    etapa 3 não conseguirá reproduzir a cobertura de derivados que esse pacote
    tem hoje. Não bloqueia quando não há cobertura a preservar — esse é o estado
    de um pacote recém-gerado do canônico puro, e uma guarda que bloqueasse ali
    seria um obstáculo permanente depois da primeira execução.

    As duas mensagens de bloqueio são distintas porque a ação corretiva é
    distinta: sem entrada nenhuma se envia insumo; com entrada insuficiente se
    completa a lacuna.
    """
    if not canonical.exists():
        # A etapa 1 não reescreve nada: no soft ela é pulada, no estrito ela
        # falha antes de tocar o pacote. Não há o que perder.
        return None
    if not pacote.exists():
        # Sem pacote publicado, a etapa 1 não tem o que degradar.
        return None
    try:
        cobertura_pacote = cobertura_registros(ler_registros_zip(pacote))
    except ENTRADA_ILEGIVEL as exc:
        return _MOTIVO_PACOTE_ILEGIVEL.format(pacote=pacote, erro=exc)
    if not cobertura_pacote:
        return None

    if not listagens.exists() and not tem_planilhas(raw):
        return _MOTIVO.format(
            listagens=listagens, raw=raw, planilhas=PADRAO_PLANILHAS, pacote=pacote
        )

    cobertura_listagens, zip_ilegivel = cobertura_de_entrada(
        listagens, raw, cobertura_pacote
    )
    perdas = subtrair_coberturas(cobertura_pacote, cobertura_listagens)
    if not perdas:
        return None
    return _MOTIVO_COBERTURA.format(
        perdas=_formatar_pares(perdas),
        sobre=_SOBRE_ZIP_ILEGIVEL if zip_ilegivel else "",
        pacote=pacote,
        listagens=listagens,
        raw=raw,
        planilhas=PADRAO_PLANILHAS,
    )


def main(argv: list[str] | None = None) -> int:
    args = criar_argument_parser().parse_args(argv)

    motivo = avaliar_cadeia(
        canonical=Path(args.canonical),
        listagens=Path(args.listagens),
        raw=Path(args.raw),
        pacote=Path(args.pacote),
    )
    if motivo is None:
        return CODIGO_PODE_RODAR

    prefixo = "AVISO:" if args.soft else "ERRO:"
    sufixo = (
        " cadeia pulada; pacote preservado por não-toque."
        if args.soft
        else " nada foi executado nem sobrescrito."
    )
    sys.stderr.write(f"{prefixo} {motivo}{sufixo}\n")
    return CODIGO_BLOQUEADO


if __name__ == "__main__":
    sys.exit(main())
