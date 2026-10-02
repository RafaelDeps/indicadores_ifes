# Research: Modo Soft (SOFT=1), Verificação de Frescor e Target Único do ETL

**Branch**: `011-etl-soft-mode-frescor` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

Escopo desta fase: resolver as decisões técnicas deixadas pelo spec (nenhum
`[NEEDS CLARIFICATION]` em aberto — a semântica foi decidida com o usuário:
Opção A). As investigações abaixo cobrem onde implementar o soft, como a
verificação de frescor funciona com `mtime`, e como orquestrar o target único.

## 1. Semântica e local do modo soft

**Decisão**: flag `--soft` no parser de cada uma das três CLIs
(`etl/main.py`, `etl/main_listagens.py`,
`etl/scripts/merge_listagens_indicadores.py`), com fallback em variável de
ambiente `SOFT=1` — espelhando o padrão já usado no repo
(`ENTRADA`/`SAIDA`/`CAMPUS` via `os.getenv` em `main.py`). O Makefile converte
`SOFT=1` em `--soft` para os três alvos e para o target único `make dados`.

**Rationale**: três CLIs, um só conceito; flag explícita para quem chama
diretamente e env para orquestração (Makefile/CI). Sem nenhum novo framework ou
camada.

**Alternatives considered**:

- Comportamento soft **por default** — rejeitada: quebra o contrato documentado
  da spec 006 ("ausente ou corrompido → erro fatal"), e a falha ruidosa é a
  proteção contra dados obsoletos silenciosos (staleness).
- Flag só no Makefile (sem tocar CLIs) — rejeitada: `python -m etl.main`
  chamado direto continuaria sem o recurso; a CLIs são o contrato.

## 2. "Reusar o último indicadores.zip" = não tocar, e por que NÃO recomputar

**Descoberta**: o zip publicado contém **apenas agregados** (Princípio IV;
garantido por `test_privacy.py`); não há nomes nem matrículas. Portanto:

- Preservar contagens já publicadas: **possível** — porque o arquivo já existe.
- Recalcular NTECPP a partir do zip: **impossível** — o universo de nomes NEP
  só existe dentro do `exports_canonical.zip`; sem ele, não há interseção.

**Decisão**: o modo soft **nunca** reescreve nem sobrepõe. A etapa com entrada
ausente é pulada com `AVISO:`; o arquivo de saída permanece byte a byte como
estava. É assim que o "reuso do último zip" é alcançado — por **não-toque** —
sem misturar campos de execuções diferentes.

**Alternatives considered**:

- Opção C do diálogo (reaproveitar literalmente os valores antigos de
  NTE/NTECPP no merge quando o zip de listagens falta) — rejeitada: sobrepor
  campos antigos a um canônico recém-gerado cria um pacote cujos campos vêm de
  datas de extração diferentes, sem marcador — violação de fidelidade
  (Princípio III na prática). O teste `test_fidelity` não detectaria (valida
  forma, não procedência).
- Gravar marcador de procedência dentro do zip — rejeitada: muda o contrato de
  saída (spec 004) e exigiria mudança de frontend; desproporcional para o caso.

## 3. E o caso "canônico novo + listagens pulado"?

**Descoberta**: o fluxo canônico sempre serializa NTE/NTECPP como `null`
(`CAMPOS_QUE_DEVEM_SER_NULOS`, fluxo canônico com `campos_derivaveis=∅`). Logo,
se `make etl` regenera um canônico novo e a etapa de listagens é pulada, o
pacote final fica com NTE/NTECPP `null`.

**Decisão**: esse é o comportamento **honesto** e desejado (Princípio III):
campo não apurado = `null`, nunca número de outra execução. Documentado
explicitamente em `spec.md` (FR-005/SC-005) para evitar surpresa.

## 4. Verificação de frescor (`make check-dados`)

**Descoberta**: o repo já tem `etl/scripts/validate_zip.py` que valida o
contrato do pacote usando `validar_arquivos_pilar(registros,
campos_derivaveis=CAMPOS_DERIVAVEIS_LISTAGENS)`. Ele aceita NTE/NTECPP
preenchidos (pacote pós-merge) e exige `null` nos demais campos não coletáveis.

