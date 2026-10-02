#!/usr/bin/env python3
"""Valida o contrato e sinaliza a frescor do pacote público indicadores.zip.

Contrato: `specs/011-etl-soft-mode-frescor/contracts/check-dados.md`.

Etapa 1 — validação de contrato (reuso de `validar_arquivos_pilar` +
`CAMPOS_DERIVAVEIS_MERGE`, o mesmo conjunto que o merge autoriza): violação ⇒
`ERRO:` + exit 1.
Etapa 2 — avisos de frescor por `mtime` (nunca fatais, exit 0), comparando
apenas entradas presentes; entradas ausentes viram **uma** linha `INFO:`
informativa ("apenas o contrato foi validado") — sem falso alarme.
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

from etl.adapters.sinks.zip_indicadores_sink import validar_arquivos_pilar  # noqa: E402
from etl.core.logic.models import RegistroPilarJson  # noqa: E402
from etl.scripts.merge_listagens_indicadores import (  # noqa: E402
    CAMPOS_DERIVAVEIS_MERGE,
)

PADRAO_PACOTE = "data/dist/indicadores.zip"
PADRAO_CANONICAL = "data/canonical/exports_canonical.zip"
PADRAO_LISTAGENS = "data/dist/indicadores_listagens.zip"
PADRAO_RAW = "data/raw"


def criar_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Valida o contrato do pacote indicadores.zip e alerta sobre frescor "
            "por mtime (canônico mais novo, listagens mais novas, planilhas novas)."
        )
    )
    parser.add_argument(
        "--pacote",
        default=PADRAO_PACOTE,
        help=f"Pacote público a validar (padrão: {PADRAO_PACOTE})",
    )
    parser.add_argument(
        "--canonical",
        default=PADRAO_CANONICAL,
        help=(
            f"Export canônico p/ frescor (padrão: {PADRAO_CANONICAL}; vazio "
            f"suprime a comparação)"
        ),
    )
    parser.add_argument(
        "--listagens",
        default=PADRAO_LISTAGENS,
        help=f"Zip de listagens p/ frescor (padrão: {PADRAO_LISTAGENS})",
    )
    parser.add_argument(
        "--raw",
        default=PADRAO_RAW,
        help=(
            f"Pasta com planilhas listagem_*.xlsx p/ frescor " f"(padrão: {PADRAO_RAW})"
        ),
    )
    return parser


def _ler_registros(caminho: Path) -> list[RegistroPilarJson]:
    if not caminho.exists():
        raise FileNotFoundError(f"pacote não encontrado: '{caminho}'")
    registros: list[RegistroPilarJson] = []
    with zipfile.ZipFile(caminho, "r") as zf:
        for nome in zf.namelist():
            registros.append(
                RegistroPilarJson(nome=nome, conteudo=zf.read(nome).decode("utf-8"))
            )
    return registros


def _planilhas(pasta_raw: Path) -> list[Path]:
    if not pasta_raw.is_dir():
        return []
    return sorted(pasta_raw.glob("listagem_*.xlsx"))


def _caminho_ou_padrao(valor: str, padrao: str) -> tuple[Path | None, str]:
    """Retorna (caminho, rótulo-para-INFO); caminho None se o valor for vazio."""
    if not valor:
        return None, padrao
    caminho = Path(valor)
    return caminho, str(caminho)


def main(argv: list[str] | None = None) -> int:
    parser = criar_argument_parser()
    args = parser.parse_args(argv)

    caminho_pacote = Path(args.pacote)
    caminho_canonical, rotulo_canonical = _caminho_ou_padrao(
        args.canonical, PADRAO_CANONICAL
    )
    caminho_listagens, rotulo_listagens = _caminho_ou_padrao(
        args.listagens, PADRAO_LISTAGENS
    )
    pasta_raw = Path(args.raw)

    # Etapa 1 — validação de contrato (reuso do validate_zip).
    try:
        registros = _ler_registros(caminho_pacote)
        validar_arquivos_pilar(registros, campos_derivaveis=CAMPOS_DERIVAVEIS_MERGE)
    except FileNotFoundError as exc:
        sys.stderr.write(f"ERRO: {exc}\n")
        return 1
    except Exception as exc:
        # Zip ilegível (BadZipFile), JSON truncado, etc. — a violação de
        # contrato já chega prefixada pela `validar_arquivos_pilar`; o resto
        # (mensagens da stdlib, em inglês) precisa do prefixo para o log do
        # portão do CI não confundir falha do pacote com falha do verificador.
        mensagem = str(exc)
        prefixo = "" if mensagem.startswith("ERRO:") else "ERRO: "
        sys.stderr.write(f"{prefixo}{mensagem}\n")
        return 1

    print(
        f"Sucesso: {len(registros)} arquivo(s) em {args.pacote} "
        "atendem ao contrato CONIF."
    )

    # Etapa 2 — avisos de frescor por mtime (nunca fatais; exit 0).
    mtime_pacote = caminho_pacote.stat().st_mtime
    ausentes: list[str] = []

    if caminho_canonical is not None and caminho_canonical.exists():
        if caminho_canonical.stat().st_mtime > mtime_pacote:
            sys.stderr.write(
                "AVISO: pacote possivelmente desatualizado — export canônico "
                "mais recente que o pacote.\n"
            )
    else:
        ausentes.append(rotulo_canonical)

    if caminho_listagens is not None and caminho_listagens.exists():
        if caminho_listagens.stat().st_mtime > mtime_pacote:
            sys.stderr.write(
                "AVISO: proveniência: o zip de listagens é mais recente que o "
                "pacote — o merge não foi reexecutado, então NTE/NTECPP podem "
                "vir de execução anterior.\n"
            )
    else:
        ausentes.append(rotulo_listagens)

    planilhas = _planilhas(pasta_raw)
    if planilhas:
        for planilha in planilhas:
            if planilha.stat().st_mtime > mtime_pacote:
                sys.stderr.write(
                    f"AVISO: planilha {planilha.name} mais recente que o pacote — "
                    "não incorporada ao último pacote.\n"
                )
    else:
        ausentes.append(str(pasta_raw / "listagem_*.xlsx"))

    # Info: entradas de frescor ausentes (nunca silêncio ambíguo).
    if ausentes:
        sys.stderr.write(
            "INFO: frescor não avaliado para: "
            + ", ".join(ausentes)
            + " — apenas o contrato foi validado.\n"
        )

    return 0


if __name__ == "__main__":
    sys.exit(main())
