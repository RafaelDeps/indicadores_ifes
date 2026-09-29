#!/usr/bin/env python3
"""Integra NTE/NTECPP das listagens no pacote canônico data/dist/indicadores.zip.

Regra (contracts/saida_pacote.md §5):
- Para cada `pilar1_{campus}_{year}.json` do pacote listagens:
  - se já existe no canônico → sobrepõe apenas
    `PIES.NTE_total_estudantes_matriculados` e
    `PICOT.NTECPP_cotistas_em_pesquisa`;
  - se não existe → acrescenta o arquivo inteiro do pacote listagens.
- Nenhum outro campo do canônico é alterado (por construção: o merge só escreve
  os 2 campos autorizados; a estrutura é conferida por diff de chaves).
- Pilar 2/3: o canônico vence; só são acrescentados quando ausentes.
- Escrita atômica e determinística (mesmas regras do ZipIndicadoresSink).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import zipfile
from pathlib import Path

# Garante que a raiz do repositório esteja no sys.path para execução direta
raiz_repo = str(Path(__file__).resolve().parent.parent.parent)
if raiz_repo not in sys.path:
    sys.path.insert(0, raiz_repo)

from etl.adapters.sinks.zip_indicadores_sink import (  # noqa: E402
    ZipIndicadoresSink,
    validar_arquivos_pilar,
)
from etl.core.logic.models import RegistroPilarJson  # noqa: E402
from etl.flows.listagens_flow import CAMPOS_DERIVAVEIS_LISTAGENS  # noqa: E402

PADRAO_PILAR1 = re.compile(r"^pilar1_([a-z0-9]+)_(\d{4})\.json$")

# Únicos campos que o merge pode alterar em um pilar1 do canônico.
CAMPOS_MERGE_AUTORIZADOS = frozenset(
    {
        ("PIES", "NTE_total_estudantes_matriculados"),
        ("PICOT", "NTECPP_cotistas_em_pesquisa"),
    }
)


def _modo_soft(args: argparse.Namespace) -> bool:
    """Modo soft ativo por flag `--soft` OU variável de ambiente `SOFT=1`."""
    if args.soft:
        return True
    return os.getenv("SOFT", "").strip().lower() in {"1", "true", "yes", "on"}


def _serializar(dados: dict) -> str:
    return json.dumps(dados, ensure_ascii=False, indent=2) + "\n"


def _chaves(dados: dict) -> frozenset[tuple[str, str]]:
    """Conjunto de chaves (grupo, campo) dos indicadores — a 'estrutura' do contrato."""
    chaves: set[tuple[str, str]] = set()
    for grupo, ind in dados.get("indicadores", {}).items():
        if isinstance(ind, dict):
            for campo in ind:
                chaves.add((grupo, campo))
        else:
            chaves.add((grupo, "*"))
    return frozenset(chaves)


def _valor_derivado_valido(valor: object) -> bool:
    if valor is None:
        return True
    if isinstance(valor, bool):
        return False
    return isinstance(valor, int) and valor >= 0


def merge_arquivos(
    listagens: list[RegistroPilarJson],
    canonico: list[RegistroPilarJson],
) -> list[RegistroPilarJson]:
    """Funde os pacotes aplicando somente as regras autorizadas do contrato.

    Garantias por construção:
    - O merge parte de uma cópia de cada arquivo do canônico e só escreve os
      dois campos autorizados (PIES.NTE_total_estudantes_matriculados e
      PICOT.NTECPP_cotistas_em_pesquisa), portanto nenhum outro campo do
      canônico é alterado.
    - Estrutura (diff de chaves) do pilar1 é conferida: listagens e canônico
      precisam ter o mesmo shape de indicadores.
    - Pilar 2/3: o canônico vence; só são acrescentados quando ausentes.
    """
    por_nome_can: dict[str, RegistroPilarJson] = {r.nome: r for r in canonico}
    resultado: dict[str, RegistroPilarJson] = dict(por_nome_can)

    for registro_list in listagens:
        if PADRAO_PILAR1.match(registro_list.nome):
            dados_list = json.loads(registro_list.conteudo)
            registro_can = por_nome_can.get(registro_list.nome)
            if registro_can is None:
                resultado[registro_list.nome] = registro_list
                continue

            dados_can = json.loads(registro_can.conteudo)
            if _chaves(dados_list) != _chaves(dados_can):
                raise ValueError(
                    f"{registro_list.nome}: estrutura de indicadores diverge do "
                    f"canônico (diff de chaves) — merge recusado"
                )
            for grupo, campo in CAMPOS_MERGE_AUTORIZADOS:
                valor = dados_list["indicadores"][grupo][campo]
                if not _valor_derivado_valido(valor):
                    raise ValueError(
                        f"{registro_list.nome}: valor inválido para {grupo}.{campo} "
                        f"({valor!r})"
                    )
                if valor is not None:
                    dados_can["indicadores"][grupo][campo] = valor
            resultado[registro_list.nome] = RegistroPilarJson(
                registro_list.nome, _serializar(dados_can)
            )
        else:
            # Pilar 2/3 (e quaisquer não-pilar1): canônico vence; só acrescenta se ausente.
            resultado.setdefault(registro_list.nome, registro_list)

    return sorted(resultado.values(), key=lambda r: r.nome)


def _ler_arquivos(caminho: Path) -> list[RegistroPilarJson] | None:
    """Lê todos os JSON de um pacote ZIP. Retorna None se o pacote não existir."""
    if not caminho.exists():
        return None
    registros: list[RegistroPilarJson] = []
    with zipfile.ZipFile(caminho, "r") as zf:
        for nome in zf.namelist():
            registros.append(
                RegistroPilarJson(nome=nome, conteudo=zf.read(nome).decode("utf-8"))
            )
    return sorted(registros, key=lambda r: r.nome)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Integra NTE_total_estudantes_matriculados e "
            "NTECPP_cotistas_em_pesquisa (das listagens) no pacote canônico "
            "indicadores.zip sem alterar nenhum outro campo."
        )
    )
    parser.add_argument(
        "--listagens",
        default="data/dist/indicadores_listagens.zip",
        help="Pacote gerado pelo ETL de listagens (padrão: data/dist/indicadores_listagens.zip)",
    )
    parser.add_argument(
        "--canonical",
        default="data/dist/indicadores.zip",
        help="Pacote canônico de entrada (padrão: data/dist/indicadores.zip)",
    )
    parser.add_argument(
        "--saida",
        default="data/dist/indicadores.zip",
        help="Pacote de saída — padrão: sobrescreve data/dist/indicadores.zip",
    )
    parser.add_argument(
        "--soft",
        action="store_true",
        help=(
            "Modo soft (opt-in): se o pacote de listagens estiver ausente, pula a "
            "etapa com AVISO:+0 sem tocar indicadores.zip (default: fail-fast)"
        ),
    )
    args = parser.parse_args(argv)

    caminho_listagens = Path(args.listagens)
    caminho_canonic = Path(args.canonical)
    caminho_saida = Path(args.saida)

    if not caminho_listagens.exists():
        if _modo_soft(args):
            sys.stderr.write(
                f"AVISO: pacote de listagens ausente ('{args.listagens}') — "
                f"etapa pulada; '{args.saida}' não foi tocado por esta etapa "
                f"(NTE/NTECPP permanecem como estiverem).\n"
            )
            return 0
        sys.stderr.write(
            f"ERRO: pacote de listagens não encontrado: '{args.listagens}'\n"
        )
        return 1

    registros_listagens = _ler_arquivos(caminho_listagens)
    assert registros_listagens is not None

    registros_canonico = _ler_arquivos(caminho_canonic)
    if registros_canonico is None:
        sys.stderr.write(
            f"AVISO: pacote canônico ausente ('{args.canonical}') — "
            f"o merge partirá apenas das listagens.\n"
        )
        registros_canonico = []

    try:
        registros = merge_arquivos(registros_listagens, registros_canonico)
        validar_arquivos_pilar(registros, campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS)
        sink = ZipIndicadoresSink(
            caminho_saida, campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS
        )
        sink.load(registros)
    except ValueError as exc:
        sys.stderr.write(f"ERRO: {exc}\n")
        return 1

    print(
        f"Merge concluído: {args.saida} ({len(registros)} arquivos pilar"
        f"{{N}}_{{campus}}_{{ano}}.json)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
