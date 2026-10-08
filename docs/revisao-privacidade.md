# Revisão de privacidade — publicação dos insumos brutos

**Data:** 2026-10-05
**Feature:** [016 — Página de Downloads dos Dados](../specs/016-download-data-files/spec.md)
**Situação:** aprovada

Este documento é o registro versionado exigido pelo portão de governança
(`FR-016`, regra P-1 de
[`contracts/pagina-downloads.md`](../specs/016-download-data-files/contracts/pagina-downloads.md)).
Enquanto este arquivo não existir, o portão mantém os insumos brutos fora da
publicação — e o site sobe com o agregado sozinho.

---

## 1. O que se publica

| Arquivo                                             | Natureza     | Contém dado pessoal                      |
| --------------------------------------------------- | ------------ | ---------------------------------------- |
| `data/canonical/exports_canonical.zip`              | Insumo bruto | Sim — relação de estudantes e servidores |
| `data/raw/listagem_*.xlsx` (6 planilhas, 2024–2026) | Insumo bruto | Sim — matrícula por semestre             |
| `data/dist/indicadores.zip`                         | Agregado     | Não — indicadores desidentificados       |

## 2. Classificação: dado pessoal, não dado sensível

Os insumos contêm a coluna `Nome` com nomes completos (art. 5º, I da LGPD).
**Não** são dado sensível nos termos do art. 5º, II: não há dado biométrico,
dado de saúde, opinião política, religião, filiação sindical ou dado referente
a crianças e adolescentes.

Essa classificação não é um atenuante. Dado pessoal basta para que a LGPD
incida integralmente, e a distinção importa porque muda o regime de
consentimento: o art. 7º, II não exige consentimento quando há legítimo
interesse, e é sobre essa base que a publicação se apoia.

## 3. Base legal

**Art. 7º, II da LGPD** — tratamento necessário para atendimento de legítimo
interesse do IFES, no uso de dados de acesso e circulação de informação
institucional, desde que anonimizados quando possível.

**Art. 33 da LGPD** — transferência internacional autorizada pela
autorização acima, com as cláusulas contratuais aplicáveis ao caso.

**Data da autorização:** 2026-10-05.

## 4. Autorização

**Paulo Sérgio dos Santos Júnior**
Diretor de Extensão e Pesquisa do Campus Serra

A autorização cobre, em um único ato:

- a **base legal** para tratar e publicar os insumos brutos (art. 7º, II); e
- a **transferência internacional** dos mesmos dados (art. 33).

Nenhuma outra pessoa precisa aprovar esta publicação.

## 5. O que a decisão **não** resolve

Registrado aqui porque um documento de aprovação que só diz "aprovado" deixa o
próximo leitor com a impressão de que o problema acabou.

1. ~~A emenda do Princípio IV continua em aberto.~~ **Resolvida em 2026-10-05**:
   a constitution está em **2.0.0**, com o Princípio IV reescrito para permitir
   a publicação dos insumos brutos sob o portão, e com Sync Impact Report no
   cabeçalho do arquivo. É o que destrava o portão — esta pendência e a
   anterior eram as duas metades do mesmo ato.
2. **Versionar é permanente.** Os arquivos estão no histórico do Git. Apagá-los
   da `main` remove os ponteiros, não os objetos. A partir de 2026-10-05 não há
   caminho de apagamento real que não seja eliminar o repositório.
3. **A anonimização continua sendo o objetivo do pipeline**, não o estado dos
   insumos. O `etl/tracking/` sanitiza logs e atestados; ele não anonimiza os
   arquivos de origem.

## 6. Procedimento

```
# o portão fecha enquanto este arquivo não existir
PYTHONPATH=. python -m etl.scripts.check_governanca
```

Com este arquivo e a constitution em 2.0.0, o portão abre:

```
OK: portão aberto (3 pendência(s) registrada(s)); pacote agregado publicado (1 artefato); insumos brutos publicados (7)
```

Fechá-lo de novo é apagar (ou esvaziar) qualquer um dos dois registros — o
portão resolve contra o disco, não contra um booleano neste arquivo.

## Referências

- Feature 016: [`spec.md`](../specs/016-download-data-files/spec.md) ·
  [`plan.md`](../specs/016-download-data-files/plan.md)
- Contrato do portão: [`contracts/pagina-downloads.md`](../specs/016-download-data-files/contracts/pagina-downloads.md)
- Registro das pendências: [`.specify/governanca/pendencias.yaml`](../.specify/governanca/pendencias.yaml)
- Medidas de proteção (spec 012): [`medidas-de-protecao.md`](../specs/012-gate-proveniencia-workflow-dados/medidas-de-protecao.md)
