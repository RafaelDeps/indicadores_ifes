# Contract: Interfaces de Portas e Fluxos do ETL (Hexagonal Architecture)

**Feature**: `007-hexagonal-etl-refactor` | **Date**: 2026-09-25

Este contrato estabelece as assinaturas de código para as portas primárias e secundárias do pipeline ETL.

---

## 1. Porta de Entrada: `ISource` (`src/etl/core/ports/source.ts`)

```typescript
import type { ExportCanonicos } from '../types';

export interface ISource {
  /**
   * Extrai e parseia os conjuntos canônicos de dados brutos.
   *
   * @throws {Error} Quando a fonte não puder ser lida ou arquivos essenciais estiverem ausentes.
   * @returns Conjunto canônico completo e validado em memória.
   */
  extract(): ExportCanonicos;
}
```

---

## 2. Porta de Saída: `ISink` (`src/etl/core/ports/sink.ts`)

```typescript
import type { RegistroPilarJson } from '../types';

export interface ISink {
  /**
   * Valida e grava a lista de arquivos gerados no destino final.
   *
   * @param arquivos Lista de arquivos serializados (nome e conteúdo).
   * @throws {Error} Quando a validação contra o contrato 004 falhar ou houver erro de escrita.
   */
  load(arquivos: RegistroPilarJson[]): void;
}
```

---

## 3. Orquestrador de Fluxo: `IndicadoresFlow` (`src/etl/flows/indicadores_flow.ts`)

```typescript
import type { ISource } from '../core/ports/source';
import type { ISink } from '../core/ports/sink';
import type { Logger, ResultadoEtl } from '../core/types';

export interface OpcoesFluxo {
  source: ISource;
  sink: ISink;
  anos?: number[];
  logger?: Logger;
}

export class IndicadoresFlow {
  constructor(private opcoes: OpcoesFluxo) {}

  /**
   * Executa a sequência completa do pipeline:
   * 1. Extração via source.extract()
   * 2. Resolução e cálculo de domínio via core/logic
   * 3. Formatação dos pilares e validação de contrato
   * 4. Persistência atômica via sink.load()
   */
  run(): ResultadoEtl;
}
```
