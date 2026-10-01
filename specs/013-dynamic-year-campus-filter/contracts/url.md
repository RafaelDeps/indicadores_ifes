# Contrato: Parâmetros de URL e Histórico de Navegação

**Feature**: `013-dynamic-year-campus-filter` | **Date**: 2026-09-30
**Spec**: [spec.md](../spec.md)

Este documento define o comportamento, ciclo de vida e formato dos parâmetros de busca (`searchParams`) e da History API.

---

## 1. Parâmetros Suportados

| Parâmetro | Tipo          | Exemplo         | Descrição                                                                           |
| --------- | ------------- | --------------- | ----------------------------------------------------------------------------------- |
| `campus`  | String (slug) | `?campus=serra` | Campus selecionado. Se `'todos'`, pode ser omitido ou mantido conforme preferência. |
| `ano`     | Inteiro       | `?ano=2024`     | Ano de referência dos indicadores.                                                  |

---

## 2. Regras de Leitura e Resolução

1. **Parâmetros Ausentes:**
   - Se `campus` não estiver presente na URL: adota `'todos'`.
   - Se `ano` não estiver presente na URL: adota o ano mais recente disponível para o campus selecionado.

2. **Parâmetros Inválidos:**
   - Se `campus` for desconhecido (ex.: `?campus=invalido`): cai para `'todos'`.
   - Se `ano` não for número ou for inválido (ex.: `?ano=abc` ou fora do range): adota o ano mais recente disponível.

3. **Auto-Ajuste por Campus (FR-013):**
   - Se o usuário troca para um campus que não contém dados para o ano atual, o ano é ajustado para o mais recente desse campus e a URL é atualizada via `history.replaceState` para refletir o ajuste sem poluir o histórico.

---

## 3. Gestão de Histórico (History API)

1. **Ao alterar um seletor na página:**
   - Deve ser invocado `history.pushState(null, '', novaUrl)`.
   - Não recarregar a página (`window.location.href = ...` NÃO DEVE ser chamado).
   - Todos os componentes da tela atualizam seus dados imediatamente.

2. **Ao navegar no histórico (botões Voltar/Avançar):**
   - O evento `window.addEventListener('popstate', ...)` deve ser capturado.
   - Lê os novos parâmetros da URL e atualiza tanto os seletores quanto os dados da tela para o contexto restaurado.

3. **Propagação em Links Internos:**
   - Todos os links internos relativos (`<a href="/pilar-1/">`) devem ter seus atributos `href` sincronizados com `?campus=...&ano=...` para que o usuário não perca o contexto ao trocar de aba ou entrar em um indicador.
