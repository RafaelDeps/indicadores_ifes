# Contrato de Saída — Pacote `pilar{N}_{campus}_{year}.json`

**Feature**: `010-listagens-xlsx-etl` | **Regido por**: [spec.md](../spec.md) FR-007/FR-008

## 1. Formato

- Um arquivo JSON por (pilar, campus, ano): `pilar{N}_{campus_slug}_{year}.json`,
  N ∈ {1, 2, 3}.
- `campus_slug` = `campus_resolver.normalizar_slug(campus_nome)` (ex.: `serra`).
- Serialização idêntica ao pipeline atual: `json.dumps(dados, ensure_ascii=False,
indent=2) + "\n"` (garantida pelo reuso de `formatar_arquivos_pilar`).
- Empacotamento: ZIP (DEFLATE) com entradas **ordenadas por nome**, `date_time`
  fixo `(1980,1,1,0,0,0)`, `external_attr = 0o644 << 16`, escrita atômica
  (`.tmp-*` + `os.replace`). ⇒ determinismo byte a byte (SC-003).

## 2. Estrutura `pilar1_{campus}_{year}.json`

Chaves de topo: `campus` (nome), `ano_referencia`, `pilar` (= `NOMES_PILARES[1]`),
`indicadores`.

| Indicador | Campo                                    | Fluxo listagens                                                 |
| --------- | ---------------------------------------- | --------------------------------------------------------------- |
| `NTPP`    | `descricao`                              | texto do contrato (constante)                                   |
| `NTPP`    | `projetos_pesquisa_registrados_execucao` | `null` (não derivável)                                          |
| `NTPP`    | `total_projetos_NTPP`                    | `null` (não derivável)                                          |
| `QSPP`    | `descricao`                              | texto do contrato (constante)                                   |
| `QSPP`    | `SUPP_servidores_unicos_participantes`   | `null` (não derivável)                                          |
| `QSPP`    | `total_servidores_QSPP`                  | `null` (não derivável)                                          |
| `PIES`    | `NEP_estudantes_em_pesquisa`             | `null` (não derivável)                                          |
| `PIES`    | **`NTE_total_estudantes_matriculados`**  | **`int` — NTE calculado**                                       |
| `PIES`    | `percentual_calculado_PIES`              | `null` (NEP não é derivável das listagens — ver §5.1)           |
| `PICOT`   | **`NTECPP_cotistas_em_pesquisa`**        | **`int \| null` — cruzamento NEP × cotistas por nome (FR-012)** |
| `PICOT`   | `NEP_total_estudantes_em_pesquisa`       | `null` (não derivável)                                          |
| `PICOT`   | `percentual_calculado_PICOT`             | `null` (NEP não é derivável das listagens — ver §5.1)           |

> **Nota (FR-012)**: `NTECPP_cotistas_em_pesquisa` é o cruzamento por **nome
> normalizado** entre os estudantes em pesquisa do export canônico (NEP) e os
> cotistas das listagens. `null` quando (a) não há export canônico disponível,
> (b) a interseção é vazia (Princípio III — não se lê "0"). Contagem bruta de
> cotistas existe apenas no relatório de execução.

### Exemplo do Pilar 1 (esperado — Serra/2025)

```json
{
  "campus": "Serra",
  "ano_referencia": 2025,
  "pilar": "Engajamento Academico e Inclusao",
  "indicadores": {
    "NTPP": {
      "descricao": "Numero Total de Projetos de Pesquisa",
      "projetos_pesquisa_registrados_execucao": null,
      "total_projetos_NTPP": null
    },
    "QSPP": {
      "descricao": "Quantitativo de Servidores Desenvolvendo Projetos",
      "SUPP_servidores_unicos_participantes": null,
      "total_servidores_QSPP": null
    },
    "PIES": {
      "descricao": "Percentual de Estudantes Envolvidos em Pesquisa",
      "NEP_estudantes_em_pesquisa": null,
      "NTE_total_estudantes_matriculados": 1857,
      "percentual_calculado_PIES": null
    },
    "PICOT": {
      "descricao": "Percentual de Estudantes Cotistas Envolvidos em Pesquisa",
      "NTECPP_cotistas_em_pesquisa": 93,
      "NEP_total_estudantes_em_pesquisa": null,
      "percentual_calculado_PICOT": null
    }
  }
}
```

## 3. Pilares 2 e 3

Reuso integral de `formatar_arquivos_pilar` (`_montar_pilar2`/`_montar_pilar3`):

- **Pilar 2**: todos os campos numéricos `null` (modelo `AgregadosPilar2` já é
  todo `None`).
- **Pilar 3**: o contrato atual serializa `0` para as categorias estruturais
  (`total_producao_PIPRO`, `total_acumulado_PIPROT`, `PC_programas_computador`,
  `PA_patentes_e_modelos_utilidade`, `RM_registros_marca` etc.) — são valores
  **estruturais do contrato vigente** (presentes no `indicadores.zip` atual
  para campi/anos sem dados de pesquisa), **não** inventados por esta feature.
  FR-007 é respeitado no sentido de: não há dado novo inventado; o shape é
  literalmente o do contrato escolhido (Q3 = "mesmo contrato").

## 4. Validação no sink (`ZipIndicadoresSink`)