**Decisão**: o novo `etl/scripts/check_dados.py` reutiliza essa mesma chamada
(importa `validar_arquivos_pilar` + `CAMPOS_DERIVAVEIS_LISTAGENS`) — zero
duplicação de contrato — e adiciona os três avisos de frescor por `mtime`
(FR-008): canônico mais novo que o pacote; `indicadores_listagens.zip` mais
novo que o pacote (proveniência do merge — o aviso crítico, ver
[contracts/check-dados.md §5.1](contracts/check-dados.md) para o sentido da
condição e sua cegueira conhecida); planilha
`data/raw/listagem_*.xlsx` mais nova que o pacote.

**Rationale**: um script, duas responsabilidades já documentadas (validação +
frescor); reuso direto da validação existente evita divergência de contrato.

**Alternatives considered**:

- Frescor por conteúdo (hash de entradas vs. registro no pacote) — rejeitada:
  exigiria mudança de contrato e de pipeline; mtime é suficiente para detectar
  o cenário operacional comum (esquecer de rodar o ETL).
- Alarme em exit 1 para desatualização — rejeitada: em clone/CI o mtime é
  inócuo (todos ≈ tempo de checkout) e tornaria o CI vermelho sem causa; aviso
  (exit 0) é a semântica correta.

## 5. Limitação do `mtime` (Git não preserva mtimes)

**Decisão**: documentada como parte do contrato (FR-009). Comparações de mtime
só são significativas na máquina onde o ETL gerou os artefatos; em clone limpo
ou CI, todos os arquivos têm ~mtime do checkout, então:

- comparações não geram falso alarme (nada é "mais novo" de forma útil), e
- o `check-dados` se reduz a validação de contrato (útil no CI como portão do
  zip commitado — Princípio VI), exit 0.

**Rationale**: transparência sobre o alcance da ferramenta evita que um
operador confie em frescor verificado em outra máquina.

## 6. Target único `make dados`

**Decisão**: alvo `.PHONY` no Makefile que executa, em ordem e com
encadeamento `&&` (parada no primeiro erro):

```make
dados: ## Gera o pacote completo: etl → etl-listagens → merge-listagens (SOFT=1 pula etapas sem entrada)
	$(PYTHON) -m etl.main $(SOFT_ARGS) && \
	$(PYTHON) -m etl.main_listagens $(SOFT_ARGS) && \
	$(PYTHON) -m etl.scripts.merge_listagens_indicadores $(SOFT_ARGS) --listagens data/dist/indicadores_listagens.zip --canonical data/dist/indicadores.zip --saida data/dist/indicadores.zip
```

com `SOFT_ARGS = $(if $(SOFT),--soft,)` (mesmo padrão de variáveis opcionais
`CAMPUS`/`SAIDA` já existentes no Makefile).

**Rationale**: encadeamento explícito e linear é o mais simples e previsível;
Makefile não gerencia dependências de arquivos com mtime de forma confiável
para este caso (e o `make dados` é intencionalmente **sempre executado** — o
dado deve ser regenerado, não "atualizado se preciso").

**Alternatives considered**:

- Dependências GNU make em arquivos (alvo `.PHONY` vs. dependência de
  `data/dist/indicadores.zip`) — rejeitada: regras de timestamp do make
  entrariam em conflito com a semântica de regeneração obrigatória e com os
  zips gitignored.
- Um orquestrador Python novo (`python -m etl.scripts.run_all`) — rejeitada:
  o Makefile já é o orquestrador documentado do repo; adicionar uma camada
  Python duplicaria os targets.

## 7. Determinismo, atomicidade e escrita

**Decisão**: o modo soft não introduz nenhuma escrita própria — quando a etapa
é pulada nada é criado/reescrito; quando roda, reutiliza a escrita atômica e
determinística existente (`ZipIndicadoresSink` / merge idempotente). O teste de
byte-identidade do soft (`test_soft_mode`) cobre ambos os lados: artefato
intocado no pulo, checksum estável na execução normal.

## 8. Portão de CI (Princípio VI)

**Decisão (proposta)**: adicionar `python -m etl.scripts.check_dados` ao job
`quality` do `deploy.yml` (depois do `pytest`), executando **apenas a
validação de contrato** sobre o zip commitado. Não altera a topologia do CI
(nem roda o ETL), e protege contra regressão de contrato do pacote publicado.
**Racional**: o zip é commitado; validar seu contrato em cada PR é barato e
alinhado ao Princípio VI. (Alternativa rejeitada: rodar o ETL no CI — requer
entradas gitignored que o CI não tem.)
