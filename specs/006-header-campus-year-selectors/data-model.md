# Data Model: Seletores de Campus e Ano no Cabeçalho

**Feature**: `006-header-campus-year-selectors`  
**Date**: 2026-09-23  
**Status**: Concluído

Este documento define as entidades, estruturas de dados tipadas, regras de validação e operações de suporte para os dropdowns de seleção no cabeçalho.

---

## 1. Entidades e Tipos TypeScript

### `CampusOpcao`

Representa uma opção exibível no seletor de campus.

```typescript
export interface CampusOpcao {
  /** Identificador normalizado do campus (ex.: 'todos', 'serra', 'vitoria') */
  slug: string;
  /** Nome legível para o usuário (ex.: '(Todos)', 'Serra', 'Vitória') */
  nome: string;
}
```

**Regras de Unicidade e Ordenação**:

- `slug` deve ser único em toda a lista.
- O primeiro elemento do array retornado deve ser obrigatoriamente `{ slug: 'todos', nome: '(Todos)' }`.
- Todos os elementos subsequentes devem ser ordenados crescentemente por `nome` conforme a regra de colação da língua portuguesa (`pt-BR`).

---

### `AnoOpcao`

Representa uma opção exibível no seletor de ano.

```typescript
export interface AnoOpcao {
  /** Ano numérico de 4 dígitos (ex.: 2026, 2025) */
  ano: number;
  /** Rótulo textual para exibição (ex.: '2026') */
  rotulo: string;
  /** Indica se é o ano mais recente (seleção padrão) */
  padrao?: boolean;
}
```

**Regras de Unicidade e Ordenação**:

- `ano` deve ser único em toda a lista.
- A lista deve ser ordenada estritamente em ordem decrescente (`b - a`).
- O primeiro elemento da lista corresponde ao ano mais recente e deve ser a seleção padrão inicial.

---

### `ContextoFiltro`

Representa o estado ativo de seleção de filtros na aplicação.

```typescript
export interface ContextoFiltro {
  /** Slug do campus ativo ('todos' ou slug de unidade) */
  campus: string;
  /** Ano de referência ativo */
  ano: number;
}
```

---

## 2. Funções de Suporte e Operações do Domínio

### `obterCampiParaSelect`

Localização: `src/lib/dataset.ts`

```typescript
/**
 * Retorna a lista de campi para preenchimento do seletor suspenso.
 * Garante '(Todos)' na primeira posição e ordena os demais alfabeticamente.
 */
export function obterCampiParaSelect(dataset = datasetPadrao): CampusOpcao[] {
  const listaCampi = dataset.campi.filter((c) => c.slug !== 'todos');

  listaCampi.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }));

  return [
    { slug: 'todos', nome: '(Todos)' },
    ...listaCampi.map((c) => ({ slug: c.slug, nome: c.nome })),
  ];
}
```

---

### `obterAnosParaSelect`

Localização: `src/lib/dataset.ts`

```typescript
/**
 * Retorna os anos disponíveis para o seletor em ordem decrescente (mais recente primeiro).
 */
export function obterAnosParaSelect(dataset = datasetPadrao): number[] {
  return [...dataset.anos].sort((a, b) => b - a);
}
```

---

### `resolverContextoFiltro`

Localização: `src/lib/ano.ts`

```typescript
/**
 * Resolve e sanitiza a combinação de campus e ano a partir dos parâmetros de consulta da URL.
 * Em caso de valores inválidos ou omitidos, retorna os padrões seguros: 'todos' e o ano mais recente.
 */
export function resolverContextoFiltro(
  paramCampus: string | null,
  paramAno: string | null,
  campiValidos: CampusOpcao[],
  anosValidos: number[],
): ContextoFiltro {
  const anoMaisRecente = anosValidos[0] || 2026;

  let campusFinal = 'todos';
  if (paramCampus) {
    const slugLimpo = paramCampus.trim().toLowerCase();
    if (campiValidos.some((c) => c.slug === slugLimpo)) {
      campusFinal = slugLimpo;
    }
  }

  let anoFinal = anoMaisRecente;
  if (paramAno) {
    const anoNum = parseInt(paramAno, 10);
    if (!isNaN(anoNum) && anosValidos.includes(anoNum)) {
      anoFinal = anoNum;
    }
  }

  return {
    campus: campusFinal,
    ano: anoFinal,
  };
}
```

---

## 3. Transições de Estado

| Estado Atual             | Ação do Usuário         | Novo Estado                      | Efeito na URL                   |
| :----------------------- | :---------------------- | :------------------------------- | :------------------------------ |
| `campus=todos, ano=2026` | Seleciona `Serra`       | `campus=serra, ano=2026`         | `?campus=serra&ano=2026`        |
| `campus=serra, ano=2026` | Seleciona `2025`        | `campus=serra, ano=2025`         | `?campus=serra&ano=2025`        |
| `campus=serra, ano=2025` | Seleciona `(Todos)`     | `campus=todos, ano=2025`         | `?campus=todos&ano=2025`        |
| `campus=qualquer, ano=X` | Clica em link `Pilar 1` | `campus=qualquer, ano=X`         | Mantém `?campus=qualquer&ano=X` |
| Acessa URL inválida      | Carga da página         | `campus=todos, ano=mais_recente` | Normaliza para valores padrão   |
