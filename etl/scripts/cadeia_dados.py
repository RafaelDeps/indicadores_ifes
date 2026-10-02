#!/usr/bin/env python3
"""Verifica se a cadeia `make dados` pode rodar sem degradar o pacote público.

Contrato: `specs/011-etl-soft-mode-frescor/contracts/etl-cli.md` §4/§5.6.

O pacote `indicadores.zip` é **saída de uma cadeia** (etl → etl-listagens →
merge-listagens), não de uma etapa isolada. O merge é quem acrescenta
`NTE_total_estudantes_matriculados` e `NTECPP_cotistas_em_pesquisa`; a etapa 1
regenera o pacote **apenas** do export canônico, que não carrega esses campos.

Logo, se a etapa 1 reescrever o pacote e o merge não tiver entrada para
repor esses campos, o último snapshot coerente é apagado em silêncio — e o
`AVISO:` da etapa 3 chega a anunciar "pacote existente preservado" sobre um
pacote que já havia sido sobrescrito.

Este guarda é a pré-condição de cadeia: se o merge não terá entrada, a cadeia
inteira não roda. No modo soft o pacote é preservado por não-toque (exit 0 com
`AVISO:`); no modo estrito a falha é antecipada, antes de tocar em nada.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Garante que a raiz do repositório esteja no sys.path para execução direta
raiz_repo = str(Path(__file__).resolve().parent.parent.parent)
if raiz_repo not in sys.path:
    sys.path.insert(0, raiz_repo)

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

_MOTIVO = (
    "a cadeia merge-listagens não terá entrada: '{listagens}' está ausente e "
    "'{raw}' não contém nenhuma {planilhas}. Rodar a etapa 1 reescreveria "
    "'{pacote}' sem NTE_total_estudantes_matriculados e "
    "NTECPP_cotistas_em_pesquisa, e o merge não poderia repô-los — o último "
    "snapshot coerente seria apagado em silêncio."
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


def avaliar_cadeia(
    *, canonical: Path, listagens: Path, raw: Path, pacote: Path
) -> str | None:
    """Retorna o motivo do bloqueio, ou ``None`` se a cadeia pode rodar.

    A cadeia é bloqueada em exatamente um caso: a etapa 1 vai reescrever o
    pacote (canônico presente) e o merge não terá entrada (zip de listagens
    ausente **e** sem planilhas para gerá-lo).
    """
    if not canonical.exists():
        # A etapa 1 não reescreve nada: no soft ela é pulada, no estrito ela
        # falha antes de tocar o pacote. Não há o que perder.
        return None
    if listagens.exists() or tem_planilhas(raw):
        # O merge terá entrada: o zip já existe (ainda que stale) ou a etapa 2
        # o produzirá a partir das planilhas.
        return None
    return _MOTIVO.format(
        listagens=listagens, raw=raw, planilhas=PADRAO_PLANILHAS, pacote=pacote
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
