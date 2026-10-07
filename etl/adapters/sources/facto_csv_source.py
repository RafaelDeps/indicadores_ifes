from __future__ import annotations

import csv
from datetime import date, datetime
from pathlib import Path
import re

from etl.core.logic.models.facto import ProjetoFacto
from etl.core.logic.resolvers.campus_resolver import resolver_campi_facto


def parse_brazilian_currency(val: str | None) -> float:
    """Converte uma string monetária brasileira (ex.: '1.256.355,65' ou 'R$ 500,00') em float."""
    if not val:
        return 0.0
    limpo = re.sub(r"[^\d,\.-]", "", str(val)).strip()
    if not limpo:
        return 0.0
    # Remove separadores de milhar (pontos) e substitui vírgula decimal por ponto
    sem_pontos = limpo.replace(".", "")
    com_ponto_decimal = sem_pontos.replace(",", ".")
    try:
        return float(com_ponto_decimal)
    except ValueError:
        return 0.0


def parse_brazilian_date(val: str | None) -> date | None:
    """Converte uma string de data no formato DD/MM/YYYY em objeto date."""
    if not val:
        return None
    val_limpo = str(val).strip()
    try:
        dt = datetime.strptime(val_limpo, "%d/%m/%Y")
        return dt.date()
    except ValueError:
        return None


class FactoCsvSource:
    """Fonte de dados para ingestão de projetos e fomento da FACTO a partir de CSVs."""

    def __init__(self, caminho_dir: Path | str = "data/raw/pilar2") -> None:
        self.caminho_dir = Path(caminho_dir)

    def extract(self) -> tuple[list[ProjetoFacto], list[str]]:
        """
        Extrai a lista de projetos FACTO de projetos.csv.
        Em conformidade com a especificação, caso o arquivo ou diretório esteja ausente,
        retorna uma lista vazia com um AVISO em vez de falhar a execução.
        """
        avisos: list[str] = []
        caminho_arquivo = self.caminho_dir / "projetos.csv"

        if not caminho_arquivo.exists():
            avisos.append(
                f"AVISO: dados FACTO ausentes em '{caminho_arquivo}' — "
                "mantendo métricas do Pilar 2 como null"
            )
            return [], avisos

        projetos: list[ProjetoFacto] = []
        try:
            with open(
                caminho_arquivo, mode="r", encoding="utf-8-sig", errors="replace"
            ) as f:
                reader = csv.DictReader(f, delimiter=";")
                for row in reader:
                    pid = str(row.get("id", "")).strip()
                    ref = str(row.get("Referência do projeto", "")).strip()
                    coord = str(row.get("Coordenador", "")).strip()
                    fin = str(row.get("Financiadora", "")).strip()
                    dt_ini = parse_brazilian_date(row.get("Data de início"))
                    dt_vig = parse_brazilian_date(row.get("Data de vigência"))
                    dt_enc = parse_brazilian_date(row.get("Data de encerramento"))
                    tipo = str(row.get("Tipo de Projeto", "")).strip()
                    cat = str(row.get("Categoria de Projeto", "")).strip()
                    instr = str(row.get("Instrumento Jurídico", "")).strip()
                    inst_exec = str(row.get("Instituição executora", "")).strip()
                    dept = str(row.get("Departamento", "")).strip()
                    proc = str(row.get("Processo e sub-processo", "")).strip()
                    val = parse_brazilian_currency(row.get("Valor aprovado"))
                    obj = str(row.get("Objetivo / Objeto / Título", "")).strip()

                    campus_slugs = resolver_campi_facto(
                        instituicao=inst_exec,
                        referencia=ref,
                        departamento=dept,
                    )

                    projetos.append(
                        ProjetoFacto(
                            id=pid,
                            referencia=ref,
                            coordenador=coord,
                            financiadora=fin,
                            data_inicio=dt_ini,
                            data_vigencia=dt_vig,
                            data_encerramento=dt_enc,
                            tipo_projeto=tipo,
                            categoria_projeto=cat,
                            instrumento_juridico=instr,
                            instituicao_executora=inst_exec,
                            departamento=dept,
                            processo=proc,
                            valor_aprovado=val,
                            objetivo=obj,
                            campus_slugs=campus_slugs,
                        )
                    )
        except Exception as e:
            avisos.append(f"AVISO: falha ao ler '{caminho_arquivo}': {e}")
            return [], avisos

        return projetos, avisos
