#!/usr/bin/env python3
"""Utilitário diagnóstico para validar a integridade contratual do pacote indicadores.zip."""

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
from etl.flows.listagens_flow import CAMPOS_DERIVAVEIS_LISTAGENS  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Valida a conformidade de schema do pacote de indicadores."
    )
    parser.add_argument(
        "--zip",
        "-z",
        default="data/dist/indicadores.zip",
        help="Caminho do pacote ZIP a validar (padrão: data/dist/indicadores.zip)",
    )
    args = parser.parse_args(argv)

    caminho = Path(args.zip)
    if not caminho.exists():
        sys.stderr.write(f"ERRO: Arquivo não encontrado: '{caminho}'\n")
        return 1

    try:
        registros: list[RegistroPilarJson] = []
        with zipfile.ZipFile(caminho, "r") as zf:
            nomes = zf.namelist()
            print(f"Lendo {len(nomes)} arquivos de {caminho}...")
            for nome in nomes:
                conteudo = zf.read(nome).decode("utf-8")
                registros.append(RegistroPilarJson(nome=nome, conteudo=conteudo))

        # Como o pacote pode ser o canônico mesclado pelas listagens (merge-listagens),
        # NTE_total_estudantes_matriculados e NTECPP_cotistas_em_pesquisa são
        # aceitos preenchidos (int >= 0) — demais campos não coletáveis devem ser null.
        validar_arquivos_pilar(registros, campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS)
        print(
            f"Sucesso: todos os {len(registros)} arquivos atendem rigorosamente ao contrato CONIF."
        )
        return 0
    except Exception as e:
        sys.stderr.write(f"{e}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
