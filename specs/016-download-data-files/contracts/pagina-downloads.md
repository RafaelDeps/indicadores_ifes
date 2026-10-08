# Contract — Página de Downloads e Portão de Governança

Feature: **016 — Página de Downloads dos Dados e Guia de Instalação**
Date: 2026-10-05

Este documento define as interfaces que a feature **expõe ou impõe** a outros
partes do sistema. Não é código de implementação: é o contrato verificável.

---

## C-1 — Módulo de listagem (`src/lib/downloads.ts`)

Interface interna consumida pela página. Sem efeito colateral: só lê o disco.

```ts
/** Deriva a listagem de artefatos a partir do que existe em disco. */
export function carregarDownloads(opcoes?: OpcoesCarregamento): ArtefatoDownload[];
```

### `OpcoesCarregamento`

| Campo              | Padrão                 | Efeito                                                                  |
| ------------------ | ---------------------- | ----------------------------------------------------------------------- |
| `raizRepo`         | `process.cwd()`        | Raiz para resolver caminhos relativos                                   |
| `gateAberto`       | `undefined` → derivado | `false` força os insumos brutos a indisponíveis, com o motivo do portão |
| `copiarParaPublic` | `true`                 | Quando `true`, copia os artefatos disponíveis para `public/dados/`      |

### Garantias

Os IDs usam prefixo **`L-`** (_listing_) para não colidir com as pendências de
governança **`G-1`/`G-2`/`G-3`** de `plan.md`.

| #   | Garantia                                                                                                                               | Requirement |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| L-1 | Um artefato só tem `disponivel === true` se o arquivo **existe** no caminho de origem no momento da chamada                            | FR-017      |
| L-2 | Arquivo ausente → `disponivel === false` e `motivoIndisponivel` preenchido; **nunca** `caminhoPublico` apontando para algo inexistente | FR-017      |
| L-3 | `gateAberto === false` → **todo** artefato com `natureza === 'dado-pessoal'` fica indisponível, independentemente de existir           | FR-016      |
| L-4 | Nenhum caminho servido escapa de `public/dados/` (path traversal)                                                                      | FR-022      |
| L-5 | A listagem é **determinística**: mesma entrada → mesma saída, com `bytes`/`atualizadoEm` derivados do disco                            | FR-006      |
| L-6 | Os insumos `.xlsx` são descobertos por glob em `data/raw/`; um insumo novo seguindo o padrão aparece sem alteração de código           | FR-009      |

### Invariantes testáveis (Vitest)

```ts
// L-3: gate fechado omite os brutos, mas mantém o agregado
const listagem = carregarDownloads({ gateAberto: false });
const brutos = listagem.filter((a) => a.natureza === 'dado-pessoal');
expect(brutos.every((a) => !a.disponivel)).toBe(true);
expect(listagem.find((a) => a.natureza === 'agregado')?.disponivel).toBe(true);

// L-2: motivo sempre presente quando indisponível
expect(listagem.filter((a) => !a.disponivel).every((a) => a.motivoIndisponivel !== null)).toBe(
  true,
);
```

---

## C-2 — Portão de governança (`etl/scripts/check_governanca.py`)

Interface de linha de comando, no formato já estabelecido por
`etl/scripts/check_dados.py`.

### Invocação

```bash
PYTHONPATH=. python -m etl.scripts.check_governanca
```

| Argumento            | Padrão                                | Efeito                                   |
| -------------------- | ------------------------------------- | ---------------------------------------- |
| `--pendencias`       | `.specify/governanca/pendencias.yaml` | Registro de pendências                   |
| `--saida-insumos`    | `public/dados`                        | Onde os insumos disponíveis são copiados |
| `--apenas-verificar` | `false`                               | Só verifica o portão; não copia          |

### Saídas

| Condição                                   | Stream | Prefixo                    | Exit |
| ------------------------------------------ | ------ | -------------------------- | ---- |
| Gate aberto, insumos copiados              | stdout | `OK:`                      | 0    |
| Gate fechado (pendência listada)           | stdout | `AVISO:` + id da pendência | 0    |
| Registro de pendências ausente ou ilegível | stderr | `ERRO:`                    | 1    |
| Insumo declarado indisponível em disco     | stderr | `ERRO:` + caminho          | 1    |

### Regras

