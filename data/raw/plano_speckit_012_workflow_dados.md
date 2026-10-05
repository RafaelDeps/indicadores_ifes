# Plano inicial — speckit 012: gate de proveniência e workflow do `make dados`

> Documento de planejamento, escrito para ser editado. Não é spec: ainda não
> passou por `/speckit-specify`, e nenhuma decisão aqui está tomada.
>
> Origem: revisão da branch `011-etl-soft-mode-frescor` contra `main` e
> verificação de uma hipótese de lacuna em 2026-09-30.

---

## 1. A lacuna que define a prioridade

Esta seção é o ponto de partida, porque a verificação que a segue só faz sentido
depois dela. Cada afirmação abaixo tem âncora em arquivo e linha.

### 1.1 O caminho do republicamento silencioso

O `make dados` é uma cadeia de três etapas: `etl` → `etl-listagens` →
`merge-listagens`. Só o merge acrescenta
`NTE_total_estudantes_matriculados` e `NTECPP_cotistas_em_pesquisa`; a etapa 1
regenera o pacote apenas do export canônico, que não carrega esses campos.

A guarda de pré-condição (`etl/scripts/cadeia_dados.py:110`) libera a cadeia
assim:

```python
if listagens.exists() or tem_planilhas(raw):
    # O merge terá entrada: o zip já existe (ainda que stale) ou a etapa 2
    # o produzirá a partir das planilhas.
    return None
```

O comentário entre parênteses — *"ainda que stale"* — descreve o comportamento
real: a presença do arquivo basta, a validade do conteúdo não é examinada.

Somando a isso a regra de proveniência do `check_dados`
(`etl/scripts/check_dados.py:145`), que só dispara quando
`mtime_listagens > mtime_pacote`, o caminho completo é:

| # | Etapa | O que acontece |
|---|-------|----------------|
| 1 | guarda | zip de listagens velho presente + `data/raw` vazia → **libera** |
| 2 | `etl` | regenera o pacote do canônico → NTE/NTECPP viram `null` |
| 3 | `etl-listagens` | sem planilha para ler → pula |
| 4 | `merge-listagens` | repõe NTE/NTECPP a partir do zip **velho** |
| 5 | `check_dados` | o merge **escreveu** o pacote → pacote é o arquivo mais novo → regra (b) muda |
| 6 | — | exit 0, nenhum `AVISO:` |

Os números republicados vêm de um snapshot antigo, sem nenhum sinal. Isto não
é um canto raro: é o caminho de quem roda `make dados` numa máquina em que as
planilhas já foram limpas e o zip de listagens sobrou da rodada anterior.

### 1.2 Por que mtime não resolve, e é justamente por isso que o workflow força a mudança

As três regras de frescor do `check_dados` (canônico, listagens e planilhas mais
recentes que o pacote) comparam `mtime`. Em **checkout limpo** não há
preservação de mtime: todos os arquivos nascem com a data do checkout. Ou seja,
justo no ambiente em que um workflow roda, a verificação por tempo é um no-op.

Some-se a isso o passo 5 acima: qualquer execução do merge torna o pacote o
arquivo mais novo **por construção**. A verificação por tempo é derrotada pelo
próprio passo que ela deveria fiscalizar.

Conclusão que orienta o speckit: a verificação precisa deixar de ser temporal e
passar a ser de **identidade de conteúdo**. Não é uma melhoria incremental; é
pré-requisito de segurança para automatizar a cadeia.

### 1.3 O verificador não distingue pacote fundido de pacote só-canônico

Este é o fato que reorganiza o plano inteiro, e é mais básico do que a lacuna do
§1.1.

`validar_arquivos_pilar` trata os campos derivados de um jeito que **não exige
que estejam preenchidos**. Em `zip_indicadores_sink.py:139-147`:

```python
if (
    campo in CAMPOS_QUE_DEVEM_SER_NULOS
    and campo not in campos_derivaveis
    and valor is not None
):
    violacoes.append(...)
```

