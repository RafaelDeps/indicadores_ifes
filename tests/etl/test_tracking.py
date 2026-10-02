from __future__ import annotations

import re
from pathlib import Path

from etl.tracking.tracker import ExecutionTracker


def test_tracker_collects_metrics_and_generates_report(tmp_path: Path) -> None:
    report_file = tmp_path / "etl_run_report.md"
    tracker = ExecutionTracker(caminho_relatorio=report_file)

    tracker.iniciar(
        caminho_entrada="data/canonical/exports_canonical.zip",
        caminho_saida="data/dist/indicadores.zip",
    )
    tracker.registrar_volumetria(
        total_campi=23,
        total_iniciativas=150,
        total_pessoas=450,
        total_producoes=80,
    )
    tracker.registrar_iniciativas_ativas_por_ano({2024: 90, 2025: 110, 2026: 95})
    tracker.adicionar_aviso("iniciativa 4061 sem start_date — tratada como nunca ativa")
    tracker.finalizar(total_arquivos_gerados=216)

    assert report_file.exists(), "O arquivo de relatório Markdown deve ser gerado"
    conteudo = report_file.read_text(encoding="utf-8")

    assert "# Relatório de Execução do Pipeline ETL - Indicadores CONIF" in conteudo
    assert "data/canonical/exports_canonical.zip" in conteudo
    assert "data/dist/indicadores.zip" in conteudo
    assert "216" in conteudo
    assert "Campi Institucionais" in conteudo
    assert "23" in conteudo
    assert "Iniciativas Ativas por Ano de Referência" in conteudo
    assert "Alertas de Qualidade e Anomalias de Origem" in conteudo
    assert "iniciativa 4061 sem start_date" in conteudo


def test_tracker_report_is_lgpd_compliant(tmp_path: Path) -> None:
    report_file = tmp_path / "etl_run_report.md"
    tracker = ExecutionTracker(caminho_relatorio=report_file)
    tracker.iniciar("in.zip", "out.zip")
    tracker.adicionar_aviso("iniciativa 100 sem campus resolvível")
    tracker.finalizar(total_arquivos_gerados=9)

    conteudo = report_file.read_text(encoding="utf-8")

    # Verifica ausência de padrões de CPF (XXX.XXX.XXX-XX)
    padrao_cpf = re.compile(r"\b\d{3}\.\d{3}\.\d{3}-\d{2}\b")
    assert not padrao_cpf.search(conteudo), "Relatório não deve conter CPFs"
