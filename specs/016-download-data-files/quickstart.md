# Quickstart — Validação da Página de Downloads

Feature: **016 — Página de Downloads dos Dados e Guia de Instalação**
Date: 2026-10-05

Guia de validação executável. Cada cenário é **verificável** e tem um resultado
esperado observável. Referências a contratos e modelo de dados ficam nos
artefatos próprios, sem duplicação aqui.

> **Nota de setup**: este worktree não tem `node_modules` nem `.venv`. Rode
> `make setup` (ou `npm ci` + `pip install -r requirements-etl.txt`) antes dos
> cenários que dependem deles.

---

## Pré-requisitos

| Item                     | Verificação                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| Node ≥ 20                | `node --version`                                                   |
| Python 3.11+             | `python3 --version`                                                |
| Dependências frontend    | `npm ci`                                                           |
| Dependências Python      | `pip install -r requirements-etl.txt`                              |
| Pacote oficial presente  | `test -f data/dist/indicadores.zip`                                |
| Insumos brutos presentes | `ls data/canonical/exports_canonical.zip data/raw/listagem_*.xlsx` |

Os dois últimos **não** são pré-requisitos absolutos: os cenários cobrem
explicitamente o caso em que faltam (ver QS-04).

---

## QS-01 — Build e rota disponível

```bash
npm run build
test -f dist/dados/index.html && echo "OK: /dados/ gerada"
```

**Esperado**: `dist/dados/index.html` existe. A rota funciona no build local sem
configuração adicional.

---

## QS-02 — Link no header em todas as páginas

```bash
npm run test:web -- header-dados
```

**Esperado**: as asserções de `tests/web/header-dados.test.ts` passam —
o link `href="/dados/"` aparece **duas** vezes no layout (desktop + gaveta), e
`aria-current="page"` só quando a rota é `/dados/`.

Verificação manual complementar:

```bash
npm run dev
# abrir http://localhost:4321/indicadores_ifes/dados/
```

Esperado: o botão "Dados" está visível no header **sem abrir menu**, tanto em
janela larga (≥768 px) quanto estreita, e o item também aparece dentro da
gaveta.

---

## QS-03 — Listagem e metadados

```bash
npm run test:web -- downloads
```

**Esperado**: os testes de `tests/web/downloads.test.ts` passam, cobrindo:

- o pacote oficial aparece com rótulo, formato, **bytes**, cobertura e data;
- cada insumo bruto aparece com o badge de dado pessoal;
- todo item `disponivel === true` tem arquivo correspondente em disco;
- todo item `disponivel === false` tem `motivoIndisponivel` preenchido.

---

## QS-04 — Arquivo ausente vira "indisponível", não link quebrado

```bash
# O arquivo segue para fora da árvore do repositório: movê-lo para dentro de
# `data/` o deixaria sendo reencontrado pelo glob, e a verificação passaria sem
# ter testado nada.
mv data/raw/listagem_2026_2.xlsx "${TMPDIR:-/tmp}/listagem_2026_2.xlsx.bak"
npm run build
grep -c "Indisponível\|indisponível" dist/dados/index.html
grep -o 'href="[^"]*listagem_2026_2[^"]*"' dist/dados/index.html || echo "OK: nenhum link para o arquivo ausente"
mv "${TMPDIR:-/tmp}/listagem_2026_2.xlsx.bak" data/raw/listagem_2026_2.xlsx
```

A segunda checagem é a que importa: `grep -c "Indisponível"` encontra a
palavra **no texto** mesmo quando um `<a href>` quebrado existe ao lado dela. O
que prova FR-017 é a ausência do `href`.

O item continua na listagem porque `dados-insumo.yml` declara a planilha: sem
ele, o glob só veria o que existe em disco e o item sumiria da página — o que é
pior do que oferecê-lo quebrado, porque o visitante nem fica sabendo que o
arquivo faz falta.

**Esperado**: o item aparece na listagem marcado como indisponível, **sem**
`<a href>` para o arquivo, e com o motivo visível. Nenhum link 404 é oferecido.

Esta é a verificação direta de **FR-017**.

---

## QS-05 — Portão de governança: gate fechado

Este é o cenário central da feature: o portão tem de saber **fechar**.

**O gate está aberto hoje** (as três pendências de G-1 e G-2 foram resolvidas
em 2026-10-05), então fechar exige simular o estado anterior. Apagar o
`registro` de uma pendência reabre o portão — é assim que ele funciona, contra o
disco e não contra um booleano.

