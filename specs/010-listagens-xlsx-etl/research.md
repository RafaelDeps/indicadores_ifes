# Research: ETL de Listagens de Matrícula (XLSX) → Dados dos Pilares

**Branch**: `010-listagens-xlsx-etl` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

Escopo desta fase: resolver as decisões técnicas deixadas pelo spec e pelo
Technical Context do [plan.md](./plan.md). Não havia `[NEEDS CLARIFICATION]` em
aberto no spec (todas resolvidas com o usuário); as investigações abaixo cobrem
dependências, integrações e as regras de dados observadas.

## 1. Leitura de arquivos XLSX

**Decisão**: `openpyxl` (read-only mode) como única leitora de `.xlsx`.
**Rationale**: `.xlsx` é um contêiner ZIP de XML (OOXML). A stdlib do Python
não fornece leitor XLSX. `openpyxl` é a biblioteca mínima que: (a) lê em
read-only com consumo de memória constante; (b) retorna células raw sem
formatação; (c) é determinística (sem aleatoriedade). Já está instalada no
`.venv` (3.1.5) — falta apenas declará-la em `requirements-etl.txt`.
**Alternatives considered**:

- `pandas.read_excel` — rejeitada: dependência transitiva pesada (>30 pacotes);
  overhead desproporcional para 8 colunas × ~2,5k linhas.
- Parse XML manual (descompactar e ler `sheet*.xml`) — rejeitada: frágil frente
  a variações de encoding/namespaces do OOXML; não-determinístico na prática.

## 2. Integração com o pacote `etl/` existente

**Decisão**: integrar ao pacote hexagonal existente, espelhando o
`IndicadoresFlow`. Reutilizar:

- `campus_resolver.normalizar_slug` (slug sem acento/minúsculas, já usado para
  nomear `pilar{N}_{slug}_{year}.json`);
- `json_pilar_sink.formatar_arquivos_pilar` + `NOMES_PILARES` /
  `SIGLAS_POR_PILAR` / `DESCRICOES` — garante contrato e rótulos idênticos;
- `ZipIndicadoresSink` — validação de contrato + escrita atômica e
  determinística (entradas ordenadas, `date_time` fixo, `os.replace`);
- `ExecutionTracker` — relatório de auditoria no formato atual.

**Rationale**: zero duplicação de contrato/serialização/zip; a feature só
adiciona fonte, cálculo, fluxo e CLI novos.

**Alternatives considered**:

- Script standalone (`scripts/etl_listagens.py`) — rejeitada: duplicaria o
  serializador `pilar{N}...` e a escrita determinística; risco de divergência
  de contrato com o pipeline principal.

## 3. Ajuste necessário no `ZipIndicadoresSink`

**Descoberta**: `CAMPOS_QUE_DEVEM_SER_NULOS` em
`zip_indicadores_sink.py` exige `null` em `NTE_total_estudantes_matriculados` e
`NTECPP_cotistas_em_pesquisa`. Se preenchidas pelas listagens, a validação
atual falharia.

**Decisão**: adicionar parâmetro `campos_derivaveis: frozenset[str] = frozenset()`
à validação e ao construtor do sink. O fluxo das listagens passa
`{"NTE_total_estudantes_matriculados", "NTECPP_cotistas_em_pesquisa"}`; o fluxo
canônico mantém o comportamento atual (conjunto vazio ⇒ campos permanecem
exigidos nulos).

**Rationale**: preserva a estrita fidelidade por fluxo sem criar um sink
paralelo. O teste existente de fidelidade continua cobrindo o fluxo canônico.

## 4. Integração com o frontend (SC-005)

**Descoberta**: `src/lib/dataset.ts` lê `data/dist/indicadores.zip` no build e
já renderiza `NTE_total_estudantes_matriculados` / `NTECPP_cotistas_em_pesquisa`
quando são números (null ⇒ "Dado indisponível").

