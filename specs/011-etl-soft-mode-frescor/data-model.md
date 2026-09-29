# Data Model: Modo Soft, Verificação de Frescor e Target Único do ETL

**Branch**: `011-etl-soft-mode-frescor` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)

## Contexto

Esta feature **não introduz nenhum dado novo** nem altera o modelo de domínio
do pipeline (entidades de `etl/core/logic/models/` permanecem intocadas). O
modo soft opera sobre **artefatos de arquivo** (zips, planilhas e seus
`mtime`), e o `check-dados` observa a **ordem temporal** entre eles como
heurística de frescor. Nenhum dado individual entra em qualquer artefato
(Princípio IV).

## Artefatos e papéis

| Artefato                                   | Papel                                                                                                 | No Git?       | Observação                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------- |
| `data/canonical/exports_canonical.zip`     | Entrada do fluxo canônico; única fonte do **universo de nomes** NEP (necessário ao cruzamento NTECPP) | ❌ gitignored | Tamanho **variável** (depende do export vigente); fora de clones/CI    |
| `data/raw/listagem_<AAAA>_<S>.xlsx`        | Entrada do fluxo de listagens (NTE + cotistas)                                                        | ❌ gitignored | Quantidade **variável** (uma por `(campus, ano)` apurável)             |
| `data/dist/indicadores_listagens.zip`      | Artefato intermediário: NTE/NTECPP calculados                                                         | ❌ gitignored | Pode ficar **stale** entre execuções — origem do aviso de proveniência |
| `data/dist/indicadores.zip`                | **Pacote público** (agregados; consumido pelo site no build)                                          | ✅ commitado  | Único snapshot coerente disponível em clone/CI                         |
| `data/reports/etl_listagens_run_report.md` | Relatório de auditoria da feature 010 (contém avisos; histórico de execução)                          | ❌ gitignored | Não regenerado quando a etapa é pulada (nada a reportar)               |

## Invariantes de frescor (relações de mtime observadas pelo `check-dados`)

Ordenação esperada de um pipeline "em dia" (executado na mesma máquina):

```text
exports_canonical.zip  ──►  indicadores_listagens.zip  ──►  indicadores.zip
      (mais antigo)                                          (mais novo)
data/raw/listagem_*.xlsx  ──►  indicadores.zip   (planilhas nunca mais novas que o pacote)
```

| Invariante                                                                                                                                                           | Violação detectada por `check-dados`        | Aviso (`AVISO:`)                                                                | Exit  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- | ----- |
| `indicadores.zip` ≥ `exports_canonical.zip`                                                                                                                          | canônico **mais novo** que o pacote         | pacote "possivelmente desatualizado"                                            | 0     |
| `indicadores_listagens.zip` ≥ `indicadores.zip`                                                                                                                      | zip de listagens **mais novo** que o pacote | merge não reexecutado; NTE/NTECPP podem ser de execução anterior (proveniência) | 0     |
| `indicadores.zip` ≥ qualquer `data/raw/listagem_*.xlsx`                                                                                                              | planilha **mais nova** que o pacote         | planilha não incorporada ao último pacote                                       | 0     |
| contrato de todos os arquivos `pilar{N}_{campus}_{year}.json` do pacote (número **variável**, derivado do export: nº de campi + escopo `todos` × 3 pilares × 3 anos) | violação de schema/shape                    | — (ERRO)                                                                        | **1** |

- Entradas **ausentes** não participam da comparação (sem falso alarme) e são
  listadas em uma única linha `INFO:` no stderr ("apenas o contrato foi
  validado") — o `check-dados` nunca silencia a ausência de avaliação de
  frescor (ver `contracts/check-dados.md` §3.1).
- O mtime **não é garantia de procedência**: Git não preserva mtimes; em clone
  limpo ou CI os mtimes são ≈ hora do checkout e as comparações são inócuas
  (ver `contracts/check-dados.md` §5).

## Regras do modo soft sobre os artefatos

1. **Sem escrita quando pulado**: etapa com entrada ausente (modo soft) não
   cria nem reescreve nenhum artefato de saída — conteúdo **e mtime** intactos.
2. **Sem fabricação**: se o fluxo canônico rodou e o listagens foi pulado, o
   pacote final tem NTE/NTECPP `null` (Princípio III) — o número de outra
   execução nunca é reaproveitado.
3. **Sem deleção**: artefatos intermediários stale (ex.:
   `indicadores_listagens.zip` antigo) não são removidos pelo soft; a
   desatualização deles é responsabilidade do `check-dados` (aviso de
   proveniência).
4. **Determinismo**: quando a etapa roda, os artefatos continuam
   byte-a-byte-determinísticos e atom-write (padrão `ZipIndicadoresSink` /
   merge idempotente).

## Validações de domínio (invariantes)

1. Soft + entrada ausente + saída inexistente ⇒ `ERRO:` + 1 (nunca fabrica um
   pacote do nada).
2. Soft + entrada ausente + saída existente ⇒ 0 + `AVISO:` (preserva o
   snapshot).
3. Falha estrita (sem soft) com entrada ausente ⇒ `ERRO:` + 1 (contrato 006).
4. `make dados` aborta no primeiro erro (encadeamento `&&`); nunca continua
   com etapas subsequentes após um exit ≠ 0.
5. Nenhum cenário desta feature altera o shape do JSON de saída (o contrato da
   spec 010 permanece: NTE/NTECPP `int|null`, demais campos não coletáveis
   `null`).