```bash
# estado fechado: a constitution não está em 2.0.0
sed -i.bak "s/^\(\*\*Version\*\*: \)\(2\.0\.0\)/\11.1.0/" .specify/memory/constitution.md
PYTHONPATH=. python -m etl.scripts.check_governanca; echo "exit=$?"
ls public/dados/
mv .specify/memory/constitution.md.bak .specify/memory/constitution.md
```

**Esperado**:

- saída contém `AVISO:` **nomeando a pendência** `emenda-principio-iv` e como
  quitá-la;
- `exit=0` — o gate fechado **não** quebra o build;
- `public/dados/` contém `indicadores.zip` e **nenhum** `.xlsx` nem
  `exports_canonical.zip`.

A terceira checagem é a que um portão "silencioso" reprova: sem a limpeza de
`public/dados/`, a execução que se recusa a copiar deixa para trás o que a
execução anterior, com o gate aberto, havia colocado lá — e o log anunciaria
"omitidos" enquanto o site serviria o arquivo.

Este é o estado **Parcial** do `data-model.md`: o site sobe, o agregado
funciona, a ausência dos brutos é explicada.

**Restaure a constitution ao final.** O `sed` acima reescreve um arquivo
versionado, e a execução seguinte publicaria os insumos com a versão errada no
cabeçalho do `dist`.

---

## QS-06 — Portão de governança: gate aberto

```bash
PYTHONPATH=. python -m etl.scripts.check_governanca; echo "exit=$?"
```

**Esperado**:

```
OK: portão aberto (3 pendência(s) registrada(s)); pacote agregado publicado (1 artefato); insumos brutos publicados (7)
```

O número de insumos varies com o que existe em `data/raw/` — 7 é o estado atual
(6 planilhas + o export canônico).

Para confirmar que o gate **realmente** responde ao disco, apague
temporariamente um dos dois registros e veja o `AVISO:`:

```bash
mv .specify/memory/constitution.md "${TMPDIR:-/tmp}/constitution.md.bak"
PYTHONPATH=. python -m etl.scripts.check_governanca --apenas-verificar; echo "exit=$?"
mv "${TMPDIR:-/tmp}/constitution.md.bak" .specify/memory/constitution.md
```

**Esperado**: `AVISO:` nomeando `emenda-principio-iv`, `exit=0`, e
`nada copiado (--apenas-verificar)`. Nenhuma das três pendências abre o gate
sozinha — é o comportamento de **P-4**.

---

## QS-07 — Emenda da constitution (G-1)

```bash
grep -c "^\*\*Version\*\*" .specify/memory/constitution.md
grep -n "^\*\*Version\*\*" .specify/memory/constitution.md
```

**Esperado**: `1`, e a linha `**Version**: 2.0.0 | **Ratified**: 2026-09-21 |
**Last Amended**: 2026-10-05`.

O `grep -c` é a verificação que importa: a implementação chegou a declarar a
versão **duas** vezes — uma no cabeçalho do arquivo e outra no rodapé — e a
segunda resposta era `1.1.0`, a versão velha. O portão lê por `contem`, que
casa com qualquer uma das duas; com a linha velha presente, ele fecharia a
constitution emendada. A versão ficou só no rodapé, onde a seção "Governance" a
mantinha desde 1.0.0.

O Sync Impact Report do AMENDMENT 2.0.0 está no cabeçalho do arquivo, listando
os documentos revisados (README, spec 012, `medidas-de-protecao.md`) e marcando
o Princípio IV como modificado.

---

## QS-08 — Testes do portão

```bash
PYTHONPATH=. python -m pytest -q tests/etl/test_check_governanca.py
```

**Esperado**: todos passam, cobrindo P-1 a P-5 — em especial:

- pendência com `registro` inexistente → gate fechado;
- `registro` de YAML ilegível → `ERRO:` + exit 1;
- gate fechado → nenhum insumo copiado;
- gate fechado → agregado copiado.

---

## QS-09 — Deploy bloqueado por falha de qualidade

```bash
npm run lint && npm run format:check && npm run test
```

**Esperado**: tudo limpo (Princípio V). O `deploy.yml` executa `quality`
antes de `build`, e `deploy` depende de `quality` — uma falha aqui impede a
publicação, conforme o Princípio VI.