Com `campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS` — que é o que `check_dados`
passa na linha 112 — as três condições se anulam: a verificação de nulidade é
**dispensada** para NTE/NTECPP, e nada em lugar nenhum exige o contrário. Com
`null` passando por `_valor_valido(None) is True` (linha 43), o resultado é:

> um pacote com NTE/NTECPP **inteiramente nulos** passa por `check_dados` e
> imprime `Sucesso: 18 arquivo(s)`.

Ou seja: o verificador não sabe se o pacote foi fundido ou não. Não há como
ele detectar a regressão, porque a regressão é indistinguível do estado válido.

Por que isso **não** se resolve com "exigir NTE não nulo": o agregado `todos`
legitimamente não tem NTE. Verificado no pacote commitado:

```
pilar1_serra_2024.json   NTE=1282  NTECPP=73
pilar1_serra_2025.json   NTE=1857  NTECPP=93
pilar1_serra_2026.json   NTE=2121  NTECPP=96
pilar1_todos_2024.json   NTE=None  NTECPP=None
pilar1_todos_2025.json   NTE=None  NTECPP=None
pilar1_todos_2026.json   NTE=None  NTECPP=None
```

3 de 6 com NTE. Uma regra de "não nulo" derrubaria o pacote válido. A regra
correta é por **conjunto de chaves**, comparando com a fonte — e é por isso que
a chave de comparação é `(campus, ano)` com NTE, e não o arquivo.

---

## 2. Recorte: um speckit só, em dois grupos ordenados

Uma versão anterior deste plano separava em speckit 012 (gate) e 013 (workflow).
A divisão caiu porque o argumento que a sustentava — o M2, que mudava o
formato do pacote — foi removido. O que restou do 012 é uma função, uma chamada a
mais na guarda e duas tarefas de rotina: não tem escala de speckit próprio.

Resta uma divisão real, que é de **ordem**, não de escopo:

| grupo | conteúdo | depende de |
|---|---|---|
| A — o portão | M1, M3, M4, M6 | nada; testável local |
| B — a automação | workflow `dados.yml` | grupo A no ar |

O `tasks.md` é ordenado por dependência por desenho, então o grupo A fecha e
mergeia antes do B começar. Se D2 atrasar, o portão já está no ar sozinho — que é
justamente o ponto: o portão não deve esperar pela automação que ele protege.

O grupo A não tem efeito sobre o dado publicado. O grupo B altera o pacote
público. Essa assimetria é a razão de A vir primeiro, e é o motivo de não
tratar os dois como uma entrega só.

---

## 3. Itens do speckit 012

### M1 — Cobertura NTE/NTECPP, uma função, dois chamadores

**Uma** função que compara o conjunto de chaves `(campus, ano)` com NTE
populado entre o pacote e o zip de listagens, e exige que o pacote contenha
todas as que a fonte tem. Violação: `ERRO:` listando as chaves ausentes + exit 1.

O mesmo padrão de reuso que o repo já pratica: `validar_arquivos_pilar` é
compartilhado por `validate_zip`, `merge_listagens_indicadores` e `check_dados`.
A função nova entra no mesmo nível e é chamada de dois lugares:

| chamador | propósito | ação |
|---|---|---|
| `check_dados` (Etapa 1.5) | **detectar** | `ERRO:` + exit 1 |
| `cadeia_dados.avaliar_cadeia` | **prevenir** | bloqueia antes de sobrescrever |

Guard e verificador continuam com papéis distintos — o guard evita o dano, o
verificador confirma o resultado — mas a *regra* é uma só, escrita uma vez.

Encaixe na estrutura existente: `check_dados` já tem `_caminho_ou_padrao` para o
caminho de listagens (linha 104), o padrão `if caminho_listagens is not None and
caminho_listagens.exists()` (linha 144) e a lista `ausentes` (linha 133) para
entrada faltante. A Etapa 1.5 é uma etapa a mais no mesmo lugar, sem flag nova,
sem script novo, sem contrato novo.

**Baseline: o zip de listagens, não o pacote anterior.** Isso é mais simples e
mais correto:

