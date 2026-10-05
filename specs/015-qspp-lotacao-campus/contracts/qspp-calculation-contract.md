# Contrato de Cálculo e Ingestão do QSPP

**Branch**: `fix/first-pilar` | **Date**: 2026-10-03 | **Spec**: [spec.md](../spec.md)

## 1. Contrato da Função de Classificação (`papeis.py`)

A função `eh_pesquisador_em_pesquisa` deve retornar `True` exclusivamente se a pessoa possuir classificação canônica de pesquisador institucional (`researcher`):

```python
def eh_pesquisador_em_pesquisa(pessoa: Pessoa | None, papeis_str: str) -> bool:
    """Classifica um participante de projeto como pesquisador/servidor institucional (QSPP).

    Regras estritas:
    - Retorna True se e somente se pessoa is not None e pessoa.classification == 'researcher'.
    - Colaboradores externos (outside_ifes) retornam False.
    - Discentes (student) retornam False.
    - Registros sem pessoa ou com classificação ausente retornam False.
    """
```

## 2. Contrato de Agregação por Campus (`aggregator.py`)

No escopo de um campus individual (`slug_campus`):

- Um membro classificado como pesquisador só entra em `staff_unicos[slug_campus][ano]` se:
  1. A iniciativa for atribuída ao `slug_campus`; E
  2. `pessoa.campus` estiver presente e `normalizar_slug(pessoa.campus.name) == slug_campus`.
- Se o projeto pertence ao campus A, mas o pesquisador pertence ao campus B, ele NÃO entra em `staff_unicos[campus_A]` nem em `staff_unicos[campus_B]`.

No escopo global (`todos`):

- Todo membro ativo classificado como pesquisador (`eh_pesquisador_em_pesquisa == True`) entra em `staff_unicos['todos'][ano]`.

## 3. Contrato de Saída JSON (`pilar1_{campus}_{ano}.json`)

O schema de saída em JSON para o indicador QSPP permanece estritamente compatível:

```json
{
  "campus": "Serra",
  "ano_referencia": 2026,
  "pilar": "Engajamento Academico e Inclusao",
  "indicadores": {
    "QSPP": {
      "descricao": "Quantitativo de Servidores Desenvolvendo Projetos",
      "SUPP_servidores_unicos_participantes": 68,
      "total_servidores_QSPP": 68
    }
  }
}
```

Nenhum campo é renomeado ou removido, garantindo compatibilidade total com o frontend existente.