---

## QS-10 — Acessibilidade e responsividade

### Parte automatizada — o que se mede no `dist`

```bash
npm run build
.venv/bin/python - <<'PY'
import re, pathlib, sys

pagina = pathlib.Path('dist/dados/index.html').read_text(encoding='utf-8')
outra = pathlib.Path('dist/pilar-1/index.html').read_text(encoding='utf-8')
erros = []

# (1) Rolagem horizontal: nenhuma largura fixa que não caiba em 320 px.
larguras = [int(n) for n in re.findall(r'(?:^|[\s;{])(?:min-)?width:\s*(\d+)px', pagina)]
estouros = [n for n in larguras if n > 320]
if estouros:
    erros.append(f'largura fixa acima de 320 px: {estouros}')

# (3) A marcação de dado pessoal não depende de cor: ícone + texto, e o ícone
#     é `aria-hidden` para não duplicar a leitura do texto.
if 'Contém dados pessoais' not in pagina:
    erros.append('texto da marcação de dado pessoal ausente')
if 'aria-hidden="true"' not in pagina:
    erros.append('ícone da marcação sem aria-hidden')

# (5) O header marca "Dados" como página atual em /dados/ e **só** lá. São dois
#     links — cabeçalho e gaveta — porque são dois pontos de entrada para a
#     mesma rota (H-3). Em outra página, nenhum dos dois pode carregar a marca.
marcado = re.findall(r'href="/dados/"[^>]*aria-current="page"', pagina)
if len(marcado) != 2:
    erros.append(f'aria-current="page" em /dados/ apareceu {len(marcado)}x (esperado 2: header e gaveta)')
if re.search(r'href="/dados/"[^>]*aria-current', outra):
    erros.append('/dados/ marcada como atual em /pilar-1/')

# A mesma checagem para a home, que era a outra rota quebrada por causa do base.
if not re.search(r'class="nav-aba ativa"[^>]*aria-current="page"', pathlib.Path('dist/index.html').read_text(encoding='utf-8')):
    erros.append('a home não marca a aba "Visão geral" como atual')

# (2) Todo link de download tem nome acessível próprio (A-1).
sem_texto = [h for h in re.findall(r'<a\b[^>]*class="btn-download"[^>]*>(.*?)</a>', pagina, re.S)
             if not re.sub(r'<[^>]+>', '', h).strip()]
if sem_texto:
    erros.append(f'{len(sem_texto)} link(s) de download sem texto acessível')

for e in erros:
    print('FALHA:', e)
sys.exit(1 if erros else 0)
PY
```

**Esperado**: exit 0 e nenhuma linha `FALHA:`.

### Parte manual — o que nenhuma asserção substitui

```bash
npm run dev
```

Verificar em cada tema (claro e escuro), com o devtools em 320 px de largura:

| #   | Verificação                       | O que a asserção automatizada **não** cobre                         |
| --- | --------------------------------- | ------------------------------------------------------------------- |
| 1   | Sem rolagem horizontal            | Rolagem vinda de um filho com `nowrap` ou de um SVG sem `max-width` |
| 2   | `Tab` percorre tudo, foco visível | A ordem real de foco e se o contorno fica visível sobre cada fundo  |
| 3   | Badge de dado pessoal legível     | Se o texto cabe na pastilha em 320 px sem cortar                    |
| 4   | Leitor de tela anuncia o arquivo  | A ordem e a naturalidade da anúncio em leitor real                  |
| 5   | `/dados/` marcada como atual      | A distinção visual do estado ativo contra as abas vizinhas          |

A coluna da direita existe porque cada item da tabela já tem uma checagem
automatizada, e é justamente essa cobertura que costuma dar falsa confiança: um
`display: none` em media query ou um `aria-label` duplicado não aparecem em
nenhum grep.

---

## QS-11 — Textos em pt-BR

