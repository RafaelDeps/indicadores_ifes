# Feature Specification: Modo Soft (SOFT=1), Verificação de Frescor e Target Único do ETL

**Feature Branch**: `011-etl-soft-mode-frescor`

**Created**: 2026-09-29

**Status**: Draft (decisões resolvidas em 2026-09-29)

**Input**: User description: "É possível criar um fallback em `make etl` e
`make etl-listagens`? Por exemplo, caso não haja um arquivo
`indicadores_listagens.zip` e um `exports_canonical.zip`, reutiliza as
informações do último `indicadores.zip`, somente?" → decisão (2026-09-29):
**Opção A** — modo soft **opt-in** (`SOFT=1`/`--soft`) que **pula a etapa com
aviso**, preservando o último snapshot coerente, _sem_ misturar execuções;
**`make check-dados`** (frescor + validação de contrato); **`make dados`**
(target único que encadeia `etl` → `etl-listagens` → `merge-listagens`).

## Contexto e restrição técnica central

O export canônico (`exports_canonical.zip`) e as planilhas
(`data/raw/listagem_*.xlsx`) são **gitignored** — o CI e clones limpos não os
possuem. O único artefato commitado é o pacote agregado
`data/dist/indicadores.zip`. Um "fallback" que reaproveita o último pacote é
desejável para orquestração/CI, **mas** há uma restrição que molda todo o
desenho:

- O zip publicado contém **apenas agregados** (Princípio IV, garantido por
  `test_privacy.py`); **nenhum nome**.
- Logo, sem o export canônico o **cruzamento NTECPP NÃO é recalculável** a
  partir do zip — o "reuso do último zip" só existe como contagem publicada,
  nunca como universo de nomes para recomputar.
- Reaproveitar _valores antigos_ (ex.: NTECPP de outra execução sobre um
  canônico novo) misturaria campos de extrações diferentes sem nenhum marcador
  de procedência — **proibido** por esta feature.

Portanto, esta feature **não** implementa "fallback de dados": implementa um
**modo soft** em que a etapa cuja entrada falta é **pulada com `AVISO:`**, o
que resulta — por construção — em _não tocar_ no último snapshot coerente.
Nada é fabricado, deletado ou misturado.

## Semântica exata do modo soft (por etapa)

| Etapa                  | Entrada ausente             | Default (hoje)                               | Com `SOFT=1` / `--soft`                                                                                                         |
| ---------------------- | --------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `make etl`             | `exports_canonical.zip`     | `ERRO:` + exit 1 (contrato 006)              | `AVISO:` + exit 0, pacote **intocado** — porém, se o pacote de saída **não existir**, `ERRO:` + exit 1 (não há o que preservar) |
| `make etl-listagens`   | `exports_canonical.zip`     | já degrada: NTECPP `null` + `AVISO:`, exit 0 | igual, + `AVISO:` explícito de que o NTECPP **não** é recalculável a partir do zip (não há nomes)                               |
| `make etl-listagens`   | planilhas `.xlsx`           | `ERRO:` + exit 1                             | `AVISO:` + exit 0, **sem gerar/sobrescrever** `indicadores_listagens.zip`                                                       |
| `make merge-listagens` | `indicadores_listagens.zip` | `ERRO:` + exit 1                             | `AVISO:` + exit 0, `indicadores.zip` **intocado**                                                                               |

**Regras transversais (invariantes)**:

1. **Nunca fabricar** — o soft nunca inventa dado; se a etapa não roda, o
   campo fica `null` (Princípio III), nunca número antigo.
2. **Nunca deletar** — nenhum artefato existente é removido pelo soft.
3. **Nunca misturar execuções** — o soft jamais sobrepõe campos de um pacote
   sobre outro; quando pula, o arquivo permanece byte a byte o que já era.
4. **Aviso nunca silencioso** — todo cenário soft imprime `AVISO:` no stderr,
   sempre em pt-BR, explicando por que a etapa foi pulada.
5. **Sem escrita em modo soft** — se a etapa é pulada, nenhum artefato de
   saída é criado nem reescrito (arquivo **e mtime** inalterados).
6. **Fail-fast continua o default** — o modo soft é opt-in explícito
   (`SOFT=1` ou `--soft`); sem ele, o comportamento de `ERRO:` + exit 1 da
   spec 006 permanece intacto.

   > **Nota de contrato**: quando esta spec cita "contrato 006", refere-se à
   > regra fail-fast **original** da spec 006, consolidada e vigente nas specs
   > 008–010 (pipeline Python, contratos de saída e CLI + `make etl`). A
   > localização dos artefatos segue a 009/010 (`data/canonical/`,
   > `data/dist/`), não o layout original da raiz.

