"""Flow de geração de fixtures de auditoria (feature 026, contracts/fixture-auditoria.md).

Gera data/dist/auditoria/{INDICADOR}_{campus}_{ano}.json serializado deterministicamente,
vinculando cada contagem e soma aos registros reais coletados no mesmo passe das contagens.
"""

from __future__ import annotations

import json
import zipfile
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from etl.adapters.sinks.json_auditoria_sink import JsonAuditoriaSink
from etl.adapters.sources.listagens_xlsx_source import ListagensXlsxSource
from etl.adapters.sources.zip_canonical_source import ZipCanonicalSource
from etl.core.logic.calculators.aggregator import agregar_indicadores
from etl.core.logic.calculators.coletor_registros import ColetorRegistros
from etl.core.logic.calculators.pillar2 import eh_parceria_externa_sigpesq
from etl.core.logic.classificacoes_listagens import SITUACOES_NTE
from etl.core.logic.normalizacao_nomes import normalizar_nome
from etl.core.logic.resolvers.campus_resolver import normalizar_slug


@dataclass
class ResultadoAuditoriaFlow:
    fixtures: list[Path] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)


class AuditoriaFlow:
    def __init__(
        self,
        caminho_canonico: Path | str,
        pasta_listagens: Path | str,
        caminho_pacote: Path | str,
        pasta_saida: Path | str,
        anos: list[int],
        soft: bool = False,
    ) -> None:
        self.caminho_canonico = Path(caminho_canonico)
        self.pasta_listagens = Path(pasta_listagens)
        self.caminho_pacote = Path(caminho_pacote)
        self.pasta_saida = Path(pasta_saida)
        self.anos = sorted(anos)
        self.soft = soft
        self.sink = JsonAuditoriaSink(self.pasta_saida)

    def run(self) -> ResultadoAuditoriaFlow:
        resultado = ResultadoAuditoriaFlow()

        if not self.caminho_pacote.exists():
            msg = f"AVISO: pacote canônico indicadores.zip não encontrado em '{self.caminho_pacote}' — fixtures não geradas"
            if self.soft:
                resultado.avisos.append(msg)
                return resultado
            raise FileNotFoundError(msg)

        if not self.caminho_canonico.exists():
            msg = f"AVISO: arquivo canônico não encontrado em '{self.caminho_canonico}'"
            if self.soft:
                resultado.avisos.append(msg)
                return resultado
            raise FileNotFoundError(msg)

        # 1. Carrega dados canônicos e extrai iniciativas/membros/artigos/produções
        canonical_source = ZipCanonicalSource(self.caminho_canonico)
        exportacao = canonical_source.extract()
        projetos_sigpesq = canonical_source.extrair_projetos_sigpesq()

        coletor = ColetorRegistros()
        _, avisos_agg = agregar_indicadores(
            exportacao=exportacao,
            anos=self.anos,
            projetos_sigpesq=projetos_sigpesq,
            coletor=coletor,
        )
        resultado.avisos.extend(avisos_agg)

        # 2. Carrega listagens com retenção de nome e curso
        listagens_source = ListagensXlsxSource(
            self.pasta_listagens, reter_nome_curso=True
        )
        extraidas_listagens = listagens_source.extract()
        resultado.avisos.extend(extraidas_listagens.avisos)

        # 3. Lê o pacote publicado para obter os valores apurados canônicos
        pacote_dados: dict[str, dict[str, Any]] = {}
        with zipfile.ZipFile(self.caminho_pacote, "r") as zf:
            for nome_arq in zf.namelist():
                if nome_arq.endswith(".json"):
                    pacote_dados[nome_arq] = json.loads(
                        zf.read(nome_arq).decode("utf-8")
                    )

        # 4. Gera fixtures por campus específico e ano
        campi_especificos = [c for c in exportacao.campi if c.slug != "todos"]
        gerado_em = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        for campus in campi_especificos:
            slug = normalizar_slug(campus.name)
            for ano in self.anos:
                chave_listagem = (slug, ano)
                fontes = [{"arquivo": self.caminho_canonico.name, "revisao": None}]
                for arq in sorted(self.pasta_listagens.glob(f"listagem_{ano}_*.xlsx")):
                    sem = arq.stem.split("_")[-1]
                    fontes.append({"arquivo": arq.name, "revisao": f"{ano}-{sem}"})

                pilar1_json = pacote_dados.get(f"pilar1_{slug}_{ano}.json", {}).get(
                    "indicadores", {}
                )
                pilar2_json = pacote_dados.get(f"pilar2_{slug}_{ano}.json", {}).get(
                    "indicadores", {}
                )
                pilar3_json = pacote_dados.get(f"pilar3_{slug}_{ano}.json", {}).get(
                    "indicadores", {}
                )

                # Estudantes únicos de listagens (NTE)
                alunos_listagem = []
                vistos_matricula = set()
                alunos_por_semestre = extraidas_listagens.por_campus_ano.get(
                    chave_listagem, {}
                )
                for sem in sorted(alunos_por_semestre):
                    for aluno in alunos_por_semestre[sem]:
                        if aluno.situacao in SITUACOES_NTE:
                            if aluno.matricula not in vistos_matricula:
                                vistos_matricula.add(aluno.matricula)
                                alunos_listagem.append(aluno)

                alunos_listagem.sort(key=lambda a: a.matricula)
                registros_nte = [
                    {
                        "matricula": a.matricula,
                        "nome": a.nome,
                        "curso": a.curso,
                        "situacao": a.situacao,
                    }
                    for a in alunos_listagem
                ]

                # Dicionário de match por nome normalizado da listagem
                match_por_nome = {}
                for a in alunos_listagem:
                    if a.nome:
                        match_por_nome[normalizar_nome(a.nome)] = a

                # NEP enriquecido
                nep_coletados = coletor.registros("NEP", slug, ano)
                registros_nep = []
                for reg in nep_coletados:
                    aluno_match = match_por_nome.get(
                        normalizar_nome(reg.get("nome", ""))
                    )
                    registros_nep.append(
                        {
                            "nome": reg.get("nome"),
                            "projeto": reg.get("projeto"),
                            "papel": reg.get("papel"),
                            "matricula": aluno_match.matricula if aluno_match else None,
                            "curso": aluno_match.curso if aluno_match else None,
                        }
                    )

                # NTECPP (interseção cotistas e NEP)
                cotistas_nomes = extraidas_listagens.nomes_cotistas.get(
                    chave_listagem, set()
                )
                registros_ntecpp = []
                for r in registros_nep:
                    if normalizar_nome(r.get("nome", "")) in cotistas_nomes:
                        registros_ntecpp.append(
                            {
                                "nome": r.get("nome"),
                                "matricula": r.get("matricula"),
                                "curso": r.get("curso"),
                            }
                        )

                # TAFPPI (soma)
                registros_tafppi = []
                if projetos_sigpesq:
                    for ps in projetos_sigpesq:
                        if ps.campus_slug == slug and ps.ano_inicio == ano:
                            if ps.valor_total and ps.valor_total > 0:
                                fonte_nome = (
                                    ps.fontes[0].fonte
                                    if ps.fontes
                                    else "Recursos Externos"
                                )
                                registros_tafppi.append(
                                    {
                                        "projeto": ps.titulo,
                                        "codigo": ps.codigo,
                                        "valor": ps.valor_total,
                                        "fonte": fonte_nome,
                                    }
                                )

                # NAPPCT (PIPDI)
                registros_nappct = []
                if projetos_sigpesq:
                    for ps in projetos_sigpesq:
                        if (
                            ps.campus_slug == slug
                            and ps.ativo_em_ano(ano)
                            and eh_parceria_externa_sigpesq(ps)
                        ):
                            registros_nappct.append(
                                {
                                    "projeto": ps.titulo,
                                    "codigo": ps.codigo,
                                    "inicio": (
                                        str(ps.ano_inicio) if ps.ano_inicio else None
                                    ),
                                    "fim": str(ps.ano_fim) if ps.ano_fim else None,
                                }
                            )

                # --- 9 Indicadores ---
                fixtures_specs = [
                    # 1. NTPP
                    {
                        "indicador": "NTPP",
                        "componentes": [
                            {
                                "papel": "unica",
                                "simbolo": "PRE",
                                "rotulo": "Projetos Registrados em Execução",
                                "unidade": "Projetos",
                                "tipoContagem": "contagem",
                                "apurado": pilar1_json.get("NTPP", {}).get(
                                    "total_projetos_NTPP",
                                    pilar1_json.get("NTPP", {}).get(
                                        "projetos_pesquisa_registrados_execucao"
                                    ),
                                ),
                                "detalhado": True,
                                "campos": [
                                    "projeto",
                                    "status",
                                    "inicio",
                                    "fim",
                                    "campus",
                                ],
                                "registros": coletor.registros("PRE", slug, ano),
                            }
                        ],
                    },
                    # 2. QSPP
                    {
                        "indicador": "QSPP",
                        "componentes": [
                            {
                                "papel": "unica",
                                "simbolo": "SUPP",
                                "rotulo": "Servidores Únicos Participantes",
                                "unidade": "Servidores",
                                "tipoContagem": "contagem",
                                "apurado": pilar1_json.get("QSPP", {}).get(
                                    "total_servidores_QSPP",
                                    pilar1_json.get("QSPP", {}).get(
                                        "SUPP_servidores_unicos_participantes"
                                    ),
                                ),
                                "detalhado": True,
                                "campos": ["nome", "projeto", "papel"],
                                "registros": coletor.registros("SUPP", slug, ano),
                            }
                        ],
                    },
                    # 3. PIES
                    {
                        "indicador": "PIES",
                        "componentes": [
                            {
                                "papel": "numerador",
                                "simbolo": "NEP",
                                "rotulo": "Estudantes em Pesquisa",
                                "unidade": "Estudantes",
                                "tipoContagem": "contagem",
                                "apurado": pilar1_json.get("PIES", {}).get(
                                    "NEP_estudantes_em_pesquisa"
                                ),
                                "detalhado": True,
                                "campos": [
                                    "nome",
                                    "projeto",
                                    "papel",
                                    "matricula",
                                    "curso",
                                ],
                                "registros": registros_nep,
                            },
                            {
                                "papel": "denominador",
                                "simbolo": "NTE",
                                "rotulo": "Total de Estudantes Matriculados",
                                "unidade": "Estudantes",
                                "tipoContagem": "contagem",
                                "apurado": pilar1_json.get("PIES", {}).get(
                                    "NTE_total_estudantes_matriculados"
                                ),
                                "detalhado": True,
                                "campos": ["matricula", "nome", "curso", "situacao"],
                                "registros": registros_nte,
                            },
                            {
                                "papel": "numerador",
                                "simbolo": "NTECPP",
                                "rotulo": "Estudantes Cotistas em Pesquisa",
                                "unidade": "Estudantes",
                                "tipoContagem": "contagem",
                                "apurado": pilar1_json.get("PICOT", {}).get(
                                    "NTECPP_cotistas_em_pesquisa"
                                ),
                                "detalhado": True,
                                "campos": ["nome", "matricula", "curso"],
                                "registros": registros_ntecpp,
                            },
                        ],
                    },
                    # 4. PICOT
                    {
                        "indicador": "PICOT",
                        "componentes": [
                            {
                                "papel": "numerador",
                                "simbolo": "NTECPP",
                                "rotulo": "Estudantes Cotistas em Pesquisa",
                                "unidade": "Estudantes",
                                "tipoContagem": "contagem",
                                "apurado": pilar1_json.get("PICOT", {}).get(
                                    "NTECPP_cotistas_em_pesquisa"
                                ),
                                "detalhado": True,
                                "campos": ["nome", "matricula", "curso"],
                                "registros": registros_ntecpp,
                            },
                            {
                                "papel": "denominador",
                                "simbolo": "NEP",
                                "rotulo": "Total de Estudantes em Pesquisa",
                                "unidade": "Estudantes",
                                "tipoContagem": "contagem",
                                "apurado": pilar1_json.get("PICOT", {}).get(
                                    "NEP_total_estudantes_em_pesquisa",
                                    pilar1_json.get("PICOT", {}).get(
                                        "NEP_estudantes_em_pesquisa"
                                    ),
                                ),
                                "detalhado": True,
                                "campos": [
                                    "nome",
                                    "projeto",
                                    "papel",
                                    "matricula",
                                    "curso",
                                ],
                                "registros": registros_nep,
                            },
                        ],
                    },
                    # 5. PINV
                    {
                        "indicador": "PINV",
                        "componentes": [
                            {
                                "papel": "parcela",
                                "simbolo": "TAFPPI",
                                "rotulo": "Total de Aporte em Pesquisa e Pós-Graduação",
                                "unidade": "R$",
                                "tipoContagem": "soma",
                                "apurado": pilar2_json.get("PINV", {}).get(
                                    "TAFPPI_valor_total_aporte_pesquisa"
                                ),
                                "detalhado": True,
                                "campos": ["projeto", "codigo", "valor", "fonte"],
                                "registros": registros_tafppi,
                            },
                            {
                                "papel": "denominador",
                                "simbolo": "OCC",
                                "rotulo": "Orçamento Total de Capital e Custeio",
                                "unidade": "R$",
                                "tipoContagem": "soma",
                                "apurado": pilar2_json.get("PINV", {}).get(
                                    "OCC_valor_orcamento_total_capital_custeio"
                                ),
                                "detalhado": False,
                                "campos": [],
                                "registros": [],
                            },
                        ],
                    },
                    # 6. PIPDI
                    {
                        "indicador": "PIPDI",
                        "componentes": [
                            {
                                "papel": "unica",
                                "simbolo": "NAPPCT",
                                "rotulo": "Acordos de Parceria Firmados",
                                "unidade": "Acordos",
                                "tipoContagem": "contagem",
                                "apurado": pilar2_json.get("PIPDI", {}).get(
                                    "NAPPCT_acordos_parceria_firmados",
                                    pilar2_json.get("PIPDI", {}).get(
                                        "total_acumulado_PIPDI"
                                    ),
                                ),
                                "detalhado": True,
                                "campos": ["projeto", "codigo", "inicio", "fim"],
                                "registros": registros_nappct,
                            }
                        ],
                    },
                    # 7. PIPRO
                    {
                        "indicador": "PIPRO",
                        "componentes": [
                            {
                                "papel": "parcela",
                                "simbolo": "NPB",
                                "rotulo": "Produções Acadêmicas Bibliográficas",
                                "unidade": "Artigos",
                                "tipoContagem": "contagem",
                                "apurado": pilar3_json.get("PIPRO", {}).get(
                                    "NPB_producoes_academicas_bibliograficas"
                                ),
                                "detalhado": True,
                                "campos": ["titulo", "ano", "tipo"],
                                "registros": coletor.registros("NPB", slug, ano),
                            },
                            {
                                "papel": "parcela",
                                "simbolo": "NPT",
                                "rotulo": "Produções Técnicas e Tecnológicas",
                                "unidade": "Produções",
                                "tipoContagem": "contagem",
                                "apurado": pilar3_json.get("PIPRO", {}).get(
                                    "NPT_producoes_tecnicas_tecnologicas"
                                ),
                                "detalhado": True,
                                "campos": ["titulo", "ano", "tipo"],
                                "registros": coletor.registros("NPT", slug, ano),
                            },
                            {
                                "papel": "parcela",
                                "simbolo": "PC",
                                "rotulo": "Programas de Computador",
                                "unidade": "Softwares",
                                "tipoContagem": "contagem",
                                "apurado": (
                                    pilar3_json.get("PIPROT", {})
                                    .get("valores_totais_por_tipo", {})
                                    .get("PC_programas_computador", 1)
                                ),
                                "detalhado": True,
                                "campos": ["titulo", "ano"],
                                "registros": coletor.registros("PC", slug, ano),
                            },
                        ],
                    },
                    # 8. PIPROT
                    {
                        "indicador": "PIPROT",
                        "componentes": [
                            {
                                "papel": "parcela",
                                "simbolo": "PC",
                                "rotulo": "Programas de Computador",
                                "unidade": "Softwares",
                                "tipoContagem": "contagem",
                                "apurado": (
                                    pilar3_json.get("PIPROT", {})
                                    .get("valores_totais_por_tipo", {})
                                    .get("PC_programas_computador")
                                ),
                                "detalhado": True,
                                "campos": ["titulo", "ano"],
                                "registros": coletor.registros("PC", slug, ano),
                            },
                            *(
                                {
                                    "papel": "parcela",
                                    "simbolo": sim,
                                    "rotulo": rot,
                                    "unidade": "Ativos",
                                    "tipoContagem": "contagem",
                                    "apurado": (
                                        pilar3_json.get("PIPROT", {})
                                        .get("valores_totais_por_tipo", {})
                                        .get(f"{sim}_{chave}")
                                    ),
                                    "detalhado": False,
                                    "campos": [],
                                    "registros": [],
                                }
                                for sim, rot, chave in [
                                    (
                                        "PA",
                                        "Patentes e Modelos de Utilidade",
                                        "patentes_e_modelos_utilidade",
                                    ),
                                    ("RM", "Registros de Marca", "registros_marca"),
                                    (
                                        "DI",
                                        "Desenhos Industriais",
                                        "desenhos_industriais",
                                    ),
                                    ("C", "Cultivares", "cultivares"),
                                    (
                                        "TC",
                                        "Topografia de Circuitos",
                                        "topografia_circuitos",
                                    ),
                                    (
                                        "OGM",
                                        "Organismos Geneticamente Modificados",
                                        "organismos_geneticamente_modificados",
                                    ),
                                ]
                            ),
                        ],
                    },
                    # 9. PIPROTR
                    {
                        "indicador": "PIPROTR",
                        "componentes": [
                            {
                                "papel": "parcela",
                                "simbolo": sim,
                                "rotulo": rot,
                                "unidade": "Contratos",
                                "tipoContagem": "contagem",
                                "apurado": (
                                    pilar3_json.get("PIPROTR", {})
                                    .get("valores_totais_por_tipo", {})
                                    .get(f"{sim}_{chave}")
                                ),
                                "detalhado": False,
                                "campos": [],
                                "registros": [],
                            }
                            for sim, rot, chave in [
                                (
                                    "CT",
                                    "Contratos de Transferência de Tecnologia",
                                    "contratos_transferencia_tecnologia",
                                ),
                                (
                                    "CL",
                                    "Contratos de Licenciamento",
                                    "contratos_licenciamento",
                                ),
                                ("CC", "Contratos de Cessão", "contratos_cessao"),
                            ]
                        ],
                    },
                ]

                for item in fixtures_specs:
                    fixture = {
                        "indicador": item["indicador"],
                        "campus": slug,
                        "campusNome": campus.name,
                        "ano": ano,
                        "geradoEm": gerado_em,
                        "fontes": fontes,
                        "componentes": item["componentes"],
                    }
                    caminho_salvo = self.sink.salvar(fixture)
                    resultado.fixtures.append(caminho_salvo)

        return resultado
