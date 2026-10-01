from __future__ import annotations

import json
import zipfile
from pathlib import Path

from etl.core.logic.models import RegistroPilarJson

#: Momento fixo dos membros do zip. Sem ele os zips não são byte-idênticos
#: entre execuções, e a comparação byte a byte do workflow perde sentido.
DATE_TIME_ZIP = (1980, 1, 1, 0, 0, 0)

#: Permissões fixas dos membros do zip, pelo mesmo motivo de `DATE_TIME_ZIP`.
EXTERNAL_ATTR_ZIP = 0o644 << 16


def serializar(dados: dict) -> str:
    """Serializa o corpo de um registro `pilar1_<campus>_<ano>.json`."""
    return json.dumps(dados, ensure_ascii=False, indent=2) + "\n"


def registro_pilar1(
    campus: str = "serra",
    ano: int = 2025,
    *,
    nte: int | None = None,
    ntecpp: int | None = None,
    chave_removida: str | None = None,
) -> RegistroPilarJson:
    """Registro de pilar no formato do pacote, com os dois derivados controláveis.

    `nte` e `ntecpp` são os únicos campos que o merge das listagens escreve;
    deixá-los em `None` é o estado legítimo de um registro de escopo agregado,
    e é o que a cobertura de derivados precisa para distinguir "campo nulo" de
    "par ausente".
    """
    indicadores = {
        "NTPP": {
            "descricao": "Numero Total de Projetos de Pesquisa",
            "projetos_pesquisa_registrados_execucao": None,
            "total_projetos_NTPP": None,
        },
        "QSPP": {
            "descricao": "Quantitativo de Servidores Desenvolvendo Projetos",
            "SUPP_servidores_unicos_participantes": None,
            "total_servidores_QSPP": None,
        },
        "PIES": {
            "descricao": "Percentual de Estudantes Envolvidos em Pesquisa",
            "NEP_estudantes_em_pesquisa": None,
            "NTE_total_estudantes_matriculados": nte,
            "percentual_calculado_PIES": None,
        },
        "PICOT": {
            "descricao": "Percentual de Estudantes Cotistas Envolvidos em Pesquisa",
            "NTECPP_cotistas_em_pesquisa": ntecpp,
            "NEP_total_estudantes_em_pesquisa": None,
            "percentual_calculado_PICOT": None,
        },
    }
    dados: dict = {
        "campus": "Serra",
        "ano_referencia": ano,
        "pilar": "Engajamento Academico e Inclusao",
        "indicadores": indicadores,
    }
    if chave_removida:
        dados.pop(chave_removida, None)
    return RegistroPilarJson(
        nome=f"pilar1_{campus}_{ano}.json", conteudo=serializar(dados)
    )


def escrever_zip(caminho: Path, registros: list[RegistroPilarJson]) -> None:
    """Escreve um zip determinístico com os registros, ordenados por nome."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(caminho, "w", zipfile.ZIP_DEFLATED) as zf:
        for reg in sorted(registros, key=lambda r: r.nome):
            zinfo = zipfile.ZipInfo(reg.nome, date_time=DATE_TIME_ZIP)
            zinfo.external_attr = EXTERNAL_ATTR_ZIP
            zf.writestr(zinfo, reg.conteudo.encode("utf-8"))
