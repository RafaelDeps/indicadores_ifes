# Research: Raio-X do Indicador

**Feature**: 026-raio-x-indicador | **Date**: 2026-10-15

Não há NEEDS CLARIFICATION pendentes (Q1 micradados → Opção A; Q2 coexistência com a
memória de cálculo → Opção A). Este documento registra as decisões de design, baseadas na
pesquisa do pipeline (`etl/`) e das fontes reais (export canônico: 726 arquivos; listagens
Serra 2024–2026).

---

## D-1. Local das fixtures: `data/dist/auditoria/` versionado + `public/auditoria/` populado pelo portão

**Decision**: o ETL grava as fixtures versionadas em `data/dist/auditoria/
{indicador}_{campus}_{ano}.json`; o `check_governanca.py` (que já popula `public/dados/`) é
estendido para copiar as fixtures disponíveis para `public/auditoria/` quando o portão está
aberto e **limpar** o diretório quando fechado (paridade com `limparSaidaPublica`). O
frontend busca `{base}auditoria/{indicador}_{campus}_{ano}.json`.

**Rationale**: o caminho ilustrativo da spec (`public/dados/auditoria/`) colide com a
feature 016: `limparSaidaPublica` (`src/lib/downloads.ts`) apaga `public/dados/`
**recursivamente** (exceto `.gitkeep`) a cada build — as fixtures seriam varridas. Separar
em `public/auditoria/` mantém uma regra por diretório: `public/dados/` = insumos brutos;
`public/auditoria/` = derivados de auditoria; ambos sob o MESMO portão (uma única fonte de
decisão, `check_governanca.py`). Versionar em `data/dist/` segue a postura vigente
(`indicadores.zip` e insumos versionados por decisão de 2026-10-05; CI não roda ETL —
`deploy.yml:33-35` —, então fixtures precisam estar versionadas para existir no Pages).

**Alternatives considered**:

- _`public/dados/auditoria/`_ (pedido): varrida pelo `limparSaidaPublica` — rejeitado.
- _Preservar `auditoria/` na limpeza_: espalharia a regra do portão em dois donos
  (Python e TS) — já rejeitado na 016 por criar segunda fonte de verdade.
- _Fixtures dentro do `indicadores.zip`_: obrigaria baixar o pacote inteiro (com todos os
  indicadores/campi/anos) só para abrir um Raio-X — viola FR-009/SC-001.

## D-2. Mapa componente → registros (o que tem linhas de fato)

**Decision** (base: mapeamento real do `aggregator.py` e das fontes):

| Componente                      | Registros existem? | Fonte                                                                         | Campos da linha                                                            |
| ------------------------------- | ------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| PRE (NTPP)                      | ✅                 | iniciativas tipo Research Project ativas no ano                               | projeto (título), status, datas, campus                                    |
| SUPP (QSPP)                     | ✅                 | `team[]` × pesquisadores (contagem por `person_id` único)                     | nome, projeto, papel, datas                                                |
| NEP (PIES/PICOT)                | ✅                 | `team[]` × estudantes (único por `person_id`)                                 | nome, projeto, papel; matrícula/curso **só via match com listagens** (D-3) |
| NTE (PIES)                      | ✅                 | listagens: matrículas únicas com situação ∈ {Matriculado, Formado, Concluído} | matrícula, nome, curso, situação                                           |
| NTECPP (PICOT)                  | ✅                 | interseção por nome normalizado (cotistas listagens ∩ NEP)                    | nome, matrícula, curso (da listagem)                                       |
| TAFPPI (PINV)                   | ✅ **soma R$**     | SIGPESQ com financiamento no ano (FACTO vazio hoje)                           | projeto (código/título), valor (R$), fonte                                 |
| OCC (PINV)                      | ❌                 | sem fonte nenhuma no repositório (sempre `null`)                              | aba "sem detalhamento"                                                     |
| NAPPCT (PIPDI)                  | ✅                 | SIGPESQ: parcerias externas vigentes no ano                                   | projeto, financiador, datas                                                |
| NPB (PIPRO)                     | ✅                 | artigos por ano                                                               | título, ano, tipo                                                          |
| NPT (PIPRO)                     | ✅                 | produções técnicas por ano                                                    | título, ano, tipo                                                          |
| PC (PIPROT)                     | ✅                 | produções tipo software                                                       | título, ano                                                                |
| PA, RM, DI, C, TC, OGM (PIPROT) | ❌                 | hardcoded 0/`null` — sem fonte                                                | aba "sem detalhamento"                                                     |
| CT, CL, CC (PIPROTR)            | ❌                 | idem                                                                          | aba "sem detalhamento"                                                     |

