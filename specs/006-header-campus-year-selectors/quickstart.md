# Quickstart & Validation Guide: Seletores de Campus e Ano no Cabeçalho

**Feature**: `006-header-campus-year-selectors`  
**Date**: 2026-09-23  
**Status**: Concluído

Este guia fornece os passos e comandos necessários para validar de ponta a ponta a implementação dos seletores de Campus e Ano no cabeçalho.

---

## 1. Pré-requisitos

- Node.js versão 20.0.0 ou superior.
- Dependências do projeto instaladas (`npm install`).
- Pacote de dados `indicadores.zip` íntegro na raiz do repositório.

---

## 2. Validação Automatizada de Testes

Execute a suíte de testes do Vitest para verificar os critérios de aceitação:

```bash
# 1. Executar testes de extração e ordenação do dataset
npx vitest run tests/dataset.test.ts

# 2. Executar testes de resolução e padrões de ano/campus
npx vitest run tests/ano.test.ts

# 3. Executar testes de marcação e acessibilidade do cabeçalho
npx vitest run tests/header.test.ts

# 4. Executar toda a suíte de regressão (deve passar 100%)
npm test
```

### Critérios de Aceitação nos Testes

- [ ] `obterCampiParaSelect`: Retorna `(Todos)` no índice 0 e os demais em ordem alfabética estrita (`pt-BR`).
- [ ] `obterAnosParaSelect`: Retorna anos em ordem estritamente decrescente (`b - a`).
- [ ] `Header`: Contém marcação de seletores com `aria-label`, IDs acessíveis e estrutura de drawer mobile.
- [ ] Sem regressão nos 145 testes existentes do projeto.

---

## 3. Validação do Build de Produção

Verifique se a geração estática (SSG) do Astro compila sem erros:

```bash
npm run build
```

- O comando deve concluir gerando os arquivos estáticos no diretório `dist/` sem qualquer erro de compilação ou advertência de tipagem.

---

## 4. Roteiro de Validação Manual (Navegador)

Inicie o servidor de desenvolvimento local:

```bash
npm run dev
```

Acesse `http://localhost:4321/` e execute os seguintes passos:

### Cenário A: Validação em Desktop (>= 768px)

1. Inspecione o cabeçalho no topo da página:
   - Observe os dois seletores posicionados na barra superior.
   - Abra o seletor de Campus: verifique se a primeira opção é `(Todos)` e os campi seguintes estão em ordem alfabética.
   - Abra o seletor de Ano: verifique se a lista está em ordem decrescente (ex.: 2026, 2025...), com o ano mais recente selecionado.
2. Altere o campus para um campus específico (ex.: "Serra"):
   - A URL deve refletir o parâmetro `?campus=serra`.
3. Clique na aba de navegação "Pilar 1":
   - A página do Pilar 1 deve carregar mantendo o parâmetro `?campus=serra` na URL e o seletor exibindo "Serra".

### Cenário B: Validação em Dispositivos Móveis (< 768px)

1. Reduza a largura da janela do navegador ou ative o modo responsivo do DevTools (ex.: 375px - iPhone SE):
   - Confirme que os seletores NÃO aparecem no cabeçalho fixo do topo (mantendo o topo limpo com logo, badge e botão de menu).
2. Toque no botão de menu (ícone de hambúrguer):
   - A gaveta móvel (_Slide-Over Drawer_) se abre.
   - Confirme que os seletores de Campus e Ano estão posicionados logo no topo da gaveta, acima dos links dos pilares.
   - Confirme que os campos têm tamanho e espaçamento adequados para toque confortável (altura mínima 44px).
3. Selecione um campus ou ano diferente dentro do menu gaveta:
   - Verifique se o filtro é aplicado e a seleção é propagada.

### Cenário C: Validação de Acessibilidade por Teclado

1. Navegue utilizando apenas a tecla `Tab`:
   - Os seletores recebem foco com anel de destaque visível (`outline`).
   - As teclas de seta para cima e para baixo permitem alternar entre as opções.
   - O leitor de tela anuncia os rótulos adequados ("Selecionar campus do IFES" e "Selecionar ano de referência").
