# Implementation Plan: Raio-X do Indicador (Drawer de Auditoria de Micradados)

**Branch**: `026-raio-x-indicador` | **Date**: 2026-10-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/026-raio-x-indicador/spec.md`

## Summary

Adicionar o **Raio-X do Indicador**: um drawer modal acessível, acionado dos cartões dos
pilares e das páginas de detalhe, que exibe — por componente da fórmula (abas) — a lista dos
**registros individuais** contabilizados no contexto ativo (campus/ano), com busca, ordenação,
paginação, selo de conferência contra o valor apurado canônico, exportação do recorte e a
etapa de cálculo no rodapé. Os registros chegam de **fixtures de auditoria** geradas pelo ETL
(uma por indicador × campus × ano), carregadas sob demanda, publicadas sob o mesmo portão de
governança fail-closed dos insumos brutos. **Pré-condição de publicação (FR-012 da spec)**:
emenda MAJOR do Princípio IV + atualização da revisão de privacidade versionada — o Princípio
IV vigente autoriza só os insumos exatos, não novas superfícies de micradados.

## Technical Context

**Language/Version**: TypeScript 5 (Astro 5, frontend) + Python 3.12 (ETL, hexagonal);
frontend sem dependências novas; ETL já usa openpyxl

**Primary Dependencies**: Nenhuma nova. Frontend reusa `contexto.ts` (resolução de contexto),
`formatters.ts`, `busca.ts` (normalização acento/caixa), padrão `aplicar-visao.ts` (DOM) e
`exportar-csv.ts`; ETL reusa `aggregator.py` (contagens), `ListagensXlsxSource`,
`zip_indicadores_sink.py` (determinismo) e o portão de `check_governanca.py`

**Storage**: Arquivos estáticos — fixtures versionadas em `data/dist/auditoria/` (mesma
postura de versionamento de `data/dist/indicadores.zip`, decisão 2026-10-05) e servidas de
`public/auditoria/` populado pelo portão em build; NÃO em `public/dados/` (ver research D-1)

**Testing**: pytest (`tests/etl/`, fixtures sintéticas de zip/xlsx já consolidadas) e Vitest
(`tests/web/`, mocks de DOM em Node puro + asserções de fonte `.astro`)

**Target Platform**: Navegadores modernos (360px+), GitHub Pages (subcaminho), temas
claro/escuro; CI existe e **não roda ETL** — fixtures são versionadas e validadas

**Project Type**: Site estático Astro + pipeline ETL Python (ambas as camadas tocadas)

**Performance Goals**: Fixture buscada só ao abrir (SC-001: ≤ 2 s pós-abertura); busca/
ordenação/paginação < 1 s no maior conjunto (~2.500 registros — NTE Serra 2026: 2.425);
peso inicial das páginas inalterado (zero micrado pré-carregado)

**Constraints**: Princípio III (apurado sempre do canônico; divergência transparente);
Princípio IV com emenda pré-condição (fail-closed, marcação de dado pessoal, sem credencial);
Princípio V (pt-BR, mobile, WCAG AA); sem dado individual nos logs/PRs/reports (padrão do
tracker); fixtures determinísticas (mesma disciplina do sink de indicadores)

**Scale/Scope**: 9 indicadores × campi com listagens (hoje: Serra) × 3 anos ≈ 27 fixtures
(+ variantes por componente); 1 drawer por página; gatilho em cartões de pilar (3 páginas) e
páginas de detalhe (9 rotas)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                       | Avaliação               | Evidência                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I. Simplicity                   | ✅ PASS                 | Zero dependências novas: CSV nativo (Blob), XLSX **rejeitado** (pesaria em dependência — research D-8, dentro do que FR-008 permite); ETL segue a arquitetura hexagonal existente (flow + sink + source), sem camadas novas                                                                                                                                                                                                                           |
| II. Test-First (NON-NEGOTIABLE) | ✅ PASS                 | pytest antes do código do ETL (`tests/etl/test_auditoria_*.py`); Vitest antes do frontend (`raiox*.test.ts`); red → green documentado nas tasks                                                                                                                                                                                                                                                                                                       |
| III. Fidelity to Report Data    | ✅ PASS                 | `apurado` de cada componente vem do dataset canônico **no mesmo passe** em que os registros são coletados (research D-5) — a fixture nunca recalcula; divergência listado×apurado vira estado transparente (FR-006); "sem detalhamento" para fontes sem linhas (OCC, PA/RM/DI/C/TC/OGM, CT/CL/CC — research D-2)                                                                                                                                      |
| IV. Aggregated Data + gate      | ⚠️ CONDICIONAL          | A feature **viola o Princípio IV como escrito** — propositalmente, via emenda MAJOR (FR-012): renderização de micradados + novas fixtures derivadas, sob o mesmo portão fail-closed estendido às fixtures (FR-011), marcação de dado pessoal no drawer (FR-013), sem credencial, e re-escopo deliberado dos guardas de privacidade existentes (research D-9). **Entrada no Complexity Tracking abaixo; bloqueia a publicação, não o desenvolvimento** |
| V. Basic Quality                | ✅ PASS                 | pt-BR integral; drawer responsivo 360px com rolagem própria; foco/ESC/`aria-modal`/`aria-sort`; contraste via tokens existentes; ESLint/flake8/black/prettier zero erros                                                                                                                                                                                                                                                                              |
| VI. Automated Deployment        | ✅ PASS                 | CI mantém a ordem: `check_governanca` (que passa a copiar/limpar `public/auditoria/`) → build; nenhum job novo; deploy segue bloqueado por quality                                                                                                                                                                                                                                                                                                    |
| Static only                     | ✅ PASS                 | Fetch de JSON estático sob demanda; nenhuma API/servidor;fixtures determinísticas por build                                                                                                                                                                                                                                                                                                                                                           |
| Privacy review                  | ⚠️ BLOQUEIO DOCUMENTADO | `docs/revisao-privacidade.md` DEVE ser atualizado + emenda na constitution antes do merge da publicação (precedente: feature 016, emenda 2.0.0). Coordenador não pode "aparecer por acaso": as tasks têm tarefa explícita de emenda/revisão ANTES das tasks de publicação                                                                                                                                                                             |

**Pós-Phase 1 (re-check)**: ✅ PASS com a mesma condição — o design não cria caminho que
publique micradado sem portão: sem emenda, o portão fechado mantém `public/auditoria/` vazio
(fail-closed herdado) e o drawer nem é oferecido. O invariante "nenhum nome no agregado"
(`test_privacy.py`) é re-escopado para o pacote agregado (continua estrito) e ganha gêmeos
para as fixtures (research D-9).

## Project Structure

### Documentation (this feature)

```text
specs/026-raio-x-indicador/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões (D-1..D-11)
├── data-model.md        # Phase 1 — Fixture de Auditoria, Registro, invariants
├── quickstart.md        # Phase 1 — cenários de validação R1..R8
├── contracts/
│   ├── fixture-auditoria.md   # contrato do JSON servido (schema + exemplos)
│   └── dom-raiox.md           # contrato de DOM/funções/ETL (hooks, fetch, portão)
└── tasks.md             # Phase 2 (/speckit.tasks — não criado aqui)
```

### Source Code (repository root)

```text
etl/
├── flows/auditoria_flow.py          # NOVO: coleta registros no MESMO passe das contagens (D-5)
├── adapters/sinks/json_auditoria_sink.py  # NOVO: fixtures determinísticas em data/dist/auditoria/
├── adapters/sources/listagens_xlsx_source.py  # MODIFICADO: modo de retenção p/ auditoria (nome/curso)
└── scripts/check_governanca.py      # MODIFICADO: copia/limpa public/auditoria (portão fail-closed)

