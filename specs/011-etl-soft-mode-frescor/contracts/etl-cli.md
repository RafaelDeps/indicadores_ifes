# Contrato de CLI — Modo Soft (`--soft` / `SOFT=1`) e Orquestração `make dados`

**Feature**: `011-etl-soft-mode-frescor` | **Regido por**: [spec.md](../spec.md) FR-001..FR-006

## 1. Ativação do modo soft

Em todas as três CLIs, o modo soft é **opt-in** e ativo se **qualquer um** dos
mecanismos estiver definido (redundância sem conflito):

| Mecanismo            | Forma                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------- |
| Flag                 | `--soft` (flag `store_true`, sem valor)                                                        |
| Variável de ambiente | `SOFT=1` (valor truthy; espelha o padrão `ENTRADA`/`SAIDA`/`CAMPUS` já usado em `etl/main.py`) |

Sem flag e sem env (`SOFT` vazia), o comportamento **fail-fast atual** da
spec 006 é mantido integralmente (`ERRO:` + exit 1 quando a entrada falta).

## 2. Comportamento por etapa (matriz)

| CLI                           | Entrada                         | Condição de saída                        | Estrito (default)                                           | Soft (`--soft` / `SOFT=1`)                                                                         |
| ----------------------------- | ------------------------------- | ---------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `etl.main`                    | `exports_canonical.zip`         | ausente + pacote de saída **existe**     | `ERRO:` + exit 1                                            | `AVISO:` + exit 0, pacote intocado                                                                 |
| `etl.main`                    | `exports_canonical.zip`         | ausente + pacote de saída **não existe** | `ERRO:` + exit 1                                            | `ERRO:` + exit 1 (nada a preservar)                                                                |
| `etl.main_listagens`          | planilhas `listagem_*.xlsx`     | nenhuma encontrada                       | `ERRO:` + exit 1                                            | `AVISO:` + exit 0, zip de listagens **não criado/sobrescrito**                                     |
| `etl.main_listagens`          | `--canonical` (export canônico) | ausente                                  | NTECPP `null` + `AVISO:` + exit 0 (comportamento existente) | igual, com `AVISO:` adicional: NTECPP **não recalculável** a partir do zip (sem universo de nomes) |
| `merge_listagens_indicadores` | `indicadores_listagens.zip`     | ausente                                  | `ERRO:` + exit 1                                            | `AVISO:` + exit 0, `indicadores.zip` intocado                                                      |

> **Nota**: o caso "planilhas ausentes + soft" no `etl.main_listagens` **não**
> gera `indicadores_listagens.zip`. Se um zip stale existir no disco, ele
> permanece — e a desatualização dele é sinalizada pelo `check-dados` (aviso de
> proveniência), não pelo fluxo. Se **não** houver zip stale, a cadeia não tem
> entrada para o merge — situação tratada por §4.1.
>
> **A matriz acima é por etapa.** Ela não cobre a degradação do pacote causada
> por uma cadeia _incompleta_: ver §4.1 e o invariante 6 em §5.

## 3. Códigos de saída e mensagens

- `0` — sucesso, ou etapa pulada em modo soft (`AVISO:` no stderr garantido —
  **nunca silencioso**).
- `1` — falha fatal (`ERRO:` no stderr): entrada ausente em modo estrito, ou
  modo soft sem pacote a preservar, ou anomalia de contrato/corrupção.
- Formato de mensagens em pt-BR, no padrão já adotado:
  - `AVISO: <motivo> — etapa pulada; <arquivo> não foi tocado por esta etapa.`
    (soft). A redação é **por etapa** e não pode afirmar "pacote preservado": uma
    etapa anterior da mesma cadeia pode já ter reescrito o pacote (ver §4.1).
  - `ERRO: <motivo>` + sugestão de correção quando aplicável.

## 4. `make dados` — orquestração do pacote completo

Contrato (no Makefile, alvo `.PHONY`):

```text
dados: etl → etl-listagens → merge-listagens
```

- Executa as três etapas **na ordem**, com encadeamento `&&`: qualquer exit ≠ 0
  encerra a sequência (nenhuma etapa subsequente roda).
- `SOFT=1 make dados` repassa `--soft` às três etapas.
- É intencionalmente **sempre executado** (sem dependências de arquivos do GNU
  make): rodar `make dados` regera o pacote; não é uma regra "se desatualizado".

### 4.1 Pré-condição de cadeia (guarda de coerência)

O pacote `indicadores.zip` é **saída de uma cadeia**, não de uma etapa. O merge
é quem acrescenta `NTE_total_estudantes_matriculados` e
`NTECPP_cotistas_em_pesquisa`; a etapa 1 regenera o pacote **apenas** do export
canônico, que não carrega esses campos.

Logo, se a etapa 1 reescrever o pacote e o merge não tiver entrada para repor
esses campos, o último snapshot coerente é apagado **em silêncio** — o comando
termina com exit 0 e o único sinal é um `AVISO:` de etapa pulada. Por isso, antes
de qualquer etapa, `make dados` roda o guarda
`etl/scripts/cadeia_dados.py`, que bloqueia a cadeia em exatamente um caso:

```text
canônico presente (etapa 1 vai reescrever)
  ∧ zip de listagens ausente (etapa 3 não tem entrada)
  ∧ sem planilhas listagem_*.xlsx em data/raw (etapa 2 não poderá gerá-lo)
```

| Modo    | Saída do guarda | Efeito                                                                                  |
| ------- | --------------- | --------------------------------------------------------------------------------------- |
| Estrito | `ERRO:` + 3     | `make dados` termina com exit 1 **antes de executar ou sobrescrever qualquer etapa**    |
| Soft    | `AVISO:` + 3    | `make dados` termina com exit 0; cadeia inteira pulada; pacote preservado por não-toque |

Sem bloqueio (guarda exit 0), a cadeia segue normalmente e nenhuma mensagem é
emitida. O guarda **não** roda nos alvos `etl`, `etl-listagens` ou
`merge-listagens` isolados — que continuam sendo executados sob a matriz §2
(ver a mitigação em `check-dados.md` §5.1 para a cegueira do `make etl` isolado).

Uso:

```bash
make dados                 # estrito: aborta com ERRO+1 se faltar alguma entrada
SOFT=1 make dados          # tolerante: pula com AVISO+0 a etapa sem entrada
make check-dados           # depois: "posso confiar neste zip?"
```

## 5. Invariantes (não-negociáveis)

1. **Nunca fabricar** — soft não cria pacote onde não havia; campo não
   apurado ⇒ `null` (Princípio III).
2. **Nunca deletar** — nenhum artefato é removido pelo soft.
3. **Nunca misturar** — nenhum campo é sobreposto entre execuções; soft não
   toca o arquivo (conteúdo e mtime).
4. **Aviso obrigatório** — todo pulo em modo soft imprime `AVISO:` no stderr.
5. **Contrato 006 intacto** — sem soft, entrada ausente ⇒ `ERRO:` + exit 1.
6. **Coerência da cadeia** — o pacote público só é reescrito se a cadeia puder
   completá-lo. Se o merge não terá entrada, a cadeia inteira não roda: no soft o
   último snapshot coerente é preservado por não-toque (invariante 3), e no
   estrito a falha é antecipada, sem tocar em nada. Uma etapa pulada **nunca**
   pode anunciar preservação que uma etapa anterior da mesma cadeia já negatei.
