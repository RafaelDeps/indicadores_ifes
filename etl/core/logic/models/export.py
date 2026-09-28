from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class RegistroPilarJson:
    """Representação de um arquivo JSON de saída gerado pelo ETL."""

    nome: str
    conteudo: str


@dataclass
class ResultadoFlow:
    """Resultado da execução do pipeline de indicadores."""

    codigo_saida: int = 0
    total_arquivos: int = 0
    avisos: list[str] = field(default_factory=list)
    erros: list[str] = field(default_factory=list)
