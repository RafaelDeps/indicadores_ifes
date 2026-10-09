# UI & Interactivity Contract: Componente de Fórmula Tipográfica

**Feature**: `specs/020-formula-typography`  
**Data**: 2026-10-09  
**Status**: Concluído

---

## 1. Contrato de Estrutura HTML do Componente (`FormulaEquacao.astro`)

```html
<div class="bloco-equacao" role="region" aria-label="Fórmula de cálculo para [SIGLA]">
  <!-- Transcrição para Leitor de Tela -->
  <span class="sr-only">[TEXTO_ACESSIVEL]</span>

  <!-- Renderização Visual Tipográfica -->
  <div class="equacao-visual" aria-hidden="true">
    <span class="membro-esquerdo">[SIGLA]</span>
    <span class="operador-igual">=</span>

    <!-- CASO 1: FRAÇÃO -->
    <div class="termo-fracao">
      <div class="numerador">
        <span class="token-variavel" data-variavel-simbolo="NEP" tabindex="0">NEP</span>
      </div>
      <div class="traco-fracao" aria-hidden="true"></div>
      <div class="denominador">
        <span class="token-variavel" data-variavel-simbolo="NTE" tabindex="0">NTE</span>
      </div>
    </div>
    <span class="operador-mult">×</span>
    <span class="constante">100</span>

    <!-- CASO 2: SOMA -->
    <div class="termo-soma">
      <span class="token-variavel" data-variavel-simbolo="NPB" tabindex="0">NPB</span>
      <span class="operador-mais">+</span>
      <span class="token-variavel" data-variavel-simbolo="NPT" tabindex="0">NPT</span>
    </div>

    <!-- CASO 3: DIRETA -->
    <span class="termo-direto">Projetos registrados em execução</span>
  </div>
</div>
```

---

## 2. Contrato de Correlação Interativa com a Tabela

### 2.1 Atributos de Dados Obrigatórios

1. **No componente de fórmula:**
   - Todo símbolo de variável na fórmula deve possuir `data-variavel-simbolo="SIMBOLO"`.
   - Deve ser focável via teclado (`tabindex="0"`).
2. **Na tabela de variáveis (`IndicadorDetalhe.astro`):**
   - A linha `<tr>` correspondente à variável deve possuir `data-linha-variavel="SIMBOLO"`.

### 2.2 Classes de Estado CSS

- `.destaque-ativo`:
  - Aplicada ao token na fórmula: borda destacada em `var(--color-primary)` e fundo sutil `var(--color-emerald-50)`.
  - Aplicada à linha da tabela `<tr>`: fundo em `var(--color-emerald-50)` e texto em negrito.
- Transição suave de opacidade e cor (150ms).
