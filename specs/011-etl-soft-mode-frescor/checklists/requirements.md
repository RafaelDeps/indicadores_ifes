# Specification Quality Checklist: Modo Soft, Verificação de Frescor e Target Único do ETL

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-09-29
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs) in spec.md
      (detalhes de implementação ficam em research/plan, como no padrão do repo)
- [x] Focused on user value and business needs (fluxos de operador: rodar sem
      entradas, com 1 comando, confiar no pacote)
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain (semântica decidida com o
      usuário: Opção A — soft opt-in + check-dados + target único)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable (sha256, exit codes, AVISO/ERRO)
- [x] Success criteria are technology-agnostic (referem comportamento, não
      APIs específicas)
- [x] All acceptance scenarios are defined (US1: 6; US2: 4; US3: 6)
- [x] Edge cases are identified (soft sem saída; clone/CI mtime; zip stale;
      soft com entradas presentes; relatório não regenerado; **cadeia sem
      entrada para o merge**)
- [x] Scope is clearly bounded (sem novos dados, sem nova dependência, sem
      mudança de contrato de saída, CI sem ETL)
- [x] Dependencies and assumptions identified (continuação da 010; mtime como
      heurística; pacote commitado como fonte no deploy)

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows (resiliência a entradas ausentes,
      orquestração, verificação de confiabilidade)
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification (FR-008 refere-se a
      `mtime` — metadado de arquivo observável, não API)

## Notes

- **Semântica "fallback" aprovada (2026-09-29)**: o reuso do último
  `indicadores.zip` é implementado por **não-toque** (preservação do snapshot
  coerente), e **não** por sobreposição de valores antigos — a opção "C"
  (reusar literalmente valores) foi recusada por misturar execuções sem
  marcador de procedência (Princípio III).
- **Restrição central**: o zip público contém apenas agregados (Princípio IV);
  sem `exports_canonical.zip` o cruzamento NTECPP **não** é recomputável — o
  soft nunca fabrica esse dado.
- **Fail-fast preservado**: o contrato 006 ("ausente ou corrompido → erro
  fatal") permanece o default; o soft é opt-in (`--soft` / `SOFT=1`).
- **Frescor honesta**: `mtime` é heurística limitada (Git não preserva mtimes);
  em clone/CI o `check-dados` valida apenas o contrato (sem falso alarme).
- **Pacote é saída de cadeia** (2026-09-29): a coerência do soft mode é
  invariante de **cadeia**, não de etapa. Sem entrada para o merge, a cadeia
  inteira não roda — preservando o invariante de não-toque que o soft promete
  (FR-013; `etl-cli.md` §4.1/§5.6).

**Resultado**: pronto para `/speckit-plan` → `/speckit.tasks`.
