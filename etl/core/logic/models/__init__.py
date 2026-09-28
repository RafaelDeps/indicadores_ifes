from __future__ import annotations

from etl.core.logic.models.canonical import (
    Artigo,
    AutorProducao,
    Campus,
    ExportCanonicos,
    Iniciativa,
    MembroEquipe,
    Pessoa,
    Producao,
    RefCampus,
    TipoProducao,
)
from etl.core.logic.models.export import RegistroPilarJson, ResultadoFlow
from etl.core.logic.models.indicators import (
    AgregadosCampus,
    AgregadosPilar1,
    AgregadosPilar2,
    AgregadosPilar3,
)

__all__ = [
    "RefCampus",
    "MembroEquipe",
    "Iniciativa",
    "Pessoa",
    "Campus",
    "Artigo",
    "Producao",
    "AutorProducao",
    "TipoProducao",
    "ExportCanonicos",
    "RegistroPilarJson",
    "ResultadoFlow",
    "AgregadosPilar1",
    "AgregadosPilar2",
    "AgregadosPilar3",
    "AgregadosCampus",
]
