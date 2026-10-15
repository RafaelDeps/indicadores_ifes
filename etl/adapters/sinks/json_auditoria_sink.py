"""Sink para serialização determinística de fixtures de auditoria (feature 026).

Grava arquivos no formato data/dist/auditoria/{INDICADOR}_{campus}_{ano}.json,
garantindo estabilidade de bytes (chaves ordenadas, ensure_ascii=False, quebra de linha final).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


class JsonAuditoriaSink:
    def __init__(self, pasta_saida: Path) -> None:
        self.pasta_saida = pasta_saida

    def salvar(self, fixture: dict[str, Any]) -> Path:
        campus = fixture.get("campus", "")
        if campus == "todos":
            raise ValueError(
                "O escopo de campus 'todos' não é permitido para fixtures de auditoria."
            )

        indicador = fixture.get("indicador", "")
        ano = fixture.get("ano", 0)

        nome_arquivo = f"{indicador}_{campus}_{ano}.json"
        self.pasta_saida.mkdir(parents=True, exist_ok=True)
        caminho = self.pasta_saida / nome_arquivo

        conteudo = (
            json.dumps(fixture, indent=2, ensure_ascii=False, sort_keys=False) + "\n"
        )
        caminho.write_text(conteudo, encoding="utf-8")
        return caminho