**Consequências desejadas**:

- Se `make etl` roda (canônico novo) e a etapa de listagens é pulada, o
  pacote final fica com NTE/NTECPP `null` — comportamento **honesto**
  (Princípio III): campo não apurado = `null`, não valor de outra execução.
- Se `make etl` é pulado, o `indicadores.zip` permanece **exatamente** como
  estava (snapshot coeso, "reuso do último zip" alcançado por não tocar no
  arquivo).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Pipeline tolerante a entradas ausentes (modo soft) (Priority: P1)

Um operador precisa rodar a sequência completa do ETL mesmo sem todas as
entradas (ex.: clone limpo, CI sem o export canônico, ou planilhas ainda não
posicionadas). Com `SOFT=1`, cada etapa cuja entrada falta é pulada com
`AVISO:` no stderr e o pipeline termina com exit 0, preservando o último
pacote coerente. Sem `SOFT`, o comportamento atual (`ERRO:` + exit 1) é
mantido.

**Why this priority**: sem isso, a orquestração (US2) e o uso em CI/desenvolvimento
quebram sempre que uma entrada está ausente; o default estrito continua
disponível para quem quer falha ruidosa.

**Independent Test**: em um diretório sem `data/canonical/exports_canonical.zip`
mas com `data/dist/indicadores.zip` existente, rodar `SOFT=1 make etl` termina
com 0, imprime `AVISO:` no stderr, e o checksum do zip não muda. Sem `SOFT`,
o mesmo comando termina com `ERRO:` + exit 1.

**Acceptance Scenarios**:

1. **Given** `SOFT=1` e o export canônico ausente, **When** `make etl` roda e
   o pacote de saída existe, **Then** exit 0, `AVISO:` no stderr, e o pacote é
   byte a byte idêntico (mesmo sha256).
2. **Given** `SOFT=1` e o export canônico ausente, **When** `make etl` roda e
   o pacote de saída **não** existe, **Then** exit 1 com `ERRO:` (nada a
   preservar — não se fabrica pacote).
3. **Given** **sem** `SOFT`, **When** o export canônico está ausente,
   **Then** exit 1 com `ERRO:` (fail-fast do contrato 006 — regressão
   impedida por teste).
4. **Given** `SOFT=1` e `data/raw/` sem planilhas, **When** `make
etl-listagens` roda, **Then** exit 0, `AVISO:` no stderr, e
   `indicadores_listagens.zip` não é criado (nem sobrescrito se já existir).
5. **Given** `SOFT=1` e `indicadores_listagens.zip` ausente, **When** `make
merge-listagens` roda, **Then** exit 0, `AVISO:` no stderr, e
   `indicadores.zip` é byte a byte idêntico.
6. **Given** `make etl-listagens` sem export canônico (com ou sem soft),
   **When** o fluxo roda, **Then** exit 0 e `NTECPP_cotistas_em_pesquisa`
   permanece `null` (nunca `0`; nunca o valor de outra execução).

### User Story 2 - Pacote completo com um único comando: `make dados` (Priority: P1)

Um operador gera o pacote final executando **um único comando**, na ordem
correta e com parada no primeiro erro, em vez de memorizar
`make etl && make etl-listagens && make merge-listagens`.

**Why this priority**: elimina o risco de rodar a sequência pela metade (ex.:
só `make etl`, esquecendo o merge) e padroniza a ordem obrigatória.

**Independent Test**: `SOFT=1 make dados` sem entradas (mas com
`data/dist/indicadores.zip` commitado) termina com exit 0, imprimindo os
`AVISO:` de cada etapa pulada; `make dados` sem `SOFT` com entrada ausente
aborta no primeiro passo com `ERRO:` + exit 1.

**Acceptance Scenarios**:

1. **Given** um clone com `data/dist/indicadores.zip` e entradas ausentes,
   **When** `SOFT=1 make dados` roda, **Then** exit 0 e o zip é byte a byte
   idêntico antes/após (nenhuma etapa sobrescreveu).
2. **Given** todas as entradas presentes, **When** `make dados` roda,
   **Then** exit 0 e o pacote final contém NEP do canônico **e** NTE/NTECPP
   do merge (`pilar1_*` com os três campos preenchidos).
