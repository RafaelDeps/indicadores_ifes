# Contract: Estrutura Física de Dados e Regras de Versionamento

**Feature**: `009-reorganize-horizon-architecture`
**Date**: 2026-09-26
**Status**: Complete

## 1. Topologia do Diretório `data/`

O diretório `data/` isola categoricamente o fluxo de dados em três estágios físicos:

```text
data/
├── canonical/
│   ├── .gitkeep                 # Versionado no Git para preservar o diretório
│   └── exports_canonical.zip    # IGNORADO no Git (tamanho variável). Fonte bruta upstream.
├── dist/
│   ├── indicadores.zip          # VERSIONADO no Git (212 KB). Pacote oficial de produção.
│   └── indicadores_*.zip        # IGNORADO no Git. Pacotes de teste/desenvolvimento de campus.
└── reports/
    └── etl_run_report.md        # VERSIONADO no Git. Atestado auditável da última execução.
```

---

## 2. Regras Estritas do `.gitignore`

O arquivo `.gitignore` na raiz do projeto deve conter as seguintes regras explícitas:

```gitignore
# Governança de Dados (Padrão Horizon)
data/canonical/*
!data/canonical/.gitkeep

# Pacotes parciais e de desenvolvimento de campus
data/dist/indicadores_*.zip

# Zips soltos na raiz (rejeição total)
/*.zip
```

---

## 3. Contrato de Leitura do Frontend Astro (`src/lib/dataset.ts`)

A função `carregarDataset()` em [`src/lib/dataset.ts`](file:///home/rafael/indicadores_ifes/src/lib/dataset.ts) passa a operar com o seguinte contrato:

1. **Caminho Padrão**: `path.resolve(process.cwd(), 'data/dist/indicadores.zip')`.
2. **Tratamento de Ausência**:
   - Se o arquivo `data/dist/indicadores.zip` não existir:
     - Emite mensagem de aviso legível no console: `[Aviso] Pacote de indicadores não encontrado em data/dist/indicadores.zip. Execute 'make etl' para gerar o dataset.`
     - Retorna dataset vazio `{ campi: [], anos: [], entradas: [] }` de forma segura, impedindo quebras incontroladas de execução em tempo de desenvolvimento.
3. **Descontinuação dos JSONs Estáticos**:
   - Os arquivos `src/data/*.json` são removidos.
   - O arquivo `src/data/indicadores.ts` exporta exclusivamente constantes de metadados (`INDICADORES_META`, `PILARES`) e definições de tipos TypeScript (`Indicador`, `SiglaIndicador`, etc.).
