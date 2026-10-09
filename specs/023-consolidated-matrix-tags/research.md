# Research: Matriz Geral Consolidada e Tags Temáticas

## Objetivo da Pesquisa

Definir as decisões arquiteturais e técnicas para a implementação da Matriz Geral Consolidada dos 9 indicadores do IFES Campus Serra com filtragem rápida por tags temáticas e busca em tempo real, mantendo conformidade estrita com a Constituição do projeto (Astro SSG, zero dependências extras, acessibilidade WCAG AA, tipografia e tokens institucionais).

---

## 1. Modelo e Taxonomia de Tags Temáticas

### Decisão

Criar um módulo de catálogo auxiliar em `src/lib/matriz.ts` (ou extensão em `src/data/indicadores.ts`) que mapeia os 9 indicadores existentes do Campus Serra para um conjunto coerente de tags temáticas institucionais, mantendo a compatibilidade regressiva com a interface `Indicador`.

Tags padronizadas:

- **Pesquisa**: NTPP, QSPP, PIPRO
- **Docência / Servidores**: NTPP, QSPP
- **Estudantes / Inclusão**: PIES
- **Extensão / Cooperação**: PICOT, PIPDI
- **Gestão / Fomento**: PINV
- **Inovação / Propriedade Intelectual**: PIPDI, PIPROT, PIPROTR

### Rationale

- Não altera arquivos de pipeline ETL nem altera schemas brutos que dependem de `data/`.
- Permite mapeamento limpo em TypeScript garantindo que todo indicador possua ao menos 2 tags relevantes.
- Permite calcular dinamicamente a contagem de indicadores por tag para exibição nos chips (`Pesquisa (3)`, `Inovação (3)`, etc.).

### Alternativas Consideradas

- _Adicionar campo obrigatório `tags: string[]` em `Indicador` direto na tipagem original_: Requereria alterar todas as instâncias de mock em dezenas de testes unitários existentes. Mapear de forma extensível em `src/lib/matriz.ts` com fallback evita quebra de contratos legados.
- _Filtros puramente por Pilar_: Os pilares já existem na navegação; as tags oferecem um corte transversal temático muito mais rico e solicitado pelos gestores.

---

## 2. Mecanismo de Filtragem e Busca Client-Side

### Decisão

Implementar filtragem client-side em JavaScript nativo (vanilla TS embutido no Astro via `<script>`) operando sobre elementos do DOM com atributos `data-` (`data-sigla`, `data-nome`, `data-tags`, `data-pilar`) ou mantendo os dados consolidados em um script JSON inline leve (`dados-matriz`).

A busca textual realiza normalização de string:

```typescript
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
```

A filtragem combina a tag selecionada (se houver) e o termo de busca (interseção lógica `E`):

- Se `tag !== 'todas'`, o indicador precisa conter a tag.
- Se `busca !== ''`, o termo normalizado precisa estar contido na sigla, nome ou tags normalizadas.

### Rationale

- Desempenho instantâneo (< 10ms) para 9 indicadores sem recarregamento ou re-renderização externa.
- Zero dependências (dispensa Alpine, React, Preact ou Svelte).
- Respeita o Princípio I (Simplicidade) e Princípio V (Qualidade básica).

### Alternativas Consideradas

- _Filtragem via Query Params na URL (`?tag=pesquisa`)_: Causaria reload completo da página no SSG estático, gerando experiência mais lenta e dependência de SSR que não existe no projeto.
- _Componente React interativo_: Violaria o Princípio I da constituição ao introduzir runtime desnecessário para filtrar 9 linhas de tabela.

---

## 3. Ordenação Tabular Acessível

### Decisão

Permitir ordenação das linhas da tabela por clique nos cabeçalhos das colunas "Pilar", "Sigla" e "Nome".

- Os cabeçalhos são botões `<button type="button" class="cabecalho-ordem">` com atributo `aria-sort` (`ascending`, `descending` ou `none`).
- A ordenação padrão inicial é por Pilar (ascendente: 1 -> 2 -> 3), mantendo a ordem oficial CONIF.
- As linhas filtradas (ocultas) permanecem ocultas durante e após a ordenação.

### Rationale

- Semântica padrão da W3C / WAI-ARIA para tabelas de dados ordenáveis.
- Operável integralmente por teclado (Enter / Espaço) e anunciado por leitores de tela.

### Alternativas Consideradas

- _Select dropdown de ordenação_: Menos intuitivo que clicar diretamente no cabeçalho da coluna desejada em tabelas executivas.

---

## 4. Estrutura de Rotas e Navegação

### Decisão

- Criar a página estática em `src/pages/matriz/index.astro`.
- Adicionar o link de navegação "Matriz" na barra principal (`BaseLayout.astro`) e na gaveta móvel com indicador `aria-current="page"` quando `Astro.url.pathname.startsWith('/matriz')`.
- Adicionar um card/banner de acesso rápido na página inicial (`src/pages/index.astro`), conectando a visão em cards aos dados consolidados.

### Rationale

- Facilita o acesso direto tanto para quem entra na home quanto para quem navega pelos pilares.
- URLs limpas e semânticas (`/matriz/`).