3. **Given** uma entrada ausente e **sem** `SOFT`, **When** `make dados` roda,
   **Then** a sequência aborta na primeira etapa com exit 1 (não segue para as
   etapas seguintes).
4. **Given** `SOFT=1` e planilhas ausentes mas export canônico presente,
   **When** `make dados` roda, **Then** `make etl` regenera o canônico,
   `etl-listagens` é pulado e `merge-listagens` é pulado — o pacote final
   mantém os campos de pesquisa do canônico novo com NTE/NTECPP `null`.

### User Story 3 - Confiar no pacote publicado: `make check-dados` (Priority: P2)

Um operador (ou o CI) avalia "posso confiar neste `indicadores.zip`?" com um
comando único que (a) valida o contrato e (b) alerta sobre frescor/desatualização
por `mtime` — incluindo o caso crítico de `indicadores_listagens.zip` mais
antigo que o índice canônico (NTE/NTECPP vindos de execução anterior).

**Why this priority**: o mtime é a única pista barata de procedência disponível
no repositório; o aviso de proveniência do merge é o que impede a publicação
silenciosa de campos misturados.

**Independent Test**: corromper uma chave do contrato em uma cópia do zip →
`ERRO:` + exit 1; tocar (atualizar mtime) `data/canonical/exports_canonical.zip`
⇒ `AVISO:` de pacote possivelmente desatualizado (exit 0); nada desatualizado
→ exit 0 sem avisos de frescor.

**Acceptance Scenarios**:

1. **Given** um pacote que viola o contrato, **When** `make check-dados` roda,
   **Then** `ERRO:` + exit 1.
2. **Given** um pacote íntegro e em dia, **When** `make check-dados` roda,
   **Then** exit 0, sem `AVISO:` de frescor.
3. **Given** `exports_canonical.zip` mais novo que `indicadores.zip`, **When**
   `make check-dados` roda, **Then** exit 0 com `AVISO:` nomeando o pacote
   "possivelmente desatualizado".
4. **Given** `indicadores_listagens.zip` mais antigo que `indicadores.zip`,
   **When** `make check-dados` roda, **Then** exit 0 com `AVISO:` de
   proveniência de NTE/NTECPP (valores podem ser de execução anterior).
5. **Given** uma planilha `data/raw/listagem_*.xlsx` mais nova que o pacote,
   **When** `make check-dados` roda, **Then** exit 0 com `AVISO:`.
6. **Given** uma entrada de frescor **ausente** (ex.: sem
   `exports_canonical.zip`), **When** `make check-dados` roda, **Then** nenhuma
   comparação de mtime é feita para essa entrada, nenhum falso alarme é emitido
   (exit 0, se o contrato valida) e uma linha **`INFO:`** no stderr lista a
   entrada ausente, deixando explícito que a frescor não foi avaliada para ela.
7. **Given** todas as entradas de frescor ausentes (só `indicadores.zip`
   presente), **When** `make check-dados` roda, **Then** exit 0, nenhum
   `AVISO:` de frescor e **uma única** linha `INFO:` no stderr: "apenas o
   contrato foi validado" (nunca silêncio ambíguo — o comando deixa claro o
   alcance da avaliação).
8. **Given** algumas entradas presentes (ex.: canônico presente, zip de
   listagens ausente), **When** `make check-dados` roda, **Then** a comparação
   é feita apenas para as entradas presentes (possíveis `AVISO:` normais) e a
   linha `INFO:` lista somente as entradas ausentes — sem afetar o exit 0.

### Edge Cases

- `SOFT=1` + `--soft` simultâneos → redundantes, sem conflito (o modo é ativo
  se qualquer um estiver definido).
- Clone limpo (Git não preserva mtimes): `make check-dados` **só valida o
  contrato**; comparações de mtime são inócuas (todos ≈ mtime do checkout), por
  isso a checagem de frescor é **silenciosa** quando não há pacote mais novo
  detectável — nunca gera falso alarme; a ausência de entradas vira **uma**
  linha `INFO:` no stderr ("apenas o contrato foi validado"). Documentado em
  FR-009.
- `data/canonical/` ausente por completo → `make etl` soft pula (se o zip
  existe); `check-dados` não compara essa entrada e a inclui na linha `INFO:`.
