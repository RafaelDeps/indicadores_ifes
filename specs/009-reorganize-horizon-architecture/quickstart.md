# Quickstart: Validação da Nova Arquitetura

**Feature**: `009-reorganize-horizon-architecture`
**Date**: 2026-09-26
**Status**: Complete

Este guia orienta a validação ponta a ponta da nova arquitetura após a implementação das tarefas.

---

## 1. Pré-Requisitos

- **Python**: Versão >= 3.11
- **Node.js**: Versão >= 20.0
- **Ambiente Virtual**: `.venv` configurado na raiz

---

## 2. Preparação do Ambiente

Instale as dependências unificadas de desenvolvimento:

```bash
make setup
```

Certifique-se de que o arquivo canônico de dados está disponível em:

```bash
ls -lh data/canonical/exports_canonical.zip
# Se não estiver presente, copie ou crie link simbólico:
# cp ../horizon_etl/data/exports/data_snapshot.zip data/canonical/exports_canonical.zip
```

---

## 3. Execução do Pipeline ETL

Execute o pipeline completo de dados:

```bash
make etl
```

### O que verificar:

1. O arquivo `data/dist/indicadores.zip` foi criado/atualizado com todos os arquivos `pilar{N}_{campus}_{year}.json` do export vigente (número **variável**: nº de campi + escopo `todos`, × 3 pilares × 3 anos).
2. O relatório `data/reports/etl_run_report.md` foi gerado com os contadores de projetos e campi.
3. **Nenhum** arquivo `.zip` foi gerado na raiz do repositório:
   ```bash
   ls *.zip 2>/dev/null || echo "OK: Raiz limpa sem zips"
   ```

---

## 4. Execução Parcial por Campus

Teste a geração isolada para um único campus (ex.: Serra):

```bash
make etl-campus CAMPUS=Serra
```

### O que verificar:

- O arquivo `data/dist/indicadores_serra.zip` foi gerado contendo exatamente 9 arquivos (3 pilares × 3 anos).
- O arquivo principal `data/dist/indicadores.zip` permaneceu inalterado.

---

## 5. Execução dos Testes Segregados

Valide as duas suítes de testes de forma independente:

### 5.1. Testes do Pipeline de Dados (Python / Pytest)

```bash
make test-etl
```

_Deve rodar exclusivamente os testes sob `tests/etl/` com 100% de aprovação._

### 5.2. Testes do Frontend Web (TypeScript / Vitest)

```bash
make test-web
```

_Deve rodar exclusivamente os testes sob `tests/web/` com 100% de aprovação._

---

## 6. Checagem de Qualidade e CI Local

Execute a esteira completa de validação:

```bash
make check
```

O comando executará em sequência:

1. Lint Python (`flake8 etl tests/etl`)
2. Lint Frontend (`eslint .`)
3. Checagem de formatação Python (`isort --check`, `black --check`)
4. Checagem de formatação Frontend (`prettier --check`)
5. Testes Pytest (`tests/etl`)
6. Testes Vitest (`tests/web`)

---

## 7. Build do Frontend Astro

Valide a geração estática do site utilizando o pacote de dados sob `data/dist/`:

```bash
npm run build
```

O build do Astro deve ser concluído com sucesso gerando a pasta `dist/` pronta para publicação.
