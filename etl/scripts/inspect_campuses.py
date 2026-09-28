#!/usr/bin/env python3
"""Utilitário diagnóstico para inspecionar e listar campi do pacote canônico."""

from __future__ import annotations

import argparse
import json
import sys
import zipfile
from pathlib import Path

# Garante que a raiz do repositório esteja no sys.path para execução direta
raiz_repo = str(Path(__file__).resolve().parent.parent.parent)
if raiz_repo not in sys.path:
    sys.path.insert(0, raiz_repo)

from etl.core.logic.resolvers.campus_resolver import normalizar_slug  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Lista os campi do pacote canônico de dados."
    )
    parser.add_argument(
        "--entrada",
        "-i",
        default="data/canonical/exports_canonical.zip",
        help="Caminho do pacote canônico (padrão: data/canonical/exports_canonical.zip)",
    )
    args = parser.parse_args(argv)

    caminho = Path(args.entrada)
    if not caminho.exists():
        sys.stderr.write(f"ERRO: Arquivo não encontrado: '{caminho}'\n")
        return 1

    try:
        with zipfile.ZipFile(caminho, "r") as zf:
            if "campuses_canonical.json" not in zf.namelist():
                sys.stderr.write(
                    "ERRO: campuses_canonical.json não encontrado no zip.\n"
                )
                return 1
            campi = json.loads(zf.read("campuses_canonical.json").decode("utf-8"))

        print(f"Campi encontrados ({len(campi)}):")
        print(f"{'ID':<6} {'Slug':<25} {'Nome'}")
        print("-" * 60)
        for c in sorted(campi, key=lambda x: x.get("id", 0)):
            cid = c.get("id", "")
            nome = c.get("name", "")
            slug = normalizar_slug(nome)
            print(f"{cid:<6} {slug:<25} {nome}")

        return 0
    except Exception as e:
        sys.stderr.write(f"ERRO: Falha ao inspecionar campi: {e}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
