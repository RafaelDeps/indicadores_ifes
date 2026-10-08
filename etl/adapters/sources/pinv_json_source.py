from __future__ import annotations

import json
from pathlib import Path

from etl.core.logic.models.pillar2_models import DadosPinvCampus


class PinvJsonSource:
    """Leitor dos arquivos JSON de percentual calculado de PINV por campus."""

    def __init__(self, diretorio_base: Path | str = "data") -> None:
        self.diretorio_base = Path(diretorio_base)

    def carregar_por_campus(self, campus_slug: str) -> DadosPinvCampus | None:
        """Busca pinv_<campus_slug>.json na raiz de data ou em data/raw/pilar2/."""
        caminhos_candidatos = [
            self.diretorio_base / f"pinv_{campus_slug}.json",
            self.diretorio_base / "data" / f"pinv_{campus_slug}.json",
            self.diretorio_base / "raw" / "pilar2" / f"pinv_{campus_slug}.json",
            self.diretorio_base
            / "data"
            / "raw"
            / "pilar2"
            / f"pinv_{campus_slug}.json",
        ]

        for caminho in caminhos_candidatos:
            if caminho.is_file():
                try:
                    conteudo = json.loads(caminho.read_text(encoding="utf-8"))
                    return self._parse_dados(conteudo, campus_slug)
                except (json.JSONDecodeError, OSError, KeyError, TypeError):
                    return None
        return None

    def _parse_dados(self, conteudo: dict, campus_slug: str) -> DadosPinvCampus | None:
        indicador = conteudo.get("indicador", "PINV")
        campus = conteudo.get("campus", campus_slug.capitalize())
        slug = conteudo.get("campus_slug", campus_slug)
        unidade = conteudo.get("unidade", "%")

        valores_raw = conteudo.get("valores_por_ano", {})
        valores_por_ano: dict[int, float] = {}

        if isinstance(valores_raw, dict):
            for ano_str, val in valores_raw.items():
                try:
                    valores_por_ano[int(ano_str)] = float(val)
                except (ValueError, TypeError):
                    continue

        if not valores_por_ano and isinstance(conteudo.get("resultados_anuais"), list):
            for item in conteudo["resultados_anuais"]:
                if isinstance(item, dict) and "ano" in item and "percentual" in item:
                    try:
                        valores_por_ano[int(item["ano"])] = float(item["percentual"])
                    except (ValueError, TypeError):
                        continue

        return DadosPinvCampus(
            indicador=indicador,
            campus=campus,
            campus_slug=slug,
            unidade=unidade,
            valores_por_ano=valores_por_ano,
        )
