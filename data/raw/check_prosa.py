#!/usr/bin/env python3
"""Verifica corrupcao de caracteres em prosa escrita por assistencia.

O problema que este script existe para pegar: caractere de outro idioma ou
de outra escrita infiltrado no meio de uma frase em portugues. Aconteceu seis
vezes nesta sessao de trabalho (CJK, hangul, cirilico, e um token ingles
solt o), e nenhum dos casos aparece num linter de codigo -- porque o defeito
esta no texto, nao no programa.

Uso:

    python3 data/raw/check_prosa.py                  # os dois documentos
    python3 data/raw/check_prosa.py ARQUIVO [ARQUIVO...]
    python3 data/raw/check_prosa.py --relatorio      # nao falha; imprime e sai 0

Saida: 0 se limpo, 1 se ha ocorrencia, 2 em erro de uso.

O QUE ESTE SCRIPT NAO PEGA -- e a parte importante:

  * portugues malformado gramaticalmente ("um sonho detalhe");
  * palavra faltando espaco, ou duas palavras coladas, quando ambas sao ASCII
    ("semACs" e 100% ASCII: nenhuma classe de caractere o detecta);
  * qualquer erro de sentido ou de afirmacao.

Esses tres exigem leitura. Um script que os prometesse seria pior que nada,
porque pareceria cobrir a lacuna sem cobri-la. O que ele faz e reduzir o
candidato a zero para que a leitura venga sobre texto ja limpo.
"""

from __future__ import annotations

import re
import sys
import unicodedata
from pathlib import Path

DIRETORIO = Path(__file__).resolve().parent
PADRAO = [
    DIRETORIO / "plano_speckit_012_workflow_dados.md",
    DIRETORIO / "tasks_speckit_012.md",
]

# Escritas que nao deveriam aparecer em documento em portugues. Os intervalos
# sao propositalmente largos: preferir um falso positivo aqui e melhor do que
# deixar um caractere infiltrado passar.
ESCRITAS_NAO_LATINAS: dict[str, str] = {
    "CJK (han)": "\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff",
    "kana": "\u3040-\u30ff",
    "hangul": "\u1100-\u11ff\u3130-\u318f\uac00-\ud7af",
    "cirilico": "\u0400-\u04ff",
    "grego": "\u0370-\u03ff",
    "arabico": "\u0600-\u06ff",
    "hebraico": "\u0590-\u05ff",
    "devanagari": "\u0900-\u097f",
    "tailandes": "\u0e00-\u0e7f",
}

# Simbolos tipograficos em uso nos documentos, com o nome unicode ao lado
# para que uma troca inesperada apareca como nome e nao como mistério.
SIMBOLOS: dict[str, str] = {
    "\u2014": "EM DASH",
    "\u2013": "EN DASH",
    "\u2018": "LEFT SINGLE QUOTATION",
    "\u2019": "RIGHT SINGLE QUOTATION",
    "\u201c": "LEFT DOUBLE QUOTATION",
    "\u201d": "RIGHT DOUBLE QUOTATION",
    "\u2192": "RIGHTWARDS ARROW",
    "\u21d2": "RIGHTWARDS DOUBLE ARROW",
    "\u2260": "NOT EQUAL TO",
    "\u2282": "SUBSET OF",
    "\u00a7": "SECTION SIGN",
    "\u00b0": "DEGREE SIGN",
    "\u2264": "LESS-THAN OR EQUAL TO",
    "\u2265": "GREATER-THAN OR EQUAL TO",
    "\u2500": "BOX DRAWINGS LIGHT HORIZONTAL",
    "\u2502": "BOX DRAWINGS LIGHT VERTICAL",
    "\u251c": "BOX DRAWINGS LIGHT VERTICAL AND RIGHT",
    "\u2514": "BOX DRAWINGS LIGHT UP AND RIGHT",
    "\u00ba": "MASCULINE ORDINAL INDICATOR",
    "\u26a0": "WARNING SIGN",
    "\ufe0f": "VARIATION SELECTOR-16",
    "\U0001f3af": "DIRECT HIT",
    "\u00d7": "MULTIPLICATION SIGN",
    "\u2713": "CHECK MARK",
    "\u2717": "BALLOT X",
}

