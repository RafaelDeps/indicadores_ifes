from __future__ import annotations

import sys
from pathlib import Path

from etl.adapters.sinks.json_pilar_sink import formatar_arquivos_pilar
from etl.core.logic.calculators.estudantes_pesquisa import (
    nomes_estudantes_pesquisa_por_escopo_ano,
)
from etl.core.logic.calculators.listagens import (
    calcular_cotistas_por_campus_ano,
    calcular_nte_por_campus_ano,
)
from etl.core.logic.calculators.ntecpp import calcular_ntecpp_match
from etl.core.logic.models import AgregadosCampus, AgregadosPilar1, ResultadoFlow
from etl.core.logic.resolvers.campus_resolver import normalizar_slug
from etl.core.logic.resolvers.people_registry import criar_registro_pessoas
from etl.core.ports.sink import ISink
from etl.core.ports.source import ISource

CAMPOS_DERIVAVEIS_LISTAGENS = frozenset(
    {
        "NTE_total_estudantes_matriculados",
        "NTECPP_cotistas_em_pesquisa",
    }
)

NTECPP_MATCH_NOTA = (
    "NTECPP_cotistas_em_pesquisa é o cruzamento (FR-012) entre os estudantes "
    "cotistas das listagens (ambas as colunas de cota) e os estudantes em "
    "pesquisa do export canônico (NEP), unidos por nome normalizado — a única "
    "chave disponível (não há matrícula no export canônico). Como o nome não "
    "identifica de forma inequívoca e a cobertura do cruzamento é parcial, o "
    "valor publicado é um piso do indicador real; interseção vazia é publicada "
    "como null (Princípio III). Os percentuais PIES/PICOT permanecem null."
)


