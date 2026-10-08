from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class ExecutionMetrics:
    """Métricas operacionais e de integridade acumuladas durante a execução do pipeline."""

    timestamp_inicio: str = ""
    timestamp_fim: str = ""
    duracao_segundos: float = 0.0
    caminho_entrada: str = ""
    caminho_saida: str = ""
    total_campi: int = 0
    total_iniciativas: int = 0
    total_pessoas: int = 0
    total_producoes: int = 0
    total_projetos_facto: int = 0
    iniciativas_ativas_por_ano: dict[int, int] = field(default_factory=dict)
    resumo_campi: dict[str, dict[str, int]] = field(default_factory=dict)
    total_arquivos_gerados: int = 0
    avisos_qualidade: list[str] = field(default_factory=list)


class ExecutionTracker:
    """
    Rastreador de execução e gerador de relatórios de auditoria em Markdown.
    Garante conformidade com a LGPD (Princípio IV da Constituição) emitindo
    apenas contagens agregadas e alertas sem exposição de dados pessoais (PII).
    """

    def __init__(
        self, caminho_relatorio: Path | str = "data/reports/etl_run_report.md"
    ) -> None:
        self.caminho_relatorio = Path(caminho_relatorio)
        self.metricas = ExecutionMetrics()
        self._start_time: float = 0.0

    def iniciar(self, caminho_entrada: str, caminho_saida: str) -> None:
        self._start_time = time.time()
        self.metricas.timestamp_inicio = datetime.now(timezone.utc).strftime(
            "%Y-%m-%d %H:%M:%S UTC"
        )
        self.metricas.caminho_entrada = str(caminho_entrada)
        self.metricas.caminho_saida = str(caminho_saida)

    def registrar_volumetria(
        self,
        total_campi: int,
        total_iniciativas: int,
        total_pessoas: int,
        total_producoes: int,
        total_projetos_facto: int = 0,
    ) -> None:
        self.metricas.total_campi = total_campi
        self.metricas.total_iniciativas = total_iniciativas
        self.metricas.total_pessoas = total_pessoas
        self.metricas.total_producoes = total_producoes
        self.metricas.total_projetos_facto = total_projetos_facto

    def registrar_iniciativas_ativas_por_ano(
        self, ativas_por_ano: dict[int, int]
    ) -> None:
        self.metricas.iniciativas_ativas_por_ano = dict(ativas_por_ano)

    def registrar_resumo_campus(
        self, campus_nome: str, metricas: dict[str, int]
    ) -> None:
        self.metricas.resumo_campi[campus_nome] = dict(metricas)

    def adicionar_aviso(self, aviso: str) -> None:
        import re

        # Sanitização LGPD (Princípio IV): remove nomes civis de mensagens para evitar vazamento de PII no relatório
        aviso_sanitizado = re.sub(r",\s*nome:\s*[^)]+", "", aviso)
        self.metricas.avisos_qualidade.append(aviso_sanitizado)

    def finalizar(self, total_arquivos_gerados: int) -> None:
        duracao = time.time() - self._start_time if self._start_time else 0.0
        self.metricas.duracao_segundos = round(duracao, 2)
        self.metricas.timestamp_fim = datetime.now(timezone.utc).strftime(
            "%Y-%m-%d %H:%M:%S UTC"
        )
        self.metricas.total_arquivos_gerados = total_arquivos_gerados
        self._gravar_relatorio()

    def _gravar_relatorio(self) -> None:
        self.caminho_relatorio.parent.mkdir(parents=True, exist_ok=True)
        m = self.metricas

        linhas = [
            "# Relatório de Execução do Pipeline ETL - Indicadores CONIF",
            "",
            f"**Data/Hora de Execução**: {m.timestamp_fim or m.timestamp_inicio}",
            f"**Arquivo de Entrada**: {m.caminho_entrada}",
            f"**Arquivo de Saída**: {m.caminho_saida}",
            f"**Tempo de Execução**: {m.duracao_segundos} segundos",
            f"**Total de Arquivos Gerados**: {m.total_arquivos_gerados}",
            "**Status**: Concluído com Sucesso",
            "",
            "## 1. Volumetria Geral Processada",
            "",
            "| Entidade | Total Carregado |",
            "| :--- | :---: |",
            f"| Campi Institucionais | {m.total_campi} |",
            f"| Pessoas Registradas (Pesquisadores / Discentes) | {m.total_pessoas} |",
            f"| Projetos / Iniciativas Totais | {m.total_iniciativas} |",
            f"| Projetos FACTO (Pilar 2) | {m.total_projetos_facto} |",
            f"| Produções Técnicas e Bibliográficas | {m.total_producoes} |",
            "",
            "## 2. Iniciativas Ativas por Ano de Referência",
            "",
            "| Ano de Referência | Projetos Ativos |",
            "| :---: | :---: |",
        ]

        if m.iniciativas_ativas_por_ano:
            for ano, total in sorted(m.iniciativas_ativas_por_ano.items()):
                linhas.append(f"| {ano} | {total} |")
        else:
            linhas.append("| - | Dados não computados |")

        linhas.extend(
            [
                "",
                "## 3. Alertas de Qualidade e Anomalias de Origem",
                "",
                f"- Total de alertas registrados: {len(m.avisos_qualidade)}",
            ]
        )

        if m.avisos_qualidade:
            linhas.append("")
            # Amostra dos primeiros 20 avisos para manter o relatório limpo
            for aviso in m.avisos_qualidade[:20]:
                linhas.append(f"- {aviso}")
            if len(m.avisos_qualidade) > 20:
                linhas.append(
                    f"- ... (+{len(m.avisos_qualidade) - 20} alertas omitidos)"
                )
        else:
            linhas.append("- Nenhum alerta de qualidade emitido.")

        linhas.append("")
        conteudo = "\n".join(linhas)
        self.caminho_relatorio.write_text(conteudo, encoding="utf-8")
