# Quickstart: Guia de Validação da Arquitetura Hexagonal do ETL

**Feature**: `007-hexagonal-etl-refactor` | **Date**: 2026-09-25

Este guia descreve os cenários de validação para verificar a integridade da refatoração arquitetural sem regressão funcional.

---

## 1. Pré-Requisitos

- Node.js >= 20.0.0
- Repositório clonado com dependências instaladas (`npm install`)
- Arquivo `exports_canonical.zip` presente na raiz do projeto

---

## 2. Cenário de Validação 1: Execução Completa dos Testes Automatizados

Executar a suíte completa de testes no Vitest para verificar que a reorganização dos módulos para `core/`, `adapters/` e `flows/` mantém 100% dos testes passando:

```bash
npm test
```

### Resultado Esperado:

- 33 arquivos de teste executados com sucesso.
- 231 testes passando (0 falhas).
- Tempo de execução inferior a 5 segundos.

---

## 3. Cenário de Validação 2: Execução do Pipeline CLI

Executar o comando oficial do ETL para gerar o pacote `indicadores.zip`:

```bash
npm run etl
```

### Resultado Esperado:

- Saída no terminal informando:
  ```text
  ETL concluído: N arquivos gerados (M campi + todos), anos 2024–2026.
  ```
- Código de retorno `0`.
- Arquivo `indicadores.zip` atualizado na raiz do projeto.

> **Nota**: `N`/`M` são **variáveis** conforme o export canônico vigente
> (nº de campi + escopo "todos", × 3 pilares × 3 anos).

---

## 4. Cenário de Validação 3: Build Estático do Site Astro

Verificar que o pacote gerado pelo novo fluxo é consumido sem nenhuma divergência pelo leitor do dashboard (`src/lib/dataset.ts`):

```bash
npm run build
```

### Resultado Esperado:

- Build concluído com sucesso sem erros de decodificação ou schemas inválidos.
- Páginas estáticas geradas em `dist/`.
