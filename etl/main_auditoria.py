"""Ponto de entrada CLI para geração das fixtures de auditoria (feature 026).

Gera data/dist/auditoria/{INDICADOR}_{campus}_{ano}.json consumido pelo Raio-X do Indicador.
"""

from __future__ import annotations

import argparse
import sys

from etl.cli_comum import parsear_anos
from etl.flows.auditoria_flow import AuditoriaFlow

ANOS_PADRAO = [2024, 2025, 2026]


def criar_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Gera fixtures de auditoria de microdados (Raio-X do Indicador)."
    )
    parser.add_argument(
        "--canonical",
        default="data/canonical/exports_canonical.zip",
        help="Caminho do export canônico (padrão: data/canonical/exports_canonical.zip)",
    )
    parser.add_argument(
        "--listagens",
        default="data/raw",
        help="Pasta com planilhas de listagens (padrão: data/raw)",
    )
    parser.add_argument(
        "--pacote",
        default="data/dist/indicadores.zip",
        help="Caminho do pacote canônico publicado (padrão: data/dist/indicadores.zip)",
    )
    parser.add_argument(
        "--saida",
        default="data/dist/auditoria",
        help="Pasta de saída das fixtures (padrão: data/dist/auditoria)",
    )
    parser.add_argument(
        "--anos",
        default=None,
        help="Anos de referência separados por vírgula (padrão: 2024,2025,2026)",
    )
    parser.add_argument(
        "--soft",
        action="store_true",
        default=False,
        help="Modo tolerante a entradas ausentes (soft mode)",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = criar_argument_parser()
    args = parser.parse_args(argv)

    anos = parsear_anos(args.anos) if args.anos else ANOS_PADRAO

    flow = AuditoriaFlow(
        caminho_canonico=args.canonical,
        pasta_listagens=args.listagens,
        caminho_pacote=args.pacote,
        pasta_saida=args.saida,
        anos=anos,
        soft=args.soft,
    )

    try:
        resultado = flow.run()
    except Exception as e:
        sys.stderr.write(f"ERRO: falha na geração das fixtures de auditoria: {e}\n")
        return 1

    for aviso in resultado.avisos:
        print(aviso)

    print(
        f"OK: {len(resultado.fixtures)} fixtures de auditoria geradas em {args.saida}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
