# Implementation Plan: Página de Downloads dos Dados e Guia de Instalação

**Branch**: `016-download-data-files` | **Date**: 2026-10-05 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-download-data-files/spec.md`

## Summary

Adiciona um botão "Dados" ao header compartilhado (visível em viewport largo e
estreito, com item correspondente na gaveta móvel) que leva a uma nova página
estática de downloads. A página lista e serve dois grupos de arquivos:

1. **Insumos brutos da cadeia** — `exports_canonical.zip` e os
   `listagem_*.xlsx` — que passam a ser versionados no repositório (decisão
   D-01) e baixáveis publicamente, sem autenticação (D-02).
2. **O pacote oficial consolidado** — `indicadores.zip` — único artefato
   agregado oferecido (D-05).

A página traz metadados (rótulo, formato, tamanho, cobertura, última
atualização), marcação explícita de que os insumos contêm dado pessoal não
anonimizado, e uma seção de instalação com os passos de posicionamento,
execução e verificação da cadeia.

A implementação é inteiramente **estática e build-time**: nenhum runtime de
servidor. A listagem é derivada do que existe em disco no momento do build, e
uma checagem na esteira do CI garante que a listagem e os arquivos não divirjam
e que os insumos brutos não sejam publicados enquanto as pendências de
governança estiverem abertas (FR-016).

## Technical Context

**Language/Version**: TypeScript 5.8 (frontend, Astro 5.12) | Python 3.11+ (gate de governança, `pytest`)

**Primary Dependencies**: `astro@^5.12.0` (única dependência de runtime) | `vitest@^3.2.0`, `eslint@^9.30.0`, `prettier@^3.6.0`, `typescript@^5.8.0` (dev) | Python: `pytest` (já em `requirements-etl.txt`)

**Storage**: Nenhum banco. Sistema de arquivos em build time — `data/dist/indicadores.zip` (já versionado), `data/canonical/`, `data/raw/` (a versionar). Assets servidos de `public/` na saída do build.

**Testing**: `vitest` para o frontend (`tests/web/`), padrão já estabelecido por `tests/web/header.test.ts` e `tests/web/routes.test.ts` — asserções sobre o conteúdo textual dos arquivos `.astro`. `pytest` para o gate de governança em Python (`tests/etl/`).

**Target Platform**: Site estático em GitHub Pages, publicado sob o subendereço `/indicadores_ifes` (`base` em `astro.config.mjs`). Navegadores modernos, sem dependência de runtime de JS para o conteúdo da nova página.

**Project Type**: web-service (site estático) — frontend Astro + scripts de build em Python

**Performance Goals**: A página de downloads não adiciona requisições de rede ao caminho crítico — os arquivos são servidos como assets estáticos. Zero JS de runtime na nova página. Tamanho dos insumos é o do arquivo, sem transformação.

**Constraints**: Sem servidor, sem backend, sem banco (restrição "Static only" da constituição). Todo texto de interface em pt-BR. A listagem DEVE derivar do que existe em disco (FR-017), nunca de uma lista hardcoded que possa divergir. O portão de governança (FR-016) roda na esteira que já bloqueia o deploy.

**Scale/Scope**: 1 rota nova, 1 componente de layout novo, 1 módulo de listagem, 1 gate de CI. 8 arquivos de insumo (1 `.zip` canônico + 6 `.xlsx` + `.gitkeep`) + 1 pacote agregado.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Gate inicial — VIOLAÇÃO DETECTADA (justificada em Complexity Tracking)

| Princípio                       | Status          | Nota                                                                                                                                                                                            |
| ------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Simplicity                   | ⚠️              | A feature adiciona um módulo de listagem e um gate em Python. Ambos são inevitáveis: a listagem não pode ser hardcoded (FR-017) e o gate não pode ser feito no shell. Nenhuma dependência nova. |
| II. Test-First (NON-NEGOTIABLE) | ✅              | Testes Vitest escritos antes do código; gate de governança coberto por `pytest`. Seguindo o padrão de `header.test.ts`.                                                                         |
| III. Fidelidade a Report Data   | ✅              | A página declara que os valores são transcritos e não estimados (FR-025), alinhada ao rodapé existente. A feature não calcula nem altera indicador.                                             |
| IV. Dados Agregados Somente     | ❌ **VIOLAÇÃO** | **D-01 publica dado pessoal.** As planilhas contêm a coluna `Nome`; o export canônico deixa de ser isolado. Ver Complexity Tracking.                                                            |
| V. Qualidade Básica             | ✅              | pt-BR (FR-023), sem rolagem horizontal ≥320 px (FR-020), ambos os temas (FR-019), ESLint + Prettier sem erros.                                                                                  |
| VI. Deploy com Quality Gates    | ✅              | O gate de FR-016 roda **antes** do build; deploy continua depending de `quality`.                                                                                                               |

**Conclusão**: 1 violação (Princípio IV), **justificada e registrada** em
Complexity Tracking. A justificação exige duas pendências de governança que
bloqueiam a publicação (FR-016, FR-016a, FR-016b).

### Gate pós-design — REAVALIADO

| Princípio                   | Status                 | Nota                                                                                                                                                                                                                                                                                                                                              |
| --------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Simplicity               | ✅                     | Nenhuma dependência adicionada. O módulo de listagem substitui, em vez de acumular, o consumo de `fs` no frontend.                                                                                                                                                                                                                                |
| IV. Dados Agregados Somente | ⚠️ **EMENDA PENDENTE** | A violação está **contida** por FR-016: sem a emenda da constitution e sem o registro da revisão de privacidade em disco, os insumos não são publicados. A revisão de privacidade já está **aprovada** (D-03, cobrindo art. 7º II e art. 33); o que falta é o arquivo. O estado do repositório é "violação controlada", não "violação resolvida". |

**Conclusão pós-design**: nenhuma violação nova. A violação do Princípio IV
permanece **ativa e não resolvida** — a feature entrega a capacidade, mas o
portão impede a publicação até que a emenda seja registrada. Ver Quickstart
(QS-06) para o cenário de gate fechado.

## Project Structure

### Documentation (this feature)

```text
specs/016-download-data-files/
├── spec.md              # /speckit.specify output
├── plan.md              # Este arquivo (/speckit.plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── pagina-downloads.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NÃO criado por /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── layouts/
│   └── BaseLayout.astro          # MODIFICADO: botão "Dados" no header (desktop)
│                                 #   + item na gaveta móvel
├── components/
│   └── CartaoDownload.astro      # NOVO: item da listagem (rótulo, metadados,
│                                 #   marcação de dado pessoal, ação de download)
├── pages/
│   └── dados/
│       └── index.astro           # NOVO: página de downloads + guia de instalação
├── lib/
│   └── downloads.ts              # NOVO: derivação da listagem a partir do disco
└── styles/
    └── tokens.css                # MODIFICADO: tokens de aviso de dado pessoal

