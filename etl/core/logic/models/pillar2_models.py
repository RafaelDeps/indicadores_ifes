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
    duracao_meses: int | None = None
    valor_total: float = 0.0
    fontes: list[FonteFinanciamento] = field(default_factory=list)

    def ativo_em_ano(self, ano: int) -> bool:
        """Indica se o projeto esteve ativo no ano civil especificado."""
        if self.ano_inicio is None:
            return False
        fim = self.ano_fim if self.ano_fim is not None else self.ano_inicio
        return self.ano_inicio <= ano <= fim


@dataclass
class DadosPinvCampus:
    """Representa os percentuais de PINV apurados por campus."""

    indicador: str
    campus: str
    campus_slug: str
    unidade: str
    valores_por_ano: dict[int, float]
