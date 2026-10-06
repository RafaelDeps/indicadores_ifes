# Specification Quality Checklist: Página de Downloads dos Dados e Guia de Instalação

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-10-05
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **Iteration 1 (2026-10-05)** — content, requirements and success criteria
  validated as passing. Three `[NEEDS CLARIFICATION]` markers raised, all in the
  privacy/scope cluster of the request itself.
- **Iteration 2 (2026-10-05)** — Q1 e Q2 respondidas pelo mantenedor e
  registradas como decisões D-01 e D-02 na spec:
  - **D-01** — os insumos brutos (`exports_canonical.zip`, `listagem_*.xlsx` e
    os demais arquivos que alimentam o `indicadores.zip`) **serão** disponíveis
    para download público. Isto contraria o Princípio IV, o item 2 de LGPD do
    `README.md` e as FR-026/FR-028 da spec 012, e a spec agora registra a
    decisão junto com as três pendências de governança que ela cria (emenda da
    constituição, registro da base legal, revisão de privacidade), com FR-016
    bloqueando a publicação enquanto existirem.
  - **D-02** — sem canal de acesso restrito; acesso aberto, sem credencial nem
    token.
  - Spec renumbered: FR-013→FR-013/FR-014/FR-015, and the former FR-016..FR-022
    became FR-017..FR-025. Two new requirements added (FR-015 marcação de dado
    pessoal, FR-024 origem e revisão de cada insumo).
  - One marker remains open: **FR-026** — which aggregated artifacts are
    offered beyond the official consolidated package.
- **Iteration 3 (2026-10-05)** — Q3 da iteração 2 resolvida pelo mantenedor:
  **portão automático** (opção 1). Registrado na spec:
  - **D-03** — base legal: publicação autorizada por **Paulo Sérgio dos
    Santos Júnior**, Diretor de Extensão e Pesquisa do Campus Serra (2026-10-05).
    Com isso a pendência "registro da base legal" passa de PENDENTE a
    RESOLVIDA, e FR-016 deixa de bloquear por esse motivo.
  - **D-04** — esclarecimento: os insumos contêm **dado pessoal** (coluna
    `Nome`), não **dado sensível** (art. 5º, II, da LGPD). A distinção é
    registrada para que a base legal cubra a publicação de dado pessoal, que é
    o que o Princípio IV proíbe.
  - **FR-016** reescrito: o portão bloqueia a publicação apenas enquanto a
    emenda do Princípio IV (PENDENTE) e a revisão de privacidade (PENDENTE)
    não estiverem registradas; verificado na esteira que bloqueia o deploy.
  - **FR-016a** — a emenda exige **MAJOR** na constituição (1.1.0 → 2.0.0) com
    Sync Impact Report, por redefinição do Princípio IV.
  - **FR-016b** — `README.md` e spec 012 devem ser atualizados para não
    contradizerem D-01 (ver SC-010).
  - Cenário 8 adicionado em US2 (gate satisfeito → insumos publicados).
  - Registrado em "Fora do escopo": reescrita de histórico Git para desversionar
    o que o commit "unignore raw/canonical" já versionou.
- **Iteration 4 (2026-10-05)** — **FR-026 resolvida** (D-05): a página oferece
  apenas o pacote oficial consolidado como artefato agregado. Pacotes parciais por
  campus e o intermediário de listagens ficam fora, e a alteração da regra de
  versionamento que os mantém de fora também fica fora de escopo.
  - Spec atualizada: D-05 registrado, FR-026 resolvido como requirement (sem
    marker), entidade "Artefato agregado" adicionada, SC-011
    adicionado, "Out of scope" ampliado, Assumption do pacote oficial
    reescrita.
  - **Nenhum `[NEEDS CLARIFICATION]` restante.** Todos os 16 itens do checklist
    passam. As pendências de D-01 (emenda do Princípio IV e revisão de
    privacidade) são trabalho de execução rastreado por FR-016, não
    clarificação de escopo.
- Items marked incomplete require spec updates before `/speckit.clarify` or `/speckit.plan`.
