# Quickstart: Validação do Raio-X do Indicador

**Feature**: 026-raio-x-indicador

Guia de validação ponta a ponta. Referências: [contracts/fixture-auditoria.md](./contracts/fixture-auditoria.md),
[contracts/dom-raiox.md](./contracts/dom-raiox.md), [data-model.md](./data-model.md), [../spec.md](./spec.md).

## Pré-requisitos

```bash
make dados        # cadeia completa (etl → etl-listagens → merge-listagens)
make auditoria    # NOVO: gera data/dist/auditoria/{INDICADOR}_{campus}_{ano}.json
python -m etl.scripts.check_governanca   # popula public/dados + public/auditoria conforme o portão
npm install       # dependências existentes (nenhuma nova)
```

Pré-condição de governança (FR-012 da spec): com a emenda do Princípio IV pendente, as
fixtures NÃO são publicadas (portão fail-closed) — para validar o drawer em dev, a emenda e a
revisão de privacidade precisam estar registradas (ou usar fixture de teste servida
manualmente em `public/auditoria/` em ambiente local apenas).

## Executar

```bash
npm run dev       # http://localhost:4321/indicadores_ifes/
```

## Cenários de validação manual

### R1. Abrir o Raio-X no contexto ativo (US1 — P1)

1. Em `/pilar-1/` com campus/ano selecionados, acione "[🔍 Raio-X do Indicador]" no cartão do
   PIES: o drawer abre sem recarregar, com aba por componente — "Numerador (NEP) — {apurado}
   alunos em pesquisa" e "Denominador (NTE) — {apurado} matrículas ativas" (FR-003).
2. No painel da aba, confirme que as linhas são registros individuais com os campos do
   contrato (pessoa: Nome, Matrícula/ID, Curso, Projeto, Papel — células sem dado exibem
   "Dado indisponível").
3. Confirme o selo: "Exibindo N registros listados | Total apurado: N ✓ (Conferido)" — e que
   N coincide com o valor canônico no `indicadores.zip` (SC-002).

### R2. Contexto dinâmico (FR-002)

1. Com o drawer aberto, troque campus/ano pelos seletores globais: o drawer re-busca e passa
   a exibir somente registros do novo contexto (nunca conteúdo misto).
2. Selecione o contexto "Todos": o drawer explica e aponta para `/dados` (sem tabela de
   registros cruzando campi — D-11).

### R3. Busca, ordenação e paginação (US2 — P2)

1. Na aba NTE (~2.400 registros), digite um curso: filtragem instantânea + "Exibindo Y de N
   registros", selo de total apurado preservado.
2. Varie acento/caixa ("informatica" vs "Informática"): mesmo resultado (FR-005).
3. Ordene por Nome (asc/desc) com `aria-sort` visível para leitores de tela; pague em 25/50/100.

### R4. Exportar e conferir a conta (US3 — P3)

1. Aplique um filtro e acione "Exportar lista": o CSV baixado contém exatamente os registros
   visíveis, com os mesmos campos.
2. No rodapé, confirme a fórmula com valores substituídos + valor final publicado (a
   avaliação ilustrativa nunca substitui o valor oficial — FR-007) e a proveniência (fontes +
   data de geração).

### R5. Estados legíveis (FR-009, edge cases)

1. Componente sem fonte (ex.: OCC, PA/RM/DI/C/TC/OGM, CT/CL/CC): aba informa "sem
   detalhamento" com o total apurado mantido — nunca tabela vazia fingida.
2. Divergência simulada em teste (fixture alterada): selo exibe divergência com os dois
   números — nunca "✓ (Conferido)" falso (Princípio III).
3. 404 de fixture (contexto sem publicação): mensagem + "Tentar novamente" (nunca erro mudo).

### R6. Acessibilidade e responsividade (US4 — P4, FR-014)

1. Só teclado: abrir, trocar aba (setas), buscar, ordenar, paginar, fechar com ESC — foco
   preso no diálogo e devolvido ao disparador.
2. Leitor de tela anuncia `role="dialog"`, `aria-modal`, título, abas e `aria-sort`.
3. 360px sem overflow da página; temas claro/escuro com contraste AA; marcação de dados
   pessoais visível dentro do drawer (FR-013).

### R7. Portão fail-closed (FR-011, Princípio IV)

1. Com o portão fechado (registro de pendências inválido — simulado em teste):
   `public/auditoria/` vazio, nenhum gatilho renderizado nas páginas, motivo em pt-BR; o
   painel agregado segue intacto. Verificação automatizada obrigatória.
2. Com o portão aberto: `public/auditoria/` contém as 27 fixtures e os gatilhos aparecem.

### R8. Carregamento sob demanda (FR-009, SC-001)

1. Com a aba de rede aberta, carregue `/pilar-1/`: nenhuma requisição a `auditoria/` antes do
   primeiro acionamento; ao abrir, uma requisição por indicador; ao trocar contexto (drawer
   aberto), re-busca apenas do novo contexto.

## Validação automatizada

```bash
make test         # pytest (tests/etl) + vitest (tests/web)
make lint         # flake8 + eslint + formatação
npm run build     # check_governanca → astro build (ordem do CI)
```

Suítes novas obrigatórias (mapa com a spec):

| Suíte                                             | Cobre                                                                              |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `tests/etl/test_auditoria_flow.py`                | FR-004/FR-010 — coleta no mesmo passe, campos de pessoas (D-3), NTE por listagens  |
| `tests/etl/test_auditoria_sink.py`                | determinismo, nomenclatura, contrato do JSON, `detalhado: false`                   |
| `tests/etl/test_privacy.py` (re-escopado) + novos | D-9 — agregado sem nomes; fixtures só sob portão aberto; sem CPF; logs sanitizados |
| `tests/web/raiox.test.ts`                         | FR-005/FR-006 — filtrar/ordenar/paginar/resumo/selo (D-4)                          |
| `tests/web/raiox-integracao.test.ts`              | FR-002/FR-009 — abrir/fechar, fetch lazy, 404, troca de contexto                   |
| `tests/web/raiox-markup.test.ts`                  | FR-014 — dialog/tablist/focus/ESC no fonte; gatilho fora do `<a>`                  |

## Critério de aceite final

R1–R8 verificados + suítes verdes + lint/build verdes + **emenda do Princípio IV e revisão
de privacidade registradas** ⇒ feature pronta para PR (verificação de valores contra o
relatório oficial — Princípio III, passo 4 do workflow de qualidade).