- Nomenclatura `pilar{N}_{campus}_{year}.json`, parse JSON, cabeçalhos
  obrigatórios, `ano_referencia`/`pilar` consistentes com nome/constante.
- Valores numéricos: `int ≥ 0` ou `null` (`bool` rejeitado).
- **Mudança mínima (parametrizada)**: a validação passa a aceitar
  `campos_derivaveis: frozenset[str]` (default `∅`). Campos em
  `CAMPOS_QUE_DEVEM_SER_NULOS` **que estejam também em `campos_derivaveis`**
  não são mais exigidos nulos — e apenas esses. O fluxo listagens informa
  `campos_derivaveis = {"NTE_total_estudantes_matriculados",
"NTECPP_cotistas_em_pesquisa"}`; o fluxo canônico não informa (comportamento
  atual preservado — teste de fidelidade existente continua passando).

## 5. Merge em `data/dist/indicadores.zip` (integração do site)

`etl/scripts/merge_listagens_indicadores.py`:

- Entradas: `data/dist/indicadores_listagens.zip` (lista) e
  `data/dist/indicadores.zip` (canônico — pode existir antes/independente).
- O pacote de listagens já contém o NTECPP **calculado pelo cruzamento
  FR-012** (feito no fluxo de listagens, que recebe o export canônico por
  `--canonical`); o merge apenas propaga o valor.
- Para cada `pilar1_{campus}_{year}.json` do pacote listagens:
  - se existe no canônico → sobrepõe `PIES.NTE_total_estudantes_matriculados`
    e `PICOT.NTECPP_cotistas_em_pesquisa`, e **recalcula** os dois
    percentuais (abaixo);
  - se não existe → acrescenta o arquivo inteiro do pacote listagens, verbatim.
- Valida: **nenhum outro campo** do canônico é alterado (diff de chaves). As
  exceções são exatamente os dois campos autorizados acima mais os dois
  percentuais que o merge deriva deles.
- Escreve `data/dist/indicadores.zip` deterministicamente (mesmas regras de
  ordenação/timestamps). Idempotente.
- CLI: `python -m etl.scripts.merge_listagens_indicadores
--listagens data/dist/indicadores_listagens.zip
--canonical data/dist/indicadores.zip [--saida data/dist/indicadores.zip]`.

### §5.1 Recálculo dos percentuais PIES/PICOT

O merge é a **única** etapa do pipeline em que os dois ingredientes de cada
quociente coexistem no mesmo arquivo: o NEP vem do canônico e o NTE/NTECPP das
listagens. Por isso o merge também calcula:

| Campo                        | Fórmula                | Numerador                                       | Denominador                                          |
| ---------------------------- | ---------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `percentual_calculado_PIES`  | `(NEP / NTE) × 100`    | `PIES.NEP_estudantes_em_pesquisa` (canônico)    | `PIES.NTE_total_estudantes_matriculados` (listagens) |
| `percentual_calculado_PICOT` | `(NTECPP / NEP) × 100` | `PICOT.NTECPP_cotistas_em_pesquisa` (listagens) | `PICOT.NEP_total_estudantes_em_pesquisa` (canônico)  |

As fórmulas espelham `src/data/indicadores.ts` (`PIES`/`PICOT`), que é o que o
frontend exibe como métrica principal dos cards.

- **Tipo**: `int >= 0` — o contrato de saída (§4) só admite `int` ou `null`, e
  `float` seria violação de fidelidade.
- **Arredondamento**: meia-para-cima (`Decimal`/`ROUND_HALF_UP`), nunca o
  arredondamento bancário do `round()` — em artefato que exige determinismo
  byte a byte (SC-003), e `1/8 = 12,5%` não pode virar `12`.
- **`null`, nunca `0`**, quando o quociente não é publicável (Princípio III):
  numerador `null` (ex.: NTECPP de interseção vazia), denominador `null` ou `0`.
  Denominador `0` não vira `0%` porque isso afirmaria uma medição inexistente.
  Já numerador `0` com denominador `> 0` **é** `0` (participação medida como
  nula), não um placeholder.
- **Pilar1 só de listagens** (sem par no canônico): o arquivo entra verbatim.
  Não há NEP canônico, logo nenhum dos dois quocientes tem denominador e os
  percentuais permanecem `null` — como na §2.
- `CAMPOS_DERIVAVEIS_MERGE` (definido no merge) é o conjunto informado ao
  `ZipIndicadoresSink` e ao `check-dados`: sem ele a validação recusaria um
  pacote que o próprio pipeline gerou.

> **Nota de provenance**: se o ETL canônico for reexecutado **depois** do merge,
> os percentuais (e NTE/NTECPP) voltam a `null` no pacote — o merge precisa ser
> repetido. É a mesma classe de cobertura perdida que a spec 012 documenta.

## 6. Códigos de saída e mensagens

- `0` sucesso; `1` falha fatal (`ERRO:` no stderr).
- `AVISO:` para semestre ausente/título divergente/campus divergente/linhas sem
  matrícula (não fatais).

## 7. Privacidade (Princípio IV)

Nenhum artefato de saída contém `Nome`, `Matrícula`, cota/ingresso individual.
Coberto por teste dedicado (`test_listagens_flow.py`).
