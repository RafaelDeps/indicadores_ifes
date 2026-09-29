from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from etl.adapters.sinks.zip_indicadores_sink import ZipIndicadoresSink
from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.core.logic.resolvers.campus_resolver import normalizar_slug
from etl.flows.indicadores_flow import IndicadoresFlow


def criar_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Pipeline de ETL em Python dos Indicadores CONIF do IFES."
    )
    parser.add_argument(
        "--entrada",
        "-i",
        default=os.getenv("ENTRADA", "data/canonical/exports_canonical.zip"),
        help="Caminho do pacote canônico de entrada (padrão: data/canonical/exports_canonical.zip)",
    )
    parser.add_argument(
        "--saida",
        "-o",
        default=os.getenv("SAIDA"),
        help="Caminho do pacote ZIP de saída (padrão: data/dist/indicadores.zip ou data/dist/indicadores_<campus>.zip)",
    )
    parser.add_argument(
        "--campus",
        "-c",
        default=os.getenv("CAMPUS"),
        help="Nome ou slug do campus para execução filtrada (opcional)",
    )
    parser.add_argument(
        "--anos",
        "-a",
        default="2024,2025,2026",
        help="Anos de referência separados por vírgula (padrão: 2024,2025,2026)",
    )
    parser.add_argument(
        "--soft",
        action="store_true",
        help=(
            "Modo soft (opt-in): se a entrada estiver ausente, pula a etapa com "
            "AVISO:+0 preservando o último pacote existente (default: fail-fast)"
        ),
    )
    return parser


def _modo_soft(args: argparse.Namespace) -> bool:
    """Modo soft ativo por flag `--soft` OU variável de ambiente `SOFT=1`."""
    if args.soft:
        return True
    return os.getenv("SOFT", "").strip().lower() in {"1", "true", "yes", "on"}


def main(argv: list[str] | None = None) -> int:
    parser = criar_argument_parser()
    args = parser.parse_args(argv)

    caminho_entrada = Path(args.entrada)
    campus = args.campus.strip() if args.campus else None

    # Determina arquivo de saída padrão em data/dist
    pasta_dist = Path("data/dist")
    if args.saida:
        caminho_saida = Path(args.saida)
    elif campus:
        slug = normalizar_slug(campus)
        caminho_saida = pasta_dist / f"indicadores_{slug}.zip"
    else:
        caminho_saida = pasta_dist / "indicadores.zip"

    try:
        anos = [int(a.strip()) for a in args.anos.split(",") if a.strip()]
    except ValueError:
        sys.stderr.write(f"ERRO: Valor inválido fornecido para --anos: '{args.anos}'\n")
        return 1

    if not caminho_entrada.exists():
        if _modo_soft(args) and caminho_saida.exists():
            sys.stderr.write(
                f"AVISO: export canônico ausente ('{caminho_entrada}') — etapa pulada; "
                f"pacote existente preservado ('{caminho_saida}').\n"
            )
            return 0
        sys.stderr.write(
            f"ERRO: Arquivo de entrada canônico não encontrado: '{caminho_entrada}'\n"
            f"Por favor, posicione o arquivo em 'data/canonical/exports_canonical.zip' ou forneça o caminho via --entrada / ENTRADA.\n"
        )
        return 1

    print(f"Carregando dados canônicos de {caminho_entrada}...")
    source = ZipCanonicalSource(caminho_entrada)
    sink = ZipIndicadoresSink(caminho_saida)

    flow = IndicadoresFlow(
        source=source,
        sink=sink,
        anos=anos,
        campus_filtro=campus,
    )

    resultado = flow.run()
    if resultado.codigo_saida == 0:
        print(
            f"Pipeline concluído com sucesso: {resultado.total_arquivos} "
            f"arquivos gerados em {caminho_saida}"
        )
    return resultado.codigo_saida


if __name__ == "__main__":
    sys.exit(main())
