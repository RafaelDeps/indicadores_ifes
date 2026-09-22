# Routes and Navigation Contract

**Feature**: `004-pillars-campi-zip-rework` | **Data**: 2026-09-22 | **Spec**: [spec.md](../spec.md)

## 1. Mapeamento de Rotas

Todas as rotas são geradas estaticamente pelo Astro e servem os 3 pilares CONIF e seus 9 indicadores:

| Rota                | Tipo           | Descrição                                                                   |
| ------------------- | -------------- | --------------------------------------------------------------------------- |
| `/`                 | Home           | Visão geral dos 3 pilares CONIF (Pilar 1, Pilar 2 e Pilar 3, todos ativos). |
| `/pilar-1/`         | Visão de Pilar | Lista dos 4 indicadores do Pilar 1 (NTPP, QSPP, PIES, PICOT).               |
| `/pilar-1/<sigla>/` | Detalhe        | Detalhe do indicador de Pilar 1 (`ntpp`, `qspp`, `pies`, `picot`).          |
| `/pilar-2/`         | Visão de Pilar | Lista dos 2 indicadores do Pilar 2 (PINV, PIPDI).                           |
| `/pilar-2/<sigla>/` | Detalhe        | Detalhe do indicador de Pilar 2 (`pinv`, `pipdi`).                          |
| `/pilar-3/`         | Visão de Pilar | Lista dos 3 indicadores do Pilar 3 (PIPRO, PIPROT, PIPROTR).                |
| `/pilar-3/<sigla>/` | Detalhe        | Detalhe do indicador de Pilar 3 (`pipro`, `piprot`, `piprotr`).             |

---

## 2. Contrato de Parâmetros de URL (`Query String`)

- **Formato**: `?campus=<slug>&ano=<ano>`
  - Exemplo: `?campus=serra&ano=2026`
  - Exemplo padrão institucional: `?campus=todos&ano=2026`
- **Regras de Resolução**:
  1. Se `campus` estiver ausente na URL: assume o padrão `"todos"` (se houver dados consolidados) ou o primeiro campus disponível.
  2. Se `ano` estiver ausente na URL: assume o ano mais recente disponível no dataset.
  3. Se `campus` ou `ano` forem inválidos (ex.: `?campus=inexistente&ano=1800`): fallback gracioso para os valores padrão sem erro de runtime.
- **Sincronização Bidirecional**:
  - A alteração do seletor em tela atualiza a URL via `history.pushState`.
  - O acionamento de voltar/avançar no navegador (`popstate`) restaura a visão e os seletores correspondentes.
- **Propagação nos Links Internos**:
  - Todos os links internos (cartões de pilar, cartões de indicador, links de breadcrumb e logotipo) anexam os parâmetros ativos (`?campus=<c>&ano=<a>`) para preservar a continuidade de navegação do usuário.

---

## 3. Elementos Removidos da Interface

1. **Botões de Exportação**: Links e botões para download de arquivos CSV e JSON são terminantemente excluídos.
2. **Campo "Fonte dos dados"**: O rótulo e o texto de fonte de dados são excluídos dos cartões e páginas.
3. **Widget de Acessibilidade**: O script do UserWay não é injetado.
