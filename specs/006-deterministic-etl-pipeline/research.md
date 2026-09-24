# Research: Pipeline ETL Determinístico de Indicadores

**Feature**: `006-deterministic-etl-pipeline` | **Date**: 2026-09-23

Pesquisa baseada em inspeção direta do `exports_canonical.zip` real (arquivos medidos em 2026-09-23) e do código existente do site. Todas as decisões resolvem os pontos técnicos do plano sem NEEDS CLARIFICATION remanescente.

## D1 — Leitura do ZIP de entrada

**Decision**: Reutilizar o leitor ZIP existente `src/lib/zip.ts` (`extrairZip`, sem dependências externas, suporta STORE e DEFLATE) para ler `exports_canonical.zip` inteiramente em memória.

**Rationale**: Já está em produção no site (ingestão do `indicadores.zip`), possui testes (`tests/zip.test.ts`) e atende ao volume de entrada (~23 MB compactados, ~350 MB descompactados — cabe folgado em memória de máquina de desenvolvimento).

**Alternatives considered**: dependências como `fflate`/`adm-zip`/`yauzl` (rejeitadas: adicionariam dependência sem ganho — Principle I); streaming com `unzip` CLI (rejeitado: dependência de plataforma e parsing de saída frágil).

## D2 — Escrita do ZIP de saída (determinismo)

**Decision**: Implementar um escritor ZIP minimalista em `src/etl/zipwriter.ts` usando método **STORE** (sem compressão), campos de data fixados em 1980-01-01 00:00:00 e CRC32 implementado localmente (tabela padrão IEEE 802.3, ~15 linhas). Escrita atômica: arquivo temporário + `rename`.

**Rationale**: STORE elimina qualquer variação de compressão; datas fixas eliminam carimbos de tempo — o resultado é **byte-idêntico** entre execuções (requisito SC-002). Os arquivos são JSON pequenos (total esperado < 2 MB), então a ausência de compressão é irrelevante. O leitor do site (`extrairZip`) e qualquer leitor padrão leem STORE normalmente. CRC32 é o único algoritmo necessário e não justifica dependência.

**Alternatives considered**: `fflate`/`jszip` (dependência nova + variação de metadados); CLI `zip` (metadados não determinísticos entre plataformas); DEFLATE com nível fixo (ainda dependente da implementação da lib).

## D3 — Execução de TypeScript no comando `npm run etl`

**Decision**: Adicionar `tsx` como **dev-dependency** e script `"etl": "tsx src/etl/main.ts"`.

**Rationale**: `engines` do projeto exige Node >= 20, e `--experimental-strip-types` só é estável em Node >= 22.6. `tsx` é padrão de mercado, dev-only (não afeta o build do site) e o custo é justificado na Complexity Tracking do plano.

**Alternatives considered**: `node --experimental-strip-types` (quebra Node 20); pré-build com `tsc` (etapa extra de build/sync de artefatos); reescrever em JS (viola Constituição).

## D4 — Registro de pessoas, classificação e identidade

**Decision**: Usar `researchers_canonical.json` como **registro único de pessoas** (inspeção: 9.635 registros contendo as classes `researcher` 2.511, `student` 6.280, `outside_ifes` 669, `null` 175 — o arquivo já engloba estudantes e externos). Identidade = id numérico canônico. Regras:

- **QSPP (servidores únicos)**: membros de equipe com role `Coordinator` ou `Researcher` cujo registro tenha `classification === 'researcher'`. `outside_ifes` NÃO é servidor — excluído. `classification === null` → excluído de QSPP (sem classificação verificada) e registrado em aviso.
- **NEP (estudantes únicos)**: membros com role `Student` (independente de também existirem em outras classes — a role no projeto define a participação). Overlap pesquisador/estudante no mesmo projeto conta pelo papel exercido em cada conjunto.
- **Deduplicação**: `Set<number>` de ids por escopo (campus e global) — people em múltiplos projetos/campi contam uma vez por campus e uma vez no `todos` (clarificações Q1/Q4 da spec e FR-011).

**Rationale**: Os dados mostram que 2.486 ids existem simultaneamente nos arquivos de pesquisadores e estudantes; usar classificação + role evita dupla contagem e implementa "servidor vs estudante" com precisão.

**Alternatives considered**: cruzar `students_canonical.json` separadamente (redundante — mesmo esquema, subconjunto); contar por `person_name` (frágil, viola deduplicação por identidade).

## D5 — Resolução de campus de iniciativas

**Decision**: Ordem de resolução determinística: (1) `initiative.campus` declarado; (2) campus do coordenador (primeiro membro com role `Coordinator`, campus do registro da pessoa); (3) campus do primeiro membro com campus, na ordem da lista `team`. Sem resolução → iniciativa entra **apenas no escopo `todos`** + aviso com o id. Catálogo de campi: `campuses_canonical.json` (nomes oficiais; shape `{id, name}`).

**Rationale**: Medição no export real: 4.026/4.095 iniciativas têm campus `null`; com coordenador→membros, 3.600/3.665 Research Projects resolvem — a inferência por equipe é o caminho dominante, exatamente como a spec prioriza. A ordem fixa garante determinismo.

