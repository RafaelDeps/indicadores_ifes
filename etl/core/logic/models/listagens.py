from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:  # pragma: no cover
    pass


@dataclass(frozen=True)
class EstudanteListagem:
    """Linha mínima e agregável de uma listagem de matrícula.

    Nunca contém dados pessoais serializáveis (Princípio IV): o nome do aluno
    é descartado na extração; matrícula é usada apenas como chave de
    deduplicação dentro do processo.
    """

    matricula: str
    situacao: str | None
    forma_ingresso: str | None
    forma_matricula_cota: str | None


@dataclass
class ListagensExtraidas:
    """Resultado da extração: estudantes agrupados por (campus, ano) e semestre.

    ``por_campus_ano[(slug, ano)][semestre]`` → lista de estudantes.

    ``nomes_cotistas[(slug, ano)]`` → nomes **normalizados** dos cotistas
    (situação do NTE + ambas as colunas de cota), retidos exclusivamente em
    memória para o cruzamento NTECPP (FR-012). Nunca são serializados em
    artefatos de saída (Princípio IV).
    """

    por_campus_ano: dict[tuple[str, int], dict[int, list[EstudanteListagem]]] = field(
        default_factory=dict
    )
    nomes_campus: dict[str, str] = field(default_factory=dict)
    nomes_cotistas: dict[tuple[str, int], set[str]] = field(default_factory=dict)
    avisos: list[str] = field(default_factory=list)
    anos_encontrados: set[int] = field(default_factory=set)
