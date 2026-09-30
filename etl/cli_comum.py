"""Utilitários de linha de comando compartilhados pelos entrypoints do ETL.

Existe para que `etl/main.py` e `etl/main_listagens.py` validem os mesmos
argumentos do mesmo jeito — a assimetria entre os dois era o defeito: um
tratava `--anos` inválido com `ERRO:` + exit 1, o outro deixava o `ValueError`
subir como traceback.
"""

from __future__ import annotations

__all__ = ["parsear_anos"]


def parsear_anos(valor: str) -> list[int]:
    """Converte o argumento ``--anos`` em lista de inteiros.

    Cadeia vazia, só separadores, ou sem nenhum ano convertível ⇒
    ``ValueError``. A "flag ausente" é decidida pelo chamador (``None`` não
    chega aqui), porque os dois entrypoints a interpretam de formas diferentes:
    `etl/main.py` tem default fixo (2024,2025,2026) e `etl/main_listagens.py`
    usa ausência para significar "todos os anos encontrados".

    Rejeitar a lista vazia não é preciosismo: `--anos ""` desliga o filtro
    temporal, o fluxo conclui com "0 arquivos gerados" e o `ZipIndicadoresSink`
    grava esse pacote vazio por cima do pacote público — exit 0, sem aviso.
    `validar_arquivos_pilar([])` não acusa nada (um pacote vazio é "válido" por
    construção), então a única defesa possível é nunca deixar a lista vazia
    chegar ao fluxo.
    """
    try:
        anos = [int(parte.strip()) for parte in valor.split(",") if parte.strip()]
    except ValueError as exc:
        raise ValueError(f"valor de ano não numérico em --anos: {valor!r}") from exc

    if not anos:
        raise ValueError(f"nenhum ano informado em --anos: {valor!r}")
    return anos
