# Implementation Plan: Refinamento do Pilar 2 e Consolidação Exclusiva do Campus Serra

**Branch**: `018-serra-pillar2-refinement` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/018-serra-pillar2-refinement/spec.md`

## Summary

Esta feature consolida o portal público de indicadores de pesquisa exclusivamente para o **Campus Serra** e refina o cálculo do **Pilar 2 (Fomento e Parcerias)**. A interface web desativa a opção de visualização agregada institucional `(Todos)` e fixa o Campus Serra como padrão absoluto. No pipeline ETL, a vigência de projetos plurianuais de fomento sem data final explícita passa a ser projetada no PIPDI com base na sua duração em meses (`duracao_meses`), eliminando a subnotificação de parcerias em 2025 e 2026. O fomento do complexo NOVA-IA (PJ 8503 e PJ 8504) é mantido em R$ 25M em 2025, o PINV preserva o OCC como nulo (Princípio III), as regras de liderança para o NTPP são mantidas e os artefatos de todos os campi continuam sendo gerados em background no zip hermético para satisfazer `make check-dados`.

## Technical Context

**Language/Version**: Python 3.14 (ETL) e TypeScript / Node.js 20+ (Frontend)  
**Primary Dependencies**: Astro, Vitest, pytest, pydantic/dataclasses padrão, zipfile  
**Storage**: Arquivos estáticos JSON herméticos em `data/dist/indicadores.zip`  
**Testing**: `pytest tests/etl` para o pipeline de dados; `npm run test:web` (Vitest) para o frontend  
**Target Platform**: Linux (CI/Build) / GitHub Pages (Hospedagem estática)  
**Project Type**: Aplicação web estática orientada a dados com pipeline ETL em lote  
**Performance Goals**: Tempo de build < 5s; execução do ETL completa < 10s  
**Constraints**: Conformidade estrita com a LGPD (Princípio IV) e fidelidade aos dados de origem sem estimativas artificiais (Princípio III)  
**Scale/Scope**: 1 campus ativo (Serra), 3 pilares de indicadores, anos de referência 2024, 2025 e 2026

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                             | Descrição                                                                        |  Status  | Justificativa                                                                                                                                                    |
| :------------------------------------ | :------------------------------------------------------------------------------- | :------: | :--------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Simplicidade**                   | Estrutura padrão do Astro sem dependências desnecessárias.                       | **PASS** | Mantém componentes e rotas existentes do Astro; ajustes apenas no seletor de campus e lógica de projeção no ETL.                                                 |
| **II. Desenvolvimento Test-First**    | Testes antes do código; Vitest para web e pytest para ETL.                       | **PASS** | Testes de unidade e regressão cobrem rigorosamente a projeção de datas no PIPDI e a desativação da opção `(Todos)` no frontend.                                  |
| **III. Fidelidade aos Dados**         | Nunca inventar, estimar ou arredondar valores sem fonte.                         | **PASS** | OCC mantido estritamente como `null`; PINV lê percentuais oficiais de `pinv_serra.json`; fomento do TAFPPI preserva valores literais das chamadas FINEP/SIGPESQ. |
| **IV. Dados Agregados Apenas**        | Conformidade com LGPD; nenhum CPF, nome ou dado individual em arquivos de saída. | **PASS** | Apenas métricas quantitativas agregadas são exportadas nos JSONs finais.                                                                                         |
| **V. Qualidade Básica**               | Textos em pt-BR, acessibilidade, responsividade móvel e sem erros de lint.       | **PASS** | Rótulo `(Desativado)` em pt-BR; seletores mantêm atributos ARIA e suporte móvel via slide-over drawer.                                                           |
| **VI. Deploy Automatizado com Gates** | Bloqueio de deploy em falhas; validação com `make check-dados`.                  | **PASS** | O pipeline continua gerando artefatos de todos os campi em background para validação total de schemas no `check-dados.py`.                                       |

## Project Structure

### Documentation (this feature)

```text
specs/018-serra-pillar2-refinement/
├── plan.md              # Este arquivo de plano de implementação
├── research.md          # Pesquisa técnica e decisões de design (Fase 0)
├── data-model.md        # Modelos de dados e fluxo de entidades (Fase 1)
├── quickstart.md        # Guia de validação e comandos de teste (Fase 1)
├── contracts/
│   └── pilar2-contract.md # Especificação do contrato JSON do Pilar 2
└── checklists/
    └── requirements.md  # Checklist de validação de qualidade
```

### Source Code (repository root)

```text
etl/
├── adapters/
│   └── sources/
│       ├── zip_canonical_source.py   # Projeção de vigência (ano_fim) via duracao_meses
│       └── facto_csv_source.py       # Leitura de parcerias FACTO
├── core/
│   └── logic/
│       ├── calculators/
│       │   ├── pillar2.py            # Cálculo do TAFPPI, PIPDI e PINV
│       │   └── aggregator.py         # Orquestração por campus e ano
│       └── resolvers/
│           └── campus_resolver.py    # Resolução de campus e lotação
└── main.py                           # Ponto de entrada do pipeline de indicadores

src/
├── layouts/
│   └── BaseLayout.astro              # Seletor de campus com 'todos' desativado e Serra padrão
├── lib/
│   ├── contexto-cliente.ts           # Sincronização do cliente ancorada no Campus Serra
│   ├── dataset-core.ts               # Modelagem e opções de seleção de campus
│   └── ano.ts                        # Resolução de contexto de campus e ano
```

**Structure Decision**: Preserva a arquitetura hexagonal existente no ETL (`etl/`) e a estrutura de layout e componentes do Astro (`src/`), concentrando os refinamentos pontualmente nas classes de extração temporal e seletores de visualização.

## Complexity Tracking

_Nenhuma violação constitucional identificada. Arquitetura mantida dentro dos limites de simplicidade._