**Decisão**: o fluxo listagens grava seu próprio pacote
(`data/dist/indicadores_listagens.zip`) e um script de merge
(`etl/scripts/merge_listagens_indicadores.py`) sobrepõe **somente** esses dois
campos nos arquivos `pilar1_{campus}_{year}.json` de
`data/dist/indicadores.zip`. O merge é idempotente, determinístico e valida que
nenhum outro campo foi alterado.

**Rationale**: SC-005 exige "site exibe NTE sem alterações no frontend"; os
campos de pesquisa (NTPP/QSPP/NEP) de `indicadores.zip` nunca são tocados
(pipeline canônico permanece fonte deles).

**Alternatives considered**:

- Fluxo listagens sobrescrever diretamente `indicadores.zip` — rejeitada:
  zeraria NTPP/QSPP/NEP (fontes diferentes, Princípio III).
- Alterar `dataset.ts` para fundir dois zips — rejeitada: violaria o critério
  de aceitação "sem alterações no frontend".

## 5. Regras de dados observadas nas 6 planilhas

**Contrato**: todas as 6 planilhas têm exatamente as 8 colunas
(`Matrícula`, `Nome`, `Curso`, `Situação Matrícula`, `Sexo`, `Nascimento`,
`Desc_Forma_Ingresso_Matricula`, `Desc_Cota`); cabeçalho na linha 3 (linha 1 =
título com campus, linha 2 = vazia).

**Situações distintas observadas** (15): `Matriculado` (7993), `Concluído`
(2331), `Cancelamento Compulsório` (2313), `Formado` (1232), `Trancado` (340),
`Aguard. Solicitar Certificação` (308), `Cancelado` (291), `Não Concluído` (87),
`Transferido Interno` (77), `Concludente` (66), `Estagiario (Concludente)` (16),
`Aguardando ENADE` (12), `Transferido Externo` (7),
`Matrícula Vínculo Institucional` (6), `Aguardando Colação de Grau` (6),
`Falecido` (1).

**Decisão NTE**: situações exatamente `{"Matriculado", "Formado"}` — igualdade
exata (valores limpos, sem variações ortográficas). União dos dois semestres,
dedup por `str(matrícula)` (a célula de matrícula pode vir numérica).

**Regra "de cota"**: listas negativas explícitas por coluna (ver
`contracts/classificacao_cota.md`), com igualdade exata após `strip()`.
Casuística crítica validada:

- `118` alunos têm ingresso literal "Ampla Concorrência" (ou
  "Pós-Graduação - Ampla Concorrência") com cota de reserva — corretamente
  **excluídos** (ingresso não-cota ⇒ and-falso).
- Ingressos "M9 - Enem - Ampla Concorrência" contêm a palavra "Ampla" no
  rótulo, mas a coluna de cota desses alunos é sempre "Ampla Concorrência" —
  o and com a segunda coluna os exclui; a regra por igualdade exata (e não
  substring) é suficiente e mais defensável.

## 6. Sink/gate de qualidade e CI

**Decisão**: job `quality` do `deploy.yml` passa a incluir
`setup-python` + `pip install -r requirements-etl.txt` + `pytest -q tests/etl`

- `flake8 etl tests/etl` + `black --check` + `isort --check`, além do fluxo
  node existente; o job `deploy` continua dependente de `quality`.

**Rationale**: Princípio VI — publicação só após lint+testes+build passarem; o
código Python novo (esta feature) precisa estar sob portão.

**Alternatives considered**: job Python separado/paralelo — rejeitada: mantém
a topologia atual (um único job `quality` como bd de todas as verificações).

## 7. Determinismo

**Decisão**: todas as saídas garantem byte-a-byte idênticas para a mesma
entrada: (a) `ZipIndicadoresSink` já ordena entradas e fixa timestamps; (b) o
merge escreve JSON com `indent=2, ensure_ascii=False` + newline final (mesma
serialização do `json_pilar_sink`), sobre os arquivos ordenados; (c) nenhuma
data/hora do relógio entra no conteúdo do pacote.

**Rationale**: SC-003 explícito no spec.
