# Quickstart — Gate de Proveniência e Automação do `make dados`

**Feature**: `012-gate-proveniencia-workflow-dados` | **Data**: 2026-09-30

Como provar que a feature funciona — **antes** de implementada (reproduzindo o
defeito) e **depois** (confirmando o fechamento). Os dois lados usam os mesmos
comandos.

## 0. Ponto de partida

```bash
make check          # deve passar: lint + formatação + pytest + vitest
make check-dados    # deve passar: exit 0, sem violação
```

Estado atual do disco de trabalho, usado como base de todos os cenários:

| entrada                                | presente         | onde       |
| -------------------------------------- | ---------------- | ---------- |
| `data/dist/indicadores.zip`            | sim, 18 arquivos | commitado  |
| `data/dist/indicadores_listagens.zip`  | sim, 9 arquivos  | gitignored |
| `data/raw/listagem_*.xlsx`             | sim, 6 arquivos  | gitignored |
| `data/canonical/exports_canonical.zip` | sim, 18 MB       | gitignored |

O export canônico é limitação do ambiente local, não da feature: as entradas
gitignored **não** estão em clone limpo, e o pacote commitado é a referência de
comparação.

## 1. Antes — reproduzir o defeito

O cenário que a feature fecha é: **o pacote passa na verificação atual e mesmo
assim perdeu a contribuição das listagens**.

```bash
mkdir -p /tmp/pacote-sem-listagens
cp data/dist/indicadores.zip /tmp/pacote-sem-listagens/
```

Simula-se um pacote apenas-canônico: o mesmo pacote, com os derivados removidos
como o export canônico os deixaria. Constrói-se com a mesma estrutura e o mesmo
nome de arquivo, para que só o valor mude:

```bash
python3 - <<'PY'
import json, zipfile, pathlib
DERIVADOS = [("PIES", "NTE_total_estudantes_matriculados"),
             ("PICOT", "NTECPP_cotistas_em_pesquisa")]
src = pathlib.Path("data/dist/indicadores.zip")
dst = pathlib.Path("/tmp/pacote-sem-listagens/indicadores.zip")
with zipfile.ZipFile(src) as z_in, zipfile.ZipFile(dst, "w") as z_out:
    for nome in z_in.namelist():
        dados = json.loads(z_in.read(nome))
        if nome.startswith("pilar1_"):
            for grupo, campo in DERIVADOS:
                if grupo in dados.get("indicadores", {}):
                    dados["indicadores"][grupo][campo] = None
        z_out.writestr(nome, json.dumps(dados, ensure_ascii=False, indent=2) + "\n")
print("pacote sem listagens:", dst)
PY
```

Agora a verificação **atual**, contra a origem presente:

```bash
python -m etl.scripts.check_dados \
  --pacote /tmp/pacote-sem-listagens/indicadores.zip \
  --listagens data/dist/indicadores_listagens.zip \
  --canonical "" --raw ""
echo "exit = $?"
```

**Resultado verificado em 2026-09-30, antes da implementação**:

```text
INFO: frescor não avaliado para: data/canonical/exports_canonical.zip, listagem_*.xlsx — apenas o contrato foi validado.
Sucesso: 18 arquivo(s) em /tmp/pacote-sem-listagens/indicadores.zip atendem ao contrato CONIF.
exit = 0
```

O pacote perdeu **12 valores derivados** (6 arquivos de `pilar1` × 2 campos) e
foi aprovado. Esse exit 0 indevido é o defeito. Todo o resto desta feature existe
para que ele seja exit 1.

O número 12 foi **contado** no pacote gerado, não estimado.

### 1.1 A guarda, no mesmo estado degradado

```bash
python -m etl.scripts.cadeia_dados
echo "exit = $?"
```

**Resultado verificado em 2026-09-30**: `cadeia_dados exit=0`. A guarda pergunta
apenas se o merge terá entrada; o zip de listagens existe, então **libera** —
mesmo com entrada insuficiente para repor o que o pacote tem.

## 2. Depois — o portão fecha

Mesmos comandos do §1, sem mudar nada:

```bash
python -m etl.scripts.check_dados \
  --pacote /tmp/pacote-sem-listagens/indicadores.zip \
  --listagens data/dist/indicadores_listagens.zip \
  --canonical "" --raw ""
echo "exit = $?"
```

