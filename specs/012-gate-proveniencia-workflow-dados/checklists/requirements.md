# Specification Quality Checklist: Gate de Proveniência do Pacote e Automação do `make dados`

**Purpose**: Validate specification completeness and quality before proceeding to
planning
**Created**: 2026-09-30
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

### Convenção de requisito

A spec usa **`DEVE` / `NÃO DEVE`**, e não `MUST` / `MUST NOT` do template do
speckit. Foi verificado que **nenhuma** spec do repositório usa `MUST`: as specs
006, 010 e 011 redigem em português normativo. A spec 012 foi corrigida para
alinhar. A divergência era silenciosa — `MUST` é compreensível e passa despercebido
em revisão — e por isso está registrada aqui.

### Clareza

- Nenhum marcador `[NEEDS CLARIFICATION]`. As decisões que poderiam tê-lo gerado
  foram resolvidas em conversa e estão fixadas como premissa:
  - plataforma de acesso (PAT fine-grained + repositório privado, release asset),
    emitido na conta dona do repositório privado, que é outra conta — a de quem é
    membro com direitos plenos da organização que hospedará este repositório.
    A premissa de que as duas contas fossem do mesmo mantenedor não se
    confirmou e foi corrigida em 2026-10-01;
  - direção da cobertura exigida (origem → pacote, medindo **perda**);
  - nulos de escopo agregado como estado legítimo e permanente;
  - modo tolerante permanece opt-in e fora de execução agendada;
  - carimbo de proveniência **fora** de escopo por mudar o contrato do dado;
  - valor da revisão fixa do export canônico é insumo de implementação.
- **"Implementation details"** foi avaliado com distinção entre *nomear a
  ferramenta* e *especificar a técnica*. A spec nomeia "repositório privado",
  "token de escopo restrito" e "versão publicada" porque são **entidades do
  domínio** deste domínio de conformidade — descrevê-los abstratamente
  ("armazenamento seguro") tornaria os requisitos não-verificáveis. Não aparece:
  linguagem de programação, estrutura de código, nome de arquivo de código, nome
  de biblioteca, formato de payload.
  - Exceção consciente e nomeada: o requisito de **revisão fixa** do export
    canônico (FR-017) é o único ponto que toca em identificador técnico, e
    permanece porque sem ele o requisito de reprodutibilidade não é testável.
    O valor concreto é premissa, não requisito.

### Riscos assumidos explicitamente

Não são lacunas da spec; são decisões que a spec **declara** em vez de esconder:

- **residência e transferência internacional** — decisão institucional
  **pendente**, registrada como risco **declarado e não aceito**. A spec declara
  que os controles reduzem exposição mas não eliminam o risco. FR-027 cobre a auditabilidade; o
  registro concreto está em
  [medidas-de-protecao.md](../medidas-de-protecao.md) §4.1, com os três pontos a
  verificar.
- **retenção das planilhas de semestres encerrados** — decisão institucional,
  fora de escopo. Cópias duplicadas em disco entram como tarefa de higiene.

### Requisitos verificados por inspeção, e não por teste de comportamento

FR-005 (ponto único de decisão) e FR-020 (gate sem passo novo no CI) não são
testáveis por suíte automatizada: `check_dados` e `cadeia_dados` são scripts de
linha de comando, não componentes com interface. São verificáveis por inspeção do
repositório. Registrado porque a ausência deste registro faria a checklist
parecer mais completa do que é.

### Afirmação que foi verificada contra o repositório

A spec afirma, no contexto de por que "exigir derivado não nulo" está errado, que
o pacote real tem arquivos com derivado nulo **legitimamente**. Isso foi
**contado** nos pacotes: 3 dos 6 arquivos `pilar1` de `data/dist/indicadores.zip`
(`todos` × 3 anos) têm NTE e NTECPP nulos, contra 3 com valor (`serra` × 3 anos).
O mesmo dado está em research D1 e nas premissas da spec.

O baseline do defeito — pacote com os 12 derivados nulados passando com exit 0 —
está **executado e registrado** em [quickstart.md](../quickstart.md) §1, com a
saída literal. Não é afirmação.

### Ordem de entrega

Escopo do portão (P1, P2) versus automação (P3) está explícito na seção de
contexto e na justificativa de prioridade de P3. A ordem é requisito implícito de
entrega, e o [plan.md](../plan.md) a torna explícita em "Ordem de entrega".