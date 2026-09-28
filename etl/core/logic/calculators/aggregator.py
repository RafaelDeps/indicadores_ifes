from __future__ import annotations

from etl.core.logic.calculators.papeis import (
    eh_estudante_em_pesquisa,
    eh_pesquisador_em_pesquisa,
)
from etl.core.logic.models import (
    AgregadosCampus,
    AgregadosPilar1,
    AgregadosPilar2,
    AgregadosPilar3,
    Campus,
    ExportCanonicos,
)
from etl.core.logic.resolvers.campus_resolver import (
    buscar_campus_por_nome_ou_slug,
    normalizar_slug,
    resolver_campus_iniciativa,
)
from etl.core.logic.resolvers.people_registry import criar_registro_pessoas
from etl.core.logic.temporal.activity_filter import (
    ano_valido,
    iniciativa_ativa_em_ano,
    membro_ativo_em_ano,
)

NOME_TIPO_PC = "softwares_sem_patente"
ESCOPO_TODOS_SLUG = "todos"
ESCOPO_TODOS_NOME = "Todos os Campi"


def agregar_indicadores(
    exportacao: ExportCanonicos,
    anos: list[int],
    campus_filtro: str | None = None,
) -> tuple[dict[int, dict[str, AgregadosCampus]], list[str]]:
    """
    Agrega iniciativas, pessoas, artigos e produções por campus e ano,
    gerando métricas consolidadas dos Pilares 1, 2 e 3 tanto para os campi
    individuais quanto para o escopo institucional 'todos'.
    """
    avisos: list[str] = list(exportacao.avisos)
    registro_pessoas, avisos_pessoas = criar_registro_pessoas(
        exportacao.pessoas, exportacao.estudantes
    )
    avisos.extend(avisos_pessoas)

    # Identifica campus filtrado, se houver
    campus_alvo: Campus | None = None
    if campus_filtro:
        campus_alvo = buscar_campus_por_nome_ou_slug(campus_filtro, exportacao.campi)
        if not campus_alvo:
            raise ValueError(
                f"ERRO: Campus '{campus_filtro}' não encontrado entre os campi institucionais."
            )

    # Estruturas intermediárias: escopo_slug -> ano -> sets/contagens
    # Iniciativas
    iniciativas_contagem: dict[str, dict[int, int]] = {}
    staff_unicos: dict[str, dict[int, set[int]]] = {}
    students_unicos: dict[str, dict[int, set[int]]] = {}

    # Produções
    npb_contagem: dict[str, dict[int, int]] = {}
    npt_contagem: dict[str, dict[int, int]] = {}
    pc_contagem: dict[str, dict[int, int]] = {}

    todos_escopos: dict[str, str] = {c.slug: c.name for c in exportacao.campi}
    todos_escopos[ESCOPO_TODOS_SLUG] = ESCOPO_TODOS_NOME

    def inicializar_escopo(slug: str) -> None:
        if slug not in iniciativas_contagem:
            iniciativas_contagem[slug] = {ano: 0 for ano in anos}
            staff_unicos[slug] = {ano: set() for ano in anos}
            students_unicos[slug] = {ano: set() for ano in anos}
            npb_contagem[slug] = {ano: 0 for ano in anos}
            npt_contagem[slug] = {ano: 0 for ano in anos}
            pc_contagem[slug] = {ano: 0 for ano in anos}

    for slug in todos_escopos:
        inicializar_escopo(slug)

    # --- 1. Processamento de Iniciativas (Pilar 1) ---
    avisados_nulo_inicio: set[int] = set()
    avisados_sem_campus: set[int] = set()

    for ini in exportacao.iniciativas:
        # Apenas projetos de pesquisa pontuam no NTPP (filtra Advisorship, etc.)
        if ini.initiative_type is not None:
            tipo_nome = ini.initiative_type.get("name", "")
            if tipo_nome != "Research Project" and tipo_nome != "Projeto de Pesquisa":
                continue

        if not ini.start_date and ini.id not in avisados_nulo_inicio:
            avisados_nulo_inicio.add(ini.id)
            avisos.append(
                f"AVISO: iniciativa {ini.id} sem start_date — tratada como nunca ativa"
            )

        ref_campus, _ = resolver_campus_iniciativa(ini, registro_pessoas)
        slug_campus = ref_campus.name.lower() if ref_campus else None
        if slug_campus:
            slug_campus = normalizar_slug(ref_campus.name)

        # Checa se esteve ativa em algum dos anos-alvo para emitir aviso se não tiver campus
        ativa_em_algum_ano = any(iniciativa_ativa_em_ano(ini, ano) for ano in anos)
        if (
            slug_campus is None
            and ativa_em_algum_ano
            and ini.id not in avisados_sem_campus
        ):
            avisados_sem_campus.add(ini.id)
            avisos.append(
                f"AVISO: iniciativa {ini.id} sem campus resolvível — "
                'contabilizada apenas no escopo "todos"'
            )

        for ano in anos:
            if not iniciativa_ativa_em_ano(ini, ano):
                continue

            escopos_afetados = [ESCOPO_TODOS_SLUG]
            if slug_campus and slug_campus in todos_escopos:
                escopos_afetados.append(slug_campus)

            for esc in escopos_afetados:
                iniciativas_contagem[esc][ano] += 1
                for membro in ini.team:
                    if not membro_ativo_em_ano(membro, ano, ini):
                        continue
                    pessoa = registro_pessoas.get(membro.person_id)
                    papeis = membro.roles
                    papeis_str = " ".join(papeis).lower()

                    eh_pesquisador = eh_pesquisador_em_pesquisa(pessoa, papeis_str)
                    eh_estudante = eh_estudante_em_pesquisa(pessoa, papeis_str)

                    if eh_pesquisador:
                        staff_unicos[esc][ano].add(membro.person_id)
                    if eh_estudante:
                        students_unicos[esc][ano].add(membro.person_id)

    # --- 2. Processamento de Artigos e Produções (Pilar 3) ---
    autores_por_producao: dict[int, list[int]] = {}
    for autor in sorted(exportacao.autores_producao, key=lambda a: a.researcher_id):
        autores_por_producao.setdefault(autor.production_id, []).append(
            autor.researcher_id
        )

    autores_por_artigo: dict[int, list[int]] = {}
    for pessoa in sorted(exportacao.pessoas, key=lambda p: p.id):
        for art in pessoa.articles or []:
            art_id = art.get("id")
            if art_id:
                autores_por_artigo.setdefault(art_id, []).append(pessoa.id)

    nomes_tipos = {t.id: t.name for t in exportacao.tipos_producao}

    def resolver_campi_registro(
        campus_proprio: Campus | None,
        autores: list[int] | None,
        rotulo: str,
    ) -> list[str]:
        if campus_proprio:
            return [normalizar_slug(campus_proprio.name)]
        campi_encontrados: list[str] = []
        for a_id in autores or []:
            p = registro_pessoas.get(a_id)
            if p and p.campus:
                s = normalizar_slug(p.campus.name)
                if s not in campi_encontrados:
                    campi_encontrados.append(s)
        if not campi_encontrados:
            avisos.append(
                f"AVISO: {rotulo} sem campus e sem autor vinculável — "
                'contabilizado apenas no escopo "todos"'
            )
        return campi_encontrados

    # Artigos -> NPB
    for artigo in exportacao.artigos:
        if not ano_valido(artigo.year):
            avisos.append(
                f"AVISO: artigo {artigo.id} com ano inválido ({artigo.year}) — "
                "excluído das contagens"
            )
            continue
        ano_art = artigo.year
        if ano_art not in anos:
            continue

        c_slugs = resolver_campi_registro(
            artigo.campus, autores_por_artigo.get(artigo.id), f"artigo {artigo.id}"
        )
        escopos_art = [ESCOPO_TODOS_SLUG] + [s for s in c_slugs if s in todos_escopos]
        for esc in escopos_art:
            npb_contagem[esc][ano_art] += 1

    # Produções -> NPT e PC
    for prod in exportacao.producoes:
        if not ano_valido(prod.year):
            avisos.append(
                f"AVISO: produção {prod.id} com ano inválido ({prod.year}) — excluída das contagens"
            )
            continue
        ano_prod = prod.year
        if ano_prod not in anos:
            continue

        nome_tipo = nomes_tipos.get(prod.production_type_id or -1, "")
        c_slugs = resolver_campi_registro(
            prod.campus, autores_por_producao.get(prod.id), f"produção {prod.id}"
        )
        escopos_prod = [ESCOPO_TODOS_SLUG] + [s for s in c_slugs if s in todos_escopos]
        for esc in escopos_prod:
            npt_contagem[esc][ano_prod] += 1
            if nome_tipo == NOME_TIPO_PC or "software" in nome_tipo.lower():
                pc_contagem[esc][ano_prod] += 1

    # --- 3. Montagem dos AgregadosCampus por Ano ---
    resultado: dict[int, dict[str, AgregadosCampus]] = {ano: {} for ano in anos}

    escopos_a_incluir = (
        [campus_alvo.slug] if campus_alvo else list(todos_escopos.keys())
    )

    for ano in anos:
        for slug in escopos_a_incluir:
            nome_campus = todos_escopos.get(slug, slug)
            ntpp = iniciativas_contagem[slug][ano]
            qspp = len(staff_unicos[slug][ano])
            nep = len(students_unicos[slug][ano])

            npb = npb_contagem[slug][ano]
            npt = npt_contagem[slug][ano]
            pc = pc_contagem[slug][ano]

            pilar1 = AgregadosPilar1(
                ntpp_projetos_pesquisa_ativos=ntpp,
                qspp_docentes_pesquisa=qspp,
                nep_estudantes_pesquisa=nep,
                nte_total_estudantes_matriculados=None,
                percentual_calculado_pies=None,
                ntecpp_cotistas_pesquisa=None,
                percentual_calculado_picot=None,
            )

            pilar2 = AgregadosPilar2()

            pilar3 = AgregadosPilar3(
                npb_producao_bibliografica=npb,
                npb_artigos=npb,
                npb_livros=0,
                npt_producao_tecnica=npt,
                npt_produtos_tecnologicos=npt,
                npt_processos_tecnologicos=0,
                pc_softwares=pc,
                pa_patentes=0,
                total_transferidos_piprotr=None,
            )

            resultado[ano][slug] = AgregadosCampus(
                campus_nome=nome_campus,
                pilar1=pilar1,
                pilar2=pilar2,
                pilar3=pilar3,
            )

    return resultado, avisos