public/
└── dados/                        # NOVO: destino dos artefatos no site publicado
    ├── indicadores.zip
    ├── exports_canonical.zip
    └── listagem_*.xlsx

data/
├── dist/indicadores.zip          # já versionado — origem do pacote oficial
├── canonical/exports_canonical.zip   # a versionar (D-01)
└── raw/listagem_*.xlsx               # a versionar (D-01)

etl/
└── scripts/
    └── check_governanca.py       # NOVO: portão de FR-016

tests/
├── web/
│   ├── downloads.test.ts         # NOVO: listagem, metadados, marcação
│   ├── header-dados.test.ts      # NOVO: botão no header (desktop + gaveta)
│   └── fixtures/                 # existente
└── etl/
    └── test_check_governanca.py  # NOVO: portão de FR-016

.specify/
└── memory/constitution.md        # MODIFICADO: emenda MAJOR do Princípio IV (FR-016a)
README.md                         # MODIFICADO: alinhar com D-01 (FR-016b)
specs/012-.../spec.md             # MODIFICADO: alinhar com D-01 (FR-016b)
.gitignore                        # MODIFICADO: versionar data/canonical e data/raw
```

**Estrutura escolhida**: projeto único (Opção 1 do template). O repositório já
é um Astro + Python ETL no mesmo root, e a feature não introduz fronteira nova
entre frontend e gate. O módulo `src/lib/downloads.ts` segue o padrão existente
de `src/lib/dataset.ts` (leitura de `fs` em build time, módulo com funções
testáveis e uma instância padrão já carregada).

**Nota sobre a cópia para `public/dados/`**: o site precisa servir os arquivos
como assets. `public/` é copiado verbatim para `dist/` pelo Astro. A cópia
ocorre no build, não é commitada — `public/dados/` é gerado, e `.gitignore`
precisa ignorar o conteúdo gerado enquanto mantém o diretório. Isso evita
duplicar os blobs no repositório e garante que o que é servido é o que existe.

## Complexity Tracking

| Violation                                                           | Why Needed                                                                                                                                                                                                                                                                                                                                      | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Princípio IV (dados agregados somente) — publicar dado pessoal**  | D-01: o mantenedor decidiu tornar os insumos brutos (`exports_canonical.zip` + `listagem_*.xlsx`) baixáveis publicamente, com base legal registrada (D-03, art. 7º II da LGPD) e autorização nominal de Paulo Sérgio dos Santos Júnior, Diretor de Extensão e Pesquisa do Campus Serra. O pedido original nomeia explicitamente esses arquivos. | **Rejeitado**: servir apenas artefatos agregados + guia. Rejeitado porque o mantenedor foi explícito — os insumos _e_ os arquivos que primeiramente geram o `indicadores.zip` devem ser baixáveis. A alternativa conforme não desaparece: ela vive como o **guia de instalação** (User Story 3), que ensina a obter, posicionar e rodar a cadeia com os arquivos. O que muda é que os arquivos passam a estar disponíveis **na própria página**, e não apenas descritos. |
| `etl/scripts/check_governanca.py` em vez de lógica no workflow YAML | O portão de FR-016 precisa ser testável e verificável localmente (`pytest`), não apenas no CI.                                                                                                                                                                                                                                                  | **Rejeitado**: passo de shell no workflow. Seria impossível de testar com `pytest` e contrariaria o Princípio II. O padrão já existe: `etl/scripts/check_dados.py` é exatamente esse formato.                                                                                                                                                                                                                                                                            |
| `src/lib/downloads.ts` em vez de listagem hardcoded no `.astro`     | FR-017 exige que a listagem seja verificável automaticamente e não possa divergir do que existe em disco.                                                                                                                                                                                                                                       | **Rejeitado**: array literal no template. É a abordagem mais simples e é exatamente o que o FR-017 proíbe — a lista poderia oferecer arquivo inexistente sem que nada notasse.                                                                                                                                                                                                                                                                                           |
| `PyYAML` em `requirements-etl.txt`                                  | O portão tem que **falhar fechado**, e um parser de YAML escrito à mão colocaria a leitura da própria entrada do portão sob suspeita: um bug de parsing abriria o portão em silêncio, que é o pior modo de falha possível aqui. A dependência é de primeira parte, sem transitivas, e já é padrão em ferramentas de CI.                         | **Rejeitado**: parser de YAML próprio, ou `grep` sobre o arquivo. Ambos colocam a decisão de segurança a cargo de um parser que ninguém testou. O custo de uma dependência declarada é visível; o custo de um gate que abre sem querer não é.                                                                                                                                                                                                                            |

### Achados de implementação que mudaram o contrato

Cinco coisas apareceram ao rodar o build real, e nenhuma delas estava prevista.
Todas passaram a ter teste antes da correção (Princípio II), e duas alteraram o
contrato em vez de só a implementação:

| #   | Achado                                                                                                                                                                                                                           | Consequência para o contrato                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 1   | No build estático `Astro.url.pathname` vem **com o `base`** (`/indicadores_ifes/pilar-1/`). Todo `startsWith('/pilar-1')` no layout era falso — **nenhuma** das quatro abas marcava a própria página, desde antes desta feature. | H-5 deixou de ser verificável. `src/lib/rota.ts` (T020)                     |
| 2   | O portão recusava copiar os brutos com o gate fechado, mas a cópia da execução anterior continuava em `public/dados/`, e o Astro a servia (`public/` → `dist/` no início do build). O log dizia "omitidos".                      | **FR-016c** (novo): fechar o portão tem de **remover**, não só recusar      |
| 3   | A coluna "Revisão" do export canônico mostrava `v1` — a versão do **esquema** do manifesto — no lugar da revisão do arquivo, porque o regex procurava a primeira chave compatível no arquivo inteiro.                            | Só implementação (`lerRevisaoCanonica`)                                     |
| 4   | A `constitution` declarava a versão em dois lugares: cabeçalho novo (2.0.0) e rodapé antigo (1.1.0). `grep` respondia "1.1.0".                                                                                                   | Só documentação (a versão ficou só no rodapé)                               |
| 5   | Com o insumo apagado do disco, a tabela de instalação perdia a linha — o glob só enxerga o que existe.                                                                                                                           | Só implementação (`obterInsumosCadeia` declara o export incondicionalmente) |

O achado 1 e o achado 2 são o motivo de a lista de tarefas subestimar o esforço
de T020 e de não ter tarefa para a limpeza: ambos estavam descritos como se
fossem triviais, e o primeiro **já estava quebrado** antes de a feature começar.

### Pendências que esta violação impõe (não opcionais)

| #   | Pendência                                                                                      | Estado                                                                                     | Rastreada por   |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | --------------- |
| G-1 | Emenda do Princípio IV na constituição, **MAJOR** 1.1.0 → 2.0.0, com data e Sync Impact Report | **RESOLVIDA** 2026-10-05 (T048)                                                            | FR-016, FR-016a |
| G-2 | Revisão de privacidade antes do merge                                                          | **RESOLVIDA** 2026-10-05 (T049): autorização transcrita para `docs/revisao-privacidade.md` | FR-016          |
| G-3 | Alinhar `README.md` e spec 012 com D-01                                                        | **RESOLVIDA** 2026-10-05 (T050–T052)                                                       | FR-016b, SC-010 |

A base legal (D-03) **não** é pendência — está registrada.

### Fato já consumado, fora do escopo

O commit `fb53e8f` na branch `012-gate-proveniencia-workflow-dados` ("unignore
raw/canonical by institutional decision") **já versionou** os 8 arquivos em
`data/raw/` e `data/canonical/`. Esse commit **não é ancestral** da branch
`016-download-data-files` (base `fix/first-pilar`, 29489f7) — verificar isso é
tarefa da Phase 2, porque muda se o `.gitignore` precisa ser editado aqui ou se
a mudança deve ser bring por merge.

O `.gitignore` da spec 012 registra o efeito de forma explícita: _"versionado é
permanente. Uma vez no histórico, apagar o arquivo da `main` não apaga o
objeto — os apontadores mudam, os blobs ficam."_ Reescrita de histórico para
desversionar é operação separada, com consequências próprias, e está **fora do
escopo** desta feature.
