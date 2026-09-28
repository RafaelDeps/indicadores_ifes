from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class RefCampus:
    """Referência simplificada a um campus."""

    id: int
    name: str


@dataclass(frozen=True)
class MembroEquipe:
    """Membro participante de uma iniciativa/projeto."""

    person_id: int
    person_name: str
    roles: list[str] = field(default_factory=list)
    start_date: str | None = None
    end_date: str | None = None


@dataclass(frozen=True)
class Iniciativa:
    """Iniciativa ou projeto de pesquisa canônico."""

    id: int
    name: str
    status: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    initiative_type: dict[str, Any] | None = None
    campus: RefCampus | None = None
    team: list[MembroEquipe] = field(default_factory=list)


@dataclass(frozen=True)
class Pessoa:
    """Pessoa (pesquisador ou estudante) canônica."""

    id: int
    name: str
    classification: str | None = None
    campus: RefCampus | None = None
    articles: list[dict[str, Any]] | None = None


@dataclass(frozen=True)
class Campus:
    """Campus institucional do IFES."""

    id: int
    name: str

    @property
    def slug(self) -> str:
        """Gera o slug alfanumérico minúsculo sem acentos para nomes de arquivos."""
        from etl.core.logic.resolvers.campus_resolver import normalizar_slug

        return normalizar_slug(self.name)


@dataclass(frozen=True)
class Artigo:
    """Artigo ou publicação bibliográfica canônica."""

    id: int
    title: str
    year: int | None = None
    type: str | None = None
    campus: RefCampus | None = None


@dataclass(frozen=True)
class Producao:
    """Produção técnica ou tecnológica canônica."""

    id: int
    title: str
    year: int | None = None
    production_type_id: int | None = None
    campus: RefCampus | None = None


@dataclass(frozen=True)
class AutorProducao:
    """Vínculo de autoria entre produção e pesquisador."""

    production_id: int
    researcher_id: int


@dataclass(frozen=True)
class TipoProducao:
    """Classificação de tipo de produção."""

    id: int
    name: str


@dataclass
class ExportCanonicos:
    """Conjunto unificado de coleções extraídas do pacote canônico."""

    iniciativas: list[Iniciativa] = field(default_factory=list)
    pessoas: list[Pessoa] = field(default_factory=list)
    estudantes: list[Pessoa] = field(default_factory=list)
    campi: list[Campus] = field(default_factory=list)
    artigos: list[Artigo] = field(default_factory=list)
    producoes: list[Producao] = field(default_factory=list)
    autores_producao: list[AutorProducao] = field(default_factory=list)
    tipos_producao: list[TipoProducao] = field(default_factory=list)
    avisos: list[str] = field(default_factory=list)
