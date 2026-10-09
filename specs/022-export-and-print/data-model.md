# Data Model: Ferramentas de Exportação e Impressão

## Entidades e Tipos de Dados

### 1. `DadosExportacaoCsv`

Parâmetros de entrada para geração do arquivo CSV da série histórica:

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
```

---

### 2. `LinhaRegistroCsv`

Estrutura de cada linha exportada no CSV:

```typescript
export interface LinhaRegistroCsv {
  campus: string;
  ano: number;
  indicador: string;
  sigla: string;
  valorFormatado: string;
  unidade: string;
  status: 'Apurado' | 'Dado indisponível';
}
```

---

### 3. `OpcoesExportacaoImagem`

Parâmetros para renderização do canvas e exportação de imagem PNG:

```typescript
export interface OpcoesExportacaoImagem {
  elementoSvg: SVGSVGElement;
  tituloIndicador: string;
  siglaIndicador: string;
  campus?: string;
  largura?: number;
  altura?: number;
  dataConsulta?: Date;
}
```

---

## Regras de Formatação e Negócio

1. **Codificação e Separador**:
   - O CSV inicia com `\uFEFF` (BOM UTF-8).
   - O delimitador de campo é `;`.
   - Quebras de linha utilizam `\r\n` (CRLF) para suporte universal ao Excel no Windows e Unix.
2. **Formatação de Valores**:
   - Números inteiros ou decimais são formatados com vírgula para decimais (ex.: `12,50` ou `35`).
   - Valores nulos (`valor === null`): campo valor fica vazio (`""`) e a coluna status recebe `"Dado indisponível"`.
3. **Dimensões da Imagem PNG**:
   - Largura base: 800px.
   - Altura base: 480px.
   - Fundo sólido: `#ffffff`.
   - Margens internas e espaçamento tipográfico institucional padronizados.
