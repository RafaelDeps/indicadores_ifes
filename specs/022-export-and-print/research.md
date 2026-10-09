# Research & Architecture Decisions: Ferramentas de Exportação e Impressão

## 1. Geração Client-side de Planilha CSV sem Dependências

### Decisão

Implementar uma função pura TypeScript em `src/lib/exportar-csv.ts` para estruturar a tabela em string e disparar o download através da API de Blobs do navegador.

- **Codificação**: UTF-8 precedido pelo BOM (`\uFEFF`). O Byte Order Mark é essencial para que o Excel abra automaticamente acentuações em português (como "Pesquisa", "Inovação", "Número") sem que o usuário precise configurar codificações manualmente.
- **Delimitador**: Ponto-e-vírgula (`;`). No ecossistema brasileiro (pt-BR), a vírgula é o separador decimal oficial, tornando o ponto-e-vírgula o separador de colunas padrão.
- **Tratamento de Dados Indisponíveis**: Em total respeito ao Princípio III (Fidelidade aos dados), anos com dados nulos mantêm a célula de valor vazia e preenchem a coluna `Status` como `"Dado indisponível"`, nunca emitindo `0`.

### Alternativas Consideradas

- **Bibliotecas como `PapaParse` ou `xlsx` (SheetJS)**: Rejeitadas por adicionarem dependências pesadas desnecessárias (Princípio I). Uma formatação CSV simples e segura é facilmente feita com dezenas de linhas de TypeScript puro.

---

## 2. Conversão de SVG para Imagem PNG via Canvas Nativo

### Decisão

Implementar a conversão no navegador utilizando o elemento `<canvas>` nativo do HTML5:

1. Obter o `<svg>` ativo do gráfico (`[data-grafico-svg]`).
2. Serializar o SVG com `XMLSerializer.serializeToString()`.
3. Criar uma imagem (`HTMLImageElement`) via Blob URL (`image/svg+xml`).
4. Desenhar em um canvas com dimensões aumentadas (800x480px) para alta densidade e nitidez.
5. Inserir cabeçalho formal ("IFES — Campus Serra", nome do indicador e sigla) e carimbo de data no rodapé.
6. Garantir fundo sólido institucional (`#ffffff`) para que, mesmo se o usuário estiver com tema escuro ativado na tela, a imagem exportada seja limpa e adequada para documentos e apresentações oficiais.
7. Disparar o download em PNG através de `canvas.toBlob()`.

### Alternativas Consideradas

- **`html2canvas` / `dom-to-image`**: Rejeitados por serem volumosos (centenas de KB), lentos e cheios de bugs de renderização de fontes e SVG. A conversão direta de SVG para Canvas nativo é rápida, exata e tem 0 KB de dependência.

---

## 3. Formatação de Impressão A4 (`@media print`)

### Decisão

Criar regras CSS dedicadas para `@media print` no layout e componentes da página de detalhe:

- Ocultar barras de navegação superior, menu móvel, botões de ação na tela, botões de alternância e elementos interativos (`display: none !important`).
- Exibir um cabeçalho impresso formal com o logotipo/título institucional ("IFES — Campus Serra • Sistema de Indicadores CONIF") e data de emissão.
- Forçar cores de alto contraste com fundo branco para economia de tinta e nitidez em impressões monocromáticas ou coloridas.
- Configurar quebras de página controladas (`page-break-inside: avoid;`).
