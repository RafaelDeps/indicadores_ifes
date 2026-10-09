# Contract: Módulo da Matriz Consolidada e Tags

## 1. Funções Utilitárias em `src/lib/matriz.ts`

### `obterIndicadoresMatriz(anoReferencia?: number): IndicadorMatrizItem[]`

Retorna a lista completa dos 9 indicadores do Campus Serra enriquecidos para exibição tabular na matriz.

- **Entrada**: `anoReferencia` (opcional, número do ano). Caso omitido, utiliza o ano mais recente disponível de cada indicador.
- **Retorno**: Array com 9 instâncias de `IndicadorMatrizItem`.

### `obterTagsDisponiveis(itens: IndicadorMatrizItem[]): TagTematica[]`

Calcula o rol de tags temáticas únicas presentes nos indicadores fornecidos, acompanhadas de sua contagem.

- **Entrada**: Array de `IndicadorMatrizItem`.
- **Retorno**: Array de `TagTematica` ordenado pelo número de ocorrências ou alfabeticamente.

### `filtrarIndicadores(itens: IndicadorMatrizItem[], tagId: string, termoBusca: string): IndicadorMatrizItem[]`

Filtra os indicadores aplicando a interseção da tag selecionada e do termo de busca digitado.

- **Entrada**:
  - `itens`: lista original de itens.
  - `tagId`: string ('todas' ou id da tag).
  - `termoBusca`: string a ser pesquisada.
- **Retorno**: Array contendo apenas os indicadores que atendem a ambos os critérios.

### `ordenarIndicadores(itens: IndicadorMatrizItem[], coluna: 'pilar' | 'sigla' | 'nome', direcao: 'asc' | 'desc'): IndicadorMatrizItem[]`

Retorna uma nova lista ordenada conforme a coluna e a direção informadas.

---

## 2. Contrato de Marcação HTML e Atributos ARIA

### Chips de Tags (`role="group"`)

```html
<div class="grupo-tags" role="group" aria-label="Filtrar por área temática">
  <button type="button" class="chip-tag chip-ativo" data-tag="todas" aria-pressed="true">
    Todas (9)
  </button>
  <button type="button" class="chip-tag" data-tag="pesquisa" aria-pressed="false">
    Pesquisa (3)
  </button>
  ...
</div>
```

### Campo de Busca Instantânea

```html
<div class="campo-busca-matriz">
  <label for="busca-matriz-input" class="sr-only">Pesquisar indicadores</label>
  <input
    id="busca-matriz-input"
    type="search"
    placeholder="Buscar por sigla, nome ou palavra-chave..."
    aria-label="Buscar indicadores da matriz"
    autocomplete="off"
  />
  <button type="button" id="btn-limpar-busca" aria-label="Limpar termo de busca" hidden>✕</button>
</div>
```

### Tabela Consolidada e Cabeçalhos Ordenáveis

```html
<table class="tabela-matriz" aria-label="Matriz consolidada de indicadores do Campus Serra">
  <thead>
    <tr>
      <th scope="col">
        <button type="button" class="btn-ordenar" data-coluna="pilar" aria-sort="ascending">
          Pilar <span class="icone-ordem" aria-hidden="true">▲</span>
        </button>
      </th>
      <th scope="col">
        <button type="button" class="btn-ordenar" data-coluna="sigla" aria-sort="none">
          Sigla <span class="icone-ordem" aria-hidden="true">↕</span>
        </button>
      </th>
      <th scope="col">
        <button type="button" class="btn-ordenar" data-coluna="nome" aria-sort="none">
          Indicador <span class="icone-ordem" aria-hidden="true">↕</span>
        </button>
      </th>
      <th scope="col">Último Valor</th>
      <th scope="col">Variação Recente</th>
      <th scope="col">Polaridade</th>
      <th scope="col">Ação</th>
    </tr>
  </thead>
  <tbody>
    <tr
      class="linha-indicador"
      data-sigla="NTPP"
      data-nome="número total de projetos de pesquisa"
      data-pilar="1"
      data-tags="pesquisa docencia projetos"
    >
      ...
    </tr>
    ...
  </tbody>
</table>
```