- não cria dependência de git dentro do verificador Python;
- é testável localmente com o `data/raw`/`data/dist` que já existem;
- é a fonte da verdade para "o que o merge deveria ter preenchido".

A comparação com `HEAD:data/dist/indicadores.zip` fica como *opcional* do
workflow (§4), não como núcleo: ela responde a uma pergunta de política
("perder um campus é permitido?") que não precisa ser resposta padrão, e no CI
exigiria `fetch-depth: 0` com o sha da base do PR.

### M2 — ~~Carimbo de proveniência dentro do pacote~~ (removido)

Proposto antes: gravar no pacote um manifesto com o hash do zip de listagens de
entrada. **Removido na revisão de 2026-09-30** — é complexidade que o repo não
precisa, por três razões:

1. Muda o **formato do pacote versionado**, que é contrato de dado, por um
   problema que a comparação de chaves já resolve.
2. A fonte da verdade já está em disco (`data/dist/indicadores_listagens.zip`).
   Um hash do insumo é um resumo do que M1 lê diretamente.
3. Carimbo dentro do pacote só vale se derivado **apenas** das entradas (nunca
   relógio/`mtime`), o que é uma regra a mais para alguém lembrarem de seguir —
   e um carimbo errado é pior que nenhum, porque dá confiança falsa.

### M3 — A guarda deixa de aceitar entrada stale (vira uma chamada)

`avaliar_cadeia` passa a exigir que o zip de listagens cubra as chaves que o
canônico traz, **ou** que as planilhas estejam presentes para regenerá-lo. Sai o
*"ainda que stale"* do docstring (`cadeia_dados.py:111`).

Deixou de ser um item com lógica própria: é M1 aplicada no ponto de bloqueio.

### M4 — Política de pin travada por teste

`tests/etl/test_requirements_pins.py` foi planejado e nunca escrito. Hoje a
política (`==` em ferramentas de teste/lint, `>=` em runtime) é convenção, e
convenção se degrada. Num job agendado a falha apareceria semanas depois, sem
commit associado.

O teste deve verificar a **política**, não os números de versão: quatro
ferramentas com `==`, `openpyxl` mantendo faixa, nenhuma linha solta, sem URL /
caminho local / environment marker. Assim um bump toca só o requirements.

### M5 — ~~Ingestor do site engole arquivo em silêncio~~ (descartado: premissa falsa)

A hipótese original era: `dataset.ts` descarta sem aviso qualquer nome fora de
`^pilar([123])_([a-zA-Z0-9_-]+)_(\d{4})\.json$`, então um campus novo com nome
inesperado desapareceria a jusante. **Verificada em 2026-09-30 e falsa** — o ETL
valida o nome antes de escrever, e o regex do site é mais permissivo:

| consumidor | regex | onde |
|---|---|---|
| ETL (valida, no caminho de escrita) | `^pilar([123])_([a-z0-9]+)_(\d{4})\.json$` | `zip_indicadores_sink.py:14` |
| merge (valida antes do `sink.load`) | `^pilar1_([a-z0-9]+)_(\d{4})\.json$` | `merge_listagens_indicadores.py:38` |
| site (consome) | `^pilar([123])_([a-zA-Z0-9_-]+)_(\d{4})\.json$` | `dataset.ts:80` |

`[a-z0-9]+` ⊂ `[a-zA-Z0-9_-]+`, então **todo nome que o ETL consegue escrever é
aceito pelo site** — verificado empiricamente. E a validação não é pós-hoc: o
`ZipIndicadoresSink.load` chama `validar_arquivos_pilar` na linha 175, antes do
`zipfile.ZipFile` da linha 184, ou seja, o nome impossível nunca chega a ser
gravado. Os 18 arquivos do pacote commitado casam nos dois regexes.

Verifiquei também se `normalizar_slug` (ETL) e `slugificarCampus` (site)
divergiriam: não divergem — ambas decompõem diacríticos, passam a minúsculas e
removem tudo que não for `[a-z0-9]`.

