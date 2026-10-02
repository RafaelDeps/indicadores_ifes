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

| entrada                                | presente              | onde       |
| -------------------------------------- | --------------------- | ---------- |
| `data/dist/indicadores.zip`            | sim, 18 arquivos      | commitado  |
| `data/dist/indicadores_listagens.zip`  | sim, 9 arquivos       | gitignored |
| `data/raw/listagem_*.xlsx`             | sim, 6 arquivos       | gitignored |
| `data/canonical/exports_canonical.zip` | **não** nesta máquina | intocável  |

O export canônico ausente é limitação do ambiente local, não da feature: as
entradas gitignored **não** estão em clone limpo, e o pacote commitado é a
referência de comparação.

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

| cenário              | comando                                            | hoje (verificado) | depois                       |
| -------------------- | -------------------------------------------------- | ----------------- | ---------------------------- |
| cobertura preservada | `make check-dados`                                 | exit 0            | exit 0, sem violação         |
| sem origem           | `python -m etl.scripts.check_dados --listagens ""` | exit 0, `INFO:`   | exit 0, `INFO:` de cobertura |
| cobertura perdida    | §2                                                 | **exit 0**        | exit ≠ 0, 6 linhas `ERRO:`   |

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
2026, pasta bruta vazia.

```bash
mkdir -p /tmp/cadeia/{pacote,listagens,raw}
cp data/dist/indicadores.zip /tmp/cadeia/pacote/
cp data/dist/indicadores_listagens.zip /tmp/cadeia/listagens/
python3 - <<'PY'
import zipfile, pathlib
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

**Esperado depois**: exit **3** — o código **já publicado** para bloqueio, sem
código novo — com `ERRO:` nomeando os pares que seriam perdidos.

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

**Esperado**: exit 0.

Este cenário **não muda** de veredito (já é 0 hoje, verificado). É guarda de
regressão: garante que a guarda nova não fique restritiva demais e bloqueie
execução legítima. Registrado assim porque um quickstart que só mostra o que
muda não mostra o que não pode mudar.

## 5. Grupo B — o workflow

O grupo B não é verificável por `make`. A validação é manual por natureza,
porque depende de repositório privado, segredo e uma execução real do GitHub
Actions.

### 5.1 Pré-condições, fora do repositório

1. Repositório privado `dados-listagens` existe em **outra conta** do
   mantenedor, e o PAT foi emitido **na conta dona dele** com `contents: read`
   sobre um repositório só. Confirmar que o token é revogável de onde foi
   emitido, e não de onde está guardado.
2. Release `v1` publicada com os 6 assets anexados.
3. `DADOS_LEITURA_TOKEN` configurado como segredo, com permissão de leitura sobre
   **um** repositório.
4. `dados-insumo.yml` preenchido com os `asset_id` e a revisão de 40 caracteres
   do export canônico.

### 5.2 Obter os identificadores, sem insumo

```bash
gh api repos/<dono>/dados-listagens/releases/tags/v1 \
  --jq '.assets[] | "\(.id)\t\(.name)"'
```

E, para o canônico, a revisão fixa fica **versionada** — escolher uma e nunca
mudar depois, senão a reproducibilidade é perdida sem ninguém perceber.

### 5.3 Confirmar que `contents: read` basta

```bash
curl -sSI -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/octet-stream" \
  "https://api.github.com/repos/<dono>/dados-listagens/releases/assets/<id>"
```

Se responder `302` com `Location` para uma URL assinada, a permissão de leitura
basta e não é preciso qualquer permissão de escrita.

### 5.4 Disparo real

Acionar manualmente e conferir, em ordem:

| #   | o que conferir                                                 | onde                              |
| --- | -------------------------------------------------------------- | --------------------------------- |
| 1   | o log **não** contém o valor do token                          | log da execução                   |
| 2   | o log **não** contém nome, matrícula ou nascimento             | log da execução                   |
| 3   | 6 planilhas baixadas, e o passo de contagem passa              | log                               |
| 4   | a cadeia roda e a verificação **não** tem `INFO:` de cobertura | log — no workflow a origem existe |
| 5   | o pull request abre com o pacote e sem entrada                 | pull request                      |
| 6   | o pacote é byte a byte igual ao versionado, ou o gate barra    | log do passo 7                    |

### 5.5 O que **não** fazer

- Não disparar a partir de um pull request: o evento não existe, e o teste é
  inútil porque não há credencial.
- Não conferir a conformidade pelo fato de o log estar limpo hoje. Ausência de
  credencial em log é observada **por execução**, e o masking do GitHub é por
  valor exato.

## 6. Limpeza

```bash
rm -rf /tmp/pacote-sem-listagens /tmp/cadeia
git status --short   # deve mostrar apenas artefatos da feature
```

Nada deste quickstart altera o pacote versionado. Se `git status` mostrar
`data/dist/indicadores.zip` modificado, algum passo escreveu no lugar errado — e
isso é um defeito a investigar antes de seguir.
