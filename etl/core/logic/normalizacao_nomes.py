from __future__ import annotations

import re
import unicodedata

_ESPACOS = re.compile(r"\s+")


def normalizar_nome(texto: str | None) -> str:
    """Normaliza um nome para comparação determinística.

    - Remove acentos (NFKD → ASCII);
    - Converte para minúsculas;
    - Colapsa espaços em branco e remove extremidades.

    Usada exclusivamente em memória para o cruzamento NTECPP (FR-012);
    nenhum nome é emitido em artefatos de saída (Princípio IV).
    """
    if not texto:
        return ""
    nfkd = unicodedata.normalize("NFKD", texto)
    sem_acento = "".join(c for c in nfkd if not unicodedata.combining(c))
    return _ESPACOS.sub(" ", sem_acento).strip().lower()
