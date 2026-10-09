# Quickstart: Validação da Matriz Geral Consolidada e Tags

## Objetivo

Guia rápido de execução e validação da funcionalidade de Matriz Geral Consolidada com Filtros por Tags no IFES Campus Serra.

---

## 1. Pré-requisitos

- Node.js instalado e dependências sincronizadas (`npm install`).
- Branch ativa: `feat/new_pages`.

---

## 2. Validação Rápida via Testes Automatizados

Executar os testes unitários e de componente:

```bash
npm run test:web
```

Cenários validados pela suíte:

1. `tests/web/matriz-dados.test.ts`:
   - Geração correta dos 9 indicadores com tags associadas;
   - Cálculo e formatação dos valores do Campus Serra;
   - Validação da preservação de "Dado indisponível" sem zeros interpolados.
2. `tests/web/matriz-filtros.test.ts`:
   - Filtragem correta por tags temáticas;
   - Busca textual com normalização insensível a acentuação e maiúsculas;
   - Interseção cumulativa de tag + termo de busca.
3. `tests/web/matriz-componente.test.ts`:
   - Presença da rota `/matriz/`;
   - Presença dos atributos `aria-sort`, `role="group"` e `aria-pressed`;
   - Links no menu do cabeçalho e gaveta móvel com `aria-current="page"`.

---

## 3. Validação Manual no Navegador

Iniciar o servidor de desenvolvimento:

```bash
npm run dev
```

1. **Acessar `/matriz/`**:
   - Verificar se o título institucional "Matriz Consolidada de Indicadores" é exibido.
   - Conferir se todas as 9 linhas dos indicadores do Campus Serra aparecem na tabela.
2. **Testar Filtro por Tags**:
   - Clicar no chip "Pesquisa": apenas NTPP, QSPP e PIPRO devem ficar visíveis.
   - Clicar no chip "Inovação": apenas PIPDI, PIPROT e PIPROTR devem ficar visíveis.
   - Clicar em "Todas": os 9 indicadores voltam a ser exibidos.
3. **Testar Campo de Busca**:
   - Digitar "docen": os indicadores de docência aparecem instantaneamente.
   - Digitar "inexistente": o estado vazio amigável surge com botão para resetar.
4. **Testar Ordenação**:
   - Clicar no cabeçalho "Sigla": as linhas são ordenadas alfabeticamente.
5. **Testar Navegação e A11y**:
   - Navegar via `Tab` / `Shift+Tab` por todos os chips e cabeçalhos.
   - Alternar entre modo claro e modo escuro: o contraste permanece nítido.
   - Reduzir a largura da janela para mobile (< 768px): a tabela ganha barra de rolagem horizontal suave sem quebrar a tela.

---

## 4. Validação de Build Estático

```bash
npm run build
```

O build deve gerar a página `/matriz/index.html` estática com sucesso.
