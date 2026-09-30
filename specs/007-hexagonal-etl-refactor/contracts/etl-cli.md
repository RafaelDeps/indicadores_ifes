# Contract: Contrato da Interface CLI do ETL (`make etl`)

**Feature**: `007-hexagonal-etl-refactor` | **Date**: 2026-09-25

> **Nota de vigência**: layout/implementação históricos (CLI TypeScript
> `npm run etl` ativando `src/etl/main.ts`, pacote na raiz). A partir das
> specs 008/009 o pipeline é Python, executado por `make etl` (`make dados`
> para o pacote completo) com entrada em
> `data/canonical/exports_canonical.zip` e saída em `data/dist/indicadores.zip`
> — ver [009/contracts/](../009-reorganize-horizon-architecture/contracts/). A
> mensagem de conclusão com `{N}`/`{C}` variáveis é mantida nas versões
> atuais.

Este contrato preserva a interface de linha de comando operada pelos mantenedores e scripts de automação.

---

## 1. Comando de Execução

```bash
make etl
```

Internamente aciona `PYTHONPATH=. python -m etl.main` (alvo `etl` do `Makefile`). A forma histórica era `npm run etl` → `tsx src/etl/main.ts`.

---

## 2. Parâmetros e Opções Programáticas (`src/etl/main.ts`)

```typescript
export interface OpcoesEtl {
  dirBase?: string; // Diretório raiz (padrão: process.cwd())
  entrada?: string; // Caminho do arquivo de entrada (padrão: "exports_canonical.zip")
  saida?: string; // Caminho do arquivo de saída (padrão: "indicadores.zip")
  anos?: number[]; // Lista de anos a calcular (padrão: [2024, 2025, 2026])
  logger?: Logger; // Mecanismo de log (padrão: console)
}

export function executarEtl(opcoes?: OpcoesEtl): ResultadoEtl;
```

---

## 3. Códigos de Retorno e Saídas no Terminal

- **Código de Saída `0` (Sucesso)**:
  - Mensagem no `stdout` em pt-BR:
    ```text
    ETL concluído: {N} arquivos gerados ({C} campi + todos), anos 2024–2026.
    ```
  - O arquivo `indicadores.zip` é gerado/substituído de forma atômica e íntegra.

- **Código de Saída `1` (Erro/Falha Rápida)**:
  - Mensagem no `stderr` em pt-BR com prefixo `ERRO:`.
  - Nenhum pacote ZIP parcial ou corrompido é gravado no destino.
