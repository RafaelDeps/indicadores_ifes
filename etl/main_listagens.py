from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from etl.adapters.sinks.zip_indicadores_sink import ZipIndicadoresSink
from etl.adapters.sources.listagens_xlsx_source import (
    PADRAO_ARQUIVO,
    ListagensXlsxSource,
)
from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.flows.listagens_flow import CAMPOS_DERIVAVEIS_LISTAGENS, ListagensFlow


def criar_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "ETL das listagens de matrícula: lê data/raw/listagem_<AAAA>_<S>.xlsx e "
            "gera pilar{N}_{campus}_{year}.json (Pilar 1: NTE e NTECPP) em zip sob data/dist/."
        )
    )
    parser.add_argument(
        "--entrada",
        "-i",
        default="data/raw",
        help="Pasta com os arquivos listagem_<AAAA>_<S>.xlsx (padrão: data/raw)",
    )
    parser.add_argument(
        "--saida",
        "-o",
        default="data/dist/indicadores_listagens.zip",
        help="Pacote ZIP de saída (padrão: data/dist/indicadores_listagens.zip)",
    )
    parser.add_argument(
        "--anos",
        "-a",
        default=None,
        help="Anos de referência separados por vírgula (padrão: todos os anos encontrados)",
    )
    parser.add_argument(
        "--campus",
        "-c",
        default=None,
        help="Nome ou slug do campus para execução filtrada (opcional)",
    )
    parser.add_argument(
        "--canonical",
        default="data/canonical/exports_canonical.zip",
        help=(
            "Export canônico com estudantes em pesquisa (NEP) para o cruzamento "
            "NTECPP (padrão: data/canonical/exports_canonical.zip; ausente ⇒ "
            "NTECPP permanece null)"
        ),
    )
    parser.add_argument(
        "--relatorio",
        default="data/reports/etl_listagens_run_report.md",
        help="Caminho do relatório de execução (padrão: data/reports/etl_listagens_run_report.md)",
    )
    parser.add_argument(
        "--soft",
        action="store_true",
        help=(
            "Modo soft (opt-in): se nenhuma planilha for encontrada, pula a etapa "
            "com AVISO:+0 sem gerar/sobrescrever o pacote de listagens (default: fail-fast)"
        ),
    )
    return parser


def _modo_soft(args: argparse.Namespace) -> bool:
    """Modo soft ativo por flag `--soft` OU variável de ambiente `SOFT=1`."""
    if args.soft:
        return True
    return os.getenv("SOFT", "").strip().lower() in {"1", "true", "yes", "on"}


def _tem_planilhas(pasta: Path) -> bool:
    """Há ao menos uma planilha no contrato `listagem_<AAAA>_<1|2>.xlsx`?"""
    return any(n for n in pasta.glob("listagem_*.xlsx") if PADRAO_ARQUIVO.match(n.name))


def main(argv: list[str] | None = None) -> int:
    parser = criar_argument_parser()
    args = parser.parse_args(argv)

    anos: list[int] | None = None
    if args.anos:
        anos = [int(a.strip()) for a in args.anos.split(",") if a.strip()]

    pasta_entrada = Path(args.entrada)
    if _modo_soft(args) and not _tem_planilhas(pasta_entrada):
        sys.stderr.write(
            f"AVISO: nenhuma planilha de listagem encontrada em '{args.entrada}' "
            "(esperado listagem_<AAAA>_<1|2>.xlsx) — etapa pulada; pacote de "
            "listagens não criado/sobrescrito.\n"
        )
        return 0

    fonte_canonica = None
    caminho_canonical = Path(args.canonical)
    if caminho_canonical.exists():
        fonte_canonica = ZipCanonicalSource(caminho_canonical)
    else:
        sys.stderr.write(
            f"AVISO: export canônico ausente ('{args.canonical}') — "
            "NTECPP_cotistas_em_pesquisa permanecerá null (sem universo NEP "
            "para o cruzamento FR-012); NTECPP não recalculável a partir do "
            "zip (sem universo de nomes).\n"
        )

    source = ListagensXlsxSource(args.entrada)
    sink = ZipIndicadoresSink(args.saida, campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS)
    flow = ListagensFlow(
        source=source,
        sink=sink,
        anos=anos,
        campus_filtro=args.campus,
        caminho_relatorio=args.relatorio,
        fonte_canonica=fonte_canonica,
    )

    resultado = flow.run()
    if resultado.codigo_saida == 0:
        print(
            f"Pacote gerado: {args.saida} "
            f"({resultado.total_arquivos} arquivos pilar{{N}}_{{campus}}_{{ano}}.json)"
        )
        print(
            "NTECPP_cotistas_em_pesquisa preenchido pelo cruzamento NEP × cotistas "
            "por nome normalizado (FR-012); percentuais PIES/PICOT permanecem null."
        )
    return resultado.codigo_saida


if __name__ == "__main__":
    sys.exit(main())
