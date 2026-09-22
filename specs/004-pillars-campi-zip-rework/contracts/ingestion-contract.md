# Ingestion Contract: Pacote de Dados Zip dos Indicadores

**Feature**: `004-pillars-campi-zip-rework` | **Data**: 2026-09-22 | **Spec**: [spec.md](../spec.md)

## 1. Estrutura do Pacote `indicadores.zip`

O arquivo `indicadores.zip` deve estar localizado na raiz do repositório e conter arquivos JSON nomeados estritamente no formato:

```text
pilar{N}_{campus}_{year}.json
```

- `{N}`: Número do pilar (`1`, `2` ou `3`).
- `{campus}`: Identificador do campus em minúsculas (ex.: `serra`, `vitoria`, `todos`).
- `{year}`: Ano de referência com 4 dígitos (ex.: `2026`).

---

## 2. Esquema dos Arquivos JSON

Cada arquivo JSON contém os metadados de cabeçalho e os indicadores avaliados para aquele campus e ano.

### Esquema Comum de Cabeçalho

```json
{
  "campus": "Serra",
  "ano_referencia": 2026,
  "pilar": "<Nome do Pilar>",
  "indicadores": { ... }
}
```

---

### Pilar 1: Engajamento Acadêmico e Inclusão (`pilar1_{campus}_{year}.json`)

```json
{
  "campus": "Serra",
  "ano_referencia": 2026,
  "pilar": "Engajamento Academico e Inclusao",
  "indicadores": {
    "NTPP": {
      "descricao": "Numero Total de Projetos de Pesquisa",
      "projetos_pesquisa_registrados_execucao": 534,
      "total_projetos_NTPP": 534
    },
    "QSPP": {
      "descricao": "Quantitativo de Servidores Desenvolvendo Projetos",
      "SUPP_servidores_unicos_participantes": 202,
      "total_servidores_QSPP": 202
    },
    "PIES": {
      "descricao": "Percentual de Estudantes Envolvidos em Pesquisa",
      "NEP_estudantes_em_pesquisa": 376,
      "NTE_total_estudantes_matriculados": null,
      "percentual_calculado_PIES": null
    },
    "PICOT": {
      "descricao": "Percentual de Estudantes Cotistas Envolvidos em Pesquisa",
      "NTECPP_cotistas_em_pesquisa": null,
      "NEP_total_estudantes_em_pesquisa": 376,
      "percentual_calculado_PICOT": null
    }
  }
}
```

---

### Pilar 2: Fomento e Conexão com o Ecossistema (`pilar2_{campus}_{year}.json`)

```json
{
  "campus": "Serra",
  "ano_referencia": 2026,
  "pilar": "Fomento e Conexao com o Ecossistema",
  "indicadores": {
    "PINV": {
      "descricao": "Percentual de Investimento em Pesquisa, Pos e Inovacao",
      "TAFPPI_valor_total_aporte_pesquisa": null,
      "OCC_valor_orcamento_total_capital_custeio": null,
      "percentual_calculado_PINV": null
    },
    "PIPDI": {
      "descricao": "Quantidade de Acordos de Parceria para PDeI",
      "NAPPCT_acordos_parceria_firmados": null,
      "total_acumulado_PIPDI": null
    }
  }
}
```

---

### Pilar 3: Produtividade e Propriedade Intelectual (`pilar3_{campus}_{year}.json`)

```json
{
  "campus": "Serra",
  "ano_referencia": 2026,
  "pilar": "Produtividade e Propriedade Intelectual",
  "indicadores": {
    "PIPRO": {
      "descricao": "Producao Intelectual",
      "NPB_producoes_academicas_bibliograficas": 51,
      "NPT_producoes_tecnicas_tecnologicas": 24,
      "total_producao_PIPRO": 75
    },
    "PIPROT": {
      "descricao": "Quantidade Total de Ativos de Propriedade Intelectual",
      "valores_totais_por_tipo": {
        "PA_patentes_e_modelos_utilidade": 0,
        "RM_registros_marca": null,
        "DI_desenhos_industriais": 0,
        "C_cultivares": null,
        "TC_topografia_circuitos": null,
        "PC_programas_computador": 0,
        "OGM_organismos_geneticamente_modificados": null
      },
      "total_acumulado_PIPROT": 0
    },
    "PIPROTR": {
      "descricao": "Quantidade Total de Ativos Transferidos",
      "valores_totais_por_tipo": {
        "CT_contratos_transferencia_tecnologia": null,
        "CL_contratos_licenciamento": null,
        "CC_contratos_cessao": null
      },
      "total_transferidos_PIPROTR": null
    }
  }
}
```

---

## 3. Regras Semânticas do Contrato

1. **Campos Ausentes ou Não Coletados**: Devem ser estritamente serializados como `null`.
2. **Valor Zero Verificado**: O número `0` é exclusivamente utilizado para contagens verificadas (ex.: `0` patentes ativas).
3. **Escopo do Campus "todos"**: Deve ser fornecido por arquivos dedicados `pilar{N}_todos_{year}.json`. Na ausência destes arquivos, o sistema atribui `null` aos indicadores institucionais, sem sintetizar somas com base em subconjuntos parciais de campi.