**Resultado esperado depois**: **6** linhas `ERRO:` — 3 pares
(`serra` × 3 anos) × 2 campos derivados — e **exit ≠ 0**.

São 6, e não 12, porque o escopo agregado tem derivado nulo **na origem também**,
e portanto não é perda. A diferença entre 12 e 6 é a regra de perda operando: o
que a origem não tinha não era para ser reposto.

E o pacote correto continua passando, sem alteração:

```bash
make check-dados
echo "exit = $?"
```

**Resultado esperado**: exit 0, nenhuma violação. Este é o critério que impede
que a feature "funcione" rejeitando o pacote bom.

## 3. Depois — os três vereditos, um a um

O portão tem três desfechos, e é preciso ver os três. É o que separa
"reprovar o ruim" de "reprovar tudo".

| cenário              | comando                                            | hoje (verificado) | depois                                            | verificado em 2026-10-01 |
| -------------------- | -------------------------------------------------- | ----------------- | ------------------------------------------------- | ------------------------ |
| cobertura preservada | `make check-dados`                                 | exit 0            | exit 0, sem violação                              | ✓ exit 0                 |
| sem origem           | `python -m etl.scripts.check_dados --listagens ""` | exit 0, `INFO:`   | exit 0, `INFO:` de cobertura                      | ✓ exit 0                 |
| cobertura perdida    | §2                                                 | **exit 0**        | exit ≠ 0, 6 linhas `ERRO:` de perda + 1 de resumo | ✓ exit 1, 7 linhas       |

Só o terceiro muda. Os dois primeiros já estão corretos hoje e a feature **não
pode** alterá-los — por isso estão na tabela: um portão que só funciona é um
portão que reprova o pacote bom.

O terceiro é o que mantém o CI limpo. Sem ele, um clone sem
`data/dist/indicadores_listagens.zip` reprovaria todo pull request.

## 4. Depois — a guarda, antes

```bash
python -m etl.scripts.cadeia_dados --soft; echo "exit = $?"
```

Cenário a montar: pacote que cobre 2025 e 2026, zip de listagens que cobre só
2026, pasta bruta vazia. **O pacote é recortado também** — o `indicadores.zip`
versionado cobre 2024, 2025 e 2026, e com os três anos o segundo passo deste
documento (planilha de 2025 presente, esperado exit 0) seria inalcançável: 2024
continuaria sem entrada e a guarda bloquearia. O recorte é o que torna o cenário
igual à frase acima.

```bash
mkdir -p /tmp/cadeia/{pacote,listagens,raw}
cp data/dist/indicadores.zip /tmp/cadeia/pacote/
cp data/dist/indicadores_listagens.zip /tmp/cadeia/listagens/
python3 - <<'PY'
import zipfile, pathlib
# Pacote: só 2025 e 2026.
pac = pathlib.Path("/tmp/cadeia/pacote/indicadores.zip")
with zipfile.ZipFile(pac) as z_in, zipfile.ZipFile(pac.parent / "recorte.zip", "w") as z_out:
    for nome in z_in.namelist():
        if "_2024.json" not in nome:
            z_out.writestr(nome, z_in.read(nome))
pac.unlink()
(pac.parent / "recorte.zip").rename(pac)
# zip de listagens que cobre apenas 2026
src = pathlib.Path("/tmp/cadeia/listagens/indicadores_listagens.zip")
with zipfile.ZipFile(src) as z_in, \
     zipfile.ZipFile(src.parent / "parcial.zip", "w") as z_out:
    for nome in z_in.namelist():
        if nome.endswith("_2026.json"):
            z_out.writestr(nome, z_in.read(nome))
src.unlink()
(src.parent / "parcial.zip").rename(src)
PY

python -m etl.scripts.cadeia_dados \
  --pacote /tmp/cadeia/pacote/indicadores.zip \
  --listagens /tmp/cadeia/listagens/indicadores_listagens.zip \
  --raw /tmp/cadeia/raw
echo "exit = $?"
```

**Resultado verificado em 2026-09-30**: `exit = 0` — libera. O pacote cobre 3
anos, o zip de listagens cobre 1, e a guarda não percebe; a cadeia apagaria a
cobertura de 2 anos.

