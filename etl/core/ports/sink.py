from __future__ import annotations

from abc import ABC, abstractmethod

from etl.core.logic.models import RegistroPilarJson


class ISink(ABC):
    """Porta de saída para carregamento/persistência dos arquivos de indicadores."""

    @abstractmethod
    def load(self, arquivos: list[RegistroPilarJson]) -> None:
        """Valida e persiste a coleção de arquivos JSON no destino de entrega."""
        raise NotImplementedError
