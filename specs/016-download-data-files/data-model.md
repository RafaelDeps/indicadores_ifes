# Phase 1 — Data Model

Feature: **016 — Página de Downloads dos Dados e Guia de Instalação**
Date: 2026-10-05

Entidades extraídas de `spec.md`. Tipos TypeScript (frontend, em
`src/lib/downloads.ts`) e as formas de dado persistidas.

---

## Artefato para Download

Um arquivo oferecido na página. É a entidade central da feature.

```ts
interface ArtefatoDownload {
  /** Identificador estável, usado como chave de lista e âncora. */
  id: string;
  /** Nome do arquivo como servido (ex.: 'indicadores.zip'). */
  arquivo: string;
  /** Rótulo legível em pt-BR para o visitante (ex.: 'Pacote oficial de indicadores'). */
  rotulo: string;
  /** Descrição em pt-BR do que o arquivo é. */
  descricao: string;
  /** Natureza do conteúdo — determina a marcação exibida (FR-015). */
  natureza: NaturezaArtefato;
  /** Caminho relativo dentro de `public/`, para montar a URL de download. */
  caminhoPublico: string;
  /** Tamanho em bytes; `null` quando o arquivo não existe. */
  bytes: number | null;
  /** Última data de modificação; `null` quando o arquivo não existe. */
  atualizadoEm: Date | null;
  /** Período de apuração coberto (ex.: [2024, 2025, 2026]). */
  anos: number[];
  /** Escopo de campus coberto; ['todos'] quando o artefato é agregado. */
  campi: string[];
  /**
   * Available quando o arquivo existe e (para insumos brutos) quando o portão
   * de governança está aberto. `false` faz a página mostrar o item como
   * indisponível, com o motivo em `motivoIndisponivel` — nunca um link quebrado
   * (FR-017).
   */
  disponivel: boolean;
  /** Razão da indisponibilidade, em pt-BR. `null` quando `disponivel`. */
  motivoIndisponivel: string | null;
}
```

### Validações

| Regra                                                                    | Fonte  |
| ------------------------------------------------------------------------ | ------ |
| `id` único dentro da listagem                                            | FR-006 |
| `arquivo` deve existir no caminho de origem quando `disponivel === true` | FR-017 |
| `bytes !== null` quando `disponivel === true`                            | FR-006 |
| `anos` não vazio para o pacote oficial                                   | FR-006 |
| `motivoIndisponivel !== null` quando `disponivel === false`              | FR-017 |
| `natureza === 'dado-pessoal'` implica `descricao` que nomeie a natureza  | FR-015 |

---

## NaturezaArtefato

Enum que decide a marcação e o agrupamento na página.

```ts
type NaturezaArtefato =
  | 'agregado' // pacote oficial consolidado — desidentificado
  | 'dado-pessoal'; // insumos brutos — contém a coluna `Nome`
```

- `agregado` → grupo "Pacote oficial", sem marcação de dado pessoal.
- `dado-pessoal` → grupo "Insumos brutos", **sempre** acompanhado do badge
  "Contém dados pessoais — não anonimizado" (FR-015), com ícone + rótulo
  textual, legível sem depender de cor (FR-019).

Só existem estas duas naturezas. `dado-pessoal` cobre tanto as planilhas
(coluna `Nome`) quanto o export canônico — que, por decisão D-04, é tratado
como não anonimizado.

---

## Insumo da Cadeia

Arquivo de entrada exigido pelo pipeline. Descreve **o que precisa estar no
disco antes de rodar `make dados`**, e é a base da seção de instalação.

```ts
interface InsumoCadeia {
  /** Caminho canônico relativo à raiz do repositório. */
  caminho: string;
  /** Etapa que consome o insumo. */
  etapa: EtapaCadeia;
  /** Para que serve, em pt-BR. */
  finalidade: string;
  /** Origem do arquivo (upstream, emissão institucional, etc.). */
  origem: string;
  /** Revisão/identificador de versão, quando aplicável (FR-024). */
  revisao: string | null;
  /** Natureza do conteúdo do arquivo. */
  natureza: NaturezaArtefato;
  /** `false` quando a origem é um repositório privado/token — orienta o guia
   *  a não prometer download público. `true` para tudo que a página serve. */
  obtendoPublico: boolean;
}

type EtapaCadeia = 'etl' | 'etl-listagens' | 'merge-listagens';
```

