# Feature Specification: Restrição do QSPP aos Servidores com Lotação no Próprio Campus

**Feature Branch**: `fix/first-pilar`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "Corrigir a sobrecontagem no indicador QSPP (Quantitativo de Servidores Desenvolvendo Projetos) do Pilar 1 para que o indicador reflita estritamente os servidores com lotação no próprio campus avaliado. Requisitos específicos: 1. No cálculo do QSPP de um campus específico (ex.: Campus Serra), contabilizar única e exclusivamente participantes que sejam servidores do IFES (classification == 'researcher') e cuja lotação institucional individual (pessoa.campus) coincida com o próprio campus avaliado. 2. Servidores do IFES lotados em outros campi que colaborem em projetos sediados no campus NÃO devem pontuar no QSPP do campus avaliado. 3. Excluir estritamente do QSPP participantes com classificação de colaborador externo (outside_ifes) e participantes classificados como discentes (student), independentemente de papéis cadastrados na equipe do projeto (como 'Researcher', 'Coordinator' ou 'Student Researcher'). 4. No escopo global 'Todos os Campi', contabilizar todos os servidores únicos do IFES (classification == 'researcher') ativos em pesquisa, mantendo a deduplicação institucional. 5. Garantir a integridade dos testes automatizados e dos pacotes de indicadores gerados."

## Clarifications

### Session 2026-10-03

- Q: Se um servidor lotado no Campus Serra atuar em um projeto sediado em outro campus, como ele deve ser contabilizado no QSPP dos campi locais? → A: O servidor só pontua no QSPP do campus avaliado se o projeto for sediado no campus E o servidor for lotado no mesmo campus. Se atuar apenas em projetos de outros campi, pontua unicamente no escopo global "todos".

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Visualização dos Servidores Próprios do Campus no QSPP (Priority: P1)

Como gestor do IFES ou cidadão consultando os indicadores do Campus Serra, desejo visualizar no indicador QSPP apenas os servidores únicos com lotação no Campus Serra que atuam em pesquisa, de modo que pesquisadores de outros campi atuando em colaboração não inflem a métrica local do campus.

**Why this priority**: É a correção central da anomalia identificada no painel, garantindo que o QSPP expresse com fidedignidade a mobilização do corpo funcional próprio da unidade de ensino.

**Independent Test**: Consultar a métrica QSPP do Campus Serra para os anos de 2024, 2025 e 2026 e constatar que apenas servidores com lotação registrada no Campus Serra são contabilizados, retornando a contagem real de servidores locais (faixa de 66 a 68 servidores) em vez do valor anterior de ~350.

**Acceptance Scenarios**:

1. **Given** um projeto de pesquisa ativo atribuído ao Campus Serra, **When** um pesquisador da equipe possuir classificação de servidor do IFES (`classification == 'researcher'`) e sua lotação individual for o Campus Serra, **Then** ele é contabilizado no conjunto único do QSPP do Campus Serra.
2. **Given** um projeto de pesquisa ativo atribuído ao Campus Serra, **When** um pesquisador da equipe for servidor do IFES lotado em outro campus (ex.: Vitória, Colatina) atuando como colaborador no projeto, **Then** ele NÃO é contabilizado no QSPP do Campus Serra.

---

### User Story 2 - Exclusão de Colaboradores Externos e Discentes do QSPP (Priority: P2)

Como auditor de dados acadêmicos e integridade dos pilares CONIF, desejo que pessoas externas ao IFES (`outside_ifes`) e discentes (`student`) jamais sejam contabilizadas no indicador de servidores (QSPP), mesmo que possuam nomenclaturas de papel no projeto como "Researcher", "Coordinator" ou "Student Researcher".

**Why this priority**: Evita que rótulos de equipe no sistema de submissão de projetos promovam indevidamente pessoas sem vínculo funcional público para o censo de servidores do IFES.

**Independent Test**: Processar projetos de pesquisa contendo integrantes com classificação `outside_ifes` ou `student` e verificar que nenhum deles é inserido no cômputo de servidores do QSPP em nenhum campus ou escopo.

**Acceptance Scenarios**:

1. **Given** um participante ativo em projeto registrado com classificação institucional `outside_ifes`, **When** seu papel na equipe contiver `"Researcher"` ou `"Coordinator"`, **Then** ele NÃO é contabilizado no QSPP de nenhum campus nem no escopo global `"todos"`.
2. **Given** um participante ativo registrado com classificação institucional `student`, **When** seu papel contiver `"Student Researcher"` ou `"Pesquisador Discente"`, **Then** ele NÃO é contabilizado no QSPP, sendo avaliado estritamente para o indicador discente (NEP).

---

### User Story 3 - Consolidação Sistêmica no Escopo Global "Todos os Campi" (Priority: P3)

Como gestor sistêmico da Pró-Reitoria de Pesquisa e Pós-Graduação (PRPPG), desejo consultar o indicador QSPP no escopo institucional global ("Todos os Campi") e obter o total de servidores únicos do IFES envolvidos em pesquisa em todo o instituto, sem sobreposição nem perda de servidores válidos.

