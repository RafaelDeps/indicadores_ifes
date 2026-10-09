# Data Model: Matriz Geral Consolidada e Tags Temáticas

## Visão Geral das Entidades

Este documento descreve os modelos de dados e transformações necessárias para a renderização e manipulação da Matriz Geral Consolidada de Indicadores do IFES Campus Serra.

---

## 1. Entidades Principais

### `TagTematica`

Representa uma categoria temática transversal aos pilares CONIF.

```typescript
export interface TagTematica {
  id: string; // Ex: 'pesquisa', 'inovacao', 'docencia'
  nome: string; // Ex: 'Pesquisa', 'Inovação', 'Docência'
  total: number; // Quantidade de indicadores vinculados a esta tag no Campus Serra
}
```

### `IndicadorMatrizItem`

Representa a linha consolidada de um indicador na tabela da matriz geral.

```typescript
export interface IndicadorMatrizItem {
  sigla: string; // Ex: 'NTPP', 'PINV', 'PIPRO'
  slug: string; // Ex: 'ntpp', 'pinv', 'pipro'
  pilarNumero: 1 | 2 | 3;
  pilarNome: string; // Ex: 'Engajamento Acadêmico e Inclusão'
  nome: string; // Nome oficial completo do indicador
  tipoValor: 'quantidade' | 'percentual';
  unidade: string; // Ex: 'projetos', 'servidores', 'R$', '%'
  polaridade: 'maior_melhor' | 'menor_melhor';
  polaridadeRotulo: string; // 'Quanto maior, melhor' | 'Menor é melhor'
  tags: string[]; // Lista de nomes de tags (ex: ['Pesquisa', 'Docência'])
  ultimoAno: number | null; // Ano mais recente com valor apurado ou ano de referência
  ultimoValor: number | null;
  ultimoValorFormatado: string; // Formatado com unidade ou "Dado indisponível"
  delta: {
    tipo: 'percentual' | 'absoluto' | 'sem_base';
    valorFormatado: string; // Ex: '+12,5%', '-3,0%', '—'
    positivo: boolean | null;
    simbolo: '▲' | '▼' | '=' | '';
    descricaoAcessivel: string;
  } | null;
  urlDetalhe: string; // Ex: '/pilar-1/ntpp/'
}
```

### `EstadoFiltroMatriz`

Estrutura que governa o estado de filtragem interativa no cliente:

```typescript
export interface EstadoFiltroMatriz {
  tagAtiva: string; // 'todas' ou id da tag
  termoBusca: string; // Termo digitado pelo usuário (normalizado)
  colunaOrdem: 'pilar' | 'sigla' | 'nome'; // Coluna ativa para ordenação
  direcaoOrdem: 'asc' | 'desc'; // Sentido da ordenação
}
```

---

## 2. Catálogo de Indicadores e Atribuição de Tags

| Sigla       | Pilar | Nome Oficial                                  | Tags Temáticas                      |
| :---------- | :---: | :-------------------------------------------- | :---------------------------------- |
| **NTPP**    |   1   | Número Total de Projetos de Pesquisa          | Pesquisa, Docência, Projetos        |
| **QSPP**    |   1   | Quadro de Servidores em Projetos de Pesquisa  | Pesquisa, Servidores, Docência      |
| **PIES**    |   1   | Participação de Estudantes em Projetos        | Ensino, Estudantes, Inclusão        |
| **PICOT**   |   1   | Projetos em Parceria ou Cooperação            | Extensão, Parcerias, Projetos       |
| **PINV**    |   2   | Recursos Financeiros Aplicados em P&I         | Gestão, Fomento, Financiamento      |
| **PIPDI**   |   2   | Acordos de Parceria e Cooperação              | Inovação, Parcerias, Cooperação     |
| **PIPRO**   |   3   | Produção Intelectual de P&I                   | Pesquisa, Produção Intelectual      |
| **PIPROT**  |   3   | Proteção de Ativos de Propriedade Intelectual | Inovação, Propriedade Intelectual   |
| **PIPROTR** |   3   | Transferência de Tecnologia Concluída         | Inovação, Transferência Tecnológica |

---

## 3. Regras de Validação e Integridade

1. **Totalidade**: A matriz deve conter rigorosamente todos os 9 indicadores do Campus Serra cadastrados no catálogo oficial.
2. **Fidelidade (Princípio III)**: Se `ultimoValor` for `null`, `ultimoValorFormatado` DEVE ser exatamente `"Dado indisponível"` e o delta DEVE indicar `"Dado indisponível"` ou `"Sem apuração anterior"`. Em nenhuma circunstância o valor pode ser transformado em 0.
3. **Imutabilidade**: A lista de indicadores é gerada em tempo de build estático e permanece inalterada durante a execução no navegador; os filtros apenas alternam visibilidade via classes/estilos DOM.
