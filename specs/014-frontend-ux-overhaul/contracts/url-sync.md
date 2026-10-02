# Contrato de Sincronização de URL e Navegação

**Feature**: `014-frontend-ux-overhaul`
**Date**: 2026-10-01

Este contrato especifica as regras de preservação de estado, parâmetros de consulta na URL e interoperabilidade com a API de Histórico do navegador (`window.history`).

---

## 1. Parâmetros de Consulta Canônicos

| Parâmetro | Valores Válidos                                                | Padrão / Omissão                   | Comportamento                                                                                                          |
| --------- | -------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `campus`  | Slug de campus cadastrado (ex: `serra`, `vitoria`, `colatina`) | `'todos'`                          | Se igual a `'todos'`, o parâmetro pode ser omitido da URL. Se inválido, ajusta para o valor mais próximo ou `'todos'`. |
| `ano`     | Ano numérico (ex: `2021`, `2022`, ..., `2026`)                 | Mais recente apurado para o campus | Se não apurado para o campus específico, auto-ajusta para o ano válido mais próximo.                                   |

Exemplo de URL canônica:
`/pilar-1/ntpp/?campus=serra&ano=2024`

---

## 2. Regras de Transição de Histórico

1. **Seleção Manual pelo Usuário** (interação via dropdown ou clique na busca):
   - Deve disparar `window.history.pushState(null, '', novaUrl)`.
   - Adiciona um novo estado no histórico do navegador, permitindo ao usuário voltar ao estado anterior pelo botão "Voltar".

2. **Auto-ajuste de Validação** (quando a URL contém ano ou campus inexistente):
   - Deve disparar `window.history.replaceState(null, '', novaUrlNormalizada)`.
   - Substitui a URL no histórico sem poluir a pilha de navegação.

3. **Navegação no Histórico** (`popstate`):
   - Ao disparar o evento `popstate`, o cliente relê `window.location.search`, sincroniza os seletores e re-renderiza o DOM sem disparar novo `pushState`.

4. **Reescrita de Links Internos**:
   - Todo link `<a>` interno do domínio `/pilar-[1-3]/...` mantém preservados os parâmetros de contexto ativos (`?campus=X&ano=Y`) para que a navegação do usuário permaneça contextualizada.