- Zip de listagens desatualizado (`mtime` antigo) sobre canônico recém-regenerado
  → mesmo em modo estrito o merge sobrepõe valores antigos (risco **pré-existente**
  da feature 010); `make check-dados` é quem **detecta** a mistura (FR-008b).
- Relatório `data/reports/etl_listagens_run_report.md` em modo soft: **não é
  regenerado** quando a etapa é pulada (nada a reportar; arquivo gitignored).
- `SOFT=1` sobre um pipeline com entradas presentes → o soft **não** altera
  nada; cada etapa roda normalmente (modo soft só age quando falta entrada).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE oferecer modo soft **opt-in** em todas as três
  CLIs do ETL (`etl.main`, `etl.main_listagens`,
  `etl.scripts.merge_listagens_indicadores`) via flag `--soft` **ou** variável
  de ambiente `SOFT=1`. Sem flag e sem env, o comportamento fail-fast atual do
  contrato (spec 006) DEVE permanecer intacto.
- **FR-002**: No fluxo canônico (`etl.main`), com export canônico ausente E
  modo soft E pacote de saída existente, o sistema DEVE emitir `AVISO:` no
  stderr e terminar com exit 0 **sem tocar** o pacote de saída (conteúdo e
  mtime inalterados). Se o pacote de saída **não** existir, DEVE emitir
  `ERRO:` + exit 1 (não há o que preservar).
- **FR-003**: No fluxo de listagens (`etl.main_listagens`), com planilhas
  ausentes E modo soft, o sistema DEVE emitir `AVISO:` no stderr e terminar
  com exit 0 **sem gerar nem sobrescrever** `indicadores_listagens.zip`. Com
  export canônico ausente (com ou sem soft), o comportamento existente é
  mantido: NTECPP `null` + `AVISO:` + exit 0, agora com o acréscimo de que o
  NTECPP **não é recalculável** a partir do zip (sem universo de nomes).
- **FR-004**: No merge (`merge_listagens_indicadores`), com
  `indicadores_listagens.zip` ausente E modo soft, o sistema DEVE emitir
  `AVISO:` no stderr e terminar com exit 0 **sem tocar** `indicadores.zip`.
  Sem modo soft, o `ERRO:` + exit 1 atual é mantido.
- **FR-005**: O modo soft DEVE obedecer às invariantes: nunca fabricar dados
  (campo não apurado ⇒ `null`, Princípio III), nunca deletar artefatos, nunca
  misturar execuções (nenhum campo sobreposto de pacotes de runs diferentes) e
  nenhuma escrita de saída quando a etapa é pulada (arquivo e mtime intactos).
- **FR-006**: O sistema DEVE prover o target único `make dados` que executa,
  **em ordem e parando no primeiro erro** (encadeamento com `&&`), as etapas
  `etl` → `etl-listagens` → `merge-listagens`, repassando o modo soft quando
  `SOFT=1` for definido.
- **FR-007**: O sistema DEVE prover `make check-dados` (script
  `etl/scripts/check_dados.py`) que (a) valida o contrato do pacote
  `data/dist/indicadores.zip` reutilizando a validação existente
  (`validar_arquivos_pilar` com `CAMPOS_DERIVAVEIS_LISTAGENS`) — violação ⇒
  `ERRO:` + exit 1 — e (b) emite `AVISO:` (exit 0) conforme as regras de
  frescor da FR-008.
- **FR-008**: As regras de frescor do `check-dados` DEVERÃO comparar `mtime`
  e avisar quando: (a) `exports_canonical.zip` é mais novo que
  `indicadores.zip` → pacote "possivelmente desatualizado"; (b)
  `indicadores_listagens.zip` é mais novo que `indicadores.zip` → o merge não
  foi reexecutado e os NTE/NTECPP publicados não vêm da execução atual das
  listagens (proveniência do merge); (c) qualquer `data/raw/listagem_*.xlsx` é
  mais nova que `indicadores.zip` → há planilha não incorporada. Entradas
  ausentes DEVERÃO ser ignoradas (sem comparação, sem falso alarme) **e**
  listadas em uma **linha única `INFO:`** no stderr, deixando explícito que a
  frescor não foi avaliada para elas (apenas o contrato foi validado); a linha
  `INFO:` é informativa, nunca um `AVISO:`, e DEVE ser emitida somente quando
  houver pelo menos uma entrada de frescor ausente (todas presentes ⇒ silêncio).
  A condição (b) é `>` estrita e não pode acusar proveniência na ordem saudável
  do `make dados` (`etl` → `etl-listagens` → `merge-listagens`), na qual o merge
  escreve o pacote por último e o deixa necessariamente mais novo que as
  listagens; a cegueira decorrente está registrada em
  [contracts/check-dados.md §5.1](contracts/check-dados.md).
