# Contract: Arquivo de Percentual de PINV por Campus (`pinv_<campus>.json`)

**Feature**: `017-pillar2-pinv-pipdi-etl` | **Data**: 2026-10-07

## 1. Localização do Arquivo

O arquivo de percentual de PINV por campus deve ser posicionado sob:

- Primário: `data/pinv_<campus_slug>.json`
- Fallback: `data/raw/pilar2/pinv_<campus_slug>.json`

Exemplo para o campus Serra:

- `data/pinv_serra.json`

## 2. Estrutura do Arquivo JSON

```json
{
  "indicador": "PINV",
  "nome": "Percentual de Investimento em Pesquisa, Pós e Inovação",
  "pilar": 2,
  "campus": "Serra",
  "campus_slug": "serra",
  "unidade": "%",
  "resultados_anuais": [
    {
      "ano": 2024,
      "percentual": 496.78,
      "percentual_formatado": "496,78%"
    },
    {
      "ano": 2025,
      "percentual": 1111.35,
      "percentual_formatado": "1.111,35%"
    },
    {
      "ano": 2026,
      "percentual": 610.63,
      "percentual_formatado": "610,63%"
    }
  ],
  "valores_por_ano": {
    "2024": 496.78,
    "2025": 1111.35,
    "2026": 610.63
  }
}
```

## 3. Regras de Ingestão e Mapeamento

1. O leitor do ETL consome preferencialmente o mapa `valores_por_ano` (com chaves convertidas para inteiro de ano).
2. Se o campus correspondente não tiver arquivo JSON em `data/` nem em `data/raw/pilar2/`, o indicador `percentual_calculado_PINV` permanece estritamente `null` no arquivo de saída `pilar2_<campus>_<ano>.json`.
3. O valor atribuído deve ser numérico (`float` com até duas casas decimais ou `int`).