Resta um resíduo, de valor baixo: o `if (!match) continue` da linha 81 é um
`continue` mudo e sem teste, mas só pode ser acionado por nome vindo de fora do
ETL (zip editado à mão ou de terceiros). **Não é prioritário.**

### M5' — Sucessor real: campus desconhecido cai na série completa

O que a busca original procurava de fato existe, um nível abaixo. Em
`dataset.ts:135-139`, `obterAnosDisponiveis` devolve **todos os anos do dataset**
quando o slug pedido não está em `campi`:

```ts
const campus = dataset.campi.find((c) => c.slug === campusSlug);
return campus ? campus.anos : dataset.anos;
```

Somado ao `campusSlug = 'serra'` fixo nos defaults de
`obterIndicadoresDoPilar` (linha 394) e `obterIndicadorCompleto` (linha 455), um
campus ausente do pacote não gera erro: produz a série multi-ano completa com
todos os valores `null` — o usuário vê "Dado indisponível" em vez de "campus
não encontrado". Há teste para o caso `todos` (linha 129), não para o campus
inexistente.

Relevância para o workflow: é o efeito de um campus novo aparecer no pacote sem
que nada o examine. Menor gravidade que M1/M2 — é robustez de site, não
integridade de dado — mas é o que restou da investigação, e por isso fica
registrado em vez de descartado.

### M6 — Inconsistência residual na spec 006

As linhas 19, 92 e 100 ainda dizem `npm run etl`; o FR-013 (linha 133) diz
`make etl`. A nota de supersessão existe, mas só na linha 170 — longe do texto
que contradiz. Fica uma especificação que se contradiz no meio.

---

## 4. Grupo B — o workflow: esqueleto

`.github/workflows/dados.yml`, gatilho primário `workflow_dispatch`.

```
1. baixar as planilhas do Drive        (rclone + service account, ver §5/D1)
2. baixar o export canônico            (raw.githubusercontent, `export_sha` fixo)
3. make dados em modo ESTRITO         (nunca soft — ver §4.1)
4. make check-dados                   (já inclui o gate do M1)
5. abrir PR com o pacote regenerado
```

Nada disso toca no ETL: a credencial fica inteira no workflow, e a fonte segue
lendo uma pasta local (`data/raw`) como hoje. É a costura que evita mexer no
contrato do ETL por causa de um workflow.


O passo 3 é o que faz a revisão §4 valer: **o `deploy.yml` já roda
`python -m etl.scripts.check_dados` no job `quality`**. Colocando o gate dentro
do `check_dados`, ele passa a valer em todo PR que mexa no pacote, sem passo
novo no CI e sem contrato novo — inclusive para edições manuais do pacote, que
o workflow nunca enxerga.

Saíram do esqueleto, por serem desnecessários: instalar Python (o
`actions/setup-python` do `quality` já é o mesmo 3.12; só `pip install -r
requirements-etl.txt`, como em `deploy.yml:26`), e um passo de byte-compare com
o baseline (§4.2 virou opcional).

### 4.1 Por que nunca em modo soft

O modo soft bloqueia com `AVISO:` + exit 0. Num job agendado, "não fez nada, sem
erro" é o pior resultado possível: some sem deixar rastro. Num gatilho manual
ele é defensável, porque há alguém olhando. Decisão sugerida: soft apenas em
`workflow_dispatch`, proibido em `schedule`.

### 4.2 Sem diff → sem PR (opcional, não no primeiro corte)

Como o pacote é determinístico, comparar a saída nova com o baseline antes de
abrir o PR eliminaria a revisão semanal de regenerações que não mudam nada.
**Não entra no primeiro corte**: é conveniência, não proteção — um PR vazio é
ruído, não risco. Decidir depois de ver o job rodando.

---

## 5. Decisões que faltam (bloqueiam o grupo B)

**D1 — De onde vêm as entradas.** `data/raw/listagem_*.xlsx` e
`data/canonical/exports_canonical.zip` são gitignored e não estão no repo.