```bash
# Textos de interface = o que o visitante lê. Os identificadores permanecem em
# inglês, então a busca tem de olhar o conteúdo, não os nomes de arquivo.
.venv/bin/python - <<'PY'
import re, pathlib, sys
ingles = re.compile(r'\b(settings|upload|click here|read more|learn more|'
                    r'not available|coming soon|no data)\b', re.I)
achou = False
for caminho in ['src/pages/dados/index.astro', 'src/components/CartaoDownload.astro']:
    html = pathlib.Path(caminho).read_text(encoding='utf-8')
    corpo = re.sub(r'<style>.*?</style>', '', html, flags=re.S)
    corpo = re.sub(r'^\s*(//|/\*|\*|<!--).*$', '', corpo, flags=re.M)
    for n, linha in enumerate(corpo.splitlines(), 1):
        for trecho in re.findall(r'>([^<>{}]+)<', linha):
            if ingles.search(trecho):
                print(f'{caminho}:{n}: {trecho.strip()}')
                achou = True
sys.exit(1 if achou else 0)
PY
```

**Esperado**: exit 0 e nenhuma saída. Todo texto de interface em pt-BR
(**FR-023**); identificadores e atributos (`download`, `href`) permanecem em
inglês.

A lista de padrões **exclui `download`** de propósito: a palavra é português
emprestado do inglês e aparece legitimamente em "Baixar indicadores.zip" e
"Indisponível para download". Incluí-la faria esta verificação acusar o texto
correto. O mesmo vale para `file`: a palavra é ambígua demais para ser sinal de
texto em inglês. Só entram construções inequivocamente anglas.

---

## QS-12 — Subendereço do site

```bash
npm run build
echo "--- links de download (devem trazer o base) ---"
grep -o 'href="[^"]*dados/[^"]*"' dist/dados/index.html | sort -u
```

**Esperado** — duas categorias, deliberadamente distintas:

```
href="/dados/"                                        # link de navegação
href="/indicadores_ifes/dados/indicadores.zip"        # link de download
```

**URLs de download trazem o `base`** (`import.meta.env.BASE_URL`): elas
apontam para um arquivo estático servido pelo GitHub Pages e, sem o
subendereço, dariam 404 em produção (**FR-022**).

**Links de navegação não trazem o `base`**, e isso é a convenção já
estabelecida do site: `href="/pilar-1/"`, `href="/pilar-2/"` e
`href="/"` aparecem no `dist` exatamente assim, desde antes desta feature. O
caminho perdido é recuperado pelo script de redirecionamento de `404.astro`,
que reescreve a URL quando ela não começa com `/indicadores_ifes`. O link
`/dados/` segue a mesma convenção dos irmãos — mudar só este link para
prefixado o tornaria o único da página a não usar o mecanismo que sustenta os
outros.

Uma verificação honesta deste item compara `/dados/` com `pilar-1`, e não com
uma expectativa escrita antes de ver o que o repositório faz:

```bash
grep -o 'href="/\(dados\|pilar-1\)/"' dist/dados/index.html | sort -u
```

**Esperado**: as duas linhas juntas. Se `/dados/` aparecer prefixado e
`pilar-1` não, a feature mudou a convenção sem precisar.

---

## QS-13 — Pacotes parciais não são oferecidos

```bash
npm run build && grep -c "indicadores_serra\|indicadores_listagens" dist/dados/index.html
```

**Esperado**: `0`. Apenas o pacote oficial consolidado é oferecido, conforme
**D-05** (**FR-026**). O `.gitignore` continua ignorando
`data/dist/indicadores_*.zip`.

---

## Ordem sugerida de execução

```bash
make setup                                  # uma vez
QS-01 → QS-02 → QS-03 → QS-04 → QS-08 → QS-05 → QS-06 → QS-07
→ QS-09 → QS-11 → QS-12 → QS-13 → QS-10 (manual)
```

**QS-05 antes de QS-06**: confirma primeiro o estado real (gate fechado, que é o
estado inicial esperado) e só depois o caminho de abertura.

---

## Critério de pronto

A feature está pronta quando:

1. `QS-01` a `QS-04` e `QS-08` a `QS-13` passam;
2. `QS-10` passa na **parte automatizada**; a manual continua sendo decisão de
   quem revisa, e é o único item que nenhum teste cobre;
3. `QS-05` mostra o portão fechando: `AVISO:` nomeando a pendência, `exit=0`, e
   `public/dados/` **sem** nenhum insumo bruto — nem os que uma execução aberta
   deixou (FR-016c);
4. `QS-06` mostra o portão abrindo e os 7 insumos publicados.

Os itens 3 e 4 são **os dois estados do mesmo mecanismo**, e é comum verificar só
um deles. Um portão que nunca fechou é um portão cuja capacidade de fechar não
está demonstrada — e essa é a propriedade de segurança da feature inteira.
