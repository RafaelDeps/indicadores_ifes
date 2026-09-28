# Research: Refatoração da Arquitetura Hexagonal do ETL (Ports & Adapters)

**Feature**: `007-hexagonal-etl-refactor` | **Date**: 2026-09-25

Este documento consolida as decisões técnicas e arquiteturais tomadas para refatorar o módulo `src/etl/` do padrão procedural plano para o padrão Hexagonal (Ports & Adapters), espelhando a arquitetura canônica existente no projeto irmão `horizon_etl/src/`.

---

## D1 — Mapeamento da Arquitetura de `horizon_etl` para TypeScript

- **Decisão**: Adotar a estrutura tripartite do `horizon_etl`:
  - `src/etl/core/ports/`: Contratos de interface TypeScript (`source.ts`, `sink.ts`).
  - `src/etl/core/logic/`: Lógica analítica pura (resolvers de campus/pessoas, janelas de vigência e calculadores dos pilares 1, 2, 3 e `todos`).
  - `src/etl/adapters/`: Implementações concretas de I/O divididas em `sources/` (leitura de `exports_canonical.zip`) e `sinks/` (formatação de JSONs e escrita atômica do ZIP).
  - `src/etl/flows/`: Orquestradores de fluxo (`indicadores_flow.ts`).
- **Justificativa**: Garante consistência arquitetural entre os dois repositórios institucionais da equipe, simplifica a transferência de conhecimento e desacopla totalmente a camada de negócio de dependências de arquivo e formato.
- **Alternativas Rejeitadas**:
  - _Manter estrutura plana_: Rejeitada por misturar responsabilidades (ex.: `pillars.ts` fazendo cálculo analítico e formatação de contrato JSON ao mesmo tempo).
  - _Arquitetura em camadas MVC clássica_: Rejeitada pois ETL lida essencialmente com fluxos unidirecionais de dados (extração → transformação → carga), sendo Ports & Adapters a representação ideal.

---

## D2 — Assinaturas Síncronas nas Portas `ISource` e `ISink`

- **Decisão**: Definir `extract(): ExportCanonicos` e `load(dados: RegistroPilarJson[]): void` de forma estritamente síncrona.
- **Justificativa**: A descompressão no projeto já é executada de forma determinística em memória usando `node:zlib.inflateRawSync` e `node:fs.readFileSync`. Como o processamento completo consome menos de 1 segundo, introduzir `Promise` ou `async/await` adicionaria complexidade acidental sem ganho de throughput, violando o Princípio I (Simplicidade).
- **Alternativas Rejeitadas**:
  - _Assinaturas baseadas em Promise_: Descartada por overhead desnecessário e potencial quebra de assinaturas nos testes síncronos já validados.

---

## D3 — Desacoplamento entre Cálculo de Métricas e Formatação de Contrato

- **Decisão**: A camada `core/logic` produz exclusivamente instâncias do modelo de domínio (`DomainAggregates`), contendo valores numéricos ou `null`. A formatação para o esquema JSON de cabeçalho e indicadores da feature 004 passa a ser responsabilidade exclusiva do adaptador `JsonPilarSink` em `adapters/sinks/`.
- **Justificativa**: Respeita o Princípio da Responsabilidade Única (SRP). O núcleo de negócio não deve ter conhecimento da estrutura externa de exibição ou serialização, permitindo que alterações futuras nos contratos de visualização não toquem na lógica de consolidação.
- **Alternativas Rejeitadas**:
  - _Retornar strings JSON diretamente do cálculo_: Descartada por acoplar serialização com lógica de negócio.

---

## D4 — Estrutura e Reorganização dos Testes

- **Decisão**: Reorganizar a suíte de testes em `tests/etl/` para espelhar as pastas de código:
  - `tests/etl/core/`: Testes unitários puros de resolução, datas e calculadores de pilares.
  - `tests/etl/adapters/`: Testes de leitura do ZIP de entrada e escrita do ZIP de saída.
  - `tests/etl/flows/`: Testes de integração do fluxo ponta a ponta e testes de privacidade (LGPD).
- **Justificativa**: Torna a localização de testes intuitiva e permite que a camada de domínio seja testada com fixtures em memória em velocidade máxima (milissegundos), sem tocar no disco.
- **Alternativas Rejeitadas**:
  - _Manter testes planos em `tests/etl/*.test.ts`_: Descartada para manter a coerência estrutural entre código-fonte e testes.