PADRAO_PALAVRA_REPETIDA = re.compile(r"\b(\w{2,})\s+\1\b", re.UNICODE)


def _linhas(arquivo: Path) -> list[tuple[int, str]]:
    return list(enumerate(arquivo.read_text(encoding="utf-8").splitlines(), 1))


def _nome(c: str) -> str:
    try:
        return unicodedata.name(c)
    except ValueError:
        return "<sem nome>"


def verificar_escritas_nao_latinas(arquivo: Path) -> list[str]:
    """Caractere de outra escrita, em qualquer posicao."""
    achados = []
    for rotulo, intervalo in ESCRITAS_NAO_LATINAS.items():
        padrao = re.compile(f"[{intervalo}]")
        for numero, linha in _linhas(arquivo):
            for m in padrao.finditer(linha):
                achados.append(
                    f"{arquivo.name}:{numero}  escrita {rotulo}: "
                    f"{m.group()!r} (U+{ord(m.group()):04X}, {_nome(m.group())})"
                )
    return achados


def _em_escrita_nao_latina(c: str) -> bool:
    return any(re.match(f"[{intervalo}]", c) for intervalo in ESCRITAS_NAO_LATINAS.values())


def verificar_nao_ascii_fora_da_lista(arquivo: Path) -> list[str]:
    """Tudo que nao for letra latina acentuada ou simbolo conhecido."""
    achados = []
    for numero, linha in _linhas(arquivo):
        for c in linha:
            if ord(c) < 128:
                continue
            eh_letra = unicodedata.category(c).startswith("L")
            nome = _nome(c)
            if eh_letra and nome.startswith(("LATIN", "COMBINING")):
                continue
            if c in SIMBOLOS:
                continue
            # Ja reportado, com mensagem mais especifica, pela outra verificacao.
            if _em_escrita_nao_latina(c):
                continue
            achados.append(
                f"{arquivo.name}:{numero}  nao-ASCII inesperado: "
                f"{c!r} (U+{ord(c):04X}, {nome})"
            )
    return achados


def verificar_palavra_repetida(arquivo: Path) -> list[str]:
    """Mesma palavra duas vezes seguidas -- quase sempre palavra perdida."""
    achados = []
    for numero, linha in _linhas(arquivo):
        for m in PADRAO_PALAVRA_REPETIDA.finditer(linha):
            achados.append(
                f"{arquivo.name}:{numero}  palavra repetida: {m.group()!r}"
            )
    return achados


VERIFICACOES = (
    ("caractere de escrita nao latina", verificar_escritas_nao_latinas),
    ("nao-ASCII fora da lista", verificar_nao_ascii_fora_da_lista),
    ("palavra repetida", verificar_palavra_repetida),
)


def principal(argv: list[str]) -> int:
    so_relatorio = "--relatorio" in argv
    alvos = [a for a in argv if not a.startswith("--")]

    if alvos:
        arquivos = [Path(a) for a in alvos]
    else:
        arquivos = PADRAO

    inexistentes = [a for a in arquivos if not a.is_file()]
    if inexistentes:
        for a in inexistentes:
            print(f"check_prosa: arquivo inexistente: {a}", file=sys.stderr)
        return 2

    achados: list[str] = []
    for arquivo in arquivos:
        for rotulo, funcao in VERIFICACOES:
            for achado in funcao(arquivo):
                achados.append(f"[{rotulo}] {achado}")

    for achado in achados:
        print(achado)

    print()
    print(f"check_prosa: {len(arquivos)} arquivo(s), {len(achados)} achado(s).")
    if not achados:
        print("Limpo no que este script sabe ver. O resto exige leitura.")
    if so_relatorio:
        return 0
    return 1 if achados else 0


if __name__ == "__main__":
    sys.exit(principal(sys.argv[1:]))
