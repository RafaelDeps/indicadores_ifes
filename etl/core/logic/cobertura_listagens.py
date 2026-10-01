"""Cobertura de derivados das listagens: o que a origem produz e o pacote tem.

Contrato: `specs/012-gate-proveniencia-workflow-dados/contracts/check-dados.md` §3.

A regra inteira cabe em uma subtração de conjuntos:

```
perda = cobertura(origem) - cobertura(pacote)
```

 onde a cobertura de um conjunto de registros é o conjunto das chaves
`(campus, ano, campo)` para as quais o derivado **tem valor**.

Três decisões que o módulo carrega, e que valem mais que o código:

**Por que valor, e não presença.** O pacote pode ter o arquivo e o derivado nulo
— é o caso em que a integração das listagens rodou e não escreveu. Exigir
presença de arquivo deixaria esse caso passar, e ele é exatamente o defeito que a
feature fecha.

**Por que subtração, e não exigência.** Um derivado nulo nos **dois** lados não é
perda: a origem também não o produziu. O escopo agregado está nesse estado
porque a soma de matrículas não é o número de matrículas, e nenhum nome de
campus, escopo ou ano é escrito aqui. Uma lista de isenções seria a mesma regra
com um valor mágico, e o próximo campus novo a faria errar de novo.

**Por que dois chamadores.** `check_dados` pergunta se a perda **já** aconteceu;
`cadeia_dados` pergunta se a cadeia **vai** causá-la. A regra é a mesma — a
divergência silenciosa entre duas cópias seria o defeito outra vez.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

from etl.core.logic.models import RegistroPilarJson
from etl.flows.listagens_flow import CAMPOS_DERIVAVEIS_LISTAGENS
from etl.scripts.merge_listagens_indicadores import PADRAO_PILAR1

#: Chave de cobertura: o par que o merge integra, mais o derivado que sumiu.
ChaveCobertura = tuple[str, int, str]

#: Como a perda se manifesta — a **forma** que aponta a ação corretiva.
FORMA_ARQUIVO_AUSENTE = "arquivo ausente"
FORMA_CAMPO_NULO = "campo nulo"


@dataclass(frozen=True)
class Perda:
    """Uma chave exigida pela origem que o pacote não entrega."""

    chave: ChaveCobertura
    forma: str

    @property
    def campus(self) -> str:
        return self.chave[0]

    @property
    def ano(self) -> int:
        return self.chave[1]

    @property
    def campo(self) -> str:
        return self.chave[2]


def cobertura_registros(
    registros: list[RegistroPilarJson],
) -> set[ChaveCobertura]:
    """Chaves `(campus, ano, campo)` em que o derivado tem valor.

    Registro cujo nome não casa com `pilar1_{campus}_{ano}.json` não contribui:
    o mesmo zip leva os outros pilares, que não têm derivado de listagem.

    JSON inválido levanta `ValueError` nomeando o arquivo. Cobertura vazia
    silenciosa seria o pior resultado possível — o portão passaria sobre um
    insumo corrompido.
    """
    cobertura: set[ChaveCobertura] = set()
    for registro in registros:
        achado = PADRAO_PILAR1.match(registro.nome)
        if achado is None:
            continue
        campus, ano = achado.group(1), int(achado.group(2))
        try:
            corpo = json.loads(registro.conteudo)
        except json.JSONDecodeError as erro:
            raise ValueError(f"JSON inválido em '{registro.nome}': {erro}") from erro
        indicadores = corpo.get("indicadores") or {}
        for campo in CAMPOS_DERIVAVEIS_LISTAGENS:
            for indicador in indicadores.values():
                if isinstance(indicador, dict) and indicador.get(campo) is not None:
                    cobertura.add((campus, ano, campo))
                    break
    return cobertura


def subtrair_coberturas(
    origem: set[ChaveCobertura], pacote: set[ChaveCobertura]
) -> set[ChaveCobertura]:
    """Chaves que a origem exige e o pacote não entrega.

    A direção é origem → pacote. O inverso (chave no pacote que a origem não
    cobre) é o estado normal: as listagens cobrem os semestres enviados, o
    canônico cobre todos os anos.
    """
    return origem - pacote


def registrar_perdas(
    origem: set[ChaveCobertura],
    pacote: set[ChaveCobertura],
    *,
    pares_no_pacote: set[tuple[str, int]],
) -> list[Perda]:
    """Perdas ordenadas por `(campus, ano, campo)`, com a forma de cada uma.

    A ordenação é estável porque um relatório que embaralha a ordem a cada
    execução não pode ser comparado entre logs.

    `pares_no_pacote` decide a forma: par ausente do pacote é `arquivo ausente`;
    par presente é `campo nulo`. O veredito é o mesmo nas duas — a regra mede
    valor — mas a causa indicada é diferente. Ele é **exigido** e não deduzido
    da cobertura: a cobertura só tem as chaves com valor, e o par cujo derivado
    é nulo justamente não aparece nela — deduzir de lá classificaria todo caso
    como arquivo ausente.
    """
    perdas = [
        Perda(chave=chave, forma=_forma(chave, pares_no_pacote))
        for chave in subtrair_coberturas(origem, pacote)
    ]
    return sorted(perdas, key=lambda perda: perda.chave)


def _forma(chave: ChaveCobertura, pares_no_pacote: set[tuple[str, int]]) -> str:
    campus, ano, _ = chave
    return (
        FORMA_ARQUIVO_AUSENTE
        if (campus, ano) not in pares_no_pacote
        else (FORMA_CAMPO_NULO)
    )


def pares_registros(registros: list[RegistroPilarJson]) -> set[tuple[str, int]]:
    """Pares `(campus, ano)` dos registros cujo nome casa com o padrão do merge.

    Serve de entrada para `registrar_perdas`, que precisa saber se o par está no
    pacote para distinguir arquivo ausente de campo nulo.
    """
    pares: set[tuple[str, int]] = set()
    for registro in registros:
        achado = PADRAO_PILAR1.match(registro.nome)
        if achado is not None:
            pares.add((achado.group(1), int(achado.group(2))))
    return pares
