# Implementation Plan: ETL de Listagens de Matrícula (XLSX) → Dados dos Pilares

**Branch**: `010-listagens-xlsx-etl` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-listagens-xlsx-etl/spec.md`

## Summary

Novo pipeline Python de ETL que lê `data/raw/listagem_<AAAA>_<S>.xlsx`
(`<S>` ∈ {1,2}), valida o contrato de 8 colunas (verificado nos 6 arquivos),
deduplica matrículas por `(campus, ano)` e calcula apenas as duas componentes
deriváveis do Pilar 1:

- **NTE** — `PIES.NTE_total_estudantes_matriculados`: matrículas únicas com
  situação exatamente "Matriculado" **ou** "Formado" em pelo menos um dos
  semestres do ano (2024=1282, 2025=1857, 2026=2121).
- **NTECPP** — `PICOT.NTECPP_cotistas_em_pesquisa`: **cruzamento por nome
  normalizado** (FR-012) entre os estudantes em pesquisa do export canônico
  (conjunto NEP do campus/ano, mesmo critério do `aggregator`) e os **cotistas**
  das listagens (estudantes do NTE cuja forma de ingresso E forma de
  matrícula/cota são ambas "de cota", deduplicados — 2024=438, 2025=616,
  2026=775; contagem interna do relatório). NTECPP medido: 2024=**73**,
  2025=**93**, 2026=**96** — sempre ≤ NEP (349/422/391); sem export canônico ou
  com interseção vazia → `null` (Princípio III).
- **NTE** e **NTECPP** são as duas componentes deriváveis do Pilar 1.

Saída: arquivos `pilar{N}_{campus}_{year}.json` no contrato exato do pipeline
atual, empacotados de forma determinística (atomicidade + entradas ordenadas +
timestamps fixos, reutilizando `ZipIndicadoresSink`) em
`data/dist/indicadores_listagens.zip`. Todas as demais slots permanecem `null`.

Integração com o site (SC-005): um pequeno script de **merge** sobrepõe somente
esses dois campos nos arquivos `pilar1_*.json` de `data/dist/indicadores.zip`
(pacote consumido pelo frontend), sem alterações no frontend.

## Technical Context

**Language/Version**: Python 3.11+ (Black `target-version = ['py311']`); o ETL
existente roda em `.venv` (atualmente 3.14). Mesmo toolchain do `etl/` atual
(pytest, flake8, black, isort).

**Primary Dependencies**:

- `openpyxl>=3.1.0` — **nova dependência** (adicionar a `requirements-etl.txt`);
  leitura de `.xlsx` em modo read-only. Justificada: a stdlib não lê XLSX;
  pandas é desnecessário para 8 colunas e iteração read-only.
- Reuso do pacote `etl/` existente: `campus_resolver.normalizar_slug`,
  `json_pilar_sink.formatar_arquivos_pilar` (+ `NOMES_PILARES` /
  `SIGLAS_POR_PILAR` / `DESCRICOES`), `ZipIndicadoresSink` (validação de
  contrato + escrita atômica/determinística), `ExecutionTracker`.
- Sem novas frameworks.

**Storage**: filesystem. Entrada: `data/raw/listagem_*.xlsx` (fora do Git).
Saída: `data/dist/indicadores_listagens.zip` (pacote próprio da feature) e
merge em `data/dist/indicadores.zip`. Nenhuma base de dados.

**Testing**: pytest para `tests/etl` (convenção do repositório para o ETL —
desvio documentado em Complexity Tracking); Vitest permanece o runner do
frontend (`tests/web`), inalterado.

**Target Platform**: Linux (CI GitHub Actions, runner ubuntu-latest), CLI
Python `python -m etl.main_listagens`.

**Project Type**: pipeline de dados (ETL) integrado ao pacote hexagonal
`etl/` existente; CLI.

**Performance Goals**: < 60 s para os 6 arquivos (SC-001); pacotes byte a byte
idênticos entre execuções (SC-003).

**Constraints**: zero PII na saída (Nome/Matrícula/cota individual — Princípio
IV); campos não deriváveis estritamente `null`, nunca `0` (Princípio III);
mensagens de console em pt-BR; determinismo; não sobrescrever os campos de
pesquisa de `indicadores.zip`.

**Scale/Scope**: 6 arquivos → 3 anos × 1 campus (Serra) hoje; multi-campus por
design (campus derivado do título da planilha). Sem agregação campus "todos".

## Constitution Check

_GATE: aprovado antes da Fase 0. Reavaliado após o design (Fase 1) — mantido._

| Princípio              | Status | Justificativa                                                                                                                                                                           |
| ---------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Simplicidade        | ✅     | Integra no pacote `etl/` existente (hexagonal), sem nova camada/framework; uma única dependência nova justificada (openpyxl).                                                           |
| II. Test-first         | ✅     | Testes escritos antes do código (pytest para o ETL, red→green), cobrindo cálculo e formatação (regras de NTE/cota).                                                                     |
| III. Fidelidade        | ✅     | NTE e NTECPP calculados de fontes reais (1857 / 93 em 2025, NTECPP ≤ NEP por construção); cotistas como análise interna; todo o resto `null`; percentuais PIES/PICOT permanecem `null`. |
| IV. Agregado apenas    | ✅     | Saída contém apenas contagens; teste de privacidade dedicado (nenhum Nome/Matrícula no pacote).                                                                                         |
| V. Qualidade           | ✅     | flake8/black/isort nos novos módulos; ESLint/Prettier do frontend inalterados; mensagens de console pt-BR.                                                                              |
| VI. Deploy com portões | ✅     | CI passa a executar pytest + lint Python antes do build/deploy (task T027).                                                                                                             |

## Project Structure

### Documentation (this feature)

```text
specs/010-listagens-xlsx-etl/
├── plan.md              # este arquivo (/speckit.plan)
├── research.md          # Fase 0 — decisões e alternativas
├── data-model.md        # Fase 1 — entidades, validações e regras
├── quickstart.md        # Fase 1 — guia de validação end-to-end
├── contracts/           # Fase 1 — contratos de saída e classificação de cota
│   ├── saida_pacote.md
│   └── classificacao_cota.md
└── tasks.md             # Fase 2 (/speckit.tasks — não criado pelo plan)
```

### Source Code (repository root)

```text
etl/
├── main.py                              # pipeline existente (canonical → indicadores.zip) — inalterado
├── main_listagens.py                    # NOVO: CLI das listagens (xlsx + --canonical → indicadores_listagens.zip)
├── adapters/sources/
│   └── listagens_xlsx_source.py         # NOVO: leitura/validação do contrato de 8 colunas + nomes_de_cotistas em memória
├── core/logic/
│   ├── classificacoes_listagens.py      # NOVO: constantes de classificação ("de cota", situações NTE)
│   ├── normalizacao_nomes.py            # NOVO: normalizar_nome (minúsculas, sem acentos, espaços colapsados)
│   ├── calculators/
│   │   ├── listagens.py                 # NOVO: NTE e cotistas (funções puras)
│   │   ├── papeis.py                    # NOVO: classificação "em pesquisa" (compartilhada com o aggregator)
│   │   ├── estudantes_pesquisa.py       # NOVO: nomes dos estudantes em pesquisa por (campus/"todos", ano)
│   │   └── ntecpp.py                    # NOVO: calcular_ntecpp_match (interseção por nome; vazio → None)
│   └── models/
│       ├── indicators.py                # AJUSTE: anotação `int | None` para os 2 campos do Pilar 1
│       └── listagens.py                 # NOVO: EstudanteListagem, ListagensExtraidas (+ nomes_cotistas), ResultadoListagens
├── flows/
│   └── listagens_flow.py                # NOVO: orquestração source → cálculo → sink + cruzamento NTECPP (fonte_canonica)
├── adapters/sinks/
│   └── zip_indicadores_sink.py          # AJUSTE: permitir campos "deriváveis" não-null por fluxo
└── scripts/
    └── merge_listagens_indicadores.py   # NOVO: merge dos 2 campos em data/dist/indicadores.zip

