"""Coletor de registros de auditoria acoplado ao agregador (feature 026, research D-5).

Coleta os registros individuais no mesmo passe das contagens canônicas,
garantindo invariante estrita: len(registros) == apurado para contagens,
e sum(valor) == apurado para somas em R$.
"""

from __future__ import annotations

from typing import Any


class ColetorRegistros:
    def __init__(self) -> None:
        # (sigla, escopo_slug, ano) -> list[dict[str, Any]]
        self._registros: dict[tuple[str, str, int], list[dict[str, Any]]] = {}
        # (sigla, escopo_slug, ano) -> set[Any] (para deduplicação de pessoas/projetos)
        self._ids_vistos: dict[tuple[str, str, int], set[Any]] = {}

    def adicionar_registro(
        self,
        sigla: str,
        escopo_slug: str,
        ano: int,
        registro: dict[str, Any],
        id_unico: Any | None = None,
    ) -> bool:
        """Adiciona um registro se o id_unico ainda não tiver sido visto para o contexto.

        Retorna True se adicionou, False se ignorado por duplicidade.
        """
        chave = (sigla, escopo_slug, ano)
        if chave not in self._registros:
            self._registros[chave] = []
            self._ids_vistos[chave] = set()

        if id_unico is not None:
            if id_unico in self._ids_vistos[chave]:
                return False
            self._ids_vistos[chave].add(id_unico)

        self._registros[chave].append(registro)
        return True

    def registros(self, sigla: str, escopo_slug: str, ano: int) -> list[dict[str, Any]]:
        """Retorna a lista de registros coletados para um componente, campus e ano."""
        return list(self._registros.get((sigla, escopo_slug, ano), []))

    def limpar(self) -> None:
        self._registros.clear()
        self._ids_vistos.clear()
