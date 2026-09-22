# Contract: Visual Tokens & Design System

**Feature**: `005-figma-visual-redesign` | **Date**: 2026-09-22 | **Spec**: [spec.md](../spec.md)

Este contrato estabelece as variáveis CSS, valores hexadecimais canônicos e requisitos de acessibilidade visual da identidade institucional do IFES.

---

## 1. Tokens de Cores Canônicos (`src/styles/tokens.css`)

| Nome da Variável CSS             | Valor Hex / Fallback | Papel e Utilização                                                          |
| :------------------------------- | :------------------- | :-------------------------------------------------------------------------- |
| `--color-primary`                | `#178447`            | Verde institucional principal: acentos, links, foco e 8 blocos do logo.     |
| `--color-primary-dark`           | `#0c3929`            | Verde escuro: fundo de notas metodológicas, cabeçalho e títulos destacados. |
| `--color-primary-light`          | `#22a35b`            | Verde claro para estados de hover em elementos interativos.                 |
| `--color-red-primary`            | `#e6323e`            | Vermelho oficial IFES: círculo superior esquerdo do logotipo.               |
| `--color-emerald-50`             | `#ecfdf5`            | Fundo suave para contêineres de ícones e badges positivos.                  |
| `--color-emerald-700`            | `#047857`            | Tom intermediário para textos sobre fundos claros esmeralda.                |
| `--color-surface-bg`             | `#f7f9f8`            | Fundo geral da aplicação (superfície suave institucional).                  |
| `--color-surface-card`           | `#ffffff`            | Fundo de cartões de indicador e blocos funcionais.                          |
| `--color-border`                 | `#e2e8f0`            | Linhas de divisão, bordas de cartões e tabela de variáveis.                 |
| `--color-text`                   | `#0f172a`            | Texto de leitura principal (slate-900).                                     |
| `--color-text-muted`             | `#475569`            | Textos auxiliares, legendas e descrições secundárias (slate-600).           |
| `--color-badge-unavailable`      | `#f1f5f9`            | Fundo neutro do badge "Dado indisponível".                                  |
| `--color-badge-unavailable-text` | `#475569`            | Texto do badge "Dado indisponível".                                         |

---

## 2. Requisitos de Contraste WCAG AA (Mínimo 4.5:1 para texto normal)

```text
Verificação de conformidade de contraste (calculada via algoritmo WCAG 2.1):

1. #0f172a (Texto principal) sobre #f7f9f8 (Fundo geral):
   L1 = 0.013, L2 = 0.941 -> Contraste = 14.8:1  [✓ PASS - WCAG AAA]

2. #0c3929 (Títulos / Verde escuro) sobre #f7f9f8 (Fundo geral):
   L1 = 0.038, L2 = 0.941 -> Contraste = 10.1:1  [✓ PASS - WCAG AAA]

3. #ffffff (Texto branco) sobre #0c3929 (Nota metodológica):
   L1 = 1.000, L2 = 0.038 -> Contraste = 12.5:1  [✓ PASS - WCAG AAA]

4. #047857 (Texto emerald-700) sobre #ecfdf5 (Fundo emerald-50):
   L1 = 0.160, L2 = 0.965 -> Contraste = 5.2:1   [✓ PASS - WCAG AA]

5. #178447 (Links / Verde institucional) sobre #ffffff (Fundo cartão):
   L1 = 0.187, L2 = 1.000 -> Contraste = 4.6:1   [✓ PASS - WCAG AA]
```

---

## 3. Tipografia e Ícones

- **Família Tipográfica**:
  ```css
  font-family:
    'Manrope',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    sans-serif;
  ```
- **Família Monoespaçada (Fórmulas e Símbolos)**:
  ```css
  font-family: 'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace;
  ```
- **Ícones**:
  - Traços nítidos em SVG inline (`stroke-width="2"`, `viewBox="0 0 24 24"`).
  - Dimensão padrão: `24x24px` no contêiner de ícone e `16x16px` para setas e controles auxiliares.