tests/etl/
├── factories/listagens_factories.py     # NOVO: builder de .xlsx sintético (openpyxl)
├── conftest.py                          # AJUSTE: fixtures para listagens (+ zip canônico fake p/ cruzamento)
├── test_listagens_source.py             # NOVO: contrato de entrada, erros fatais, avisos
├── test_listagens_calculator.py         # NOVO: regras NTE e cotistas (red→green)
├── test_listagens_flow.py               # NOVO: fim-a-fim (com match NTECPP), determinismo, privacidade, AVISO/ERRO
├── test_listagens_merge.py              # NOVO: merge apenas dos 2 campos, idempotente
├── test_ntecpp_match.py                 # NOVO: regras do cruzamento por nome (interseção, vazio→None, de-dup)
├── test_estudantes_pesquisa.py          # NOVO: nomes NEP por escopo/ano (espelha students_unicos)
├── test_zip_sink.py                     # NOVO (ou em test_adapters): campos deriváveis aceitos
└── test_data_layout.py                  # AJUSTE: se necessário, validar novo zip

.github/workflows/deploy.yml             # AJUSTE: job quality também roda pytest + lint Python
Makefile                                 # AJUSTE: alvos etl-listagens, merge-listagens, check
requirements-etl.txt                     # AJUSTE: + openpyxl>=3.1.0
```

**Structure Decision**: o novo pipeline integra-se ao pacote hexagonal `etl/`
existente — ao contrário de um script avulso — reutilizando sink (zip
atômico/determinístico), serializador de pilares, normalização de slug e
tracking. É a estrutura já vigente no repositório (Option 1 do template,
adaptada: sem `src/` na raiz; o "projeto" é o pacote `etl/` + testes).

## Phase 0: Research

Ver [research.md](./research.md). Decisões-chave:

- **Leitura de XLSX**: openpyxl read-only (não pandas) — leve e determinística.
- **Reuso**: `ZipIndicadoresSink` precisou de um ajuste mínimo controlado por
  parâmetro (`campos_derivaveis`) para aceitar NTE/NTECPP não-null apenas no
  fluxo das listagens (verificar `saida_pacote.md`).
- **Integração com o site**: merge dedicado, nunca sobrescrever os campos de
  pesquisa do `indicadores.zip`.
- **Regra "de cota"**: listas negativas explícitas por coluna (igualdade exata
  após `strip`), validadas contra os valores observados e o caso-limite de 118
  alunos com ingresso "Ampla Concorrência" × cota de reserva.
- **NTECPP (decisão de 2026-09-28)**: sem matrícula/`identification_id` no
  export canônico (verificado por 3 métodos), o único cruzamento estudantes-em-
  pesquisa × cotistas é **por nome normalizado** (`normalizar_nome`), executado
  no fluxo de listagens com o export canônico opcional (`--canonical`). A
  classificação NEP foi extraída para `papeis.py` e reutilizada pelo
  `aggregator`, garantindo que o match nunca divirja do NEP publicado. Cobertura
  parcial (12–17%) documentada; NTECPP ≤ NEP e interseção vazia → `null`.

## Phase 1: Design & Contracts

Ver [data-model.md](./data-model.md), [contracts/*](./contracts/) e
[quickstart.md](./quickstart.md).

Contratos gerados:

- `contracts/saida_pacote.md` — layout JSON `pilar{N}_{campus}_{year}.json`,
  quais campos o fluxo listagens preenche, regras de validação do sink
  (campos deriváveis por fluxo), determinismo e atomicidade.
- `contracts/classificacao_cota.md` — classificação "de cota" por coluna
  (listas negativas, `strip`), situações do NTE, casuística observada (valores
  distintos, 118 cruzados excluídos, M9 × cota coluna), invariantes de dados.

Reavaliação pós-design da Constitution Check: **mantida aprovada** — nenhuma
mudança de escopo; openpyxl e os dois ajustes de contrato estão justificados
abaixo.

## Complexity Tracking

> Violações de constituição justificadas (nenhuma viola Princípio I–VI; são
> desvios de _convenções detalhadas_, já praticados no repositório).

| Violação                                                       | Por que é necessária                                                                                                                                                             | Alternativa mais simples rejeitada                                                                                                                               |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pytest (e não apenas Vitest) para testes do ETL                | Prática já consolidada do repositório desde o ETL Python (c0f118a); a constituição foi ratificada antes da existência do ETL Python; Vitest permanece o único runner do frontend | Rejeitada: portar o ETL Python e seus testes para Vitest/TS reconstruiria o pipeline já aprovado (Princípio I)                                                   |
| Uma dependência nova: `openpyxl`                               | `.xlsx` é zip+binary XML; a stdlib não fornece leitor XLSX                                                                                                                       | Rejeitada: `pandas` (>30 deps transitivas) e leitores XML manuais (frágil, não-determinístico)                                                                   |
| CI passa a rodar pytest + lint Python                          | Princípio VI exige portões antes do deploy; nova feature adiciona código Python que os portões atuais (Node-only) não verificariam                                               | Rejeitada: manter CI Node-only deixaria testes do ETL sem portão de publicação                                                                                   |
| Ajuste do `ZipIndicadoresSink` (parâmetro `campos_derivaveis`) | O contrato de fidelidade atual exige null em NTE/NTECPP; as listagens precisam preenchê-los — o parâmetro mantém estrito e inalterado o comportamento do fluxo canônico          | Rejeitada: criar um sink-paralelo duplicaria validação e escrita atômica (Princípio I); remover os campos do conjunto de nulos enfraqueceria a fidelidade global |
