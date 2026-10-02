# Guia Rápido de Validação (Quickstart)

**Feature**: `014-frontend-ux-overhaul`
**Date**: 2026-10-01

Este guia descreve os cenários executáveis para validação fim a fim das correções e melhorias de frontend implementadas.

---

## 1. Pré-requisitos e Comandos de Validação

Certifique-se de que o ambiente possui Node.js >= 20 instalado:

```bash
# Executar a suíte de testes unitários e de integração web
npm test

# Verificar conformidade estrita de lint e estilo de código
npm run lint
npm run format:check

# Compilar o site estático para produção
npm run build

# Iniciar servidor local de pré-visualização dos artefatos estáticos
npm run preview
```

---

## 2. Roteiro de Validação Manual dos Cenários de Usuário

### Cenário 1: Reatividade Completa da Página de Detalhe (User Story 1)

1. Inicie o servidor com `npm run dev` ou `npm run preview` e abra `http://localhost:4321/indicadores_ifes/pilar-1/ntpp/`.
2. Observe o valor apurado no banner superior, os pontos desenhados no gráfico SVG e a tabela de série histórica na lateral direita.
3. No cabeçalho fixo, altere o seletor de Campus para **"Vitória"**.
4. **Resultado esperado**:
   - O banner de destaque atualiza imediatamente para o valor apurado de Vitória.
   - O gráfico SVG redesenha o caminho da linha e os pontos com os dados de Vitória (sem travar nos números da Serra).
   - A tabela histórica na lateral exibe unicamente os anos e valores apurados de Vitória.
   - O ponto e a linha da tabela correspondentes ao ano selecionado recebem destaque visual ativo.

### Cenário 2: Integridade do Histórico de Componentes (User Story 1 & FR-003)

1. Acesse `http://localhost:4321/indicadores_ifes/pilar-1/pies/`.
2. Na lateral direita, localize a seção "Detalhamento por componente" (ex: discentes voluntários e bolsistas).
3. Alterne o ano nos seletores do cabeçalho de 2024 para 2022.
4. **Resultado esperado**:
   - A contagem de cada ano do componente permanece com seu respectivo valor histórico apurado, sem que o primeiro ano da lista seja indevidamente sobrescrito.

### Cenário 3: Desduplicação de Controles de Interface (User Story 2)

1. Navegue por qualquer página de indicador ou pilar.
2. Observe a área acima do conteúdo principal.
3. **Resultado esperado**:
   - Não há seletores repetidos de campus ou ano no corpo da página.
   - A seleção é realizada exclusivamente pelo cabeçalho fixo unificado (ou pela gaveta móvel em smartphones).

### Cenário 4: Acessibilidade de Deltas e Atalho de Conteúdo (User Story 3)

1. Na página inicial ou de pilar, observe os cartões de indicadores com variação percentual.
2. **Resultado esperado**:
   - Variações positivas exibem o símbolo `▲` com texto acessível.
   - Variações negativas exibem o símbolo `▼`.
   - Variações neutras/estáveis exibem `=`.
3. Recarregue a página e pressione `Tab` imediatamente.
4. **Resultado esperado**:
   - Surge visivelmente no topo o atalho "Pular para o conteúdo principal". Ao pressionar `Enter`, o foco do navegador é transferido diretamente para a área central `<main id="conteudo-principal">`.

### Cenário 5: Alternância de Tema e Persistência (User Story 4)

1. No cabeçalho, localize e clique no botão de alternância de tema.
2. Alterne de Claro para Escuro e depois para Automático.
3. **Resultado esperado**:
   - As cores de fundo, cartões, tipografia e gráficos SVG adaptam-se imediatamente com contraste WCAG AA.
   - Ao recarregar a página (`F5`), a preferência escolhida permanece ativa.

### Cenário 6: Busca Rápida no Cabeçalho (User Story 6)

1. Clique no campo de busca do cabeçalho ou pressione o atalho de teclado associado.
2. Digite `"patente"` ou `"QSPP"`.
3. **Resultado esperado**:
   - Uma lista suspensa acessível exibe instantaneamente os resultados correspondentes.
   - A navegação entre os resultados funciona via setas do teclado (`↑` e `↓`) e a seleção via `Enter` redireciona para a página do indicador mantendo campus e ano intactos.