**Confirmado em 2026-10-01, depois**: exit **3** — o código **já publicado** para
bloqueio, sem código novo — com `ERRO:` nomeando os pares que seriam perdidos
(`perde serra/2025`, no cenário recortado acima).

Este é o único cenário do documento que **muda de veredito**: 0 → 3. É o que
distingue a guarda nova da atual.

Com planilha bruta presente, a guarda deve liberar:

```bash
cp data/raw/listagem_2025_2.xlsx /tmp/cadeia/raw/
python -m etl.scripts.cadeia_dados \
  --pacote /tmp/cadeia/pacote/indicadores.zip \
  --listagens /tmp/cadeia/listagens/indicadores_listagens.zip \
  --raw /tmp/cadeia/raw
echo "exit = $?"
```

**Confirmado em 2026-10-01, depois**: exit 0.

Este cenário **não muda** de veredito (já é 0 hoje, verificado). É guarda de
regressão: garante que a guarda nova não fique restritiva demais e bloqueie
execução legítima. Registrado assim porque um quickstart que só mostra o que
muda não mostra o que não pode mudar.

## 5. Grupo B — o workflow

O grupo B tem duas metades de validação, e vale separá-las porque uma está
verificada e a outra não.

**Verificada localmente, sem rede e sem segredo**: cada passo do
`.github/workflows/dados.yml` foi extraído e executado fora do GitHub, com dublês
de `curl` e `make` e com o log real de uma corrida da cadeia. O que se confirmou:

| passo                                | o que foi verificado                                                                                                                          |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| conferir o segredo                   | 3 estados: ausente, vazio, presente — `exit 1`, `exit 1`, `exit 0` sem imprimir o valor                                                       |
| ler o manifesto                      | 8 fixtures: válido, ausente, 5 arquivos, revisão curta, revisão móvel, dono vazio, `asset_id` não numérico, nome inválido, linha desconhecida |
| obter as planilhas                   | 4 cenários com `curl` dublê: 6 assets, 404 parcial, nenhum asset, manifesto inconsistente                                                     |
| conferir a contagem                  | 5 cenários: 6 cheias, 5 cheias, 6 vazias, 5 cheias e 1 vazia, nenhuma                                                                         |
| obter o export canônico              | revisão fixa grava o arquivo; referência móvel falha                                                                                          |
| conferir o portão                    | 3 cenários: saúde, `INFO:` de cobertura presente, portão reprovado                                                                            |
| conferir o determinismo              | 4 cenários: as duas corridas concordam, discordam, a segunda falha, nome residual                                                             |
| hygiene do log                       | 2.756 nomes distintos do log real, um a um: **nenhum** chega à saída                                                                          |
| abrir pull request / nada a publicar | 2 desfechos, e o corpo do PR conferido campo a campo                                                                                          |
| ordem dos passos                     | o retrato do versionado vem antes de qualquer corrida da cadeia                                                                               |

### 5.1 Pré-condições, fora do repositório

1. Repositório privado `indicadores-dados-listagem` existe, e o PAT foi emitido
   **na conta dona dele** com `contents: read` sobre um repositório só.
   Confirmar que o token é revogável de onde foi emitido, e não de onde está
   guardado.
2. Release `v1` publicada com os 6 assets anexados. **Feito** — ver §5.7.
3. `DADOS_LEITURA_TOKEN` configurado como segredo, com permissão de leitura sobre
   **um** repositório. **Por fazer** — `gh secret list` devolveu vazio em
   2026-10-01.
4. `dados-insumo.yml` preenchido com os `asset_id` e a revisão de 40 caracteres
   do export canônico. **Feito** — ver §5.7.

> **Nota sobre a conta.** Não há organização dona deste repositório. O privado é
> de `henriqk0` e este é de `RafaelDeps`, com `henriqk0` em `write` aqui e
> `RafaelDeps` em `none` no privado — verificado por API em 2026-10-01. A
> separação de contas é real para o token; a de pessoas não é, porque é a mesma
> pessoa nos dois lados. Isto está registado em
> [medidas-de-protecao.md](./medidas-de-protecao.md) §4.1.

### 5.2 Obter os identificadores, sem insumo

```bash
gh api repos/henriqk0/indicadores-dados-listagem/releases/tags/v1 \
  --jq '.assets[] | "\(.id)\t\(.name)"'
```