src/
├── components/
│   ├── RaioXDrawer.astro            # NOVO: diálogo modal único por página (tabs, tabela, selo, rodapé)
│   ├── BotaoRaioX.astro             # NOVO: gatilho acessível (cartão do pilar e página de detalhe)
│   └── (IndicatorCard/IndicadorDetalhe)  # MINIMO: acomodar o gatilho fora do <a>
├── lib/
│   ├── raiox.ts                     # NOVO: filtrar/ordenar/paginar/resumir (puro, testável)
│   ├── aplicar-raiox.ts             # NOVO: aplicação DOM do drawer (padrão aplicar-visao)
│   └── raiox-cliente.ts             # NOVO: abrir/fechar, fetch lazy, foco, ESC, contexto
tests/
├── etl/test_auditoria_flow.py       # NOVO + test_auditoria_sink.py + privacidade de fixtures
└── web/raiox*.test.ts               # NOVO: filtrar/paginar/drawer/integração/markup a11y

Makefile                             # NOVO alvo `auditoria` + inclusão na cadeia `dados`
docs/revisao-privacidade.md          # ATUALIZADO (pré-condição FR-012)
.specify/memory/constitution.md      # EMENDA MAJOR Princípio IV (pré-condição FR-012)
```

**Structure Decision**: Estruturas existentes — ETL hexagonal (flow/source/sink + scripts) e
frontend Astro/lib com módulos puros + aplicador DOM. Novo sink de fixtures espelha
`ZipIndicadoresSink` (determinismo, validação); novo módulo cliente espelha o par
`visao.ts`/`aplicar-visao.ts` (025). Nenhuma opção de estrutura alternativa.

## Complexity Tracking

> Vições reais de constituição devem ser justificadas aqui.

| Violation                                                                                | Why Needed                                                                                                                                          | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Princípio IV (renderização de micradados + novas fixtures derivadas)                     | O propósito da feature é a auditoria registro a registro; o usuário decidiu (Q1, Opção A) pelos campos completos Nome/Matrícula/Curso/Projeto/Papel | Pseudonimizado (Opção B) ainda seria dado individual e exigiria a mesma emenda, com auditabilidade menor; híbrido (Opção C) não entrega a microauditoria pedida. A emenda MAJOR + revisão de privacidade (FR-012) é pré-condição **de publicação** — o mesmo mecanismo usado pela feature 016 |
| Dependência de dados que hoje são descartados (Nome/Curso das listagens; match por nome) | A fixture de NTE/NEP precisa dos campos do pedido; o export canônico não tem matrícula/curso                                                        | Reaproveitar a retenção atual (só matrícula) tornaria as tabelas do Raio-X não-conferíveis por curso/nome. A retenção extra fica **restrita ao novo flow de auditoria** — o flow de listagens existente continua descartando (nenhuma mudança no pacote agregado)                             |
