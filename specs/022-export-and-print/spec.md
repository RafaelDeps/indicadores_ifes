# Feature Specification: Ferramentas de Exportação (PNG, CSV) e Impressão A4

**Feature Branch**: `feat/new_pages` (ou `022-export-and-print`)

**Created**: 2026-10-09

**Status**: Draft

**Input**: User description: "Adicionar ferramentas de exportação de dados (PNG, CSV) e formatação para impressão nas páginas de indicadores"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Exportação da Série Histórica em Planilha CSV (Priority: P1) 🎯 MVP

Como pesquisador, auditor ou gestor do Campus Serra, desejo exportar a série histórica completa do indicador em um arquivo CSV formatado com separador ponto-e-vírgula (`;`) e codificação UTF-8 com BOM, para que possa abrir a planilha diretamente no Microsoft Excel ou LibreOffice sem problemas de acentuação e cruzar os dados com outras fontes.

**Why this priority**: É a entrega mais essencial para transparência pública e trabalho analítico (Princípio IV da Constituição), permitindo reaproveitamento direto dos dados numéricos oficiais.

**Independent Test**: Acessar qualquer página de indicador (ex.: `/pilar-1/ntpp/` ou `/pilar-1/pies/`), clicar no botão "Exportar CSV" junto à série histórica e verificar se o arquivo baixado contém cabeçalho correto, todas as linhas de anos apurados, separador `;` e identificação correta de dados indisponíveis.

**Acceptance Scenarios**:

1. **Given** um usuário na página de detalhe de um indicador, **When** ele clica no botão "Exportar CSV", **Then** o navegador inicia o download imediato de um arquivo com nome padronizado (ex.: `ifes_serra_pies_serie_historica.csv`).
2. **Given** o arquivo CSV gerado, **When** inspecionado, **Then** ele contém as colunas `Campus;Ano;Indicador;Sigla;Valor;Unidade;Status`, com valores decimais formatados com vírgula (padrão pt-BR) e anos sem apuração marcados com `Status` "Dado indisponível".
3. **Given** caracteres acentuados nos nomes e descrições, **When** o arquivo é aberto em softwares de planilha, **Then** a codificação UTF-8 com BOM assegura renderização correta de acentos e cedilhas.

---

### User Story 2 - Exportação do Gráfico em Imagem PNG Institucional (Priority: P2)

Como gestor, professor ou comunicador, desejo baixar uma imagem PNG nítida do gráfico de série histórica com identificação institucional oficial ("IFES — Campus Serra", nome e sigla do indicador, data de geração), para que possa anexar o gráfico diretamente em relatórios institucionais, slides ou documentos oficiais.

**Why this priority**: Permite que membros do campus utilizem os gráficos oficiais prontos em apresentações gerenciais sem necessidade de capturas de tela manuais ou perda de qualidade visual.

**Independent Test**: Comutar o gráfico para modo linha ou modo barras em `/pilar-2/pinv/`, clicar em "Baixar Imagem (PNG)" e verificar que a imagem resultante reflete fielmente o modo ativo na tela, contém o cabeçalho institucional e fundo sólido limpo.

**Acceptance Scenarios**:

1. **Given** o gráfico exibido no modo linha ou no modo barras, **When** o usuário clica em "Baixar Gráfico (PNG)", **Then** o sistema gera uma imagem PNG contendo o cabeçalho "IFES — Campus Serra", o título e a sigla do indicador, o desenho vetorial do gráfico e o rodapé com a data de consulta.
2. **Given** a geração da imagem, **When** o tema da página estiver em modo escuro, **Then** o arquivo PNG exportado é gerado com fundo institucional claro de alto contraste e legibilidade ideal para relatórios impressos ou digitais.

---

### User Story 3 - Ficha do Indicador Otimizada para Impressão A4 (Priority: P3)

Como coordenador ou avaliador institucional que precisa de um documento físico ou PDF formal da ficha metodológica e resultados, desejo acionar a impressão da página e obter um layout limpo, contínuo e sem elementos supérfluos de navegação web.

**Why this priority**: Garante que a impressão física ou exportação em PDF via navegador (`Ctrl + P`) produza um documento formal, eliminando menus, rodapés de tela e botões de interface.

**Independent Test**: Clicar no botão "Imprimir Ficha" ou abrir a caixa de diálogo de impressão do navegador (`Ctrl + P`) na página `/pilar-3/pipro/` e verificar que o cabeçalho do site, menu móvel e botões são ocultados, enquanto os dados e gráficos ocupam a largura total da folha com carimbo institucional.

