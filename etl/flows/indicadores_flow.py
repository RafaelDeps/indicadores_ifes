from __future__ import annotations

import sys

from etl.adapters.sinks.json_pilar_sink import formatar_arquivos_pilar
from etl.core.logic.calculators.aggregator import agregar_indicadores
from etl.core.logic.models import RegistroPilarJson, ResultadoFlow
from etl.core.ports.sink import ISink
from etl.core.ports.source import ISource
from etl.tracking.tracker import ExecutionTracker

ANOS_PADRAO = [2024, 2025, 2026]


class IndicadoresFlow:
    """Orquestrador do pipeline de ETL: extração -> cálculo e agregação -> validação, carga e auditoria."""

    def __init__(
        self,
        source: ISource,
        sink: ISink,
        anos: list[int] | None = None,
        campus_filtro: str | None = None,
        tracker: ExecutionTracker | None = None,
    ) -> None:
        self.source = source
        self.sink = sink
        self.anos = anos if anos is not None else list(ANOS_PADRAO)
        self.campus_filtro = campus_filtro
        self.tracker = tracker or ExecutionTracker()

    def run(self) -> ResultadoFlow:
        caminho_in = getattr(self.source, "caminho_zip", "fonte_desconhecida")
        caminho_out = getattr(self.sink, "caminho_zip", "saida_desconhecida")
        self.tracker.iniciar(
            caminho_entrada=str(caminho_in), caminho_saida=str(caminho_out)
        )

        try:
            # 1. Extração
            exportacao = self.source.extract()

            self.tracker.registrar_volumetria(
                total_campi=len(exportacao.campi),
                total_iniciativas=len(exportacao.iniciativas),
                total_pessoas=len(exportacao.pessoas) + len(exportacao.estudantes),
                total_producoes=len(exportacao.producoes),
            )

            for aviso_ext in exportacao.avisos:
                self.tracker.adicionar_aviso(aviso_ext)

            # 2. Agregação e cálculos de domínio
            agregados_por_ano, avisos = agregar_indicadores(
                exportacao=exportacao,
                anos=self.anos,
                campus_filtro=self.campus_filtro,
            )

            for aviso in avisos:
                self.tracker.adicionar_aviso(aviso)

            # Contabiliza total de iniciativas ativas por ano para o relatório
            ativas_por_ano: dict[int, int] = {}
            for ano in self.anos:
                total_ano = 0
                if ano in agregados_por_ano and "todos" in agregados_por_ano[ano]:
                    total_ano = agregados_por_ano[ano][
                        "todos"
                    ].pilar1.ntpp_projetos_pesquisa_ativos
                ativas_por_ano[ano] = total_ano
            self.tracker.registrar_iniciativas_ativas_por_ano(ativas_por_ano)

            # 3. Formatação dos arquivos JSON
            arquivos: list[RegistroPilarJson] = []
            for ano in self.anos:
                for slug, agregados in agregados_por_ano[ano].items():
                    arquivos.extend(formatar_arquivos_pilar(slug, agregados, ano))

            # 4. Carga e persistência no sink
            self.sink.load(arquivos)

            # Finaliza rastreamento e grava relatório de auditoria
            self.tracker.finalizar(total_arquivos_gerados=len(arquivos))

            # Emissão de avisos no stderr
            for aviso in avisos:
                sys.stderr.write(f"{aviso}\n")

            return ResultadoFlow(
                codigo_saida=0,
                total_arquivos=len(arquivos),
                avisos=avisos,
            )
        except Exception as e:
            sys.stderr.write(f"ERRO: Falha na execução do pipeline: {e}\n")
            return ResultadoFlow(
                codigo_saida=1,
                total_arquivos=0,
                erros=[str(e)],
            )
