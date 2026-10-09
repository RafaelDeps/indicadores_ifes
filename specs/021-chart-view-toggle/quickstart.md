# Quickstart: Validação da Alternância entre Gráfico de Linha e Barras

Este guia orienta a validação da funcionalidade de alternância de gráficos nos indicadores do IFES Campus Serra.

## Pré-requisitos

- Dependências instaladas (`npm install`).
- Ambiente Node.js v20+ / Astro configurado.

---

## 1. Execução de Testes Automatizados

### Validação Unitária das Funções Geométricas de Barras

Testa o cálculo matemático de coordenadas, larguras, alturas e tratamento de anos indisponíveis:

```bash
npx vitest run tests/web/chart.test.ts
```

### Validação dos Controles do Componente e Acessibilidade

Testa a estrutura do DOM, a presença dos botões com atributos `aria-pressed`, camadas SVG e tokens de cor:

```bash
npx vitest run tests/web/chart-toggle.test.ts
```

---

## 2. Validação Visual e Interativa no Navegador

1. Iniciar o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
2. Acessar qualquer página de indicador:
   - [PIES: Estudantes na Pesquisa](http://localhost:4321/pilar-1/pies/)
   - [NTPP: Total de Projetos](http://localhost:4321/pilar-1/ntpp/)
   - [PIPDI: Parcerias e Inovação](http://localhost:4321/pilar-2/pipdi/)
3. Verificar a presença dos botões de alternância (`Linha` e `Barras`) no canto superior do gráfico.
4. Clicar em "Barras":
   - O gráfico deve comutar imediatamente para colunas verticais com cantos arredondados.
   - O ano ativo selecionado no filtro (ex.: 2024) deve estar destacado com verde institucional.
   - Os anos com dados indisponíveis (se houver) devem exibir contorno tracejado e rótulo "Indisp.".
5. Alternar o tema para modo escuro no seletor de tema do cabeçalho e verificar se o contraste das barras e textos permanece perfeito.
6. Navegar para outro indicador (ex.: `/pilar-3/pipro/`) e confirmar que o modo "Barras" permanece ativado pela persistência de sessão.
