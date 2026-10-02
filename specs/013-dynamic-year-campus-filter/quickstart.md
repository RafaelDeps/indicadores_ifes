# Guia Rápido de Validação (Quickstart)

**Feature**: `013-dynamic-year-campus-filter` | **Date**: 2026-09-30
**Spec**: [spec.md](./spec.md) | **Plano**: [plan.md](./plan.md)

Este documento detalha o roteiro prático e reprodutível de validação ponta a ponta da filtragem dinâmica de campus e ano no frontend.

---

## 1. Pré-Requisitos e Preparação

Verifique se as dependências do Node.js estão instaladas e se os testes atuais passam:

```bash
# Instalar dependências se necessário
npm install

# Executar suíte de testes web para confirmar estado íntegro
npm test
```

---

## 2. Cenários de Validação Manual

### Cenário 1: Troca dinâmica de ano sem recarregar a página (P1 / FR-001 / SC-001)

1. Inicie o servidor local de desenvolvimento:
   ```bash
   npm run dev
   ```
2. Abra no navegador: `http://localhost:4321/indicadores_ifes/` (ou a rota raiz indicada pelo Astro).
3. Observe os cartões de KPI (NTPP, QSPP, NEP, PIPRO). Por padrão, estarão exibindo os dados de 2026.
4. No cabeçalho, altere o seletor de **Ano** de `2026` para `2025` e depois para `2024`.
5. **Verificação de Sucesso:**
   - A página **NÃO** deve recarregar (sem piscar a tela ou reiniciar o scroll).
   - A URL na barra de endereços muda imediatamente para `?ano=2025` (e depois `?ano=2024`).
   - Todos os números dos cartões KPI e dos cartões dos Pilares 1, 2 e 3 mudam instantaneamente (< 1s) para os valores apurados daquele ano.

---

### Cenário 2: Carga direta com parâmetros na URL (P1 / FR-004 / SC-003)

1. Com o servidor ativo, cole diretamente na barra de endereços:
   ```text
   http://localhost:4321/indicadores_ifes/?campus=serra&ano=2024
   ```
2. Recarregue a página com `Ctrl + F5` (ou `Cmd + Shift + R`).
3. **Verificação de Sucesso:**
   - Já no primeiro instante da renderização (primeira pintura), os valores apresentados são estritamente os de 2024 para o campus Serra.
   - Os valores de 2026 **nunca aparecem** nem por uma fração de segundo.
   - Os seletores de campus e ano no cabeçalho e na gaveta móvel já iniciam apontando para "Serra" e "2024".

---

### Cenário 3: Navegação de histórico Voltar / Avançar (P2 / FR-006 / SC-004)

1. Na Visão Geral, selecione o ano `2025`.
2. Em seguida, selecione o ano `2024`.
3. Clique no botão **Voltar** do navegador.
4. **Verificação de Sucesso:**
   - A URL volta para `?ano=2025`.
   - O seletor volta para `2025`.
   - As métricas na tela mudam de volta para os valores de 2025 sem recarregar a página.
5. Clique no botão **Avançar** do navegador:
   - A tela restaura os dados de `2024`.

---

### Cenário 4: Preservação de contexto em links internos (P2 / FR-007 / SC-005)

1. Estando em `?campus=serra&ano=2024`, clique na aba **Pilar 1** no menu de navegação.
2. Observe a página do Pilar 1.
3. Clique no cartão do indicador **NTPP**.
4. **Verificação de Sucesso:**
   - A página do Pilar 1 e a página de detalhes do NTPP abrem preservando `?campus=serra&ano=2024` na URL.
   - O detalhe exibe o "Resultado apurado (2024)" com o valor do campus Serra de 2024.

---

### Cenário 5: Conflito de ano e auto-ajuste (FR-013)

1. Acesse um campus com cobertura temporal restrita ou simule um parâmetro de ano inexistente para aquele campus (ex.: `?campus=serra&ano=1999`).
2. **Verificação de Sucesso:**
   - O sistema detecta que o ano não existe no campus e ajusta automaticamente para o ano disponível mais recente.
   - A URL é atualizada para o ano corrigido.
   - Nenhum erro de tela em branco ou crash de script acontece.

---

### Cenário 6: Validação de Build Estático para Produção (SC-006)

Execute a compilação completa e o preview para assegurar paridade total com o GitHub Pages:

```bash
# Compilar projeto de produção estático
npm run build

# Executar visualização do build estático
npm run preview
```

Abra a URL do preview e repita os Cenários 1 a 4 para garantir que o comportamento estático compilado é 100% idêntico ao desenvolvimento local.