*Planilhas — decisão **revista** (2026-09-30).* A escolha de plataforma estava
declarada antes de se saber o que a planilha contém. Ver §5.1: ela tem PII mais
sensível do que se supunha, e o enquadramento de segurança estava errado. O
esboço abaixo é do desenho com Drive + chave, que **continua válido** e serve
de referência para as alternativas — mas a plataforma precisa ser decidida
(D4).

Pasta privada no Google Drive, credencial de service account guardada em secret
do repositório, `rclone copy` para `data/raw`. Esboço do passo:

```yaml
- name: baixar planilhas do Drive
  env:
    RCLONE_CONF: ${{ secrets.RCLONE_CONFIG }}
  run: |
    printf '%s' "$RCLONE_CONF" > "$RUNNER_TEMP/rclone.conf"
    chmod 600 "$RUNNER_TEMP/rclone.conf"
    rclone copy gdrive:listagens data/raw \
      --config "$RUNNER_TEMP/rclone.conf" --include 'listagem_*.xlsx'
    rm -f "$RUNNER_TEMP/rclone.conf"
```

Um secret só (a config INI do rclone, com a chave embutida), escrito em
`$RUNNER_TEMP`, apagado no fim. Sem `set -x` no passo — a config renderizada não
é mascarada por GitHub, só o secret é.

Cuidados que vêm junto:

- a fonte só aceita `^listagem_(\d{4})_([12])\.xlsx$`
  (`listagens_xlsx_source.py:30`); nome divergente no Drive não entra, e se
  **todos** divergirem o erro é da linha 85;
- compartilhar a pasta **para** a service account, nunca ter os arquivos de
  propriedade dela: deletar a conta apagaria as planilhas;
- `workflow_dispatch` (e depois `schedule`) **nunca** `pull_request` /
  `pull_request_target` com essa credencial;
- registrar os **IDs** dos arquivos, não os nomes: ID é estável, nome não.

*Export canônico — origem **conhecida** (2026-09-30).* É produto do repo
público `RafaelDeps/horizon_etl`, no caminho
`data/exports/exports_canonical.zip`. Sem credencial: baixa por
`raw.githubusercontent.com`. Verificado que é arquivo **rastreado** em `main` e
que o repo não tem releases — não é artefato de release, é o arquivo no git.

Download por **sha fixo**, nunca por `main`:

```
https://raw.githubusercontent.com/RafaelDeps/horizon_etl/<sha>/data/exports/exports_canonical.zip
```

`main` tornaria a entrada não-reprodutível: o insumo mudaria sozinho e nenhum
`indicadores.zip` commitado poderia ser reproduzido depois. Um input
`export_sha` no `workflow_dispatch`, com default fixado no YAML, resolve — e
dá a proveniência que o M2 pretendia resolver, sem tocar no formato do pacote.

O sha fixo não é preferência estética: **o gate do M1 não cobre isso.** Ele
compara cobertura de chaves NTE, não identidade do insumo, então uma troca
inteira de export passaria pelo gate sem que nada percebesse.




**D2 — `schedule` ou só manual.** Recomendação: `workflow_dispatch` primeiro,
`schedule` só depois que M1 estiverem no ar. O erro de sequenciamento a evitar é
ativar o agendamento antes do gate de conteúdo — automação que republica snapshot
velho é **pior** que o status quo, porque parece validada.

