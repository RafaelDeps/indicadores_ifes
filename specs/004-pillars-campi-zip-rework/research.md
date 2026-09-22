# Research: Rework do Dashboard com os 3 Pilares CONIF, Multi-Campus e Ingestão Zip

**Feature**: `004-pillars-campi-zip-rework` | **Data**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

## 1. Ingestão de Dados a partir de `indicadores.zip`

### Contexto

O dashboard deve ingerir o arquivo raiz `indicadores.zip`, contendo arquivos JSON padronizados como `pilar{N}_{campus}_{year}.json`. A Constituição do projeto (Princípio I: Simplicidade) estipula o mínimo indispensável de dependências e proíbe abstrações desnecessárias.

### Alternativas Avaliadas

1. **Parser ZIP nativo em TypeScript utilizando `node:fs` e `node:zlib.inflateRawSync`**:
   - O formato ZIP consiste em registros de cabeçalho de arquivo local (_Local File Headers_) e blocos comprimidos via DEFLATE (método 8) ou não comprimidos STORE (método 0). O Node.js dispõe nativamente de `zlib.inflateRawSync` desde o Node 0.11. Um utilitário de ~40 linhas em `src/lib/zip.ts` lê o buffer do arquivo ZIP, extrai as entradas e retorna os conteúdos sem qualquer dependência externa.
2. **Biblioteca de terceiros (ex.: `adm-zip`, `fflate` ou `unzipper`)**:
   - Adiciona um pacote ao `package.json` para realizar a descompressão.
3. **Script shell de pré-compilação com comando `unzip` do sistema operacional**:
   - Depende de binário externo do sistema (incompatível com ambientes Windows ou contêineres mínimos).

### Decisão

**Alternativa 1 (Parser ZIP nativo com `node:fs` e `node:zlib.inflateRawSync`)**.

- **Justificativa**: Garante **zero novas dependências** de runtime ou build, máxima portabilidade em qualquer ambiente Node 20+, execução síncrona determinística no build do Astro e conformidade total com o Princípio I.

---

## 2. Modelo de Dados Multi-Campus e Regra Estrita de Nulo vs Zero

### Contexto

Cada arquivo JSON no ZIP traz indicadores específicos para determinado pilar, campus e ano. O Princípio III da Constituição (Fidelidade aos Dados do Relatório) determina que ausência de dados deve ser estritamente `null` e renderizada como "Dado indisponível", enquanto o valor numérico `0` é restrito a contagens verificadas.

### Estrutura dos Arquivos por Pilar

- **Pilar 1 (Engajamento Acadêmico e Inclusão)**:
  - `NTPP`: `total_projetos_NTPP` (number | null)
  - `QSPP`: `total_servidores_QSPP` (number | null)
  - `PIES`: `percentual_calculado_PIES` (number | null), componentes: `NEP_estudantes_em_pesquisa`, `NTE_total_estudantes_matriculados`
  - `PICOT`: `percentual_calculado_PICOT` (number | null), componentes: `NTECPP_cotistas_em_pesquisa`, `NEP_total_estudantes_em_pesquisa`
- **Pilar 2 (Fomento e Conexão com o Ecossistema)**:
  - `PINV`: `percentual_calculado_PINV` (number | null), componentes: `TAFPPI_valor_total_aporte_pesquisa`, `OCC_valor_orcamento_total_capital_custeio`
  - `PIPDI`: `total_acumulado_PIPDI` (number | null), componentes: `NAPPCT_acordos_parceria_firmados`
- **Pilar 3 (Produtividade e Propriedade Intelectual)**:
  - `PIPRO`: `total_producao_PIPRO` (number | null), componentes: `NPB_producoes_academicas_bibliograficas`, `NPT_producoes_tecnicas_tecnologicas`
  - `PIPROT`: `total_acumulado_PIPROT` (number | null), componentes: 7 subtipos (`PA`, `RM`, `DI`, `C`, `TC`, `PC`, `OGM`)
  - `PIPROTR`: `total_transferidos_PIPROTR` (number | null), componentes: 3 subtipos (`CT`, `CL`, `CC`)