| #   | Regra                                                                                                   | Requirement |
| --- | ------------------------------------------------------------------------------------------------------- | ----------- |
| P-1 | O gate está **aberto** se, e somente se, toda pendência tem `registro` apontando para caminho existente | FR-016      |
| P-2 | Gate fechado **omite** os insumos da cópia; não os apaga nem os torna erro                              | FR-016      |
| P-3 | Gate fechado **não** impede o build: o agregado continua sendo publicado                                | FR-016      |
| P-4 | Pendência com `registro` ausente é tratada como **não resolvida**, nunca como resolvida por omissão     | FR-016      |
| P-5 | A saída nomeia **quais** pendências bloquearam e **como** quitá-las                                     | FR-016      |

### Exemplo de saída — gate fechado

```text
AVISO: governança — 2 pendência(s) impedem a publicação dos insumos brutos:
  - emenda-principio-iv: Emenda MAJOR do Princípio IV na constitution
    (1.1.0 -> 2.0.0)
    como quitar: registre a emenda em .specify/memory/constitution.md
  - revisao-privacidade: Revisão de privacidade antes do merge
    como quitar: registre a revisão em docs/revisao-privacidade.md
OK: pacote agregado publicado (1 artefato); insumos brutos omitidos (7)
```

No estado **real** atual, `revisao-privacidade` está aprovada por D-03 e aparece
como bloqueante só porque `docs/revisao-privacidade.md` ainda não existe — é o
comportamento exigido por P-4. Criar o arquivo com a transcrição da autorização
(a task T049) remove essa linha do `AVISO:`.

O `AVISO:` em vez de `ERRO:` é deliberado (R-003): a pendência é de
governança, não de integridade de dados. O site sobe sem os insumos brutos.

---

## C-3 — Header: botão "Dados"

Contrato de markup observável, testável por asserção de conteúdo do arquivo
(mesmo padrão de `tests/web/header.test.ts`).

### Desktop (≥768 px)

```html
<a href="/dados/" class="nav-aba" aria-current="page">Dados</a>
```

Quando em `/dados/`, `aria-current="page"` presente; caso contrário, ausente.

### Gaveta móvel (<768 px)

```html
<a href="/dados/" class="drawer-link" aria-current="page">Dados</a>
```

### Garantias

| #   | Garantia                                                                                          | Requirement |
| --- | ------------------------------------------------------------------------------------------------- | ----------- |
| H-1 | O link existe em **todas** as páginas, porque vive no layout compartilhado                        | FR-001      |
| H-2 | Fica em `.cabecalho-acoes`, que não é ocultado em nenhum breakpoint                               | FR-002      |
| H-3 | Existe item correspondente em `.drawer-nav`                                                       | FR-003      |
| H-4 | Rótulo é exatamente `Dados`                                                                       | FR-004      |
| H-5 | `aria-current="page"` presente apenas na rota `/dados/`                                           | FR-004      |
| H-6 | O href usa o `base` do site (`/dados/`, relativo ao subendereço), não caminho absoluto de arquivo | FR-022      |
| H-7 | Não há nesting de link, e o alvo é operável por teclado com foco visível                          | FR-021      |

### Invariante testável

```ts
const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf-8');
// H-2: a classe do link está num bloco que não some em breakpoint estreito
expect(layout).toContain('href="/dados/"');
expect(layout.match(/href="\/dados\/"/g)!.length).toBe(2); // desktop + gaveta
```

---

## C-4 — Página `/dados/`

### Estrutura exigida

| Região                              | Conteúdo                                                                                                       | Requirement            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Cabeçalho da página                 | Título em pt-BR + declaração de fidelidade ("valores transcritos do relatório oficial; nenhum valor estimado") | FR-025                 |
| Grupo "Pacote oficial"              | `indicadores.zip` com rótulo, formato, tamanho, cobertura, última atualização                                  | FR-006, FR-026         |
| Grupo "Insumos brutos"              | `exports_canonical.zip` + `listagem_*.xlsx`, **cada um** com badge de dado pessoal                             | FR-013, FR-015         |
| Estado indisponível                 | Item sem download ativo, com motivo explícito                                                                  | FR-017                 |
| Seção "Instalação dos dados brutos" | Tabela de insumos (caminho, etapa, finalidade, origem, revisão) + passos ordenados                             | FR-009, FR-010, FR-024 |
| Blocos de comando                   | Comandos copiáveis em bloco único, em pt-BR                                                                    | FR-012                 |
| Aviso de versionamento              | Alerta de que versionar os insumos em repositório próprio os expõe a terceiros                                 | FR-010                 |