### Ocorrências conhecidas

| Caminho                                | Etapa           | Natureza       | `obtendoPublico` |
| -------------------------------------- | --------------- | -------------- | ---------------- |
| `data/canonical/exports_canonical.zip` | `etl`           | `dado-pessoal` | `true` (D-01)    |
| `data/raw/listagem_2024_1.xlsx`        | `etl-listagens` | `dado-pessoal` | `true` (D-01)    |
| `data/raw/listagem_2024_2.xlsx`        | `etl-listagens` | `dado-pessoal` | `true` (D-01)    |
| `data/raw/listagem_2025_1.xlsx`        | `etl-listagens` | `dado-pessoal` | `true` (D-01)    |
| `data/raw/listagem_2025_2.xlsx`        | `etl-listagens` | `dado-pessoal` | `true` (D-01)    |
| `data/raw/listagem_2026_1.xlsx`        | `etl-listagens` | `dado-pessoal` | `true` (D-01)    |
| `data/raw/listagem_2026_2.xlsx`        | `etl-listagens` | `dado-pessoal` | `true` (D-01)    |

Os seis `.xlsx` são **descobertos por glob** em `data/raw/`, não hardcoded —
FR-009 proíbe que um insumo exigido fique sem instrução, e um insumo novo
precisa aparecer sozinho. O glob segue o padrão `listagem_<ano>_<semestre>.xlsx`;
um arquivo que não corresponda ao padrão não é insumo da cadeia e é ignorado
(comportamento já adotado pelo próprio ETL, que extrai o ano do nome).

---

## Cobertura

```ts
interface Cobertura {
  /** Anos de apuração, ordenados. */
  anos: number[];
  /** Slugs de campus cobertos; ['todos'] para escopo agregado. */
  campi: string[];
}
```

Derivada de `indicadores.zip` reusando `carregarDataset()` de
`src/lib/dataset.ts` — que já extrai exatamente esses dois campos. Não há
cálculo novo.

Para os insumos brutos, "cobertura" é **período de apuração**, não escopo de
indicador: os `.xlsx` exibem `[2024, 2025, 2026]` derivado do nome, e o
`campus` não se aplica (são de nível institucional). Forçar `campi` nesses
itens exigiria metadado inventado, que o Princípio III proíbe.

---

## Pendência de Governança

Registro que condiciona a publicação dos insumos brutos (FR-016).

```ts
interface PendenciaGovernanca {
  /** Identificador estável da pendência. */
  id: string;
  /** Descrição em pt-BR do que falta. */
  descricao: string;
  /** `true` quando registrada — a pendência está quitada. */
  resolvida: boolean;
  /** Onde o registro que a quita vive (caminho no repositório). */
  registro: string | null;
}
```

### Ocorrências conhecidas

| id                    | Descrição                                              | Registrada por                           | Estado inicial                              |
| --------------------- | ------------------------------------------------------ | ---------------------------------------- | ------------------------------------------- |
| `emenda-principio-iv` | Emenda MAJOR do Princípio IV na constitution (FR-016a) | `.specify/memory/constitution.md` v2.0.0 | `false` — **pendente de verdade**           |
| `revisao-privacidade` | Revisão de privacidade antes do merge (Princípio IV)   | `docs/revisao-privacidade.md`            | `false` — **aprovada, aguardando registro** |
| `base-legal`          | Base legal para publicação de dado pessoal             | `medidas-de-protecao.md` §3 (D-03)       | `true`                                      |

`base-legal` **não** bloqueia: está registrada (D-03, art. 7º II da LGPD,
autorização de Paulo Sérgio dos Santos Júnior, Diretor de Extensão e Pesquisa
do Campus Serra).