**Rationale**: a fixture não pode inventar registros; onde a fonte não tem linhas, a aba
declara "sem detalhamento" com o total apurado canônico (edge case da spec). Componentes com
fonte recebem registros no MESMO passe da contagem (D-5).

**Alternatives considered**: limitar o Raio-X aos componentes com fonte — rejeitado: o
drawer deve explicar a fórmula inteira; abas "sem detalhamento" são honestas e testáveis.

## D-3. Campos de pessoas: canônico dá Nome/Projeto/Papel; listagens dão Matrícula/Curso

**Decision**: NEP/SUPP vêm do canônico — que **não tem matrícula nem curso** (o próprio
código o declara: `listagens_flow.py:28-39`). Nos registros de NEP/NTECPP, Matrícula e Curso
são preenchidos **apenas quando o nome normalizado casa com uma linha de listagem do campus/
ano** (o mesmo cruzamento que o `calcular_ntecpp_match` já faz); sem match, célula "Dado
indisponível". Para NTE, o flow de auditoria lê as listagens com **retenção de nome/curso**
(novo modo na `ListagensXlsxSource` — hoje descarta: `models/listagens.py:10-22`).

**Rationale**: o export canônico simplesmente não contém matrícula/curso; inventar é
proibido (Princípio III). O match por nome já é a técnica canônica do projeto para ligar
listagens↔canônico (`estudantes_pesquisa.py:20-71`). A retenção extra fica confinada ao novo
flow — o flow de listagens existente e o pacote agregado permanecem intocados (nenhum nome
neles).

**Alternatives considered**: exigir matrícula preenchida sempre — obrigaria a ou inventar ou
deixar o Raio-X do NEP vazio; rejeitado.

## D-4. Componentes de soma: o selo compara soma de valores, não contagem

**Decision**: cada componente da fixture carrega `tipoContagem: 'contagem' | 'soma'`. Para
`contagem` (todos hoje, exceto TAFPPI), o selo compara `registros.length` com `apurado`.
Para `soma` (TAFPPI, R$), compara a **soma dos valores** dos registros com o apurado; a
tabela mostra a coluna Valor e o contador continua em registros ("Exibindo Y de N registros"),
com o selo exibindo a soma conferida.

**Rationale**: TAFPPI é apurado como soma de valores de projetos (`pillar2.py:132-172`);
comparar quantidades seria sem sentido e geraria divergência falsa (violaria FR-006 na
direção oposta — falso negativo).

## D-5. Registros coletados NO MESMO passe das contagens (garantia do "Conferido")

**Decision**: o `aggregator.py` (e o cálculo de pilar 2/3) passa a **coletar** as linhas que
compõem cada conjunto/contagem enquanto conta (ex.: o set `students_unicos` guarda, junto do
`person_id`, nome/projeto/papel; a contagem de artigos guarda título/ano). O
`AuditoriaFlow` novo serializa essas coleções para as fixtures — nunca re-deriva com filtros
reimplementados.

**Rationale**: se a fixture re-implementasse os filtros (situação, tipo de iniciativa,
vigência, campus por resolução), qualquer divergência sutil tornaria o selo "Conferido"
falso — o pior defeito possível nesta feature (FR-006/SC-002). Coletar no mesmo passe torna
a coincidência estrutural, não uma esperança.

**Alternatives considered**: recalcular registros a partir das fontes num módulo novo —
duplicaria 5 filtros de contagem já testados; rejeitado (Princípio I e III).

## D-6. Portão: uma única decisão, dois diretórios servidos

