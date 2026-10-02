# Data Model: Refatoração da Arquitetura Hexagonal do ETL

**Feature**: `007-hexagonal-etl-refactor` | **Date**: 2026-09-25

Este documento define as entidades de domínio, os contratos das portas (ports) e os modelos de dados manipulados pelas camadas do ETL.

---

## 1. Portas do Sistema (`core/ports/`)

### `ISource` (`core/ports/source.ts`)

Interface de extração de dados da origem:

```typescript
export interface ISource {
  /**
   * Extrai e carrega as coleções canônicas de dados brutos em memória.
   * Lança exceção em caso de arquivo ausente, corrompido ou formato inválido.
   */
  extract(): ExportCanonicos;
}
```

### `ISink` (`core/ports/sink.ts`)

Interface de carga e persistência do destino:

```typescript
export interface ISink {
  /**
   * Valida e persiste os arquivos gerados de indicadores no destino especificado.
   */
  load(arquivos: RegistroPilarJson[]): void;
}
```

---

## 2. Entidades Canônicas de Entrada (`core/types.ts`)

Representam os dados brutos lidos do pacote canônico (`exports_canonical.zip`):

- **`RefCampus`**: Objeto `{ id: number; name: string }`.
- **`MembroEquipe`**: `{ person_id: number; person_name: string; roles: string[]; start_date: string | null; end_date: string | null }`.
- **`Iniciativa`**: `{ id: number; name: string; status: string | null; start_date: string | null; end_date: string | null; initiative_type: { id: number; name: string } | null; campus: RefCampus | null; team: MembroEquipe[] | null }`.
- **`Pessoa`**: `{ id: number; name: string; classification: string | null; campus: RefCampus | null; articles: Array<{ id: number; year: number }> | null }`.
- **`Artigo`**: `{ id: number; title: string; year: number | null; type: string | null; campus: RefCampus | null }`.
- **`Producao`**: `{ id: number; title: string; year: number | null; production_type_id: number | null; campus: RefCampus | null }`.
- **`AutorProducao`**: `{ production_id: number; researcher_id: number }`.
- **`TipoProducao`**: `{ id: number; name: string }`.
- **`ExportCanonicos`**: Estrutura que agrega todas as coleções acima deduplicadas por ID, além de lista de avisos emitidos.

---

## 3. Modelo de Domínio e Agregados (`core/logic/types.ts`)

Representam os dados intermediários e finais calculados pela lógica pura, antes da serialização:

- **`AgregadosAno`**:
  - `ntpp: number`: Total de projetos de pesquisa ativos no ano.
  - `qspp: number`: Servidores únicos participantes em projetos ativos no ano.
  - `nep: number`: Estudantes únicos participantes em projetos ativos no ano.
  - `npb: number`: Produções acadêmicas e bibliográficas do ano.
  - `npt: number`: Produções técnicas e tecnológicas do ano.
  - `pc: number`: Softwares sem patente do ano.
- **`DadosAgregados`**:
  - `porCampusAno: Map<string, Map<number, AgregadosAno>>`: Mapeamento por chave de campus (`slug`) e ano de referência (`2024`, `2025`, `2026`), incluindo o escopo `todos`.

---

## 4. Estrutura de Saída e Contratos (`adapters/sinks/types.ts`)

Representa os arquivos serializados prontos para validação e escrita:

- **`RegistroPilarJson`**:
  - `nome: string`: Nome do arquivo seguindo estritamente `pilar{N}_{campus}_{year}.json`.
  - `conteudo: string`: Conteúdo JSON formatado e compacto.
- **`ResultadoEtl`**:
  - `codigoSaida: number`: `0` para sucesso, `1` para falha.
  - `resumo: string | null`: Mensagem resumida de encerramento em pt-BR.
  - `avisos: string[]`: Alertas não impeditivos coletados durante o processamento.
  - `erros: string[]`: Mensagens de erro em caso de exceção.
