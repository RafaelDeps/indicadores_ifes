from __future__ import annotations

from etl.core.logic.classificacoes_listagens import (
    SITUACOES_NTE,
    ser_de_cota_ingresso,
    ser_de_cota_matricula,
)
from etl.core.logic.models import ListagensExtraidas


def calcular_nte_por_campus_ano(
    extraidas: ListagensExtraidas,
) -> dict[tuple[str, int], int]:
    """
    NTE por (campus, ano): matrículas únicas com situação exatamente
    "Matriculado" ou "Formado" em pelo menos um dos semestres (FR-004).
    """
    resultado: dict[tuple[str, int], int] = {}
    for chave, por_semestre in extraidas.por_campus_ano.items():
        matriculas: set[str] = set()
        for estudantes in por_semestre.values():
            for estudante in estudantes:
                if estudante.situacao in SITUACOES_NTE:
                    matriculas.add(estudante.matricula)
        resultado[chave] = len(matriculas)
    return resultado


def calcular_cotistas_por_campus_ano(
    extraidas: ListagensExtraidas,
) -> dict[tuple[str, int], int]:
    """
    Cotistas por (campus, ano): estudantes do NTE cuja forma de ingresso E forma
    de matrícula/cota são ambas "de cota" (FR-006), deduplicados por matrícula.
    """
    resultado: dict[tuple[str, int], int] = {}
    for chave, por_semestre in extraidas.por_campus_ano.items():
        matriculas: set[str] = set()
        for estudantes in por_semestre.values():
            for estudante in estudantes:
                if (
                    estudante.situacao in SITUACOES_NTE
                    and ser_de_cota_ingresso(estudante.forma_ingresso)
                    and ser_de_cota_matricula(estudante.forma_matricula_cota)
                ):
                    matriculas.add(estudante.matricula)
        resultado[chave] = len(matriculas)
    return resultado
