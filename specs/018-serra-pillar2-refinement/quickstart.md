# Quickstart Validation Guide: Refinamento do Pilar 2 e Campus Serra

**Feature**: `018-serra-pillar2-refinement`  
**Date**: 2026-10-08

Este guia descreve os cenários de teste e comandos executáveis para validar o refinamento das regras e a consolidação exclusiva do portal para o Campus Serra.

---

## 1. Pré-requisitos

- Ambiente Python com dependências do ETL instaladas (`.venv`).
- Ambiente Node.js com dependências do frontend instaladas (`node_modules`).

---

## 2. Cenários de Validação

### Cenário 1: Teste de Projeção de Vigência no SIGPESQ (PIPDI)

- **Objetivo**: Verificar que projetos sem `datas.fim` mas com `duracao_meses` têm `ano_fim` calculado corretamente e pontuam no PIPDI nos anos subsequentes.
- **Comando de Teste**:
  ```bash
  .venv/bin/pytest tests/etl/test_sigpesq_funding.py tests/etl/test_pipdi_sigpesq.py -v
  ```
- **Resultado Esperado**: Todos os testes passam demonstrando que projetos plurianuais permanecem vigentes no PIPDI durante todos os anos de sua duração.

---

### Cenário 2: Validação da Interface Web (Filtro Exclusivo Serra)

- **Objetivo**: Verificar que a opção "(Todos)" permanece desativada e que o Campus Serra é o padrão de abertura em desktop e mobile.
- **Comandos de Teste**:
  ```bash
  npm run test:web
  npm run build
  ```
- **Resultado Esperado**:
  - 212 testes do Vitest aprovados.
  - Build estático do Astro concluído sem erros, gerando as 14 páginas estáticas.

---

### Cenário 3: Validação da Cadeia Completa do ETL

- **Objetivo**: Executar a extração, cálculo e empacotamento completo do ETL, validando integridade, schemas e ausência de vazamento.
- **Comandos**:
  ```bash
  make run-etl
  make check-dados
  ```
- **Resultado Esperado**:
  - `data/dist/indicadores.zip` gerado com sucesso.
  - `check-dados.py` valida 100% dos JSONs contra os schemas oficiais.
  - `TAFPPI` de Serra em 2025 confirma R$ 25.954.326,84.
  - `PINV` de Serra preenchido conforme `data/pinv_serra.json` com `OCC` nulo.

---

### Cenário 4: Suíte Completa de Testes

- **Comando**:
  ```bash
  .venv/bin/pytest tests/etl
  ```
- **Resultado Esperado**: 244+ testes passando com 100% de sucesso.