### Proibições

| #    | Proibição                                                                                         | Requirement   |
| ---- | ------------------------------------------------------------------------------------------------- | ------------- |
| Pg-1 | Nenhum segredo, credencial ou token na página                                                     | FR-011        |
| Pg-2 | Nenhum link de download para arquivo ausente                                                      | FR-017        |
| Pg-3 | Nenhum pacote parcial (`indicadores_<campus>.zip`) ou intermediário (`indicadores_listagens.zip`) | FR-026        |
| Pg-4 | Nenhum valor de indicador exibido como download ou estimativa                                     | Princípio III |
| Pg-5 | Nenhuma rolagem horizontal ≥320 px                                                                | FR-020        |

### Acessibilidade

| #   | Garantia                                                                | Requirement    |
| --- | ----------------------------------------------------------------------- | -------------- |
| A-1 | Cada link de download tem nome acessível que inclui o rótulo do arquivo | FR-021         |
| A-2 | A marcação de dado pessoal é legível sem cor (ícone + texto)            | FR-015, FR-019 |
| A-3 | Foco visível em todos os controles                                      | FR-021         |
| A-4 | Hierarquia de headings sem salto                                        | FR-021         |
| A-5 | Legível em tema claro e escuro                                          | FR-019         |

---

## C-5 — Registro de pendências (`.specify/governanca/pendencias.yaml`)

Contrato de formato consumido por C-2.

```yaml
pendencias:
  - id: <string, único>
    descricao: <string>
    registro: <caminho relativo à raiz do repositório>
    contem: <string, opcional> # Gg-5
    aviso_visitante: <string, opcional> # Gg-6
```

### Regras

| #    | Regra                                                                                                                                        |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Gg-1 | `id` é único e estável                                                                                                                       |
| Gg-2 | `registro` é relativo à raiz do repositório e aponta para o arquivo que quita a pendência                                                    |
| Gg-3 | Uma pendência conta como resolvida **somente** se `registro` existir no disco (P-1)                                                          |
| Gg-4 | `descricao` é lida pelo visitante em caso de gate fechado — em pt-BR                                                                         |
| Gg-5 | Quando `contem` está presente, o arquivo em `registro` **deve** conter essa string; a pendência só está resolvida se as duas condições valem |
| Gg-6 | `aviso_visitante` é opcional; quando presente, é o texto exibido ao visitante, e **não** pode conter identificadores internos (FR-011)       |

### Por que `contem` existe

`emenda-principio-iv` registra a emenda do Princípio IV **no mesmo arquivo que já
contém a versão 1.1.0**. A mera existência do arquivo não distingue "constitution
sem emenda" de "constitution emendada" — e o gate precisa distinguir, porque uma
dessas versões autoriza publicar dado pessoal e a outra não. Sem `contem`, o gate
abriria no primeiro dia, com a constitution ainda em 1.1.0, publicando os
insumos brutos sem a emenda que os autoriza.

É a regra de fail-closed aplicada onde P-1 sozinho seria insuficiente: "existe" é
o teste certo para um registro dedicado, e o teste errado para um arquivo que
passa por vários estados.

---

## Matriz de rastreabilidade

| Requirement                    | Contrato                                         |
| ------------------------------ | ------------------------------------------------ |
| FR-001..FR-004                 | C-3                                              |
| FR-005                         | C-4 (rota acessível por URL)                     |
| FR-006, FR-017                 | C-1, C-4                                         |
| FR-007                         | C-1 (`caminhoPublico` served de `public/dados/`) |
| FR-009, FR-010, FR-012, FR-024 | C-4                                              |
| FR-011                         | C-4 (Pg-1)                                       |
| FR-013, FR-014                 | C-1, C-4                                         |
| FR-015                         | C-4 (A-2)                                        |
| FR-016                         | C-2, C-5                                         |
| FR-018                         | C-1 (L-5)                                        |
| FR-019                         | C-4 (A-2, A-5)                                   |
| FR-020                         | C-4 (Pg-5)                                       |
| FR-021                         | C-3 (H-6, H-7), C-4 (A-1, A-3)                   |
| FR-022                         | C-1 (L-4)                                        |
| FR-023                         | C-4                                              |
| FR-025                         | C-4                                              |
| FR-026                         | C-4 (Pg-3)                                       |