class ListagensFlow:
    """Orquestrador do ETL de listagens: extração → cálculo → formatação → carga."""

    def __init__(
        self,
        source: ISource,
        sink: ISink,
        anos: list[int] | None = None,
        campus_filtro: str | None = None,
        caminho_relatorio: Path | str | None = None,
        fonte_canonica: ISource | None = None,
    ) -> None:
        self.source = source
        self.sink = sink
        self.anos = anos
        self.campus_filtro = campus_filtro
        self.caminho_relatorio = caminho_relatorio
        self.fonte_canonica = fonte_canonica

    def run(self) -> ResultadoFlow:
        try:
            extraidas = self.source.extract()
            avisos = list(extraidas.avisos)
            anos = self._selecionar_anos(extraidas, avisos)

            nte = calcular_nte_por_campus_ano(extraidas)
            cotistas = calcular_cotistas_por_campus_ano(extraidas)
            ntecpp = self._calcular_ntecpp_match(extraidas, anos, avisos)

            arquivos = []
            for ano in anos:
                slugs = sorted(
                    {
                        slug
                        for (slug, ano_chave) in nte
                        if ano_chave == ano and self._passa_filtro(slug)
                    }
                )
                for slug in slugs:
                    chave = (slug, ano)
                    agregados = AgregadosCampus(
                        campus_nome=extraidas.nomes_campus.get(slug, slug),
                        pilar1=AgregadosPilar1(
                            ntpp_projetos_pesquisa_ativos=None,
                            qspp_docentes_pesquisa=None,
                            nep_estudantes_pesquisa=None,
                            nte_total_estudantes_matriculados=nte.get(chave, 0),
                            ntecpp_cotistas_pesquisa=ntecpp.get(chave),
                        ),
                    )
                    arquivos.extend(formatar_arquivos_pilar(slug, agregados, ano))

            self.sink.load(arquivos)
            self._emitir_avisos(avisos)
            self._escrever_relatorio(anos, nte, cotistas, ntecpp, avisos)
            return ResultadoFlow(
                codigo_saida=0, total_arquivos=len(arquivos), avisos=avisos
            )
        except Exception as exc:  # noqa: BLE001 - falhas fatais viram ERRO + código 1
            erro = str(exc)
            sys.stderr.write(f"ERRO: {erro}\n")
            return ResultadoFlow(codigo_saida=1, total_arquivos=0, erros=[erro])

    def _emitir_avisos(self, avisos: list[str]) -> None:
        for aviso in avisos:
            if not aviso.startswith("AVISO:"):
                aviso = f"AVISO: {aviso}"
            sys.stderr.write(f"{aviso}\n")

    def _calcular_ntecpp_match(
        self,
        extraidas,
        anos: list[int],
        avisos: list[str],
    ) -> dict[tuple[str, int], int | None]:
        """Cruzamento NTECPP quando há export canônico disponível.

        Sem fonte canônica o NTECPP permanece null (não há universo de
        estudantes em pesquisa para cruzar) — degradação documentada (FR-012).
        """
        if self.fonte_canonica is None:
            return {}
        canonicos = self.fonte_canonica.extract()
        avisos.extend(canonicos.avisos)
        registro_pessoas, avisos_pessoas = criar_registro_pessoas(
            canonicos.pessoas, canonicos.estudantes
        )
        avisos.extend(avisos_pessoas)
        nomes_pesquisa = nomes_estudantes_pesquisa_por_escopo_ano(
            canonicos, registro_pessoas, anos
        )
        return calcular_ntecpp_match(nomes_pesquisa, extraidas.nomes_cotistas)

    def _selecionar_anos(self, extraidas, avisos: list[str]) -> list[int]:
        if self.anos:
            anos = sorted(self.anos)
            ausentes = [a for a in anos if a not in extraidas.anos_encontrados]
            if ausentes:
                raise ValueError(
                    "ano(s) sem nenhum arquivo de listagem: "
                    + ", ".join(str(a) for a in ausentes)
                )
            return anos
        if not extraidas.anos_encontrados:
            raise ValueError("nenhum arquivo de listagem encontrado")
        return sorted(extraidas.anos_encontrados)

    def _passa_filtro(self, slug: str) -> bool:
        if not self.campus_filtro:
            return True
        return slug == normalizar_slug(self.campus_filtro)

    def _escrever_relatorio(
        self,
        anos: list[int],
        nte: dict[tuple[str, int], int],
        cotistas: dict[tuple[str, int], int],
        ntecpp: dict[tuple[str, int], int | None],
        avisos: list[str],
    ) -> None:
        if not self.caminho_relatorio:
            return
        caminho = Path(self.caminho_relatorio)
        caminho.parent.mkdir(parents=True, exist_ok=True)

        secoes = [
            "# Relatório de Execução — ETL de Listagens de Matrícula",
            "",
            "Pacote de saída: arquivos `pilar{N}_{campus}_{year}.json` em zip sob "
            "`data/dist/` (contrato FR-008).",
            "",
        ]
        for ano in anos:
            secoes.append(f"## Ano {ano}")
            slugs = sorted(
                {slug for (slug, a) in nte if a == ano and self._passa_filtro(slug)}
            )
            for slug in slugs:
                valor_ntecpp = ntecpp.get((slug, ano))
                texto_ntecpp = (
                    "null (sem fonte canônica ou interseção vazia)"
                    if valor_ntecpp is None
                    else str(valor_ntecpp)
                )
                secoes.append(
                    f"- {slug}: NTE = {nte.get((slug, ano), 0)}; "
                    f"cotistas (análise interna) = {cotistas.get((slug, ano), 0)}; "
                    f"NTECPP (match NEP × cotistas) = {texto_ntecpp}"
                )
            secoes.append("")
        secoes.append("## Fidelidade (Princípio III)")
        secoes.append(NTECPP_MATCH_NOTA)
        secoes.append("")
        if avisos:
            secoes.append("## Avisos")
            secoes.extend(f"- {a}" for a in avisos)
        caminho.write_text("\n".join(secoes) + "\n", encoding="utf-8")