E, para o canônico, a revisão fixa fica **versionada** — escolher uma e nunca
mudar depois, senão a reproducibilidade é perdida sem ninguém perceber.

### 5.3 Confirmar que `contents: read` basta

```bash
curl -sSI -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/octet-stream" \
  "https://api.github.com/repos/henriqk0/indicadores-dados-listagem/releases/assets/<id>"
```

Se responder `302` com `Location` para uma URL assinada, a permissão de leitura
basta e não é preciso qualquer permissão de escrita.

### 5.4 Falha alto sem o segredo

Primeiro disparo, **antes** de qualquer configuração de repositório privado: o
passo do segredo tem de falhar com mensagem própria, e nenhum passo posterior pode
chegar a rodar.

Sem `DADOS_LEITURA_TOKEN` configurado, acionar o workflow e conferir, em ordem:

| #   | o que conferir                                                            | esperado                                  |
| --- | ------------------------------------------------------------------------- | ----------------------------------------- |
| 1   | o passo "Conferir o segredo de leitura" falha                             | `exit 1`, com mensagem nomeando o segredo |
| 2   | a mensagem diz **ausente ou vazio**, e não diz "401" nem "não autorizado" | mensagem de nome, não de HTTP             |
| 3   | nenhum passo de download aparece no log                                   | o job para no primeiro passo              |

Saída verificada em 2026-10-01, executando o passo isoladamente fora do GitHub:

```text
::error::DADOS_LEITURA_TOKEN está ausente ou vazio neste repositório. Configure-o em Settings → Secrets and variables → Actions. Sem ele o download das planilhas não é possível.
exit = 1
```

O mesmo passo, com o segredo **vazio** e não apenas ausente, também dá `exit 1` e
a mesma mensagem — e com o segredo presente dá `exit 0` **sem imprimir o valor**.
São três estados e três comportamentos, e o segundo é o que costuma ser esquecido:
um segredo configurado e vazio falha igual a um segredo inexistente, e sem a
conferência de não-vazio o `curl` seguiria para a rede e o erro seria 401.

### 5.5 Disparo real

Acionar manualmente e conferir, em ordem:

| #   | o que conferir                                                                             | onde                              |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------- |
| 1   | o log **não** contém o valor do token                                                      | log da execução                   |
| 2   | o log **não** contém nome, matrícula ou nascimento                                         | log da execução                   |
| 3   | 6 planilhas baixadas, e o passo de contagem passa                                          | log                               |
| 4   | a cadeia roda e a verificação **não** tem `INFO:` de cobertura                             | log — no workflow a origem existe |
| 5   | as duas corridas concordam byte a byte                                                     | log do passo de determinismo      |
| 6   | o pull request abre com o pacote e sem entrada, **ou** o log diz que não há o que publicar | log e pull request                |

O item 5 vem antes do 6 de propósito: uma saída instável com insumo novo aparece
como "mudança de dado" e seria publicada como se fosse conteúdo legítimo. É o
passo de determinismo que impede que isso aconteça.

### 5.6 O que **não** fazer

- Não disparar a partir de um pull request: o evento não existe, e o teste é
  inútil porque não há credencial.
- Não conferir a conformidade pelo fato de o log estar limpo hoje. Ausência de
  credencial em log é observada **por execução**, e o masking do GitHub é por
  valor exato.

### 5.7 Verificado contra o repositório real, 2026-10-01

O inventário acima corre contra dublês. Com o repositório privado e o canônico
público reais, os passos de rede foram corridos de verdade — extraídos do YAML,
não reescritos:

| passo                    | o que foi verificado                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| ler o manifesto          | o ficheiro real, com os `asset_id` reais: `Manifesto válido`, 8 saídas correctas                              |
| obter as planilhas       | os 6 assets reais, transferidos, sha256 igual ao original nos **dois** sentidos                               |
| conferir a contagem      | 6 presentes e não vazias                                                                                      |
| obter o canônico         | 24 436 748 bytes na revisão fixada; desembrulhado para 24 436 556, 715 entradas, os 7 obrigatórios presentes  |
| canônico, falha          | revisão inexistente → 404, `data/canonical/` **não** criado, sem zip truncado; ficheiro vazio → erro por nome |
| canônico, sucesso        | modo `0644`, tamanho conferido, nenhum temporário deixado para trás                                           |
| cadeia ponta a ponta     | `make dados` estrito exit 0, 216 arquivos; duas corridas com md5 igual                                        |
| portão                   | `make check-dados` exit 0, sem `INFO:` de cobertura                                                           |
| reza do log, escala real | 6 304 estudantes do canônico real: **6 304** no log bruto, **0** no log higienizado, e 0 por padrão           |