**Why this priority**: Assegura que a soma ou agregação institucional reflita o conjunto de todos os servidores do IFES em pesquisa, mantendo a deduplicação de indivíduos que atuam em múltiplos campi ou projetos.

**Independent Test**: Consultar o escopo global `"todos"` e verificar que todo servidor único do IFES (`classification == 'researcher'`) participante de ao menos um projeto ativo é contabilizado exatamente uma vez.

**Acceptance Scenarios**:

1. **Given** um servidor do IFES participante de projetos de pesquisa em dois campi distintos, **When** os indicadores forem agregados no escopo `"todos"`, **Then** o servidor é contabilizado exatamente uma única vez no QSPP institucional.
2. **Given** um servidor do IFES (`classification == 'researcher'`) cujo registro individual não possua campus atribuído (`campus is None`), **When** os indicadores forem gerados, **Then** ele pontua no escopo global `"todos"` e emite aviso informativo de auditoria.

---

### Edge Cases

- **Servidor atuando em múltiplos projetos no mesmo campus**: Contabilizado exatamente uma única vez no QSPP daquele campus por meio de deduplicação estrita de `person_id`.
- **Servidor com múltiplos papéis (ex.: Coordenador e Pesquisador)**: Contabilizado uma única vez, sem duplicidade funcional.
- **Servidor lotado no campus atuando apenas em projetos de outros campi**: Pontua no escopo global `"todos"`, mas NÃO pontua no QSPP do seu campus de lotação nem no campus sediador do projeto.
- **Participante sem cadastro individual na base de pessoas**: Caso um identificador de membro de equipe não exista na base de pessoas (`registro_pessoas`), ele é sumariamente desconsiderado do QSPP e registrado em aviso de auditoria.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O sistema DEVE restringir a inclusão no QSPP de um campus individual exclusivamente a membros que possuam classificação institucional de pesquisador (`classification == 'researcher'`), que participem de projeto de pesquisa ativo atribuído àquele campus E cujo campus individual de lotação coincida com o próprio campus avaliado (`pessoa.campus == campus_avaliado`).
- **FR-002**: O sistema DEVE impedir a contabilização de participantes com classificação `outside_ifes` no indicador QSPP de qualquer campus ou no escopo global `"todos"`, desconsiderando papéis textuais de projeto como `"Researcher"` ou `"Coordinator"`.
- **FR-003**: O sistema DEVE impedir a contabilização de discentes (`classification == 'student'`) no QSPP, mesmo quando os papéis cadastrados na equipe contiverem variações de `"researcher"` ou `"pesquisador"`.
- **FR-004**: No escopo institucional global `"todos"`, o sistema DEVE contabilizar todo servidor único ativo no IFES (`classification == 'researcher'`), independentemente de seu campus individual de lotação.
- **FR-005**: Participantes com classificação `classification == 'researcher'` sem lotação de campus definida no registro individual (`pessoa.campus is None`) NÃO DEVEM pontuar no QSPP de nenhum campus individual, sendo computados unicamente no escopo global `"todos"` com emissão de aviso de auditoria.
- **FR-006**: Os pacotes de indicadores gerados (`data/dist/indicadores.zip`) DEVEM refletir os quantitativos corrigidos de QSPP para todos os campi e anos de referência de forma estritamente determinística.
- **FR-007**: A suíte de testes automatizados do pipeline ETL e do Frontend DEVE ser mantida íntegra e verde (`make test`).

### Key Entities

- **Pessoa**: Registro institucional individual de servidores, discentes e colaboradores, contendo identificador único (`id`), nome (`name`), classificação institucional (`classification`) e campus institucional de lotação (`campus`).
- **Iniciativa (Projeto de Pesquisa)**: Projeto acadêmico aprovado no IFES com vigência temporal, tipo de iniciativa, campus sediador e relação de membros de equipe.
- **Membro de Equipe**: Vinculação de uma pessoa a uma iniciativa específica com vigência e papéis declarados.
- **QSPP (Quantitativo de Servidores Desenvolvendo Projetos)**: Métrica oficial do Pilar 1 CONIF que quantifica os servidores únicos pertencentes ao campus participantes de projetos de pesquisa ativos no ano.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Para o Campus Serra, o quantitativo exibido no QSPP é reduzido de ~341-372 para a faixa de 66 a 68 servidores em cada ano de referência, eliminando os colaboradores de outros campi e externos que inflavam a contagem.
- **SC-002**: Zero participantes com classificação `outside_ifes` ou `student` presentes no QSPP de qualquer campus ou no escopo global `"todos"`.
- **SC-003**: 100% dos testes automatizados (`make test`) executando com sucesso com zero regressões.
- **SC-004**: Zero dados pessoais ou identificáveis (PII) expostos ou persistidos no pacote público de indicadores, em total conformidade com o Princípio IV da Constituição.

## Assumptions

- A propriedade `classification` no cadastro de pessoas canônico (`researchers_canonical.json`) reflete o vínculo funcional oficial do indivíduo com o IFES.
- A propriedade `campus` associada diretamente à pessoa no cadastro canônico representa sua lotação institucional de referência.
- A metodologia do modelo CONIF para mobilização do corpo docente e técnico-administrativo de um campus foca nos servidores do quadro próprio daquela unidade.
