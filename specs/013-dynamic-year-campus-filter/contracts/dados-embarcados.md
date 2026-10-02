# Contrato: Dados Embarcados (Inline JSON)

**Feature**: `013-dynamic-year-campus-filter` | **Date**: 2026-09-30
**Spec**: [spec.md](../spec.md)

Este documento define o formato e o mecanismo de entrega do payload de dados dos indicadores embarcado nas páginas HTML.

---

## 1. Tag de Injeção no HTML

No arquivo `src/layouts/BaseLayout.astro`, antes do fechamento da tag `</body>` (ou no `<head>`), é inserido o elemento:

```html
<script id="dados-indicadores" type="application/json">
  {
    "campi": [
      { "slug": "todos", "nome": "Todos os Campi", "anos": [2024, 2025, 2026] },
      { "slug": "serra", "nome": "Serra", "anos": [2024, 2025, 2026] }
    ],
    "anos": [2024, 2025, 2026],
    "entradas": [
      {
        "pilarNumero": 1,
        "campusSlug": "serra",
        "campusNome": "Serra",
        "ano": 2024,
        "dados": { ... }
      }
      /* Demais entradas agregadas */
    ]
  }
</script>
```

---

## 2. Interface TypeScript do Payload

```typescript
export interface DatasetEmbarcado {
  campi: Array<{
    slug: string;
    nome: string;
    anos: number[];
  }>;
  anos: number[];
  entradas: Array<{
    pilarNumero: 1 | 2 | 3;
    campusSlug: string;
    campusNome: string;
    ano: number;
    dados: {
      campus: string;
      ano_referencia: number;
      pilar: string;
      indicadores: Record<string, Record<string, unknown>>;
    };
  }>;
}
```

---

## 3. Regras de Segurança e Privacidade (Princípio IV)

1. O payload contém **estritamente dados agregados institucionais** já públicos no arquivo oficial `data/dist/indicadores.zip`.
2. Não contém nenhum identificador pessoal, CPF, nome de aluno ou matrícula.
3. Não requer autenticação, token ou chamada a endpoints de terceiros.
4. Totalmente imutável no navegador (apenas leitura).
