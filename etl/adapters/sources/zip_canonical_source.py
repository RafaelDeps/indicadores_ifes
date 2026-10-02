from __future__ import annotations

import json
import zipfile
from pathlib import Path
from typing import Any

from etl.core.logic.models import (
    Artigo,
    AutorProducao,
    Campus,
    ExportCanonicos,
    Iniciativa,
    MembroEquipe,
    Pessoa,
    Producao,
    RefCampus,
    TipoProducao,
)
from etl.core.ports.source import ISource

ARQUIVOS_OBRIGATORIOS = [
    "campuses_canonical.json",
    "initiatives_canonical.json",
    "researchers_canonical.json",
    "students_canonical.json",
    "articles_canonical.json",
    "production_authors_canonical.json",
    "production_types_canonical.json",
]


class ZipCanonicalSource(ISource):
    """Adaptador para extração de entidades canônicas a partir de um pacote ZIP."""

    def __init__(self, caminho_zip: Path | str) -> None:
        self.caminho_zip = Path(caminho_zip)

    def extract(self) -> ExportCanonicos:
        if not self.caminho_zip.exists():
            raise FileNotFoundError(
                f"ERRO: Arquivo canônico não encontrado em '{self.caminho_zip}'."
            )

        avisos: list[str] = []

        try:
            with zipfile.ZipFile(self.caminho_zip, "r") as zf:
                nomes_no_zip = set(zf.namelist())
                for obrigatorio in ARQUIVOS_OBRIGATORIOS:
                    if obrigatorio not in nomes_no_zip:
                        raise ValueError(
                            "ERRO: Arquivo canônico obrigatório ausente no pacote ZIP: "
                            f"'{obrigatorio}'."
                        )

                # Produções pode ser research_productions_canonical.json ou
                # productions_canonical.json
                nome_producoes = None
                for candidato in [
                    "research_productions_canonical.json",
                    "productions_canonical.json",
                ]:
                    if candidato in nomes_no_zip:
                        nome_producoes = candidato
                        break

                if not nome_producoes:
                    raise ValueError(
                        "ERRO: Arquivo canônico obrigatório ausente no pacote ZIP: "
                        "'research_productions_canonical.json'."
                    )

                def ler_json(nome: str) -> list[dict[str, Any]]:
                    with zf.open(nome) as f:
                        return json.loads(f.read().decode("utf-8"))

                dados_campi = ler_json("campuses_canonical.json")
                dados_iniciativas = ler_json("initiatives_canonical.json")
                dados_pesquisadores = ler_json("researchers_canonical.json")
                dados_estudantes = ler_json("students_canonical.json")
                dados_artigos = ler_json("articles_canonical.json")
                dados_producoes = ler_json(nome_producoes)
                dados_autores = ler_json("production_authors_canonical.json")
                dados_tipos = ler_json("production_types_canonical.json")
        except zipfile.BadZipFile as e:
            raise ValueError(
                f"ERRO: O arquivo '{self.caminho_zip}' está corrompido ou não é um ZIP válido: {e}"
            ) from e

        # --- Deduplicação e Parse de Entidades ---

        # 1. Campi
        campi: list[Campus] = []
        campi_ids: set[int] = set()
        for c in dados_campi:
            cid = c.get("id")
            if cid in campi_ids:
                avisos.append(f"AVISO: campus duplicado ignorado (id: {cid})")
                continue
            campi_ids.add(cid)
            campi.append(Campus(id=cid, name=c.get("name", "")))

        # 2. Pesquisadores
        pessoas: list[Pessoa] = []
        pessoas_ids: set[int] = set()
        for p in dados_pesquisadores:
            pid = p.get("id")
            if pid in pessoas_ids:
                avisos.append(f"AVISO: pesquisador duplicado ignorado (id: {pid})")
                continue
            pessoas_ids.add(pid)
            ref_c = RefCampus(**p["campus"]) if p.get("campus") else None
            pessoas.append(
                Pessoa(
                    id=pid,
                    name=p.get("name", ""),
                    classification=p.get("classification"),
                    campus=ref_c,
                    articles=p.get("articles"),
                )
            )

        # 3. Estudantes
        estudantes: list[Pessoa] = []
        estudantes_ids: set[int] = set()
        for e in dados_estudantes:
            eid = e.get("id")
            if eid in estudantes_ids:
                avisos.append(f"AVISO: estudante duplicado ignorado (id: {eid})")
                continue
            estudantes_ids.add(eid)
            ref_c = RefCampus(**e["campus"]) if e.get("campus") else None
            estudantes.append(
                Pessoa(
                    id=eid,
                    name=e.get("name", ""),
                    classification=e.get("classification") or "student",
                    campus=ref_c,
                )
            )

        # 4. Iniciativas
        iniciativas: list[Iniciativa] = []
        iniciativas_ids: set[int] = set()
        for ini in dados_iniciativas:
            iid = ini.get("id")
            if iid in iniciativas_ids:
                avisos.append(f"AVISO: iniciativa duplicada ignorada (id: {iid})")
                continue
            iniciativas_ids.add(iid)
            ref_c = RefCampus(**ini["campus"]) if ini.get("campus") else None

            equipe = [
                MembroEquipe(
                    person_id=m["person_id"],
                    person_name=m.get("person_name", ""),
                    roles=m.get("roles", []),
                    start_date=m.get("start_date"),
                    end_date=m.get("end_date"),
                )
                for m in ini.get("team", [])
            ]

            iniciativas.append(
                Iniciativa(
                    id=iid,
                    name=ini.get("name", ""),
                    status=ini.get("status"),
                    start_date=ini.get("start_date"),
                    end_date=ini.get("end_date"),
                    initiative_type=ini.get("initiative_type"),
                    campus=ref_c,
                    team=equipe,
                )
            )

        # 5. Artigos
        artigos: list[Artigo] = []
        artigos_ids: set[int] = set()
        for a in dados_artigos:
            aid = a.get("id")
            if aid in artigos_ids:
                avisos.append(f"AVISO: artigo duplicado ignorado (id: {aid})")
                continue
            artigos_ids.add(aid)
            ref_c = RefCampus(**a["campus"]) if a.get("campus") else None
            artigos.append(
                Artigo(
                    id=aid,
                    title=a.get("title", ""),
                    year=a.get("year"),
                    type=a.get("type"),
                    campus=ref_c,
                )
            )

        # 6. Produções
        producoes: list[Producao] = []
        producoes_ids: set[int] = set()
        for pr in dados_producoes:
            prid = pr.get("id")
            if prid in producoes_ids:
                avisos.append(f"AVISO: produção duplicada ignorada (id: {prid})")
                continue
            producoes_ids.add(prid)
            ref_c = RefCampus(**pr["campus"]) if pr.get("campus") else None
            producoes.append(
                Producao(
                    id=prid,
                    title=pr.get("title", ""),
                    year=pr.get("year"),
                    production_type_id=pr.get("production_type_id"),
                    campus=ref_c,
                )
            )

        # 7. Autores de Produção
        autores = [
            AutorProducao(
                production_id=ap["production_id"],
                researcher_id=ap["researcher_id"],
            )
            for ap in dados_autores
        ]

        # 8. Tipos de Produção
        tipos = [TipoProducao(id=tp["id"], name=tp["name"]) for tp in dados_tipos]

        return ExportCanonicos(
            iniciativas=iniciativas,
            pessoas=pessoas,
            estudantes=estudantes,
            campi=campi,
            artigos=artigos,
            producoes=producoes,
            autores_producao=autores,
            tipos_producao=tipos,
            avisos=avisos,
        )
