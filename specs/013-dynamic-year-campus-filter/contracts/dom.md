# Contrato: Atributos Semânticos DOM (`data-*`)

**Feature**: `013-dynamic-year-campus-filter` | **Date**: 2026-09-30
**Spec**: [spec.md](../spec.md)

Este documento define os seletores e atributos HTML semânticos utilizados pela camada cliente para identificar e atualizar elementos dinamicamente sem acoplamento a classes de estilo CSS.

---

## 1. Visão Geral (`src/pages/index.astro`)

### 1.1 Destaques KPI

Os elementos dos 4 blocos de KPI no topo da Visão Geral são mapeados por:

| Atributo           | Exemplo de Valor                       | Elemento | Finalidade                                                                |
| ------------------ | -------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `data-kpi-valor`   | `"NTPP"`, `"QSPP"`, `"NEP"`, `"PIPRO"` | `<span>` | Atualiza o texto com o valor formatado (ex.: "14" ou "Dado indisponível") |
| `data-kpi-unidade` | `"NTPP"`, `"QSPP"`, `"NEP"`, `"PIPRO"` | `<span>` | Oculta ou exibe a unidade conforme a disponibilidade do dado              |

### 1.2 Métricas nos Cartões de Pilar (`CartaoPilar.astro`)

Dentro de cada cartão de pilar, cada linha de métrica é mapeada por:

| Atributo               | Exemplo de Valor         | Elemento          | Finalidade                       |
| ---------------------- | ------------------------ | ----------------- | -------------------------------- |
| `data-metrica-item`    | `"NTPP"`, `"PINV"`, etc. | `<li>` ou `<div>` | Contêiner da métrica no cartão   |
| `data-metrica-valor`   | `"NTPP"`, `"PINV"`, etc. | `<span>`          | Valor numérico formatado         |
| `data-metrica-unidade` | `"NTPP"`, `"PINV"`, etc. | `<span>`          | Rótulo da unidade correspondente |

---

## 2. Cartões de Indicador nos Pilares (`IndicatorCard.astro`)

Utilizados nas páginas dos pilares (`pilar-1/index.astro`, `pilar-2/index.astro`, `pilar-3/index.astro`):

| Atributo                | Exemplo de Valor | Elemento | Finalidade                                                    |
| ----------------------- | ---------------- | -------- | ------------------------------------------------------------- |
| `data-card-link`        | `"NTPP"`         | `<a>`    | Atualiza o `href` do cartão preservando `?campus=...&ano=...` |
| `data-card-valor`       | `"NTPP"`         | `<span>` | Atualiza o valor formatado ou badge "Dado indisponível"       |
| `data-card-unidade`     | `"NTPP"`         | `<span>` | Unidade do indicador                                          |
| `data-card-delta`       | `"NTPP"`         | `<span>` | Texto da variação em relação ao ano anterior                  |
| `data-card-delta-badge` | `"NTPP"`         | `<div>`  | Classes e cores do badge (positivo / negativo / sem base)     |
| `data-card-aviso`       | `"NTPP"`         | `<div>`  | Alerta de ano em andamento (exibe apenas se ano for 2026)     |

---

## 3. Página de Detalhes do Indicador (`[sigla].astro`)

Na página específica de cada indicador (ex.: `/pilar-1/ntpp/`):

| Atributo                  | Exemplo de Valor        | Elemento                 | Finalidade                                          |
| ------------------------- | ----------------------- | ------------------------ | --------------------------------------------------- |
| `data-detalhe-sigla`      | `"NTPP"`                | Raiz da página ou banner | Identifica o indicador em exibição                  |
| `data-detalhe-ano-rotulo` | —                       | `<span>`                 | Rótulo "Resultado apurado (2025)"                   |
| `data-detalhe-valor`      | —                       | `<span>`                 | Valor principal apurado                             |
| `data-detalhe-unidade`    | —                       | `<span>`                 | Unidade de medida                                   |
| `data-componente-qtd`     | `"PRE"`, `"SUPP"`, etc. | `<span>`                 | Quantidade individual de cada componente da fórmula |

---

## 4. Controles e Seletores

| Atributo / ID           | Elemento   | Finalidade                                                |
| ----------------------- | ---------- | --------------------------------------------------------- |
| `#filtro-campus-topo`   | `<select>` | Seletor de campus do cabeçalho desktop                    |
| `#filtro-ano-topo`      | `<select>` | Seletor de ano do cabeçalho desktop                       |
| `#filtro-campus-drawer` | `<select>` | Seletor de campus da gaveta móvel                         |
| `#filtro-ano-drawer`    | `<select>` | Seletor de ano da gaveta móvel                            |
| `[data-seletor-campus]` | `<select>` | Seletores locais na página de detalhe (`YearLinks.astro`) |
| `[data-seletor-ano]`    | `<select>` | Seletores locais na página de detalhe (`YearLinks.astro`) |

---

## 5. Regras de Atualização do DOM

1. A busca por elementos deve ser protegida por `document.querySelector` / `querySelectorAll` tolerante a elementos ausentes (ex.: seletores de pilar 2 ausentes na página do pilar 1).
2. Nenhuma exceção de elemento nulo pode interromper o ciclo de atualização.
3. Se um indicador estiver sem dados, adiciona a classe visual de indisponibilidade e insere `"Dado indisponível"`.
