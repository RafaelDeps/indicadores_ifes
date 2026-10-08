from __future__ import annotations

from etl.core.logic.models import Iniciativa, MembroEquipe
from etl.core.logic.temporal.activity_filter import (
    ano_valido,
    iniciativa_ativa_em_ano,
    membro_ativo_em_ano,
)


def test_ano_valido() -> None:
    assert ano_valido(2024) is True
    assert ano_valido("2026") is True
    assert ano_valido(0) is False
    assert ano_valido(-1) is False
    assert ano_valido(None) is False
    assert ano_valido(False) is False
    assert ano_valido("abc") is False


def test_iniciativa_sem_data_inicio_nunca_ativa() -> None:
    ini = Iniciativa(id=1, name="Sem Data", start_date=None, end_date="2026-12-31")
    assert iniciativa_ativa_em_ano(ini, 2025) is False
    assert iniciativa_ativa_em_ano(ini, 2026) is False


def test_iniciativa_ativa_em_ano_em_andamento() -> None:
    ini = Iniciativa(id=2, name="Em Andamento", start_date="2024-05-10", end_date=None)
    assert iniciativa_ativa_em_ano(ini, 2023) is False
    assert iniciativa_ativa_em_ano(ini, 2024) is True
    assert iniciativa_ativa_em_ano(ini, 2025) is True
    assert iniciativa_ativa_em_ano(ini, 2026) is True


def test_iniciativa_ativa_em_ano_com_fim_definido() -> None:
    ini = Iniciativa(
        id=3, name="Com Fim", start_date="2024-01-01", end_date="2025-06-30"
    )
    assert iniciativa_ativa_em_ano(ini, 2023) is False
    assert iniciativa_ativa_em_ano(ini, 2024) is True
    assert iniciativa_ativa_em_ano(ini, 2025) is True
    assert iniciativa_ativa_em_ano(ini, 2026) is False


def test_membro_ativo_datas_proprias() -> None:
    membro = MembroEquipe(
        person_id=1,
        person_name="Pesquisador",
        start_date="2025-01-01",
        end_date="2025-12-31",
    )
    ini = Iniciativa(id=10, name="Proj", start_date="2024-01-01", end_date="2026-12-31")
    assert membro_ativo_em_ano(membro, 2024, ini) is False
    assert membro_ativo_em_ano(membro, 2025, ini) is True
    assert membro_ativo_em_ano(membro, 2026, ini) is False


def test_membro_ativo_fallback_datas_iniciativa() -> None:
    membro = MembroEquipe(
        person_id=2,
        person_name="Estudante",
        start_date=None,
        end_date=None,
    )
    ini = Iniciativa(id=10, name="Proj", start_date="2025-01-01", end_date="2026-12-31")
    assert membro_ativo_em_ano(membro, 2024, ini) is False
    assert membro_ativo_em_ano(membro, 2025, ini) is True
    assert membro_ativo_em_ano(membro, 2026, ini) is True


def test_extrair_ano_mes_inicio() -> None:
    from etl.core.logic.temporal.activity_filter import extrair_ano_mes_inicio

    assert extrair_ano_mes_inicio("2025-06-15") == (2025, 6)
    assert extrair_ano_mes_inicio("2025-01-01") == (2025, 1)
    assert extrair_ano_mes_inicio("2025-12") == (2025, 12)
    assert extrair_ano_mes_inicio("2025") == (2025, 1)
    assert extrair_ano_mes_inicio(None) == (None, None)
    assert extrair_ano_mes_inicio("") == (None, None)
    assert extrair_ano_mes_inicio("invalid") == (None, None)


def test_projetar_ano_fim() -> None:
    from etl.core.logic.temporal.activity_filter import projetar_ano_fim

    # 36 meses iniciando em Jan/2025 -> 2027
    assert projetar_ano_fim(2025, 36, mes_inicio=1) == 2027
    # 36 meses iniciando em Ago/2026 -> 2029
    assert projetar_ano_fim(2026, 36, mes_inicio=8) == 2029
    # 60 meses iniciando em Jan/2025 -> 2029
    assert projetar_ano_fim(2025, 60, mes_inicio=1) == 2029
    # 12 meses iniciando em Jan/2025 -> 2025
    assert projetar_ano_fim(2025, 12, mes_inicio=1) == 2025
    # 12 meses iniciando em Março/2024 -> 2025
    assert projetar_ano_fim(2024, 12, mes_inicio=3) == 2025
    # Fallback quando duracao_meses é None ou <= 0
    assert projetar_ano_fim(2025, None) == 2025
    assert projetar_ano_fim(2025, 0) == 2025
    assert projetar_ano_fim(None, 36) is None
