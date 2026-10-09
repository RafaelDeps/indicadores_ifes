# Data Model: Alternância entre Gráfico de Linha e Barras no Histórico

## Entidades e Tipos de Dados

### 1. `ModoVisualizacaoGrafico`

Enumeração representando o tipo de visualização selecionado para a série histórica:

```typescript
export type ModoVisualizacaoGrafico = 'linha' | 'barras';
```

---

### 2. `BarraGrafico`

Estrutura calculada para posicionamento e renderização de cada coluna no SVG:

```typescript
export interface BarraGrafico {
  /** Ano de referência apurado */
  ano: number;
  /** Valor numérico apurado ou null se indisponível */
  valor: number | null;
  /** Posição horizontal X do início da barra no SVG */
  x: number;
  /** Posição vertical Y do topo da barra no SVG */
  y: number;
  /** Largura da barra em pixels virtuais SVG */
  largura: number;
  /** Altura da barra em pixels virtuais SVG */
  altura: number;
  /** Raio de arredondamento dos cantos superiores */
  rx: number;
  /** Posição central X para o rótulo de dados e rótulo do ano */
  centroX: number;
  /** Posição vertical Y para o rótulo numérico sobre a barra */
  rotuloY: number;
  /** Texto formatado do valor (ex.: "12", "45,5%", "Indisp.") */
  textoRotulo: string;
  /** Se o dado está efetivamente disponível */
  disponivel: boolean;
}
```

---

### 3. `EstadoControleGrafico`

Estado da interface gerenciado no cliente para controle de alternância:

```typescript
export interface EstadoControleGrafico {
  modoAtual: ModoVisualizacaoGrafico;
  anoSelecionado?: number;
}
```

---

## Regras de Validação e Cálculo

1. **Escala Vertical e Altura da Barra**:
   - O valor base do eixo horizontal é fixado em `yBase = altura - margem`.
   - Para anos com dados disponíveis:
     - Se `maximo === minimo`: barra tem altura de 50% da área útil.
     - Caso geral: `alturaBarra = ((valor - minimo) / (maximo - minimo)) * (altura - 2 * margem)`.
     - Para garantir visibilidade mínima quando `valor === minimo`, define-se uma altura mínima de 6px.
     - A coordenada do topo é `y = yBase - alturaBarra`.
   - Para anos com dados indisponíveis (`valor === null`):
     - A barra não tem preenchimento sólido; é desenhada com altura simbólica mínima (ex.: 4px), contorno tracejado e `disponivel: false`.

2. **Distribuição Horizontal (Eixo X)**:
   - Total de colunas = `valores.length`.
   - O espaço disponível no eixo X é `larguraUtil = largura - 2 * margem`.
   - Para cada slot de ano, a barra ocupa uma largura proporcional (ex.: 55% do slot), com espaçamento lateral simétrico (gap).
   - O centro da barra `centroX = x + largura / 2` serve como âncora para os textos de ano e de valor.

3. **Persistência de Sessão**:
   - Chave: `'ifes_grafico_modo'`.
   - Valores válidos: `'linha'` ou `'barras'`.
   - Caso o valor lido do storage seja inválido ou ausente, adota-se `'linha'`.