**Acceptance Scenarios**:

1. **Given** o acionamento da impressão via botão "Imprimir Ficha" ou atalho do navegador, **When** a visualização de impressão é gerada, **Then** a barra de navegação superior, menu lateral/gaveta, controles de busca e botões de exportação ficam totalmente ocultos (`display: none`).
2. **Given** a folha de impressão A4 gerada, **When** inspecionada, **Then** um cabeçalho formal impresso com texto institucional ("IFES — Campus Serra • Ficha de Indicador CONIF") e data de emissão é exibido no topo.

---

### Edge Cases

- **Anos com dado indisponível no CSV**: O campo de valor numérico não deve conter "0" artificial; o campo `Status` deve indicar explicitamente "Dado indisponível" (Princípio III - Fidelidade aos dados).
- **Indicador percentual vs. numérico**: A coluna de unidade no CSV deve exibir `%` ou `Quantidade` conforme o tipo do indicador.
- **Navegadores com restrições a downloads via script**: Utilizar elemento `<a>` com atributo `download` e blob URL revogado após o clique para compatibilidade universal.
- **Gráficos em telas estreitas ao exportar imagem**: A imagem gerada pelo canvas deve ter resolução interna fixa e nítida (ex.: 800x450px), independente do tamanho da janela no momento do clique.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE fornecer um botão acessível "Exportar CSV" na seção da série histórica dos indicadores.
- **FR-002**: A exportação CSV DEVE gerar arquivo com prefixo institucional e sigla do indicador (ex.: `ifes_serra_[sigla]_serie_historica.csv`).
- **FR-003**: O arquivo CSV DEVE utilizar codificação UTF-8 com BOM (`\uFEFF`) e separador ponto-e-vírgula (`;`), com colunas: `Campus`, `Ano`, `Indicador`, `Sigla`, `Valor`, `Unidade`, `Status`.
- **FR-004**: Valores decimais no CSV DEVEM utilizar vírgula como separador decimal (padrão brasileiro), e anos indisponíveis DEVEM ter o status "Dado indisponível" com valor vazio.
- **FR-005**: O sistema DEVE fornecer um botão acessível "Baixar Imagem (PNG)" integrado aos controles do gráfico histórico (`SeriesChart`).
- **FR-006**: A imagem PNG gerada DEVE renderizar fielmente o gráfico ativo (linha ou barras), incluindo cabeçalho institucional ("IFES — Campus Serra"), nome do indicador, sigla e rodapé com carimbo temporal.
- **FR-007**: A geração do PNG DEVE ocorrer puramente no cliente utilizando a API Canvas nativa do navegador, sem dependências externas adicionais.
- **FR-008**: O sistema DEVE fornecer um botão de ação "Imprimir Ficha" no banner de cabeçalho do indicador, que aciona o diálogo nativo `window.print()`.
- **FR-009**: O CSS de impressão (`@media print`) DEVE ocultar elementos de navegação (header fixo, gaveta mobile, seletor de tema, controles interativos de alternância e botões de exportação).
- **FR-010**: O CSS de impressão DEVE exibir um cabeçalho institucional impresso, quebrar páginas adequadamente e remover sombras e fundos escuros para economizar tinta e manter contraste nítido em papel branco.

### Key Entities _(include if feature involves data)_

- **RegistroExportacaoCSV**: Linha tabular contendo campos de texto delimitados por `;`.
- **ParametrosExportacaoGrafico**: Dimensões do canvas, título, sigla, modo ativo (linha/barras) e data de extração.
- **FichaImpressao**: Configuração de layout `@media print` contendo regras de visibilidade e quebra de página.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: O download do arquivo CSV inicia em menos de 100 milissegundos após o acionamento do botão.
- **SC-002**: 100% dos arquivos CSV gerados abrem com acentuação correta e colunas separadas sem necessidade de assistente de importação no Excel e LibreOffice.
- **SC-003**: A imagem PNG é gerada com resolução mínima de 800px de largura e nitidez adequada para apresentações formais.
- **SC-004**: Ao imprimir em formato A4, zero elementos supérfluos de navegação web aparecem no documento final.
- **SC-005**: 0 KB de dependências de bibliotecas externas adicionadas ao projeto.

## Assumptions

- O usuário possui navegador com suporte a Canvas e Blob/URL.createObjectURL (padrão em todos os navegadores modernos há mais de 10 anos).
- O escopo de dados permanece estritamente vinculado ao Campus Serra.
- A impressão padrão é orientada para folhas A4 em modo retrato ou paisagem.
