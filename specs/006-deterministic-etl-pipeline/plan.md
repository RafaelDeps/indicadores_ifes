# Implementation Plan: Pipeline ETL Determinístico de Geração do Pacote de Indicadores

**Branch**: `006-deterministic-etl-pipeline` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-deterministic-etl-pipeline/spec.md`

## Summary

Substituir o processamento manual (assistido por IA) que hoje produz o `indicadores.zip` por um pipeline ETL determinístico (Source → Transform → Sync) que lê `exports_canonical.zip`, calcula os 9 indicadores CONIF para os anos 2024–2026 por campus e para o agregado `todos`, valida os arquivos contra o contrato de ingestão da feature 004 e empacota o resultado em `indicadores.zip` na raiz. Execução via `npm run etl`, com testes Vitest escritos antes da implementação e zero dependências novas em runtime.

## Technical Context

**Language/Version**: TypeScript 5.8 (Node.js >= 20, ESM)

**Primary Dependencies**: Nenhuma nova dependência em runtime — reutiliza `node:fs`, `node:zlib` e o leitor ZIP existente `src/lib/zip.ts`. Dev-dependency única nova: `tsx` (execução direta de TS no comando `npm run etl`).

**Storage**: Sistema de arquivos local (`exports_canonical.zip` na raiz como entrada; `indicadores.zip` na raiz como saída versionada).

**Testing**: Vitest (existente; include `tests/**/*.test.ts`), test-first obrigatório (Princípio II).

**Target Platform**: Máquinas de desenvolvimento (Linux/macOS) e CI GitHub Actions (ubuntu) — o ETL roda localmente; o CI existente continua executando apenas lint + testes + build do site.

**Project Type**: CLI de transformação de dados (build-time tool) dentro de um projeto Astro estático existente.

**Performance Goals**: Regeneração completa em < 5 minutos (entrada de ~23 MB compactados: 4.095 iniciativas, 9.635 pessoas, 2.027 artigos, 951 produções).

**Constraints**: Saída byte-idêntica em execuções repetidas (determinismo); `null` estrito para ausência de dado (Princípio III); nenhum dado individual de pessoa nos arquivos de saída (Princípio IV); falha rápida sem produzir pacote parcial.

**Scale/Scope**: 3 pilares × (campi de `campuses_canonical.json` + `todos`) × 3 anos ≈ até ~230 arquivos JSON por execução.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                                   | Avaliação | Evidência                                                                                                                                                   |
| ------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Simplicity                               | ✅ PASS   | Zero dependências novas em runtime; nenhum framework/abstração extra. `tsx` (dev-only) é a única adição, justificada na Complexity Tracking.                |
| II. Test-First Development                  | ✅ PASS   | Todos os cálculos de indicadores, regras de campus/ano e fidelidade `null`/`0` terão testes Vitest escritos antes da implementação (tests/etl/).            |
| III. Fidelity to Report Data                | ✅ PASS   | Métricas ausentes serializadas estritamente como `null`; `0` apenas para contagem verificada; validador dedicado bloqueia violações antes do empacotamento. |
| IV. Aggregated Data Only                    | ✅ PASS   | Saídas contêm apenas agregados numéricos por campus/ano; testes de integração verificam ausência de nomes/identificadores individuais nos JSONs gerados.    |
| V. Basic Quality                            | ✅ PASS   | ESLint + Prettier zero erros; mensagens do CLI em pt-BR; identificadores de código em inglês.                                                               |
| VI. Automated Deployment with Quality Gates | ✅ PASS   | Nenhuma mudança no pipeline de deploy: CI continua rodando lint + testes + build; o ETL é operado localmente pelo mantenedor (Q5 da spec).                  |

**Re-check pós-Phase 1**: sem violações — a geração de artefatos não introduziu dependências, camadas ou serviços novos além do previsto.

## Project Structure

### Documentation (this feature)

```text
specs/006-deterministic-etl-pipeline/
├── plan.md              # This file
├── research.md          # Phase 0 output: decisões técnicas
├── data-model.md        # Phase 1 output: entidades e regras
├── quickstart.md        # Phase 1 output: guia de validação
├── contracts/
│   ├── etl-cli.md       # Contrato do comando npm run etl
│   └── output-package.md# Contrato do pacote indicadores.zip gerado
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── slugificar.ts    # [NOVO] slugificarCampus extraído de dataset.ts (compartilhado site + ETL)
│   ├── zip.ts           # [EXISTENTE] leitor ZIP (STORE/DEFLATE) — reutilizado pelo ETL
│   └── dataset.ts       # [EXISTENTE] passa a importar slugificarCampus de lib/slugificar.ts
└── etl/
    ├── main.ts          # Entrypoint `npm run etl`: orquestra Source → Transform → Sync
    ├── load.ts          # SOURCE: lê exports_canonical.zip (via lib/zip.ts) e os 8 conjuntos canônicos
    ├── people.ts        # Registro de pessoas: classificação, campus, deduplicação por id
    ├── initiatives.ts   # Regra de atividade por ano + resolução de campus (declarado → coordenador → membros)
    ├── productions.ts   # NPB/NPT (year=Y, atribuição por registro→autores) e PC (softwares_sem_patente)
    ├── pillars.ts       # Montagem dos 9 indicadores por campus/ano + agregação institucional `todos`
    ├── serialize.ts     # Serialização determinística (ordem estável, JSON sem carimbos)
    ├── validate.ts      # Validação contra o contrato 004 (nomenclatura, header, indicadores, null/0)
    └── zipwriter.ts     # Escritor ZIP determinístico (método STORE, datas fixas, CRC32)

tests/
└── etl/                 # Test-first: unitários (regras) + integração (zip → zip, determinismo)
```

**Structure Decision**: Pipeline ETL como módulos TS em `src/etl/`, reaproveitando os utilitários existentes de `src/lib/` (leitor ZIP e algoritmo de slug extraído para compartilhamento). Testes em `tests/etl/` (glob Vitest existente `tests/**/*.test.ts` já cobre subdiretórios). Sem novo projeto-raiz, sem segunda toolchain.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                                                   | Why Needed                                                                                                          | Simpler Alternative Rejected Because                                                                                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dev-dependency `tsx`                                        | Executar TypeScript diretamente em `npm run etl` (Node >= 20 não executa TS nativamente de forma estável)           | `node --experimental-strip-types` depende de Node >= 22.6 (engines do projeto: >= 20); pré-compilar com `tsc` adiciona etapa de build; JS puro viola a Constituição (TypeScript obrigatório). `tsx` é dev-only, não embarcada no site. |
| Extração de `slugificarCampus` para `src/lib/slugificar.ts` | ETL e site precisam gerar/consumir slugs idênticos; duplicar o algoritmo arriscaria divergência de nomes de arquivo | Duplicação de lógica violaria Principle I (simplicidade/manutenção); refatoração é puramente mecânica e coberta pelos testes existentes de `dataset.test.ts`.                                                                          |
