# UI & Routing Contract: Nova Página dos Pilares CONIF

**Feature**: `specs/019-conif-pillars-page`  
**Data**: 2026-10-09  
**Status**: Concluído

---

## 1. Contrato de Rotas e URLs

| Rota Canônica   | Arquivo Fonte                       | Finalidade                                                      |
| :-------------- | :---------------------------------- | :-------------------------------------------------------------- |
| `/sobre-conif/` | `src/pages/sobre-conif/index.astro` | Exibição da página explicativa completa do modelo CONIF         |
| `/`             | `src/pages/index.astro`             | Página inicial contendo o card convidativo para `/sobre-conif/` |

### 1.1 Parâmetros de Consulta (Query Params)

- A rota aceita e preserva os parâmetros globais do cabeçalho:
  - `?campus=serra` (ou qualquer outro campus suportado).
  - `?ano=YYYY` (ex.: `?ano=2024`, `?ano=2025`).
- Links para páginas de detalhe gerados dentro da página `/sobre-conif/` devem propagar o contexto de campus e ano ativo para garantir coerência de navegação.

---

## 2. Contrato de Acessibilidade e Semântica HTML

### 2.1 Marcos Semânticos (Landmarks)

```html
<header class="topo cabecalho-fixo" role="banner">...</header>
<main id="conteudo-principal">
  <!-- Trilha de navegação -->
  <nav class="trilha" aria-label="Trilha de navegação">
    <a href="/">Início</a>
    <span aria-hidden="true">/</span>
    <span aria-current="page">Sobre o Modelo CONIF</span>
  </nav>

  <!-- Seções temáticas com cabeçalhos acessíveis -->
  <section aria-labelledby="titulo-origem-conif">...</section>
  <section aria-labelledby="titulo-pilares">...</section>
  <section aria-labelledby="titulo-importancia-serra">...</section>
</main>
```

### 2.2 Itens de Menu Ativos

- No cabeçalho (`BaseLayout.astro`):
  - Link com texto `"Sobre o Modelo"`.
  - Quando a URL estiver em `/sobre-conif/`:
    - Adiciona classe CSS `ativa`.
    - Adiciona atributo `aria-current="page"`.
- Na gaveta móvel (`#mobile-drawer`):
  - O mesmo link deve estar presente e com estado ativo correspondente.

---

## 3. Contrato de Links de Indicadores

A página deve disponibilizar atalhos funcionais para cada um dos seguintes 9 indicadores oficiais:

1. **Pilar 1**:
   - `/pilar-1/ntpp/`
   - `/pilar-1/qspp/`
   - `/pilar-1/pies/`
   - `/pilar-1/picot/`
2. **Pilar 2**:
   - `/pilar-2/pinv/`
   - `/pilar-2/pipdi/`
3. **Pilar 3**:
   - `/pilar-3/pipro/`
   - `/pilar-3/piprot/`
   - `/pilar-3/piprotr/`