- **FR-009**: O sistema DEVE documentar e respeitar a limitação do mtime: o
  Git **não preserva mtimes**, portanto a checagem de frescor só é significativa
  na máquina onde o ETL gerou o pacote; em clone limpo/CI o `check-dados`
  valida apenas o contrato e **não** emite avisos de frescor (sem falso
  alarme) — sem alterar o exit 0 — imprimindo a linha `INFO:` com as entradas
  ausentes para tornar explícito o alcance da avaliação.
- **FR-010**: O modo soft DEVE preservar o determinismo e a atomicidade do
  pipeline: quando a etapa roda normalmente, a saída continua
  byte-a-byte-determinística e escrita atômica; quando é pulada, o artefato
  pré-existente fica intacto (nenhuma reescrita, mesmo vazia).

### Key Entities _(o modo soft opera sobre artefatos de arquivo, não novos dados)_

- **Entradas do ETL** (gitignored): `data/canonical/exports_canonical.zip`
  (universo de nomes — necessário ao cruzamento NTECPP) e
  `data/raw/listagem_<AAAA>_<S>.xlsx` (planilhas de matrícula).
- **Artefato intermediário**: `data/dist/indicadores_listagens.zip` (NTE/NTECPP).
- **Pacote público**: `data/dist/indicadores.zip` (agregados — único artefato
  commitado; fonte de verdade do site).
- **Mtime** (metadado de arquivo): única heurística de procedência disponível;
  documento em FR-008/FR-009.
- **Snapshot coerente**: um `indicadores.zip` gerado por uma única execução
  completa; o modo soft o preserva **por não tocá-lo**.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: `SOFT=1 make dados` sem `exports_canonical.zip` e com
  `data/dist/indicadores.zip` existente → exit 0 e zip **byte a byte
  idêntico** antes/após (sha256 igual).
- **SC-002**: `SOFT=1 make dados` com `data/raw/` sem planilhas → exit 0;
  `data/dist/indicadores_listagens.zip` não é criado, nem sobrescrito.
- **SC-003**: `make dados` **sem** soft e com entrada ausente → a sequência
  aborta na primeira etapa com `ERRO:` + exit 1 (fail-fast do contrato 006).
- **SC-004**: `make check-dados`: contrato violado → exit 1; pacote em dia →
  exit 0 sem avisos de frescor; canônico mais novo → exit 0 com `AVISO:`;
  listagens mais novo que o pacote → exit 0 com `AVISO:` de proveniência. Na
  ordem saudável do `make dados` (pacote mais novo que as listagens, por conta
  do merge por último) o `check-dados` é **silencioso** — sem `AVISO:` de
  proveniência espúrio.
- **SC-005**: Nenhum cenário soft produz pacote com campos de execuções
  diferentes: se o canônico rodou e o listagens foi pulado, NTE/NTECPP ficam
  `null` (Princípio III) — nunca o valor de uma execução anterior.
- **SC-006**: Testes novos escritos e observados falhar (red) **antes** da
  implementação (Princípio II); `make check` verde ao final (lint + format +
  pytest + vitest) e CI `deploy.yml` inalterado na topologia atual.

## Assumptions

- Continuação da feature 010: entradas permanecem fora do Git; o pacote
  agregado (só contagens, tamanho variável) é commitado e é a forma como o
  site publica os dados; o CI **não** executa o ETL (não tem entradas).
- O "fallback" desejado pelo usuário é alcançado pelo **reuso por não-toque**
  (preservar o último snapshot coerente), e não pela reescrita/sobreposição de
  valores antigos — a opção "C" (reusar literalmente valores antigos) foi
  avaliada e **recusada** por misturar execuções sem marcador de procedência.
- O `check-dados` pode ser adicionado ao job `quality` do CI como portão de
  contrato (Princípio VI) sem que o CI execute o ETL: ele valida apenas o zip
  commitado; nenhum falso alarme de frescor em clone (FR-009).
- `mtime` é heurística operacional, não garantia criptográfica de procedência;
  seu alcance e limite são parte do contrato (FR-009).
- Não há novo dado modelado, nenhuma nova dependência e nenhuma mudança de
  contrato de pacote (a saída continua exatamente o shape da 010).
