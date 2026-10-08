# Phase 0 Research: Refinamento do Pilar 2 e Consolidação Exclusiva do Campus Serra

**Feature**: `018-serra-pillar2-refinement`  
**Date**: 2026-10-08

## Objetivo

Resolver todas as questões técnicas e metodológicas identificadas durante a auditoria dos dados do ETL e consolidação da interface web do Campus Serra.

---

## Pesquisa e Decisões Técnicas

### Decisão 1: Projeção de Vigência Plurianual no SIGPESQ (PIPDI)

- **Contexto**: Em 32 projetos do SIGPESQ (como o `PJ 8504` do NOVA-IA e o `PJ 9536` de detecção de deepfakes), o campo `datas.fim` é `null` (extração ausente no PDF), mas o campo `datas.duracao_meses` possui valores de 12 a 60 meses. O código anterior truncava com `ano_fim = ano_inicio`, provocando descontinuidade no indicador PIPDI (acordos vigentes) nos anos posteriores.
- **Decisão**: Quando `datas.fim` for nulo ou vazio e `datas.duracao_meses` for um inteiro positivo:
  1. Extrair `ano_inicio` e `mes_inicio` (padrão 1 caso o mês não esteja explícito na string `YYYY-MM-DD` ou `YYYY-MM`).
  2. Projetar o ano de encerramento da vigência:
     $$\text{ano\_fim} = \text{ano\_inicio} + \lfloor \frac{\text{mes\_inicio} - 1 + \text{duracao\_meses} - 1}{12} \rfloor$$
     _Exemplo 1_: Início `2025-01-01`, duração 36 meses $\rightarrow$ ano_fim = $2025 + \lfloor (0 + 35) / 12 \rfloor = 2025 + 2 = 2027$.
     _Exemplo 2_: Início `2026-08-01`, duração 36 meses $\rightarrow$ ano_fim = $2026 + \lfloor (7 + 35) / 12 \rfloor = 2026 + 3 = 2029$.
     _Exemplo 3_: Início `2025-01-01`, duração 60 meses $\rightarrow$ ano_fim = $2025 + \lfloor (0 + 59) / 12 \rfloor = 2025 + 4 = 2029$.
  3. Se nem `datas.fim` nem `duracao_meses` estiverem presentes, manter o fallback seguro `ano_fim = ano_inicio`.
- **Rationale**: Reflete o período de execução pactuado na proposta de pesquisa, permitindo que o projeto pontue no PIPDI em todos os anos de vigência.
- **Alternativas Rejeitadas**:
  - Truncar sempre em 1 ano: Rejeitado por subnotificar acordos vigentes no PIPDI.
  - Usar data estimada arbitrária (ex. 5 anos para todos): Rejeitado por violar o Princípio III.

---

### Decisão 2: Desativação do Escopo "Todos" e Ancoragem Exclusiva no Campus Serra

- **Contexto**: O projeto é dedicado atualmente à apresentação pública dos dados do Campus Serra. A opção "(Todos)" agregava dados incompletos de outros campi e gerava confusão para os usuários locais.
- **Decisão**:
  1. No seletor de campus do layout (`filtro-campus-topo` e `filtro-campus-drawer`), manter a opção `(Todos)` com atributo `disabled` e sufixo indicativo `(Desativado)`.
  2. Definir o Campus Serra (`slug: 'serra'`) como valor padrão incondicional de inicialização do contexto do layout e na função de sincronização do cliente (`sincronizarTela`).
  3. Manter a resolução de rotas pronta para aceitar `?campus=serra`, normalizando acessos diretos legados ou sem parâmetro.
- **Rationale**: Oferece uma experiência limpa, consistente e sem risco de vazamento territorial para os usuários, sem quebrar os seletores semânticos.
- **Alternativas Rejeitadas**:
  - Remover totalmente o `<select>` do cabeçalho: Rejeitado para preservar a estrutura semântica e os testes de acessibilidade e layout já consolidados no frontend.

---

### Decisão 3: Fomento de 2025 — Consolidação dos Projetos PJ 8503 e PJ 8504

- **Contexto**: O TAFPPI de 2025 do Campus Serra atinge R$ 25.954.326,84. Desse total, R$ 25.000.000,00 provêm de `PJ 8503` (R$ 10M, FINEP PRÓ-INFRA 2024 / Edital PRPPG 02/2025) e `PJ 8504` (R$ 15M, FINEP Centros Temáticos 2024 / Edital PRPPG 01/2025).
- **Decisão**: Manter a soma de ambas as propostas institucionais ativas formalmente cadastradas no SIGPESQ sob a liderança da Profa. Karin Komati no laboratório LaTeC (Campus Serra).
- **Rationale**: O alinhamento com a gestão estabeleceu que ambas as captações devem ser registradas no exercício de início de execução (2025), refletindo o volume histórico de recursos federais alocados ao campus.

---

### Decisão 4: PINV e Preservação do OCC Nulo (Princípio III)

- **Contexto**: O indicador PINV depende da relação TAFPPI / OCC. A variável OCC (Orçamento de Capital e Custeio) não existe nos relatórios fornecidos.
- **Decisão**:
  1. Manter a leitura dos percentuais oficiais do arquivo `data/pinv_serra.json` (496,78% em 2024; 1.111,35% em 2025; 610,63% em 2026).
  2. Manter estritamente `OCC_valor_orcamento_total_capital_custeio: null` nos JSONs de saída.
- **Rationale**: Atende rigorosamente ao Princípio III da Constituição do projeto: nunca estimar ou inventar dados não fornecidos pelas fontes primárias.

---

### Decisão 5: NTPP Multicampi e Integridade do Pilar 3

- **Contexto**: Projetos multicampi (como o IntegraCAR) possuem coordenação geral em Vitória e equipe técnica de Serra. O Pilar 3 possui softwares registrados em PC, mas sem patentes catalogadas no schema canônico.
- **Decisão**:
  1. Manter a regra de NTPP por liderança: projetos são atribuídos ao campus do coordenador/sede. Projetos sediados em outros campi não inflam o NTPP de Serra.
  2. Manter o QSPP de Serra estritamente para pesquisadores lotados no campus.
  3. Manter o Pilar 3 com contagem real de programas de computador em `PC`, `PA = 0`, `DI = 0` e `PIPROTR = null`.

---

### Decisão 6: Geração Hermética em Background de "Todos" no ZIP

- **Contexto**: O pipeline do ETL gera `data/dist/indicadores.zip` contendo os artefatos JSON de cada campus e do escopo `todos`.
- **Decisão**: O pipeline do ETL continua gerando os arquivos de `todos` em background para satisfazer os contratos globais do `make check-dados` e testes de regressão, enquanto a interface web consome exclusivamente os arquivos do Campus Serra.
