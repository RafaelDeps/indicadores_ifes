# Research & Technical Decisions: Integração do Cálculo Completo do Pilar 2 (PINV e PIPDI) no ETL

**Feature**: `017-pillar2-pinv-pipdi-etl` | **Data**: 2026-10-07

## 1. Contexto e Objetivos

O Pilar 2 do CONIF ("Fomento e Conexão com o Ecossistema") compreende dois indicadores essenciais:

1. **PINV** (_Percentual de Investimento em Pesquisa, Pós e Inovação_):
   $$\text{PINV} = \left(\frac{\text{TAFPPI}}{\text{OCC}}\right) \times 100$$
   - `TAFPPI`: Total de Aporte de Fomento à Pesquisa (soma de recursos financeiros dos projetos iniciados no ano).
   - `OCC`: Orçamento Corrente de Capital e Custeio (orçamento operacional da instituição; permanece `null`).
   - `percentual_calculado_PINV`: Percentual derivado da razão entre fomento e orçamento apurado por campus.
2. **PIPDI** (_Quantidade de Acordos de Parceria para PDeI_):
   $$\text{PIPDI} = \text{NAPPCT}$$
   - `NAPPCT`: Número de Acordos de Parceria e Cooperação de PDeI firmados/vigentes no ano com entidades externas (empresas privadas e agências de fomento governamentais).

Até o momento, `percentual_calculado_PINV` vinha sendo emitido estritamente como `null` devido à ausência do orçamento de custeio institucional na base de dados de projetos. Além disso, os dados detalhados de fomento e parceiros externos recentemente adaptados no SIGPESQ (`project_sigpesq_files_json/`) ainda não eram consumidos pelo pipeline para calcular o `TAFPPI` e o `PIPDI`.

---

## 2. Decisões Arquiteturais

### Decisão 1: Ingestão Desacoplada de PINV por Campus (`data/pinv_<campus>.json`)

- **Decisão**: Criar um leitor para carregar arquivos de percentuais por campus localizados em `data/pinv_<slug>.json` (com fallback em `data/raw/pilar2/pinv_<slug>.json`).
- **Formato**:
  ```json
  {
    "indicador": "PINV",
    "campus": "Serra",
    "campus_slug": "serra",
    "unidade": "%",
    "valores_por_ano": {
      "2024": 496.78,
      "2025": 1111.35,
      "2026": 610.63
    }
  }
  ```
- **Comportamento**:
  - Para cada campus em processamento: se o arquivo JSON existir para aquele slug, o ETL extrai o valor para o ano de referência e popula `percentual_calculado_PINV`.
  - Se o arquivo não existir para o campus: `percentual_calculado_PINV` permanece estritamente `null` (_"Dado indisponível"_), cumprindo o Princípio III (Fidelidade aos Dados).
- **Alternativas rejeitadas**: Embutir percentuais fixos no código Python (rejeitado por violar separação entre dados e código).

### Decisão 2: Extração de Financiamento de `project_sigpesq_files_json/`

- **Decisão**: Estender o extrator `ZipCanonicalSource` para carregar e indexar os arquivos `project_sigpesq_files_json/PJ_<codigo>.json` presentes no arquivo canônico `exports_canonical.zip`.
- **Campos extraídos**:
  - `codigo`: Identificador do projeto (ex.: "PJ 7875").
  - `datas`: `inicio` e `fim` (convertidos para ano de início e ano de fim).
  - `coordenador.campus`: Resolução do campus do projeto (fallback para vínculo de iniciativa no `initiatives_canonical.json`).
  - `financiamento`:
    - `valor_total`: Valor monetário direto em R$; se ausente, calculado pela soma dos valores em `fontes`.
    - `fontes`: Lista de `{fonte, valor, tipo}`.
- **Alternativas rejeitadas**: Extrair apenas do texto livre de descrição da iniciativa (rejeitado por ser impreciso e frágil comparado aos JSONs estruturados).

### Decisão 3: Regra de Atribuição de Aporte Financeiro (`TAFPPI`)

- **Decisão**: O montante financeiro total do projeto é atribuído exclusivamente ao seu **ano de início** (`ano_inicio == ano`).
- **Justificativa**: Segue o padrão já ratificado na spec 016 e nas práticas contábeis do CONIF para captação de novos recursos por exercício financeiro.
- **Deduplicação / Consolidação**: Se houver dados concorrentes em FACTO e SIGPESQ, prioriza-se o montante registrado no SIGPESQ para projetos acadêmicos e FACTO para contratos de gestão, evitando contagem dupla se houver sobreposição por número de processo.

### Decisão 4: Regra de Parcerias Externas para o `PIPDI` (`NAPPCT`)

- **Decisão**: Um projeto do SIGPESQ pontua no PIPDI para o ano de referência se:
  1. Estiver **vigente no ano** (`ano_inicio <= ano <= ano_fim`).
  2. Possuir **financiador externo** ou **parceiro privado** identificado na lista de `fontes` (ex.: ArcelorMittal, Samarco, Mogai, Intelliway, Sanevix, Aratu, FAPES, CNPq, FINEP, CAPES, etc.).
  3. Exclui projetos marcados puramente como "Voluntariado" ou "Sem financiamento".
- **Justificativa**: Atende estritamente à definição CONIF de acordos e convênios técnico-científicos de PDeI firmados com entidades externas.

### Decisão 5: Atualização de Schemas e Contratos do Sink

- **Decisão**: Atualizar `pilar2-schema.json`, `CAMPOS_QUE_DEVEM_SER_NULOS` e os validadores em `zip_indicadores_sink.py` e `check_dados.py` para permitir que `percentual_calculado_PINV` seja um número decimal (float >= 0) ou inteiro quando derivado do arquivo do campus.
- **Justificativa**: Evita que o sink rejeite o pacote gerado por considerar `percentual_calculado_PINV` como campo estritamente nulo.