### Tratamento do Campus Consolidado "todos"

- Conforme acordado na clarificação (Sessão 2026-09-22), o campus institucional `todos` é ingerido estritamente a partir de arquivos oficiais `pilar{N}_todos_{year}.json`.
- Caso o arquivo de determinado pilar/ano não exista para `todos`, o dashboard apresenta "Dado indisponível", proibindo categoricamente somas ou interpolações parciais não oficiais.

---

## 3. Sincronização de URL (`?campus=...&ano=...`) e Histórico no Astro

### Contexto

O site é gerado de forma estática com Astro (SSG). A seleção de campus e ano deve sincronizar bidirecionalmente com os parâmetros de consulta da URL e propagar o contexto de navegação entre as rotas internas.

### Padrão de Implementação

1. **Em tempo de build**:
   - Astro gera páginas estáticas completas com todos os dados dos 3 pilares e 9 indicadores embutidos no cliente (ou injetados como dados tipados em atributos de dados / scripts).
2. **Em tempo de execução (cliente)**:
   - Um script desacoplado (`src/lib/urlSync.ts` ou controlador de página) inspeciona `window.location.search` (`URLSearchParams`).
   - Ao alterar o seletor de campus ou ano:
     - O estado visual é atualizado imediatamente (<100ms).
     - A URL é atualizada via `history.pushState(null, '', novaUrl)`.
   - Evento `popstate`:
     - O listener `window.addEventListener('popstate', ...)` restaura os seletores e a visualização do histórico do navegador.
   - **Propagação nos links internos**:
     - Links internos (cartões de pilares, cartões de indicadores, breadcrumbs) recebem dinamicamente ou na renderização os parâmetros de query ativos (`?campus=...&ano=...`), mantendo a navegação contínua acordada na clarificação 2.

---

## 4. Visualização Aprimorada de Gráficos (SVG Nativo)

### Contexto

A especificação exige rótulos de dados numéricos visíveis nos pontos, eixos legíveis e tooltips contextuais nas interações, sem adicionar bibliotecas pesadas de gráficos.

### Decisões de Design para o Gráfico SVG

1. **Rótulos Numéricos nos Pontos**:
   - Adição de elementos SVG `<text>` posicionados 12px acima das coordenadas `(x, y)` dos círculos, com classes tipográficas legíveis e formatação monetária/quantitativa/percentual correspondente.
2. **Eixos Legíveis e Linhas de Grade**:
   - Eixo horizontal com marcações e anos impressos abaixo de cada ponto.
   - Eixo vertical com marcações mínima, intermediária e máxima para referência de escala.
3. **Tooltips Contextuais**:
   - Container acessível SVG/HTML que, ao passar o mouse ou focar no ponto (suporte a teclado e toque), exibe um cartão flutuante com: Ano, Campus, Nome do Indicador, Valor Formatado e Mensagem de Disponibilidade.
4. **Respeito aos Dados Nulos**:
   - Pontos `null` não geram círculos no valor zero; quando não há dados, exibe-se a notificação padronizada de indisponibilidade.

---

## 5. Limpeza de Elementos Descontinuados

### Decisões de Remoção

1. **Exportação CSV/JSON**:
   - Remover os componentes `ExportLinks.astro` e as rotas estáticas `dados.csv.ts` e `dados.json.ts`.
   - Remover os testes correspondentes em `tests/exportacao.test.ts`.
2. **Campo "Fonte dos dados"**:
   - Remover as referências a `fonteDados` em cartões de indicadores e detalhes.
3. **Plugin UserWay**:
   - Permanecer sem injeção de script de terceiros, preservando a governança e conformidade WCAG AA nas folhas de estilo nativas.
