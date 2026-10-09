# Research & Architecture Decisions: Renderização Tipográfica de Fórmulas Matemáticas

**Feature**: `specs/020-formula-typography`  
**Data**: 2026-10-09  
**Status**: Concluído

---

## 1. Decisão de Abordagem Técnica para Equações

### Decisão

Construir um componente Astro nativo (`src/components/FormulaEquacao.astro`) com estilização CSS pura (Flexbox) e parser determinístico em TypeScript (`src/lib/formula.ts`), sem adoção de bibliotecas externas pesadas (como MathJax ou KaTeX completo).

### Justificativa

- **Performance e Peso:** MathJax e KaTeX adicionam entre 100 KB e 300 KB de fontes matemáticas e scripts. Como as 9 fórmulas do modelo CONIF são previsíveis (frações de 1 nível com numerador/denominador e somatórios lineares), uma implementação pura em CSS Flexbox entrega um resultado tipográfico idêntico com **0 KB** de dependências externas.
- **Acessibilidade e Semântica:** Elementos HTML customizados com `aria-hidden="true"` para a renderização visual e um texto alternativo em linguagem natural (`.sr-only`) garantem uma experiência auditiva perfeita para leitores de tela ("PIES é igual a NEP dividido por NTE, multiplicado por 100"), algo que o MathJax exige configurações complexas de SRE (Speech Rule Engine) para atingir.
- **Alinhamento Constitucional:** Respeita estritamente o Princípio I (Simplicidade) da Constituição do projeto.

### Alternativas Consideradas

- **MathJax / KaTeX:** Rejeitado pelo impacto desnecessário no bundle e complexidade de integração com os temas claro/escuro.
- **MathML nativo (`<math>`, `<mfrac>`):** Rejeitado devido a inconsistências históricas de suporte e tipografia entre navegadores antigos, além de dificultar o destaque interativo por hover/foco de variáveis específicas.

---

## 2. Decisão de Decomposição das Fórmulas (`src/lib/formula.ts`)

### Decisão

Criar uma função pura `decomporFormula(formula: string, sigla: string)` que analisa a string oficial cadastrada e devolve um objeto estruturado:

1. **Fração:** detectada quando há `/` ou `(` ... `/` ... `)`.
   - Extrai: `membroEsquerdo` (ex.: `PIES`), `numerador` (ex.: `NEP`), `denominador` (ex.: `NTE`), `multiplicador` (ex.: `100`), `operadorMult` (ex.: `×`).
2. **Somatório / Expressão Linear:** detectada quando há `+`.
   - Extrai: `membroEsquerdo` e lista de tokens/termos intercalados por `+`.
3. **Atribuição Direta / Descritiva:**
   - Ex.: `NTPP = Projetos registrados em execução` ou `QSPP = SUPP`.

### Justificativa

- Isola a lógica de parsing em módulo testável via Vitest, mantendo o componente visual `.astro` focado exclusivamente em apresentação e acessibilidade.

---

## 3. Decisão de Interatividade e Correlação (Hover / Foco)

### Decisão

1. Cada variável na fórmula é renderizada com a classe `variavel-token` e o atributo `data-variavel-simbolo="SIMBOLO"`, sendo focável via teclado (`tabindex="0"`).
2. Na tabela de variáveis em `src/components/IndicadorDetalhe.astro`, cada linha `<tr>` recebe `data-linha-variavel="SIMBOLO"`.
3. Um script leve em cliente adiciona event listeners de `mouseenter`/`mouseleave` e `focus`/`blur` para alternar a classe `.destaque-ativo` na variável e na linha correspondente da tabela bidirecionalmente.

### Justificativa

- Proporciona o feedback cognitivo desejado pelo usuário sem causar repaints pesados e sem dependências de frameworks reativos.