**Alternatives considered**: votação por maioria entre membros (ambígua em empates); campus do primeiro membro sem priorizar coordenador (contraria FR-005).

## D6 — Slug de campus (nomes de arquivo)

**Decision**: Extrair `slugificarCampus` de `src/lib/dataset.ts` para `src/lib/slugificar.ts` e usá-lo também no ETL (lowercase → NFD → remove diacríticos → remove não `[a-z0-9]`; ex.: `Vila Velha` → `vilavelha`, `Vitória` → `vitoria`). O `campus` no header JSON permanece o **nome oficial** (ex.: `Serra`).

**Rationale**: O site já deriva os slugs das URLs a partir dos nomes de arquivo com esse algoritmo e seu regex aceita `[a-zA-Z0-9_-]+`; reusar o mesmo algoritmo garante que os arquivos gerados sejam ingeridos sem surpresas (DRY, sem divergência site↔ETL).

**Alternatives considered**: slugs com underscore/hífen (rejeitados: introduziriam `_`/`-` extras no padrão `pilar{N}_{campus}_{year}.json` que o site parseia).

## D7 — Regras de ano

**Decision**:

- **Iniciativa ativa em Y**: `start_date ≤ 31/12/Y` E (`end_date` nula OU `end_date ≥ 01/01/Y`); compare apenas a parte da data (ISO `YYYY-MM-DD`). Registros com `start_date` nula são tratados como nunca ativos + aviso (inspeção: 11 casos). `status` não é critério (a regra temporal da spec prevalece; status `Cancelled` sem end_date ainda intersectaria o período — mantida a regra da spec, documentada no data-model).
- **Produções/artigos (NPB/NPT/PC)**: `year === Y` (ano de publicação). `year` inválido (ex.: `0`, nulo) → excluído + aviso (inspeção: produções com ano `0` existem).
- **PIES/PICOT**: `NEP` conta estudantes únicos em iniciativas ativas em Y; `NTE`/percentuais sempre `null` (sem censo no export).

**Rationale**: Alinha-se às clarificações Q3 (publicação) e à regra de interseção com o ano civil da spec.

## D8 — Agregação institucional `todos`

**Decision**: `todos` é **calculado diretamente sobre o conjunto global** (todas as iniciativas/produções/pessoas da instituição), com `Set` global de ids de pessoas — nunca pela soma dos valores por campus. Arquivos `pilar{N}_todos_{year}.json` dedicados gerados para todos os pilares/anos.

**Rationale**: Contrato 004 (regra 3) exige arquivos dedicados e proíbe somas de subconjuntos; contagens de pessoas somadas por campus superestimariam quem atua em mais de um campus. Contagens de iniciativas/produtos por instituição são somas exatas por construção (cada registro tem um único campus resolvido ou nenhum).

## D9 — Determinismo da serialização

**Decision**: Construção de objetos em ordem fixa de chaves (estrutura do contrato), registros ordenados por `id` numérico antes de qualquer agregação, `JSON.stringify(obj)` sem espaços (arquivo canônico, uma linha por arquivo), nomes de entrada do zip iterados em ordem estável (`pilar{N}` asc, campus alfabético, ano asc), escritor ZIP com datas fixas (D2).

**Rationale**: `JSON.stringify` preserva a ordem de inserção das chaves — com construção determinística + STORE + datas fixas, a saída é byte-idêntica (SC-002).

## D10 — Validação contratual (Sync)

**Decision**: Validador hand-rolled em `src/etl/validate.ts` (sem zod/ajv — Principle I) verificando por arquivo: nome no padrão `^pilar[123]_[a-z0-9]+_(\d{4})\.json$`; header com `campus` (nome oficial), `ano_referencia`, `pilar` (nome exato do pilar), `indicadores` com as siglas exatas de cada pilar; cada métrica numérica sendo `number` ou `null`; regra semântica: campos sabidamente não calculáveis (`NTE`, percentuais, PINV*, PIPDI*, PIPROTR*) devem ser `null`. Qualquer violação → erro nomeando arquivo + campo + regra, exit 1, sem gerar zip.

**Rationale**: O domínio é fechado e pequeno (9 indicadores, ~40 campos); validadores explícitos são testáveis e legíveis; zod adicionaria dependência para o mesmo efeito.

## D11 — Privacidade (Principle IV) na prática

**Decision**: Os dados de pessoas nunca saem de `people.ts`; os módulos de saída só recebem contagens. Teste de integração varre os JSONs gerados procurando por nomes de pessoas do registro (amostra) e campos não numéricos além dos permitidos pelo contrato.

**Rationale**: Garantia estrutural + verificação automatizada de que nenhum dado individual vaza para o pacote público.

## D12 — Mensagens do CLI

**Decision**: Saída em pt-BR (Política de idioma da Constituição): resumo no stdout (`N arquivos gerados para M campi + todos, anos 2024–2026`), avisos no stderr com prefixo `AVISO:` (ids não resolvidos, datas inválidas, duplicidades), erros fatais no stderr com prefixo `ERRO:` e exit code 1.

**Rationale**: Padrão de UX de CLI; mantenedor precisa distinguir avisos (execução prossegue) de erros (falha).
