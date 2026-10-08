from __future__ import annotations

import re
from datetime import date
from typing import Any

from etl.core.logic.models import Iniciativa, MembroEquipe


def ano_valido(ano: Any) -> bool:
    """Verifica se o ano informado é um inteiro positivo válido."""
    if ano is None:
        return False
    if isinstance(ano, bool):
        return False
    if isinstance(ano, int):
        return ano > 0
    if isinstance(ano, str) and ano.strip().isdigit():
        return int(ano.strip()) > 0
    return False


def _parse_data(valor: str | None) -> date | None:
    """Converte string de data ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:MM:SS) em objeto date."""
    if not valor or not isinstance(valor, str):
        return None
    limpo = valor.strip().split("T")[0]
    partes = limpo.split("-")
    if len(partes) != 3:
        return None
    try:
        ano, mes, dia = int(partes[0]), int(partes[1]), int(partes[2])
        return date(ano, mes, dia)
    except (ValueError, TypeError):
        return None


def iniciativa_ativa_em_ano(iniciativa: Iniciativa, ano: int) -> bool:
    """
    Avalia se uma iniciativa esteve ativa no ano civil especificado:
    - Data de início <= 31/12 do ano civil; E
    - Data de término ausente (em andamento) OU término >= 01/01 do ano civil.
    """
    data_inicio = _parse_data(iniciativa.start_date)
    if data_inicio is None:
        return False

    limite_inicio_ano = date(ano, 1, 1)
    limite_fim_ano = date(ano, 12, 31)

    if data_inicio > limite_fim_ano:
        return False

    data_fim = _parse_data(iniciativa.end_date)
    if data_fim is not None and data_fim < limite_inicio_ano:
        return False

    return True


def membro_ativo_em_ano(
    membro: MembroEquipe, ano: int, iniciativa: Iniciativa | None = None
) -> bool:
    """
    Avalia se um membro de equipe esteve ativo no projeto durante o ano civil.
    Se o membro não possuir datas próprias de vínculo, utiliza as datas da iniciativa como fallback.
    """
    data_inicio_str = membro.start_date
    if not data_inicio_str and iniciativa:
        data_inicio_str = iniciativa.start_date

    data_inicio = _parse_data(data_inicio_str)
    if data_inicio is None:
        return False

    limite_inicio_ano = date(ano, 1, 1)
    limite_fim_ano = date(ano, 12, 31)

    if data_inicio > limite_fim_ano:
        return False

    data_fim_str = membro.end_date
    if not data_fim_str and iniciativa:
        data_fim_str = iniciativa.end_date

    data_fim = _parse_data(data_fim_str)
    if data_fim is not None and data_fim < limite_inicio_ano:
        return False

    return True


def extrair_ano_mes_inicio(inicio_str: str | None) -> tuple[int | None, int | None]:
    """Extrai (ano_inicio, mes_inicio) de uma string de data (ex: '2025-03-01' ou '2025'). Mês padrão é 1."""
    if not inicio_str or not isinstance(inicio_str, str):
        return None, None
    m = re.search(r"(\d{4})(?:-(\d{1,2}))?", inicio_str.strip())
    if not m:
        return None, None
    ano = int(m.group(1))
    mes = int(m.group(2)) if m.group(2) else 1
    return ano, mes


def projetar_ano_fim(
    ano_inicio: int | None,
    duracao_meses: int | None,
    mes_inicio: int | None = None,
) -> int | None:
    """
    Projeta o ano final de vigência com base no ano inicial, mês inicial (padrão 1) e duração em meses:
        ano_fim = ano_inicio + (mes_inicio - 1 + duracao_meses - 1) // 12
    Se ano_inicio for nulo, retorna None.
    Se duracao_meses for nulo ou <= 0, retorna ano_inicio como fallback seguro.
    """
    if ano_inicio is None:
        return None
    if duracao_meses is None or duracao_meses <= 0:
        return ano_inicio
    mes = mes_inicio if (mes_inicio is not None and 1 <= mes_inicio <= 12) else 1
    offset_anos = (mes - 1 + duracao_meses - 1) // 12
    return ano_inicio + offset_anos
