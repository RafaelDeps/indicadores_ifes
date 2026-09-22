# Quickstart Guide: Validação do Dashboard Rework (3 Pilares, Multi-Campus e Ingestão Zip)

**Feature**: `004-pillars-campi-zip-rework` | **Data**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

Este guia descreve o procedimento passo a passo para validar localmente todas as capacidades implementadas nesta funcionalidade.

## 1. Pré-requisitos

- Node.js versão `>= 20.0.0`
- Gerenciador de pacotes `npm`
- Arquivo `indicadores.zip` presente na raiz do repositório (com arquivos `pilar{N}_{campus}_{year}.json`)

---

## 2. Instalação e Execução de Testes Automatizados

Execute a suíte de testes unitários e de integração via Vitest:

```bash
# Execução da suíte completa de testes
npm test
```

### Validações Esperadas nos Testes:

- **Ingestão Zip**: Validação de descompactação e parsing correto de `indicadores.zip` sem dependências externas.
- **Fidelidade de Dados (Princípio III)**: Verificação de que valores nulos geram `"Dado indisponível"` e valores `0` são mantidos como número `"0"`.
- **Rotas e Pilares**: Verificação de que os 3 pilares e 9 indicadores possuem rotas acessíveis.
- **Sincronização de URL**: Teste de resolução de `campus` e `ano` com fallbacks e validação de parâmetros.
- **Gráficos SVG**: Verificação de renderização de rótulos visíveis nos pontos e acessibilidade dos eixos.
- **Limpeza de Interface**: Verificação de ausência de botões CSV/JSON e ausência do campo "Fonte dos dados".

---

## 3. Verificação de Qualidade e Padronização

Certifique-se de que o código passa nas diretrizes de formatação e linter:

```bash
# Validação de tipos e linter
npm run lint

# Validação de formatação
npm run format:check
```

---

## 4. Execução do Servidor de Desenvolvimento e Teste Manual

Inicie o servidor de desenvolvimento estático:

```bash
npm run dev
```

Abra o navegador em `http://localhost:4321` e execute o checklist manual de validação:

1. **Home (`/`)**:
   - Confirme que os 3 pilares CONIF (Pilar 1, Pilar 2 e Pilar 3) estão ativos e navegáveis.
   - Nenhum pilar deve exibir o selo "em breve".
2. **Navegação por Pilar (`/pilar-1/`, `/pilar-2/`, `/pilar-3/`)**:
   - Acesse `/pilar-1/` e confirme a listagem de NTPP, QSPP, PIES e PICOT.
   - Acesse `/pilar-2/` e confirme a listagem de PINV e PIPDI.
   - Acesse `/pilar-3/` e confirme a listagem de PIPRO, PIPROT e PIPROTR.
3. **Página de Detalhe do Indicador (`/pilar-3/piprot/`)**:
   - Verifique que o total acumulado exibe `0` (contagem verificada).
   - Verifique a seção de componentes listando os 7 tipos de ativos (patentes com `0`, marcas com `"Dado indisponível"`).
   - Confirme que NÃO existem botões de download CSV/JSON nem campo "Fonte dos dados".
4. **Sincronização de URL**:
   - Altere o campus para "Serra" e o ano para "2026" e observe a URL atualizada para `?campus=serra&ano=2026`.
   - Clique em um indicador e comprove que a rota preserva os parâmetros na navegação.
   - Use o botão "Voltar" do navegador e verifique o retorno sincronizado da interface.
5. **Gráficos com Rótulos e Tooltips**:
   - Observe que os pontos de dados possuem valores numéricos impressos diretamente sobre eles e exibem tooltips contextuais ao passar o mouse ou tocar na tela.