**Dois defeitos reais apareceram aqui, e nenhum dos dois apareceria por leitura.**

O primeiro: o passo do canônico usava `CAMINHO_CANONICO` para **dois** papéis — o
caminho remoto na URL e o caminho local de destino. Com `caminho:
data/exports/exports_canonical.zip` no manifesto, a URL ficava certa e o destino
também, por acidente: as duas árvores só coincidiram enquanto o ficheiro esteve
nos dois sítios. Contra o repositório real deu 404. A correcção separou os dois,
e o destino passou a ser a constante do repositório
`data/canonical/exports_canonical.zip`.

O segundo, mais caro: o ficheiro publicado é um **invólucro**. O
`exports_canonical.zip` de `horizon_etl` tem uma única entrada,
`exports_canonical.zip`, com 715 ficheiros — é o pacote canônico. A fonte canônica
do ETL exige esses ficheços na raiz. A falha só apareceu na **primeira execução
real**, dois passos mais tarde, como `'campuses_canonical.json' ausente no pacote
ZIP`: mensagem que não distingue formato errado de revisão errada. O passo 5
desembrulha e confere os sete obrigatórios antes de mover o ficheiro, para que a
falha happença no passo 5 e por nome.

**A medida que estes números mudou.** A reza do log (FR-026) tinha sido verificada
contra um log de amostra, com 2 756 estudantes. O canônico fixado no manifesto tem
**6 304**, em 23 campi, contra 1 na amostra. A verificação foi refeita a esta
escala: os 6 304 nomes estão todos no log bruto e **nenhum** no log que o runner
imprime, e uma segunda rede por padrão — independente da lista de nomes, para
apanhar um nome que a lista não cobrisse — também não encontra nada. Um controlo
de vazamento só medido à escala de amostra não é um controlo medido.

**Ainda não verificável localmente**: a execução real no GitHub Actions, que
depende do segredo emitido na conta dona e de uma execução de verdade. É o
§ 5.1 a § 5.5 acima.

### 5.8 O que a primeira execução real vai fazer, e é preciso saber antes

O canônico fixado é o **real**. O que está versionado em `data/dist/` foi
produzido com a amostra de 1 campus:

|                    | canônico versionado                | canônico fixado no manifesto       |
| ------------------ | ---------------------------------- | ---------------------------------- |
| campi              | 1                                  | 23                                 |
| estudantes         | 2 756                              | 6 304                              |
| arquivos no pacote | 18                                 | 216                                |
| md5 do pacote      | `937e2aceb6a77f4837a04c415a73516e` | `6c449c5ba6df957e60f0c0ea722b1bd9` |

A primeira execução vai, portanto, **divergir do versionado e abrir um pull
request** — e o que ele propõe não é uma actualização de valores: é a substituição
de um painel de um campus por um painel de 23. Divergir é a resposta normal do
passo 10, não um aviso de erro, mas é uma mudança de conteúdo no site público e
por isso pede revisão humana. Quem aprovar aquele PR está a aprovar a troca do
âmbito do painel, e é bom que o saiba antes de o ver chegar.

## 6. Limpeza

```bash
rm -rf /tmp/pacote-sem-listagens /tmp/cadeia
git status --short   # deve mostrar apenas artefatos da feature
```

Nada deste quickstart altera o pacote versionado. Se `git status` mostrar
`data/dist/indicadores.zip` modificado, algum passo escreveu no lugar errado — e
isso é um defeito a investigar antes de seguir.

A corrida ponta a ponta do § 5 foi feita numa **cópia isolada** do repositório em
`/tmp`, precisamente para não passar por cima do pacote versionado: `make dados`
escreve em `data/dist/indicadores.zip`, e a verificação de que a saída é
determinista exige rodar a cadeia. Verificado ao final: `git status --porcelain
data/` vazio, `data/` intocada.
