# Contract: Contrato de Dados do Pilar 2 (Campus Serra)

**Arquivo de Contrato**: `specs/018-serra-pillar2-refinement/contracts/pilar2-contract.md`  
**Schema de Referência**: `contracts/pilar2-schema.json`

## Estrutura do JSON de Saída: `pilar2_serra_{ano}.json`

```json
{
  "$schema": "../../contracts/pilar2-schema.json",
  "campus": "Serra",
  "ano_referencia": 2025,
  "pilar": 2,
  "indicadores": {
    "PINV": {
      "descricao": "Percentual de Investimento em Pesquisa, Pos e Inovacao",
      "TAFPPI_valor_total_aporte_pesquisa": 25954326.84,
      "OCC_valor_orcamento_total_capital_custeio": null,
      "percentual_calculado_PINV": 1111.35
    },
    "PIPDI": {
      "descricao": "Quantidade de Acordos de Parceria para PDeI",
      "NAPPCT_acordos_parceria_firmados": 23,
      "total_acumulado_PIPDI": 23
    }
  }
}
```

## Regras de Validação de Contrato

1. **`campus`**: String exata `"Serra"`.
2. **`ano_referencia`**: Inteiro (2024, 2025 ou 2026).
3. **`pilar`**: Inteiro `2`.
4. **`PINV`**:
   - `TAFPPI_valor_total_aporte_pesquisa`: Número float positivo representando o somatório em reais dos novos projetos de pesquisa e inovação iniciados no ano.
   - `OCC_valor_orcamento_total_capital_custeio`: Estritamente `null`.
   - `percentual_calculado_PINV`: Float positivo lido de `data/pinv_serra.json`.
5. **`PIPDI`**:
   - `NAPPCT_acordos_parceria_firmados`: Inteiro positivo representando o total de projetos e acordos externos com vigência ativa no ano.
   - `total_acumulado_PIPDI`: Inteiro igual a `NAPPCT_acordos_parceria_firmados`.
