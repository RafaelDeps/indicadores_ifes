# Contract: FACTO CSV Ingestion Schema

**Source File**: `data/raw/pilar2/projetos.csv`
**Format**: Delimited text (CSV)
**Delimiter**: `;`
**Encoding**: `utf-8-sig` (tolerant of UTF-8 with BOM or plain UTF-8)

## Primary Fields (`projetos.csv`)

| Field Name                   | Type                | Description                    | Sample Value                              |
| :--------------------------- | :------------------ | :----------------------------- | :---------------------------------------- |
| `id`                         | `string`            | Unique project identifier      | `"12"`                                    |
| `Referência do projeto`      | `string`            | Project reference and title    | `"12 - Apoio e Fortalecimento..."`        |
| `Coordenador`                | `string`            | Project coordinator name       | `"DANIELLE PIONTKOVSKY"`                  |
| `Financiadora`               | `string`            | Funding agency or partner name | `"CONIF"`                                 |
| `Data de início`             | `date (DD/MM/YYYY)` | Project start date             | `"30/12/2016"`                            |
| `Data de vigência`           | `date (DD/MM/YYYY)` | Project validity date          | `"31/12/2026"`                            |
| `Data de encerramento`       | `date (DD/MM/YYYY)` | Project closing date           | `"28/02/2026"`                            |
| `Tipo de Projeto`            | `string`            | Project categorization         | `"Pesquisa e Ensino"`                     |
| `Categoria de Projeto`       | `string`            | Funding origin type            | `"Recurso público - Federal"`             |
| `Instrumento Jurídico`       | `string`            | Legal agreement type           | `"Convênio"`                              |
| `Instituição executora`      | `string`            | Executing campus or institute  | `"Instituto Federal ... - Reitoria"`      |
| `Departamento`               | `string`            | Internal sector                | `"Coordenadoria de pesquisa"`             |
| `Valor aprovado`             | `currency string`   | Total approved grant in BRL    | `"1.256.355,65"`                          |
| `Objetivo / Objeto / Título` | `string`            | Detailed project scope         | `"Gestão Administrativa e Financeira..."` |
| `_scraped_at`                | `ISO 8601 string`   | Extractor timestamp            | `"2026-10-05T14:23:18"`                   |