**D3 — Conflito com a spec 006.** O FR-013 (linha 133) diz literalmente *"sem
regeneração automática em CI"*. Um workflow que regenera **supersede** essa
frase, e precisa dizê-lo no texto, não deixar implícito. O SC-006 ("1 comando, 0
etapas manuais intermediárias") fica em tensão com o provisionamento de entradas
— o argumento de que ele fala do processo do ETL e não do acesso ao dado é
defensável, mas tem de estar escrito, não presumido.

---

## 5.1. O que as planilhas contêm, e o enquadramento corrigido

### O dado

Cabeçalho real de `listagem_2026_1.xlsx`, 2.565 linhas por planilha, 6 planilhas:

```
Matrícula | Nome | Curso | Situação Matrícula | Sexo | Nascimento | Forma_Ingresso | Desc_Cota
```

Isto é mais do que o plano supunha. Além de matrícula e nome, há **data de
nascimento** e **tipo de cota**.

A ameaça relevante não é o nome completo — é **linkabilidade em coorte
pequena**. Em um curso com poucas dezenas de matriculados, ano de nascimento +
cota + sexo identificam uma pessoa. Consequência prática: **pseudonimizar a
coluna `Nome` não resolve**, porque o resto do registro ainda identifica.

O que a ETL escreve, ao contrário, é agregado: varredura nas 9 entradas do
`indicadores_listagens.zip` não encontrou nenhuma chave de pessoa — só
contadores (`NTE_total_estudantes_matriculados`, `NEP_estudantes_em_pesquisa`).
São 7.665 bytes no total. O `EstudanteListagem` com matrícula e nome existe em
memória durante a extração, não no zip.

### Enquadramento corrigido

Versão anterior deste plano dizia que as alternativas de armazenamento a git
"violavam PII". **Isso estava errado**, e a forma certa importa para escolher.

Nenhuma opção viola nada por existir. O que de fato diferencia as opções são
três eixos:

| eixo | pergunta que responde |
|---|---|
| **residência** | onde o dado fica fisicamente (LGPD art. 33, transferência internacional) |
| **raio de um vazamento** | quanto um vazamento do secret abre |
| **capacidade de apagamento** | dá para cumprir a eliminação de verdade (LGPD art. 18) |

Drive e repositório privado **empatam em dois**: os dois hospedam nos EUA, e os
dois ficam atrás do mesmo tipo de controle de acesso. Repo privado não é
"PII-em-git proibido" — em repouso é equivalente a uma pasta privada.

O git perde em **um** eixo só, e é decisivo: **apagamento**. `git rm` deixa o
blob alcançável pelo histórico; quem clona leva todas as versões passadas,
inclusive as planilhas já deletadas. Reescrever exige filter-repo + force-push,
o que invalida os clones existentes — e os clones que já saíram continuam com o
dado. Você nunca garante que sumiu. No Drive, apagar o arquivo e limpar a
lixeira remove mesmo, e há ferramenta central de admin.

O argumento correto é, portanto: *git dificulta mais cumprir obrigação de
eliminação*. Não "viola PII".

### Achado lateral, de custo menor que a escolha de plataforma

Existem **12 cópias das planilhas nesta máquina** — 6 em `~/Documents` e as
mesmas 6 em `data/raw/`, com conteúdo idêntico (6 hashes distintos para 12
arquivos). Enquanto a pasta pessoal e a do projeto guardarem a mesma coisa,
escolher a melhor das três plataformas para o acesso do CI deixa sem
endereço a maior exposição, que é a que ninguém controla por repositório. Vira
tarefa em `tasks.md`.

### O que o link no log expõe (ou não)

Preocupação levantada: a URL do download apareceria no terminal da Actions.
Resposta: **link não é credencial**, na quase totalidade dos casos. `rclone` e
`gsutil` autenticam pela API e o log mostra o nome do remoto, não um segredo.
O único caso em que a URL authorize é **URL assinada** (`signurl`, presigned
S3) — ali a assinatura *é* a credencial, e imprimi-la vaza. Solução: não usar
URL assinada; autenticar direto.

Os vetores reais de exposição são outros três:

1. **o arquivo de configuração renderizado** — a config INI do rclone embute a
   chave privada. Qualquer coisa que a imprima entrega a credencial inteira.
2. **o masking do GitHub não é garantia** — a substituição é por string exata.
   Se o valor for transformado (extrair `private_key` do JSON, renderizar num
   INI), a forma impressa deixa de ser idêntica e **não é mascarada**. Vale
   mais a regra de não imprimir do que confiar no `***`.
3. **artifacts** — `upload-artifact` de qualquer coisa em `data/raw/` coloca as
   planilhas no artefato do run, baixável por qualquer um com leitura no repo
   por 90 dias. `.gitignore` protege o git e **não** protege o artifact.

O `deploy.yml` atual está limpo nos três vetores: sem `set -x`, sem `curl`, e o
único `upload-artifact` é o de Pages.

### Por que isso não encolhe o desenho

Com Workload Identity, não existe string de segredo nenhuma para vazar: o
token nasce na credential chain do runner e morre com o job. Com chave, existe
uma string de 40 linhas que precisa ficar longe do log. É a mesma diferença de
antes — credencial de longa duração contra efêmera —, agora sem o ruído do
link.

---

## 5bis. D4 — plataforma das planilhas (decisão em aberto)

Substitui a "decisão" de Drive em §5/D1, que foi tomada sem saber o conteúdo do
arquivo. As três saídas, e o que cada uma custa:

| opção | credencial no repo | esforço | o que custa |
|---|---|---|---|
| **GCS + WIF** | nenhuma — token por run, `southamerica-east1` | médio | é a única que remove a credencial de longa duração |
| GCS + chave | chave, mas `roles/storage.objectViewer` num bucket só | baixo | quase empate com o plano atual |
| **agregado commitado** | **nenhuma** | **zero** | CI deixa de rodar `make dados` inteiro |

A escolha real é binária, não ternária: **o CI precisa das planilhas?**

- Se **não** precisa, nada de bucket. `etl-listagens` é o único passo de
  `make dados` que as toca; os outros dois (`etl` a partir do canônico,
  `merge-listagens`) rodam sem credencial nenhuma. Efeito colateral positivo:
  o agregado commitado tem **git sha**, que o build local não tinha — a
  proveniência que o M2 queria nasce de graça.
- Se **precisa**, WIF é a única das duas que satisfaz "tão seguro ou mais que
  Drive". Com chave é empate técnico.

Custo não diferencia: 900KB está muito abaixo da free tier.

Um detalhe a acertar se for WIF: a condição `attribute.repository` no trust
policy, e `id-token: write` explícito em `permissions:` — nunca herdado.

---

## 6. Sequência

```
--- grupo A: o portão (sem efeito no dado publicado) ---
A1  M1 (função de cobertura NTE)  ── núcleo
A2  M3 (guarda passa a chamar M1)  ── mesma regra, ponto de bloqueio
A3  M4 (pin) / M6 (doc 006)       ── isolados, sem tocar no pacote
A4  M5' (campus desconhecido)     ── site; opcional, menor gravidade

--- grupo B: a automação (altera o pacote público) ---
B1  credencial das planilhas        <- D4 em aberto (§5bis)
B2  dados.yml: gatilho, permissões, download das duas entradas
B3  make dados estrito + check-dados (com o gate do grupo A)
B4  abertura do PR
B5  schedule (D2)                  ── por último de tudo
```

O grupo B não começa antes de A1 estar no ar. M2 saiu da lista (removido na
revisão). M5 saiu porque a premissa era falsa (§3 M5); M5' é o que sobrou da
mesma investigação e entra como opcional. B1 depende de D4, e D4 depende de uma
pergunta que é do mantenedor: o CI precisa das planilhas, ou só do agregado?

---

## 7. Artefatos speckit previstos

Para o 012 (enxuto — bem menos do que a primeira versão previa):

- `spec.md` — o quê e por quê
- `research.md` — **removido** (era para o carimbo de proveniência, §3 M2)- `plan.md` — arquitetura: onde a função de cobertura mora, quem a chama, e o
  desenho do workflow (dois grupos, com a ordem explícita)
- `contracts/` — **só** a atualização do contrato do `check-dados` (nova Etapa
  1.5). Sem contrato novo para o gate: o gate não é um componente com interface
  pública própria, é uma etapa de um verificador que já tem contrato.
- `data-model.md` — não previsto; sem manifesto novo, não há formato a descrever.
- `quickstart.md`, `checklists/`, `tasks.md`

Observação de speckit: a spec 011 está em status `Draft`, então alterações de
contrato nela continuam sendo território de speckit — o que inclui qualquer
ajuste no `AVISO:` do `check-dados` (§3.1 do contrato atual) que este plano
venha a exigir.