**Decision**: `check_governanca.py` estende seu comportamento: portão aberto → copia
`data/dist/auditoria/*.json` para `public/auditoria/` (como já faz com `public/dados/`);
fechado → limpa `public/auditoria/`. O frontend decide a visibilidade do gatilho no build
com o MESMO `portaoAberto()` já usado pela página `/dados` e pela rastreabilidade (025); a
fixture ausente para um contexto (404) vira estado legível no drawer ("sem registros
publicados para este contexto") com nova tentativa.

**Rationale**: o portão hoje já é consultado por duas pontas (Python e TS) contra o mesmo
arquivo — o padrão é consolidar a decisão, não duplicá-la. Copiar (e não só omitir) segue o
aprendizado de `limparSaidaPublica`: uma build fechada não pode herdar fixture de build
aberta anterior.

## D-7. Frontend: um drawer por página + módulos puros + gatilho fora do `<a>`

**Decision**: `RaioXDrawer.astro` renderiza UM diálogo por página (reusado para qualquer
indicador), com `role="dialog"`/`aria-modal`, abas `role="tablist"/tab/tabpanel`, foco preso,
ESC e devolução de foco ao disparador. O gatilho (`BotaoRaioX.astro`) fica, nos cartões de
pilar, dentro da célula (`.celula-indicador`, fora do `<a>` — lição da 025/D-1) e, no detalhe,
na área de ações da página. Módulos puros (`raiox.ts`: normalizar, filtrar, ordenar, paginar,
resumir) + aplicador (`aplicar-raiox.ts`) + cliente (`raiox-cliente.ts`: fetch lazy, contexto
via `resolverContextoComAjuste`, troca de contexto re-busca a fixture).

**Rationale**: reuso dos padrões consagrados (013/025) e validade HTML — nenhum controle
interativo dentro do `<a>` do cartão.

## D-8. Export: CSV nativo; XLSX rejeitado nesta versão

**Decision**: "Exportar lista" gera CSV (Blob + download, padrão `exportar-csv.ts`), com o
recorte filtrado atual e os mesmos campos da tabela. XLSX exigiria dependência de terceiros
de peso (SheetJS ≈ centenas de KB) — rejeitado pelo Princípio I; FR-008 permite (CSV é o
obrigatório, XLSX condicional).

**Alternatives considered**: gerar XLSX server-side no ETL — os recortes filtrados existem
só no cliente; rejeitado.

## D-9. Guardas de privacidade: re-escopo deliberado, não silencioso

**Decision**: `tests/etl/test_privacy.py` (que varre o `indicadores.zip` buscando nomes do
canônico) é re-escopado para o pacote agregado — que continua sem nenhum nome. Novos testes
de privacidade cobrem as fixtures: (a) portão fechado ⇒ `public/auditoria/` vazio; (b)
nenhum padrão CPF/sem campos além do contrato nas fixtures; (c) tracker/logs do novo flow
sanitizados (padrão `tracker.py:75-80`). A emenda (FR-012) documenta a autorização da nova
superfície.

**Rationale**: a segurança atual não pode ser relaxada por acidente — o re-escopo é uma
mudança explícita, testada nas duas direções (agregado estrito; fixtures sob emenda+portão).

## D-10. Busca insensível a acento/caixa: normalização única

**Decision**: a busca do Raio-X usa a mesma normalização da busca rápida existente
(`src/lib/busca.ts` — NFD/strip diacríticos + lowercase), extraída para função compartilhada
quando necessário (sem duplicar a regex).

**Rationale**: FR-005 pede insensibilidade a acento/caixa; a busca rápida já resolve isso em
produção (feature 023).

## D-11. Escopo `todos` sem fixture; escopos com listagens apenas

**Decision**: fixtures são geradas apenas para campi específicos (hoje: Serra) — nunca para o
escopo consolidado `todos` (decisão da spec: sem listagem cruzando campi). O contexto
`todos` mostra a explicação com apontamento para `/dados`.

**Rationale**: a listagem de NTE é por período do campus; cruzar campi no drawer multiplicaria
exposição sem ganho de verificação (o agregado `todos` permanece auditável pelos insumos).
