from __future__ import annotations

"""
Classificações de dados das listagens de matrícula.

Versão do contrato: `specs/010-listagens-xlsx-etl/contracts/classificacao_cota.md`.

Regra geral: classificação por LISTA NEGATIVA explícita (igualdade exata após
`strip()`). Todo valor de uma coluna que não esteja na lista negativa daquela
coluna é considerado "de cota" (modalidade de reserva de vagas / ação
afirmativa). As listas devem ser revisadas (e os testes atualizados) sempre que
o conjunto de valores da fonte mudar.

Exceção — `Situação Matrícula` é lista POSITIVA (fail-closed): só entra no NTE
o que está em `SITUACOES_NTE`, e um valor novo na fonte é descartado até ser
revisado, em vez de passar a contar. As colunas de cota são lista negativa
(fail-open): lá, um valor novo conta como cota. A diferença importa porque um
erro de lista positiva derruba um indicador, enquanto um erro de lista negativa
infla um indicador.

`SITUACOES_NTE` é a única lista que decide duas coisas ao mesmo tempo: quem entra
no NTE (denominador do PIES) e quem tem o nome retido para o cruzamento NTECPP
(numerador do PICOT). É deliberado: um concluinte que ingressou por cota e ainda
consta da listagem é cotista tanto quanto um matriculado. Manter as duas decisões
numa lista só impede que NTE e NTECPP divirjam sobre quem é o estudante.

Os valores são comparados por igualdade exata, nunca por substring. `Não
Concluído` e `Concludente` existem de verdade na fonte (87 e 66 ocorrências nos
6 arquivos de 2024–2026) e NÃO podem ser contados como `Concluído`.
"""

SITUACOES_NTE = frozenset({"Matriculado", "Formado", "Concluído"})

# Forma de matrícula (Desc_Cota) — NÃO de cota (contrato §2.1).
NAO_COTA_FORMA_DE_MATRICULA = frozenset(
    {
        "Não possui",
        "Ampla Concorrência",
    }
)

# Forma de ingresso (Desc_Forma_Ingresso_Matricula) — NÃO de cota (contrato §2.2).
NAO_COTA_FORMA_DE_INGRESSO = frozenset(
    {
        "Ampla Concorrência",
        "Pós-Graduação - Ampla Concorrência",
        "Transferência Interna",
        "Transferência Externa",
        "Transferência Externa Ex-Ofício",
        "Portador de Diploma (Novo Curso)",
        "Análise de Currículo",
        "Graduação - Intercampi",
        "Aluno Intercambista",
        "Professores da Rede Pública",
    }
)


def ser_coluna_de_cota(valor: str | None, nao_de_cota: frozenset[str]) -> bool:
    """Diz se um valor (após strip) é 'de cota' na coluna em questão.

    ``None``, string vazia e valores presentes na lista negativa da coluna NÃO
    são "de cota".
    """
    if valor is None:
        return False
    valor_limpo = valor.strip()
    if not valor_limpo:
        return False
    return valor_limpo not in nao_de_cota


def ser_de_cota_ingresso(valor: str | None) -> bool:
    """'De cota' na coluna Desc_Forma_Ingresso_Matricula."""
    return ser_coluna_de_cota(valor, NAO_COTA_FORMA_DE_INGRESSO)


def ser_de_cota_matricula(valor: str | None) -> bool:
    """'De cota' na coluna Desc_Cota (forma de matrícula)."""
    return ser_coluna_de_cota(valor, NAO_COTA_FORMA_DE_MATRICULA)
