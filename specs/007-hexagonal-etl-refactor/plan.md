# Implementation Plan: Refatoração da Arquitetura Hexagonal do ETL (Ports & Adapters)

**Branch**: `007-hexagonal-etl-refactor` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-hexagonal-etl-refactor/spec.md`

## Summary

Refatorar o módulo `src/etl/` da estrutura procedural plana atual para a arquitetura Hexagonal (Ports & Adapters) espelhada em `horizon_etl/src/`. O núcleo analítico (`core/logic/`) será estritamente desacoplado de operações de I/O e serialização, as interfaces de abstração residirão em `core/ports/`, os leitores e escritores residirão em `adapters/` (`sources/` e `sinks/`), e a orquestração será encapsulada em `flows/` (`indicadores_flow.ts`). O ponto de entrada CLI `npm run etl` (`src/etl/main.ts`) delegará para o novo fluxo. A refatoração mantém zero regressões nos 231 testes existentes e fidelidade estrita ao Princípio III.

## Technical Context

**Language/Version**: TypeScript 5.8 (Node.js >= 20, ESM)

**Primary Dependencies**: Nenhuma nova dependência de runtime (reutiliza `node:fs`, `node:zlib` e `src/lib/zip.ts`). Dev-dependency: `tsx` (existente).

**Storage**: Arquivos locais (`exports_canonical.zip` como entrada; `indicadores.zip` na raiz como saída).

**Testing**: Vitest (`npm test`). Todos os 231 testes existentes devem continuar verdes.

**Target Platform**: Ambientes de desenvolvimento locais (Linux/macOS) e CI no GitHub Actions.

**Project Type**: CLI / Pipeline de dados estruturado em arquitetura Ports & Adapters.

**Performance Goals**: Tempo de execução total de `npm run etl` < 5 segundos para a base de dados canônica integral.

**Constraints**: Determinismo estrito, preservação de `null` vs `0` (Princípio III), nenhuma exposição de PII (Princípio IV), paridade arquitetural com `horizon_etl`.

**Scale/Scope**: 3 pilares × (campi do export + `todos`) × 3 anos (2024–2026); nº de arquivos JSON gerados por execução é **variável** conforme o export.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                        | Avaliação | Evidência                                                                                                                                                                                                    |
| :------------------------------- | :-------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicity**                |  ✅ PASS  | Zero dependências novas adicionadas. A arquitetura Ports & Adapters simplifica o entendimento por espelhar exatamente o projeto irmão `horizon_etl`, reduzindo acoplamento sem adicionar frameworks pesados. |
| **II. Test-First Development**   |  ✅ PASS  | Todos os 231 testes existentes cobrem cálculos de indicadores, regras de data e resolução de campus. A estrutura de testes espelhará a nova árvore sem perder nenhum caso de teste.                          |
| **III. Fidelity to Report Data** |  ✅ PASS  | Preservação estrita das regras validadas: ausência de dado = `null`; contagem nula comprovada = `0`. Validação no sink rejeita violações.                                                                    |
| **IV. Aggregated Data Only**     |  ✅ PASS  | O pipeline manipula apenas dados agregados nos sinks de saída; nenhum dado pessoal (nomes/identificadores) é serializado nos JSONs finais.                                                                   |
| **V. Basic Quality**             |  ✅ PASS  | Tipagem TypeScript estrita, conformidade total com ESLint e Prettier, mensagens de log da CLI em pt-BR.                                                                                                      |
| **VI. Automated Deployment**     |  ✅ PASS  | Pipeline de deploy estático do Astro intocado; o pacote `indicadores.zip` gerado continua consumível sem quebras.                                                                                            |

## Project Structure

### Documentation (this feature)

```text
specs/007-hexagonal-etl-refactor/
├── plan.md              # Este arquivo
├── research.md          # Decisões técnicas (D1 a D4)
├── data-model.md        # Entidades de domínio, portas e agregados
├── quickstart.md        # Guia de validação ponta a ponta
├── contracts/
│   ├── ports-contract.md# Interfaces TypeScript de ISource, ISink e IndicadoresFlow
│   └── etl-cli.md       # Contrato de linha de comando npm run etl
└── checklists/
    └── requirements.md  # Validação de qualidade dos requisitos
```

### Source Code (repository root)

```text
src/
└── etl/
    ├── core/
    │   ├── ports/
    │   │   ├── source.ts               # Interface ISource
    │   │   └── sink.ts                 # Interface ISink
    │   ├── logic/
    │   │   ├── resolvers/
    │   │   │   ├── campus_resolver.ts  # Resolução declarada -> coordenador -> equipe
    │   │   │   └── people_registry.ts  # Classificação e deduplicação de pesquisadores/estudantes
    │   │   ├── temporal/
    │   │   │   └── activity_filter.ts  # Regra de vigência de iniciativas e produções no ano Y
    │   │   ├── calculators/
    │   │   │   ├── pillar1.ts          # NTPP, QSPP, NEP (PIES/PICOT null)
    │   │   │   ├── pillar2.ts          # PINV, PIPDI (nulls explicados)
    │   │   │   ├── pillar3.ts          # PIPRO (NPB + NPT), PIPROT, PIPROTR
    │   │   │   └── aggregator.ts       # Consolidação por campus e escopo institucional 'todos'
    │   │   └── types.ts                # Modelos de domínio e agregados puros
    │   └── types.ts                    # Entidades canônicas compartilhadas
    │
    ├── adapters/
    │   ├── sources/
    │   │   └── zip_canonical_source.ts # Implementa ISource (substitui load.ts)
    │   └── sinks/
    │       ├── json_pilar_sink.ts      # Serialização no contrato estrito pilar{N}_{campus}_{year}.json
    │       ├── zip_indicadores_sink.ts # Implementa ISink, validação 004 e gravação atômica
    │       └── serialize.ts            # Utilitários de serialização determinística
    │
    ├── flows/
    │   └── indicadores_flow.ts         # Orquestrador: source.extract() -> core.compute() -> sink.load()
    │
    └── main.ts                         # Entrypoint CLI desacoplado (npm run etl)

tests/
└── etl/
    ├── core/                           # Testes unitários puros da lógica de domínio
    ├── adapters/                       # Testes dos adaptadores de leitura/escrita ZIP
    ├── flows/                          # Testes de integração do fluxo e privacidade (LGPD)
    └── fixtures.ts                     # Dados sintéticos compartilhados para testes
```

## Post-Design Re-Check

Nenhuma violação aos princípios da constituição detectada. O plano está completamente delineado e pronto para a fase de decomposição de tarefas (`/speckit-tasks`).
