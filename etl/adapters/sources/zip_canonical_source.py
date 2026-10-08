from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from typing import Any

from etl.core.logic.models import (
    Artigo,
    AutorProducao,
    Campus,
    ExportCanonicos,
    FonteFinanciamento,
    Iniciativa,
    MembroEquipe,
    Pessoa,
    Producao,
    ProjetoSigpesqFinanciamento,
    RefCampus,
    TipoProducao,
)
from etl.core.logic.resolvers.campus_resolver import (
    normalizar_slug,
    resolver_campus_sigpesq,
)
from etl.core.logic.temporal.activity_filter import (
    extrair_ano_mes_inicio,
    projetar_ano_fim,
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

    def extrair_projetos_sigpesq(self) -> list[ProjetoSigpesqFinanciamento]:
        """Extrai os projetos de pesquisa e seus dados de financiamento de project_sigpesq_files_json/."""
        if not self.caminho_zip.exists():
            return []

        projetos: list[ProjetoSigpesqFinanciamento] = []

        try:
            with zipfile.ZipFile(self.caminho_zip, "r") as zf:
                nomes_sigpesq = [
                    n
                    for n in zf.namelist()
                    if n.startswith("project_sigpesq_files_json/")
                    and n.endswith(".json")
                ]

                # Mapeamento auxiliar de pesquisadores para campus institucional
                pesquisadores_campus_map: dict[str, str] = {}
                if "researchers_canonical.json" in zf.namelist():
                    try:
                        with zf.open("researchers_canonical.json") as rf:
                            r_list = json.loads(rf.read().decode("utf-8"))
                            for r in r_list:
                                r_nome = r.get("name")
                                r_c = r.get("campus")
                                if r_nome and r_c and isinstance(r_c, dict):
                                    c_name = r_c.get("name", "")
                                    if c_name:
                                        pesquisadores_campus_map[
                                            normalizar_slug(r_nome)
                                        ] = c_name
                    except Exception:
                        pass

                for nome_arquivo in nomes_sigpesq:
                    try:
                        with zf.open(nome_arquivo) as f:
                            dados = json.loads(f.read().decode("utf-8"))
                    except (json.JSONDecodeError, OSError):
                        continue

                    codigo = dados.get("codigo") or Path(nome_arquivo).stem
                    titulo = dados.get("titulo")

                    # Datas de vigência
                    datas = dados.get("datas") or {}
                    inicio_str = str(datas.get("inicio") or "")
                    fim_str = str(datas.get("fim") or "")
                    duracao_meses_raw = datas.get("duracao_meses")
                    duracao_meses: int | None = None
                    if (
                        duracao_meses_raw is not None
                        and str(duracao_meses_raw).strip().isdigit()
                    ):
                        duracao_meses = int(str(duracao_meses_raw).strip())

                    ano_inicio, mes_inicio = extrair_ano_mes_inicio(inicio_str)

                    # Fallback para cronograma quando inicio_str for nulo/vazio
                    cronograma = dados.get("cronograma") or []
                    datas_cronograma: list[str] = []
                    if isinstance(cronograma, list):
                        for ativ in cronograma:
                            if isinstance(ativ, dict):
                                for k in ("inicio", "fim"):
                                    val_data = ativ.get(k)
                                    if (
                                        val_data
                                        and isinstance(val_data, str)
                                        and re.search(r"\d{4}", val_data)
                                    ):
                                        datas_cronograma.append(val_data.strip())

                    if ano_inicio is None and datas_cronograma:
                        ano_inicio, mes_inicio = extrair_ano_mes_inicio(
                            min(datas_cronograma)
                        )

                    m_fim = re.search(r"(\d{4})", fim_str)
                    ano_fim = int(m_fim.group(1)) if m_fim else None

                    if ano_fim is None and ano_inicio is not None:
                        ano_fim = projetar_ano_fim(
                            ano_inicio=ano_inicio,
                            duracao_meses=duracao_meses,
                            mes_inicio=mes_inicio,
                        )

                    if ano_fim is None and datas_cronograma:
                        m_cron_fim = re.search(r"(\d{4})", max(datas_cronograma))
                        if m_cron_fim:
                            ano_fim = int(m_cron_fim.group(1))

                    # Financiamento e Fontes
                    fin = dados.get("financiamento") or {}
                    valor_total = fin.get("valor_total")
                    fontes_list: list[FonteFinanciamento] = []
                    for f_item in fin.get("fontes") or []:
                        f_nome = f_item.get("fonte", "")
                        f_tipo = f_item.get("tipo")
                        f_val = f_item.get("valor")
                        fontes_list.append(
                            FonteFinanciamento(
                                fonte=f_nome,
                                tipo=f_tipo,
                                valor=float(f_val) if f_val is not None else None,
                            )
                        )

                    if valor_total is None and fontes_list:
                        valores_fontes = [
                            f.valor for f in fontes_list if f.valor is not None
                        ]
                        if valores_fontes:
                            valor_total = sum(valores_fontes)

                    if valor_total is None:
                        valor_total = 0.0
                    else:
                        valor_total = float(valor_total)

                    # Resolução de Campus
                    coord = dados.get("coordenador") or {}
                    coord_nome = (coord.get("nome") or "").strip()
                    coord_campus = (coord.get("campus") or "").strip()

                    campus_slug, campus_nome = resolver_campus_sigpesq(
                        coord_campus=coord_campus,
                        coord_nome=coord_nome,
                        equipe=dados.get("equipe", []),
                        pesquisadores_campus_map=pesquisadores_campus_map,
                    )

                    projetos.append(
                        ProjetoSigpesqFinanciamento(
                            codigo=codigo,
                            titulo=titulo,
                            campus_slug=campus_slug,
                            campus_nome=campus_nome,
                            ano_inicio=ano_inicio,
                            ano_fim=ano_fim,
                            duracao_meses=duracao_meses,
                            valor_total=round(valor_total, 2),
                            fontes=fontes_list,
                        )
                    )
        except (zipfile.BadZipFile, OSError):
            return []

        return projetos
