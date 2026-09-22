# Contract: UI Components & Layout Structure

**Feature**: `005-figma-visual-redesign` | **Date**: 2026-09-22 | **Spec**: [spec.md](../spec.md)

Este contrato especifica as interfaces de propriedades (props), seletores CSS canônicos, atributos ARIA e marcações esperadas dos componentes visuais atualizados.

---

## 1. Contrato do Logotipo Oficial (`HeaderMarca.astro`)

```astro
<!-- Estrutura SVG obrigatória do logotipo oficial em grade de 9 blocos -->
<a href="/" class="marca-link" aria-label="Instituto Federal do Espírito Santo - Página inicial">
  <svg
    class="ifes-grid-logo"
    viewBox="0 0 48 48"
    role="img"
    aria-hidden="true"
    width="40"
    height="40"
  >
    <!-- Círculo vermelho superior esquerdo -->
    <circle cx="8" cy="8" r="6" fill="#e6323e"></circle>

    <!-- 8 quadrados verdes restantes em matriz 3x3 -->
    <rect x="18" y="2" width="12" height="12" rx="2" fill="#178447"></rect>
    <rect x="34" y="2" width="12" height="12" rx="2" fill="#178447"></rect>
    <rect x="2" y="18" width="12" height="12" rx="2" fill="#178447"></rect>
    <rect x="18" y="18" width="12" height="12" rx="2" fill="#178447"></rect>
    <rect x="34" y="18" width="12" height="12" rx="2" fill="#178447"></rect>
    <rect x="2" y="34" width="12" height="12" rx="2" fill="#178447"></rect>
    <rect x="18" y="34" width="12" height="12" rx="2" fill="#178447"></rect>
    <rect x="34" y="34" width="12" height="12" rx="2" fill="#178447"></rect>
  </svg>
  <div class="marca-texto">
    <span class="marca-instituto">INSTITUTO FEDERAL</span>
    <span class="marca-campus">Espírito Santo</span>
  </div>
</a>
```

---

## 2. Contrato do Cabeçalho Fixo & Drawer (`BaseLayout.astro`)

```astro
<header class="cabecalho-fixo" role="banner">
  <div class="cabecalho-container">
    <HeaderMarca />

    <!-- Navegação Desktop -->
    <nav class="nav-pilares" aria-label="Navegação por pilares CONIF">
      <a href="/" class="nav-aba" data-aba="home">Visão geral</a>
      <a href="/pilar-1/" class="nav-aba" data-aba="pilar-1">Pilar 1</a>
      <a href="/pilar-2/" class="nav-aba" data-aba="pilar-2">Pilar 2</a>
      <a href="/pilar-3/" class="nav-aba" data-aba="pilar-3">Pilar 3</a>
    </nav>

    <!-- Seletores de contexto -->
    <div class="cabecalho-filtros">
      <FilterSelectCampus />
      <FilterSelectAno />
    </div>

    <!-- Botão de acionamento móvel -->
    <button
      class="btn-menu-drawer"
      aria-label="Abrir menu de navegação"
      aria-expanded="false"
      aria-controls="mobile-drawer"
    >
      <svg class="icone-menu" ...></svg>
    </button>
  </div>

  <!-- Gaveta Móvel (Slide-Over Drawer) -->
  <div id="mobile-drawer" class="mobile-drawer" aria-hidden="true" role="dialog" aria-modal="true">
    <div class="drawer-backdrop"></div>
    <div class="drawer-conteudo">
      <button class="btn-fechar-drawer" aria-label="Fechar menu">✕</button>
      <!-- Links dos pilares e seletores duplicados com acessibilidade -->
    </div>
  </div>
</header>
```

---

## 3. Contrato do `IndicatorCard.astro`

```typescript
export interface Props {
  indicador: Indicador;
  anoSelecionado?: number;
  campusSelecionado?: string;
  pilarSlug?: string;
}
```

### Marcação HTML Obrigatória do Cartão:

- Contêiner: `.cartao-indicador`
- Cabeçalho do cartão: `.cartao-cabecalho` contendo `.icone-container` (com SVG inline) e títulos `.sigla` e `.nome`.
- Destaque numérico: `.cartao-valor` contendo `.valor-numero` e `.unidade` (ou `.badge-indisponivel` exibindo `"Dado indisponível"`).
- Variação: `.cartao-delta` exibindo `▲ +X.X%`, `▼ -X.X%`, `+X` ou badge `.delta-sem-base` com `"Sem base anterior"`.
- Rodapé: `.cartao-rodape` contendo o link `<a class="link-detalhes" href="...">Ver detalhes →</a>`.

---

## 4. Contrato da Página de Detalhe (2 Colunas)

```astro
<div class="detalhe-banner">
  <div class="banner-conteudo">
    <!-- Breadcrumb -->
    <nav class="breadcrumb">...</nav>
    <h1>{indicador.nome} ({indicador.sigla})</h1>
  </div>
  <div class="banner-destaque-caixa">
    <span class="destaque-rotulo">Resultado apurado ({anoEfetivo})</span>
    <span class="destaque-valor">{formatValor(valorPrincipal)}</span>
  </div>
</div>

<div class="detalhe-grade-2col">
  <!-- Coluna Principal (Esquerda) -->
  <main class="coluna-principal">
    <section class="bloco-texto">
      <h2>O que mede</h2>
      <p>{indicador.oQueMede}</p>
    </section>

    <section class="bloco-texto">
      <h2>Finalidade</h2>
      <p>{indicador.finalidade}</p>
    </section>

    <section class="bloco-formula">
      <h2>Fórmula de cálculo</h2>
      <div class="formula-mono"><code>{indicador.formula}</code></div>
    </section>

    <section class="bloco-variaveis">
      <h2>Variáveis da fórmula</h2>
      <table class="tabela-variaveis">
        <thead>
          <tr>
            <th scope="col">Símbolo</th>
            <th scope="col">Descrição</th>
            <th scope="col">Unidade</th>
          </tr>
        </thead>
        <tbody>
          <!-- Linhas das variáveis -->
        </tbody>
      </table>
    </section>
  </main>

  <!-- Coluna Lateral (Direita) -->
  <aside class="coluna-lateral">
    <section class="card-aside">
      <h2>Evolução recente</h2>
      <SeriesChart valores={serie} />
    </section>

    {
      temComponentes && (
        <section class="card-aside">
          <h2>Detalhamento por componente</h2>
          <ComponentCount componentes={componentes} ano={anoEfetivo} />
        </section>
      )
    }

    <section class="card-aside card-metodologia-escuro">
      <h2>Ficha metodológica</h2>
      <p>Métrica apurada conforme diretrizes do modelo de governança CONIF...</p>
    </section>
  </aside>
</div>
```
