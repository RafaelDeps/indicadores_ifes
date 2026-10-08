from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class FonteFinanciamento:
    """Discrimina uma fonte pagadora dentro do financiamento do projeto."""

    fonte: str
    tipo: str | None = None
    valor: float | None = None


@dataclass
class ProjetoSigpesqFinanciamento:
    """Representa um projeto acadêmico extraído dos arquivos de SIGPESQ."""

    codigo: str
    titulo: str | None = None
    campus_slug: str | None = None
    campus_nome: str | None = None
    ano_inicio: int | None = None
    ano_fim: int | None = None
    valor_total: float = 0.0
    fontes: list[FonteFinanciamento] = field(default_factory=list)


@dataclass
class DadosPinvCampus:
    """Representa os percentuais de PINV apurados por campus."""

    indicador: str
    campus: str
    campus_slug: str
    unidade: str
    valores_por_ano: dict[int, float]
