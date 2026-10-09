# Interface & Component Contract: SeriesChart & Toggle

## 1. Contrato da Biblioteca `src/lib/chart.ts`

### Novas Funções e Assinaturas

```typescript
export interface BarraGrafico {
  ano: number;
  valor: number | null;
  x: number;
  y: number;
  largura: number;
  altura: number;
  rx: number;
  centroX: number;
  rotuloY: number;
  textoRotulo: string;
  disponivel: boolean;
}

/**
 * Mapeia uma lista de valores anuais para parâmetros geométricos de barras verticais SVG.
 *
 * @param valores Lista de valores anuais apurados.
 * @param largura Largura total do viewBox SVG.
 * @param altura Altura total do viewBox SVG.
 * @param margem Margem interna de segurança.
 * @returns Array de barras calculadas para o SVG.
 */
export function mapearBarras(
  valores: ValorParaGrafico[],
  largura: number,
  altura: number,
  margem?: number,
): BarraGrafico[];
```

---

## 2. Contrato do Componente `src/components/SeriesChart.astro`

### Propriedades (`Props`)

```typescript
interface Props {
  valores: ValorAnual[];
  anoSelecionado?: number;
}
```

### Estrutura Semântica do DOM Emitido

```html
<div class="grafico-wrapper" data-grafico-container>
  <!-- Barra de Ferramentas / Alternância -->
  <div class="controles-grafico" role="group" aria-label="Tipo de visualização do gráfico">
    <button type="button" class="btn-alternancia ativo" data-btn-modo="linha" aria-pressed="true">
      <svg aria-hidden="true" ...></svg>
      <span>Linha</span>
    </button>
    <button type="button" class="btn-alternancia" data-btn-modo="barras" aria-pressed="false">
      <svg aria-hidden="true" ...></svg>
      <span>Barras</span>
    </button>
  </div>

  <!-- SVG Principal -->
  <svg
    class="grafico"
    data-grafico-svg
    viewBox="0 0 560 240"
    role="img"
    aria-label="Série histórica do indicador"
  >
    <!-- Eixo Horizontal Compartilhado -->
    <line class="eixo" ... />

    <!-- Camada 1: Visualização em Linha -->
    <g class="camada-linha" data-camada-linha>
      <path class="linha" ... />
      <g class="pontos-grupo">...</g>
    </g>

    <!-- Camada 2: Visualização em Barras -->
    <g class="camada-barras" data-camada-barras style="display: none;">
      <!-- Para cada ano: -->
      <g class="grupo-barra" data-barra-ano="2024" tabindex="0">
        <rect class="barra [barra-ativa] [barra-indisponivel]" ... />
        <text class="rotulo-dado" ...>...</text>
        <text class="rotulo-ano" ...>2024</text>
      </g>
    </g>
  </svg>
</div>
```

---

## 3. Contrato de Interação do Cliente

1. **Seleção de Modo**:
   - Ao clicar ou pressionar tecla em `[data-btn-modo="barras"]`:
     - `[data-btn-modo="barras"]` recebe `aria-pressed="true"` e classe `.ativo`.
     - `[data-btn-modo="linha"]` recebe `aria-pressed="false"` e remove classe `.ativo`.
     - `[data-camada-linha]` é ocultado (`style.display = 'none'`).
     - `[data-camada-barras]` é exibido (`style.display = ''`).
     - `sessionStorage.setItem('ifes_grafico_modo', 'barras')` é executado.
2. **Destaque do Ano Ativo**:
   - O elemento correspondente ao ano selecionado (`ano === anoSelecionado`) recebe a classe `.barra-ativa` com preenchimento em verde escuro institucional (`--color-primary-dark` ou `--color-primary`) e sombra suave.
