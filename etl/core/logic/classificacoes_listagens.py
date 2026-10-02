from __future__ import annotations

"""
Classificações de dados das listagens de matrícula.

Versão do contrato: `specs/010-listagens-xlsx-etl/contracts/classificacao_cota.md`.

Regra geral: classificação por LISTA NEGATIVA explícita (igualdade exata após
`strip()`). Todo valor de uma coluna que não esteja na lista negativa daquela
coluna é considerado "de cota" (modalidade de reserva de vagas / ação
afirmativa). As listas devem ser revisadas (e os testes atualizados) sempre que
o conjunto de valores da fonte mudar.
"""

SITUACOES_NTE = frozenset({"Matriculado", "Formado"})

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
