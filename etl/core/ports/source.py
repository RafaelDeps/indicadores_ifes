from __future__ import annotations

from abc import ABC, abstractmethod

from etl.core.logic.models import ExportCanonicos


class ISource(ABC):
    """Porta de entrada para extração de dados canônicos."""

    @abstractmethod
    def extract(self) -> ExportCanonicos:
        """Extrai e valida os conjuntos canônicos brutos, retornando entidades tipadas."""
        raise NotImplementedError
