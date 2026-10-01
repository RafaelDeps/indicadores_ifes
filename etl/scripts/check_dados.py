#!/usr/bin/env python3
"""Valida o contrato e sinaliza a frescor do pacote público indicadores.zip.

Contratos: `specs/011-etl-soft-mode-frescor/contracts/check-dados.md` (Etapas 1 e
2) e `specs/012-gate-proveniencia-workflow-dados/contracts/check-dados.md`
(Etapa 1.5).

Etapa 1 — validação de contrato (reuso de `validar_arquivos_pilar` +
`CAMPOS_DERIVAVEIS_LISTAGENS`): violação ⇒ `ERRO:` + exit 1.
Etapa 1.5 — cobertura de derivados (perda por campo, `origem - pacote`): perda
⇒ `ERRO:` + exit 1; origem ausente ⇒ `INFO:` + exit 0; origem ilegível ⇒ `ERRO:`
+ exit 1. **Não tem** variante sob modo tolerante: não há `SOFT` neste arquivo,
e não deve passar a haver (spec 012, FR-012).
Etapa 2 — avisos de frescor por `mtime` (nunca fatais, exit 0), comparando
apenas entradas presentes; entradas ausentes viram **uma** linha `INFO:`
informativa ("apenas o contrato foi validado") — sem falso alarme.

A Etapa 1.5 fica entre a §1 e a §2 porque é a única das três que responde "o
pacote tem o conteúdo que a origem tinha?": a 1 responde "o pacote é bem
formado?", a 2 responde "o pacote é recente?".
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Garante que a raiz do repositório esteja no sys.path para execução direta
raiz_repo = str(Path(__file__).resolve().parent.parent.parent)
if raiz_repo not in sys.path:
    sys.path.insert(0, raiz_repo)

from etl.adapters.sinks.zip_indicadores_sink import (  # noqa: E402
    ler_registros_zip,
    validar_arquivos_pilar,
)
from etl.core.logic.cobertura_listagens import (  # noqa: E402
    cobertura_registros,
    pares_registros,
    registrar_perdas,
    subtrair_coberturas,
)
from etl.core.logic.models import RegistroPilarJson  # noqa: E402
from etl.flows.listagens_flow import CAMPOS_DERIVAVEIS_LISTAGENS  # noqa: E402

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
        registros = ler_registros_zip(caminho_pacote)
        validar_arquivos_pilar(registros, campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS)
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

    # Etapa 1.5 — cobertura de derivados (NOVA). Verifica se a origem tinha
    # derivado e o pacote perdeu. Direção: origem → pacote.
    if caminho_listagens is not None:
        try:
            registros_origem: list[RegistroPilarJson] = ler_registros_zip(
                caminho_listagens
            )
            cob_origem = cobertura_registros(registros_origem)
            cob_pacote = cobertura_registros(registros)
            perda = subtrair_coberturas(cob_origem, cob_pacote)
            if perda:
                perdas_reg = registrar_perdas(
                    cob_origem, cob_pacote, pares_no_pacote=pares_registros(registros)
                )
                for perda_reg in perdas_reg:
                    chave = perda_reg.chave
                    campus, ano, campo = chave
                    if perda_reg.forma == "arquivo ausente":
                        sys.stderr.write(
                            f"ERRO: proveniência: {campus}/{ano} sem {campo} — "
                            "arquivo ausente no pacote.\n"
                        )
                    else:
                        sys.stderr.write(
                            f"ERRO: proveniência: {campus}/{ano} tem {campo} nulo — "
                            "a integração não escreveu.\n"
                        )
                pares_perdidos = {
                    (perda_reg.campus, perda_reg.ano) for perda_reg in perdas_reg
                }
                sys.stderr.write(
                    f"ERRO: proveniência: {len(pares_perdidos)} par(es) campus/ano "
                    "com derivado perdido — a integração das listagens não foi "
                    "aplicada a este pacote (Sucesso: "
                    f"{len(registros)} arquivo(s) acima refere-se apenas à forma, "
                    "não à proveniência).\n"
                )
                return 1
        except FileNotFoundError:
            sys.stderr.write(
                "INFO: cobertura de derivados não avaliada: "
                f"{rotulo_listagens} ausente — apenas o contrato foi validado.\n"
            )
        except Exception as exc:
            mensagem = str(exc)
            prefixo = "" if mensagem.startswith("ERRO:") else "ERRO: "
            sys.stderr.write(f"{prefixo}{mensagem}\n")
            return 1

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