`revisao-privacidade` está **aprovada mas ainda não registrada em disco**: a
autorização cobre a base legal (art. 7º, II) **e** a transferência
internacional (art. 33 da LGPD). Falta apenas transcrevê-la para
`docs/revisao-privacidade.md` — sem esse arquivo, a regra P-4 trata a pendência
como não resolvida, porque `registro` não existe.

`emenda-principio-iv` é a **única** pendência que ainda exige trabalho
normativo: reescrever o Princípio IV na constitution.

### Estados e transições

```text
PENDENTE ──(registro versionado)──> RESOLVIDA
    │                                    │
    │ gate FECHADO                        │ gate ABERTO
    ▼                                    ▼
insumos omitidos da listagem,      insumos listados e
cópia pulada, aviso, exit 0        copiados, exit 0
```

O portão é **derivado**: `gateAberto = pendencias.every(p => p.resolvida)`.
Não há estado intermediário nem flag manual — um humano não pode abrir o portão
sem registrar a pendência.

---

## Estados da Página

A página tem três estados, todos derivados da listagem — nenhum estado é
armazenado.

| Estado        | Condição                                            | Comportamento                                                                                                                     |
| ------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Completa**  | pacote oficial disponível **e** insumos disponíveis | Lista os dois grupos com downloads ativos                                                                                         |
| **Parcial**   | pacote oficial disponível, insumos indisponíveis    | Lista o agregado; insumos aparecem como indisponíveis **com o motivo**; aviso de governança visível                               |
| **Degradada** | pacote oficial indisponível                         | Mostra aviso de indisponibilidade para o agregado, sem valor substituto (Princípio III); insumos, se disponíveis, seguem listados |

O estado **Parcial** é o estado esperado enquanto G-1 e G-2 estiverem
pendentes: o site sobe, o agregado funciona, e a ausência dos insumos é
explicada em vez de silenciosa.

---

## Relações

```text
Cadeia de Dados (1) ──< (N) Insumo da Cadeia
Cadeia de Dados (1) ──< (N) Artefato para Download  [saídas]
Artefato para Download (N) ──> (1) NaturezaArtefato
Artefato para Download (N) ──> (1) Cobertura
Pendência de Governança (N) ──< gateAberto = every(resolvida)
```

`Artefato para Download` e `Insumo da Cadeia` são **entidades distintas** de
propósito: a primeira descreve o que o visitante **baixa** da página; a segunda
descreve o que ele precisa **colocar no disco** para rodar a cadeia. O
`exports_canonical.zip` aparece nas duas, com o mesmo `caminho` mas consumidores
e rótulos diferentes — na listagem é um download; na seção de instalação é um
pré-requisito com origem e revisão (FR-024).

---

## Formas de dado persistidas

### `.specify/governanca/pendencias.yaml`

Registro versionado consultado pelo portão (R-004).

```yaml
pendencias:
  - id: emenda-principio-iv
    descricao: Emenda MAJOR do Princípio IV na constitution (1.1.0 -> 2.0.0)
    registro: .specify/memory/constitution.md
  - id: revisao-privacidade
    descricao: >-
      Revisão de privacidade antes do merge. Autorizada por Paulo Sérgio dos
      Santos Júnior (Diretor de Extensão e Pesquisa do Campus Serra, 2026-10-05),
      cobrindo art. 7 II e art. 33 da LGPD.
    registro: docs/revisao-privacidade.md
  - id: base-legal
    descricao: Base legal para publicação de dado pessoal (art. 7 II, LGPD)
    registro: specs/012-gate-proveniencia-workflow-dados/medidas-de-protecao.md
```

Uma pendência é `resolvida` quando `registro` aponta para um caminho que
**existe**. A pendência `base-legal` aponta para um arquivo que já existe — por
isso já conta como resolvida sem exigir ação. A regra "resolvida = registro
existe no disco" é verificável sem duplicar estado: não há campo `resolvida`
para ficar inconsistente com o disco.

### `public/dados/` (gerado)

Saída do build, **não versionada** (R-002). Recebe os artefatos disponíveis e
é o único lugar de onde a URL de download é servida. O `.gitignore` precisa
ignorar o conteúdo mantendo o diretório.
