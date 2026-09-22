# Quickstart Guide: Validação do Redesenho Visual (Figma Mock)

**Feature**: `005-figma-visual-redesign` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

Este guia orienta a verificação prática e os testes automatizados da reformulação visual do portal de indicadores do IFES.

---

## 1. Pré-requisitos e Verificação de Ambiente

- Node.js versão `>= 20.0.0`
- Navegador moderno com suporte a CSS Grid, CSS Variables e Flexbox.

---

## 2. Execução dos Testes Automatizados

```bash
# Executa a suíte completa de testes no Vitest
npm test
```

### Validações Esperadas nos Testes:

1. **Tokens e Identidade**: Validação de presença das variáveis CSS institucionais (`--color-primary`, `--color-primary-dark`, `--color-red-primary`, `--color-surface-bg`) e contraste WCAG AA $\ge 4.5:1$.
2. **Logotipo IFES**: Presença do elemento SVG com o círculo vermelho (`#e6323e`) e os 8 quadrados verdes (`#178447`).
3. **Cartões de Indicador**:
   - Renderização de valor destacado com unidade.
   - Renderização do badge "Dado indisponível" quando nulo (jamais `0`).
   - Cálculo de variação relativo (`▲ +X%` / `▼ -X%`), absoluto (`+X`) ou "Sem base anterior".
4. **Página de Detalhe**:
   - Caixa de destaque no banner superior.
   - Presença da tabela de variáveis em 3 colunas (_Símbolo_, _Descrição_, _Unidade_).
   - Presença do cartão de notas metodológicas em verde-escuro (`#0c3929`).
5. **Regressão Zero**: Aprovação de 100% dos testes anteriores (sem quebra das rotas dos 3 pilares ou da ingestão de dados).

---

## 3. Verificação de Linter e Estilo de Código

```bash
npm run lint
npm run format:check
```

Ambos os comandos devem encerrar com código de saída `0` (zero erros e zero avisos).

---

## 4. Teste Manual e Roteiro Visual

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

Acesse `http://localhost:4321` e execute o checklist:

1. **Cabeçalho Fixo e Marca**:
   - Inspecione o topo da página: verifique o logotipo oficial em grade de 9 blocos com cores nítidas.
   - Role a página e confirme que o cabeçalho permanece fixo no topo.
   - Alterne as abas ("Visão geral", "Pilar 1", "Pilar 2", "Pilar 3") e veja o destaque da aba ativa.
2. **Seletores de Filtros**:
   - Altere o campus para "serra" e o ano para "2026": a URL deve atualizar para `?campus=serra&ano=2026`.
   - Clique em um indicador e confirme que os parâmetros são preservados na navegação.
3. **Menu Móvel (Drawer)**:
   - Reduza a largura da janela para menos de 768px (ou abra as ferramentas de desenvolvedor em modo móvel).
   - Clique no ícone de menu: a gaveta lateral (_slide-over_) deve abrir suavemente com fundo escurecido.
   - Tecle `Escape` ou clique no botão de fechar: a gaveta deve fechar e a rolagem da página ser restaurada.
4. **Cartão de Indicador (`IndicatorCard`)**:
   - Verifique o contêiner com ícone temático suave.
   - Verifique o valor grande, a unidade e o indicador de variação com cor contextual.
   - Selecione um ano sem coleta: comprove a exibição do badge elegante "Dado indisponível".
5. **Página de Detalhe**:
   - Acesse `/pilar-3/piprot/`:
     - Verifique o banner com a caixa de destaque do resultado.
     - Na coluna principal: confira "O que mede", "Finalidade", o bloco mono da fórmula e a tabela de variáveis em 3 colunas.
     - Na coluna lateral: confira o gráfico de linha, a contagem de tipos de ativos e o cartão verde-escuro de metodologia.
