from __future__ import annotations

import json
import os
import re
import time
import zipfile
from pathlib import Path
from typing import Any

from etl.core.logic.models import RegistroPilarJson
from etl.core.ports.sink import ISink

PADRAO_NOME = re.compile(r"^pilar([123])_([a-z0-9]+)_(\d{4})\.json$")

NOMES_PILARES = {
    1: "Engajamento Academico e Inclusao",
    2: "Fomento e Conexao com o Ecossistema",
    3: "Produtividade e Propriedade Intelectual",
}

SIGLAS_POR_PILAR = {
    1: ["NTPP", "QSPP", "PIES", "PICOT"],
    2: ["PINV", "PIPDI"],
    3: ["PIPRO", "PIPROT", "PIPROTR"],
}

CAMPOS_QUE_DEVEM_SER_NULOS = {
    "NTE_total_estudantes_matriculados",
    "percentual_calculado_PIES",
    "NTECPP_cotistas_em_pesquisa",
    "percentual_calculado_PICOT",
    "TAFPPI_valor_total_aporte_pesquisa",
    "OCC_valor_orcamento_total_capital_custeio",
    "percentual_calculado_PINV",
    "NAPPCT_acordos_parceria_firmados",
    "total_acumulado_PIPDI",
    "total_transferidos_PIPROTR",
}


def _valor_valido(valor: Any) -> bool:
    if valor is None:
        return True
    if isinstance(valor, bool):
        return False
    return isinstance(valor, int) and valor >= 0


def validar_arquivos_pilar(
    arquivos: list[RegistroPilarJson],
    campos_derivaveis: frozenset[str] = frozenset(),
) -> None:
    """
    Executa a validação do contrato de saída para todos os arquivos JSON gerados:
    - Nomenclatura pilar{N}_{campus}_{year}.json
    - Parse JSON válido
    - Cabeçalhos obrigatórios e conformidade com o nome do arquivo
    - Fidelidade estrita a nulos (Princípio III) e valores numéricos não-negativos

    ``campos_derivaveis``: conjunto de campos (de ``CAMPOS_QUE_DEVEM_SER_NULOS``)
    que, excepcionalmente, PODEM ser preenchidos nesta execução (por exemplo,
    ``NTE_total_estudantes_matriculados`` no fluxo das listagens). Por padrão
    (conjunto vazio), o contrato exige null em todos os campos não coletáveis —
    comportamento atual do pipeline canônico, inalterado.
    """
    violacoes: list[str] = []

    for arq in arquivos:
        nome = arq.nome
        conteudo = arq.conteudo

        match = PADRAO_NOME.match(nome)
        if not match:
            violacoes.append(
                f"{nome}: violação de nomenclatura — esperado pilar{{N}}_{{campus}}_{{year}}.json"
            )
            continue

        numero_pilar = int(match.group(1))
        ano = int(match.group(3))

        try:
            dados: dict[str, Any] = json.loads(conteudo)
        except Exception as e:
            violacoes.append(f"{nome}: violação de conteúdo — JSON inválido ({e})")
            continue

        for campo in ["campus", "ano_referencia", "pilar", "indicadores"]:
            if campo not in dados:
                violacoes.append(
                    f"{nome}: violação de cabeçalho — campo ausente '{campo}'"
                )

        if any(v.startswith(f"{nome}: violação de cabeçalho") for v in violacoes):
            continue

        ano_ref = dados.get("ano_referencia")
        if ano_ref != ano:
            violacoes.append(
                f"{nome}: violação de cabeçalho — ano_referencia ({ano_ref}) "
                f"difere do nome do arquivo ({ano})"
            )
        pilar_ref = dados.get("pilar")
        pilar_esp = NOMES_PILARES[numero_pilar]
        if pilar_ref != pilar_esp:
            violacoes.append(
                f"{nome}: violação de cabeçalho — pilar '{pilar_ref}' "
                f"difere do esperado '{pilar_esp}'"
            )

        indicadores = dados.get("indicadores", {})
        siglas = SIGLAS_POR_PILAR[numero_pilar]
        for sigla in siglas:
            ind = indicadores.get(sigla)
            if not isinstance(ind, dict) or not isinstance(ind.get("descricao"), str):
                violacoes.append(
                    f"{nome}: violação de indicadores — sigla '{sigla}' ausente ou sem descrição"
                )
                continue

            for campo, valor in ind.items():
                if campo == "descricao":
                    continue
                if campo == "valores_totais_por_tipo":
                    if not isinstance(valor, dict):
                        violacoes.append(
                            f"{nome}: violação de fidelidade — '{sigla}.{campo}' deve ser um objeto"
                        )
                        continue
                    for subcampo, subvalor in valor.items():
                        if not _valor_valido(subvalor):
                            violacoes.append(
                                f"{nome}: violação de fidelidade — "
                                f"'{sigla}.{campo}.{subcampo}' tem valor inválido ({subvalor})"
                            )
                    continue

                if (
                    campo in CAMPOS_QUE_DEVEM_SER_NULOS
                    and campo not in campos_derivaveis
                    and valor is not None
                ):
                    violacoes.append(
                        f"{nome}: violação de fidelidade — campo não coletável "
                        f"'{sigla}.{campo}' deve ser null (recebeu {valor})"
                    )

                if not _valor_valido(valor):
                    violacoes.append(
                        f"{nome}: violação de fidelidade — "
                        f"campo '{sigla}.{campo}' tem valor numérico inválido ({valor})"
                    )

    if violacoes:
        msg = (
            f"ERRO: validação do pacote gerado falhou com {len(violacoes)} violações:\n"
        )
        msg += "\n".join(f"  - {v}" for v in violacoes)
        raise ValueError(msg)


class ZipIndicadoresSink(ISink):
    """Adaptador de persistência atômica e determinística no pacote indicadores.zip."""

    def __init__(
        self,
        caminho_zip: Path | str,
        campos_derivaveis: frozenset[str] = frozenset(),
    ) -> None:
        self.caminho_zip = Path(caminho_zip)
        self.campos_derivaveis = campos_derivaveis

    def load(self, arquivos: list[RegistroPilarJson]) -> None:
        validar_arquivos_pilar(arquivos, self.campos_derivaveis)

        self.caminho_zip.parent.mkdir(parents=True, exist_ok=True)
        nome_tmp = (
            f".tmp-{self.caminho_zip.name}-{os.getpid()}-{int(time.time() * 1000)}"
        )
        caminho_tmp = self.caminho_zip.parent / nome_tmp

        try:
            with zipfile.ZipFile(
                caminho_tmp, "w", compression=zipfile.ZIP_DEFLATED
            ) as zf:
                # Ordenação estrita das entradas por nome de arquivo para determinismo
                for arq in sorted(arquivos, key=lambda a: a.nome):
                    zinfo = zipfile.ZipInfo(arq.nome, date_time=(1980, 1, 1, 0, 0, 0))
                    zinfo.external_attr = 0o644 << 16
                    conteudo_bytes = arq.conteudo.encode("utf-8")
                    zf.writestr(zinfo, conteudo_bytes)

            # Substituição atômica no destino final
            os.replace(caminho_tmp, self.caminho_zip)
        finally:
            if caminho_tmp.exists():
                try:
                    caminho_tmp.unlink()
                except OSError:
                    pass
