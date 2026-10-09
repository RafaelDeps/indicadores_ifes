# Interface & Component Contract: Exportação e Impressão

## 1. Contrato da Biblioteca `src/lib/exportar-csv.ts`

```typescript
export interface DadosExportacaoCsv {
  campus: string;
  indicadorNome: string;
  sigla: string;
  unidade: string;
  serie: {
    ano: number;
    valor: number | null;
    motivoIndisponivel?: string;
  }[];
}

/**
 * Gera o conteúdo em string de uma planilha CSV no padrão brasileiro (UTF-8 com BOM e separador ;)
 */
export function gerarCsvSerieHistorica(dados: DadosExportacaoCsv): string;

/**
 * Dispara o download de um arquivo de texto no navegador do cliente.
 */
export function dispararDownloadArquivo(
  conteudo: string,
  nomeArquivo: string,
  mimeType?: string,
): void;
```

---

## 2. Contrato da Biblioteca `src/lib/exportar-grafico.ts`

```typescript
export interface OpcoesExportacaoImagem {
  elementoSvg: SVGSVGElement;
  tituloIndicador: string;
  siglaIndicador: string;
  campus?: string;
  largura?: number;
  altura?: number;
}

/**
 * Converte o elemento SVG do gráfico em uma imagem PNG com cabeçalho institucional e dispara o download.
 */
export function exportarGraficoParaPng(opcoes: OpcoesExportacaoImagem): Promise<void>;
```

---

## 3. Contrato de DOM e Componentes

### Botão "Exportar CSV" em `HistoricalSeries.astro`

```html
<button
  type="button"
  class="btn-exportar-csv"
  data-btn-exportar-csv
  aria-label="Exportar série histórica em planilha CSV"
>
  <svg aria-hidden="true" ...></svg>
  <span>Exportar CSV</span>
</button>
```

### Botão "Baixar Imagem (PNG)" em `SeriesChart.astro`

```html
<button
  type="button"
  class="btn-exportar-png"
  data-btn-exportar-png
  aria-label="Baixar gráfico da série histórica em imagem PNG"
>
  <svg aria-hidden="true" ...></svg>
  <span>Baixar PNG</span>
</button>
```

### Botão "Imprimir Ficha" em `IndicadorDetalhe.astro`

```html
<button
  type="button"
  class="btn-imprimir-ficha"
  data-btn-imprimir
  aria-label="Imprimir ficha completa do indicador"
>
  <svg aria-hidden="true" ...></svg>
  <span>Imprimir</span>
</button>
```

### Cabeçalho de Impressão (`@media print`)

```html
<header class="cabecalho-impressao" aria-hidden="true">
  <h1>IFES • Campus Serra</h1>
  <p>Ficha de Indicador Institucional CONIF</p>
</header>
```
