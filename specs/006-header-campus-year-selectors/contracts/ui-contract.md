# UI Contract: Seletores de Campus e Ano no Cabeçalho

**Feature**: `006-header-campus-year-selectors`  
**Date**: 2026-09-23  
**Status**: Concluído

Este documento estabelece o contrato de interface de usuário (marcação HTML, classes CSS, atributos de acessibilidade ARIA e eventos de sincronização) para os seletores no cabeçalho.

---

## 1. Contrato de Componente: `HeaderFilters.astro` (ou Integração em `BaseLayout.astro`)

### Propriedades Recebidas (Props)

```typescript
export interface Props {
  /** Lista de opções de campus a exibir */
  campi: Array<{ slug: string; nome: string }>;
  /** Lista de anos a exibir (decrescente) */
  anos: number[];
  /** Campus atualmente selecionado */
  campusSelecionado?: string;
  /** Ano atualmente selecionado */
  anoSelecionado?: number;
  /** Modo de exibição: 'desktop' ou 'mobile' */
  modo?: 'desktop' | 'mobile';
}
```

---

## 2. Estrutura de Marcação HTML & Acessibilidade

### Desktop (`.cabecalho-filtros`)

Renderizado dentro de `.topo-container` em telas médias/grandes (`min-width: 768px`).

```html
<div class="cabecalho-filtros" role="group" aria-label="Filtros de indicadores">
  <!-- Seletor de Campus -->
  <div class="campo-filtro">
    <label for="filtro-campus-topo" class="sr-only">Campus do IFES</label>
    <select
      id="filtro-campus-topo"
      name="campus"
      class="seletor-cabecalho"
      aria-label="Selecionar campus do IFES"
    >
      <option value="todos" selected>(Todos)</option>
      <option value="serra">Serra</option>
      <!-- Demais opções em ordem alfabética -->
    </select>
  </div>

  <!-- Seletor de Ano -->
  <div class="campo-filtro">
    <label for="filtro-ano-topo" class="sr-only">Ano de referência</label>
    <select
      id="filtro-ano-topo"
      name="ano"
      class="seletor-cabecalho"
      aria-label="Selecionar ano de referência"
    >
      <option value="2026" selected>2026</option>
      <!-- Demais anos em ordem decrescente -->
    </select>
  </div>
</div>
```

---

### Mobile Drawer (`.drawer-filtros`)

Renderizado dentro de `.drawer-conteudo` no `#mobile-drawer`, posicionado logo antes de `.drawer-nav`.

```html
<div class="drawer-filtros" role="group" aria-label="Filtros de visualização móvel">
  <!-- Seletor Móvel de Campus -->
  <div class="drawer-campo">
    <label for="filtro-campus-drawer" class="drawer-label">Campus:</label>
    <select
      id="filtro-campus-drawer"
      name="campus"
      class="seletor-drawer"
      aria-label="Selecionar campus do IFES"
    >
      <option value="todos" selected>(Todos)</option>
      <option value="serra">Serra</option>
    </select>
  </div>

  <!-- Seletor Móvel de Ano -->
  <div class="drawer-campo">
    <label for="filtro-ano-drawer" class="drawer-label">Ano:</label>
    <select
      id="filtro-ano-drawer"
      name="ano"
      class="seletor-drawer"
      aria-label="Selecionar ano de referência"
    >
      <option value="2026" selected>2026</option>
    </select>
  </div>
</div>
```

---

## 3. Contrato de Estilos CSS

| Seletor CSS          | Regras Chave                                                                                                                                                                            | Propósito                                            |
| :------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| `.cabecalho-filtros` | `display: none;` (mobile), `@media (min-width: 768px) { display: flex; gap: 0.5rem; }`                                                                                                  | Ocultar em telas móveis e exibir flexível em desktop |
| `.seletor-cabecalho` | `padding: 0.35rem 0.65rem; border: 1px solid var(--color-border); border-radius: 6px; font-size: 0.85rem; font-weight: 600; color: var(--color-ink); background: var(--color-surface);` | Aparência institucional e compacta                   |
| `.drawer-filtros`    | `display: flex; flex-direction: column; gap: 0.75rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-border);`                                                              | Espaçamento confortável dentro da gaveta móvel       |
| `.drawer-label`      | `font-size: 0.85rem; font-weight: 700; color: var(--color-muted);`                                                                                                                      | Identificação clara para o usuário em mobile         |
| `.seletor-drawer`    | `width: 100%; min-height: 44px; padding: 0.5rem; border-radius: 6px; font-size: 0.95rem;`                                                                                               | Conformidade com área mínima de toque (Touch Target) |
| `:focus-visible`     | `outline: 2px solid var(--color-primary); outline-offset: 2px;`                                                                                                                         | Foco acessível WCAG 2.1 AA                           |

---

## 4. Contrato de Comportamento e Script do Cliente

1. **Sincronização Bidirecional**:
   - Alterar o seletor desktop atualiza o seletor móvel equivalente, e vice-versa.
2. **Atualização de Parâmetros e Navegação**:
   - Ao disparar o evento `change`:
     ```javascript
     const url = new URL(window.location.href);
     if (novoCampus && novoCampus !== 'todos') {
       url.searchParams.set('campus', novoCampus);
     } else {
       url.searchParams.delete('campus');
     }
     url.searchParams.set('ano', String(novoAno));
     window.location.href = url.toString();
     ```
3. **Propagação de Contexto**:
   - A rotina `propagarContexto()` existente em `BaseLayout.astro` continua interceptando todos os links da página para anexar os parâmetros atuais `?campus=...&ano=...`.
