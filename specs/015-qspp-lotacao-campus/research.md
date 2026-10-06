# Research: Restrição do QSPP aos Servidores com Lotação no Próprio Campus

**Branch**: `fix/first-pilar` | **Date**: 2026-10-03 | **Spec**: [spec.md](./spec.md)

## 1. Classificação Estrita de Servidor para QSPP

**Decisão**: Exigir estritamente `pessoa is not None and pessoa.classification == "researcher"`. A verificação textual de papéis (`"researcher" in papeis_str` ou `"coord" in papeis_str`) não pode promover membros com classificação `outside_ifes` (colaboradores externos), `student` (discentes) ou registros sem classificação verificada para a métrica de servidores.

**Rationale**:
Na inspeção dos dados canônicos (`researchers_canonical.json`), o sistema de origem classifica pessoas em quatro categorias: `researcher`, `student`, `outside_ifes` e `null`.
Atualmente, [`etl/core/logic/calculators/papeis.py`](file:///home/rafael/indicadores_ifes/etl/core/logic/calculators/papeis.py) e [`etl/core/logic/calculators/pillar1.py`](file:///home/rafael/indicadores_ifes/etl/core/logic/calculators/pillar1.py) continham a expressão permissiva:

```python
eh_pesquisador = (
    (pessoa and pessoa.classification == "researcher")
    or "coord" in papeis_str
    or "pesquisador" in papeis_str
    or "researcher" in papeis_str
)
```

Como pesquisadores externos (`outside_ifes`) quase sempre portam o papel de projeto `"Researcher"` ou `"Coordinator"`, e alunos bolsistas frequentemente portam `"Student Researcher"` ou `"Pesquisador Discente"`, o operador `or` capturava ~111 colaboradores externos e ~37 estudantes no Campus Serra em 2026, inflando o indicador de 68 para mais de 340.

**Alternativas consideradas**:

- _Manter verificação de string apenas quando `pessoa.classification is None`_: Rejeitada, pois participantes sem cadastro institucional verificado não devem ser contabilizados como servidores do quadro próprio (Princípio III - Fidelidade).
- _Filtrar apenas `outside_ifes` explicitamente_: Rejeitada, pois abre brecha para discentes e perfis nulos contaminarem a métrica de servidores.

---

## 2. Atribuição de Campus no QSPP Individual (Dupla Vinculação)

**Decisão**: No agregador de indicadores ([`etl/core/logic/calculators/aggregator.py`](file:///home/rafael/indicadores_ifes/etl/core/logic/calculators/aggregator.py)), para adicionar um servidor ao conjunto único de um campus específico (`staff_unicos[slug_campus][ano]`), o projeto de pesquisa deve ser atribuído ao campus avaliado **E** o campus de lotação institucional registrado na pessoa (`pessoa.campus`) deve ser resolvido e coincidir com o slug do campus avaliado (`normalizar_slug(pessoa.campus.name) == slug_campus`).

**Rationale**:
Conforme esclarecido formalmente na sessão de clarificação, o QSPP mede a mobilização do corpo docente e técnico-administrativo pertencente àquele campus específico em projetos da unidade.
Se um pesquisador lotado em Vitória ou Vila Velha colabora em um projeto da Serra, ele não deve pontuar no QSPP de Serra (não pertence ao quadro do campus) nem no QSPP de Vitória (o projeto não é de Vitória). Ele pontua exclusivamente no consolidado institucional (`todos`).

**Alternativas consideradas**:

- _Atribuir servidores ao campus do projeto sediador independentemente da lotação_: Rejeitada, pois gerava a sobrecontagem de mais de 200 pessoas externas/outros campi.
- _Permitir que servidores sem campus declarado entrem no campus do projeto_: Rejeitada, pois pessoas sem lotação formal no sistema contaminariam a contagem local.

---

## 3. Comportamento no Escopo Global (`todos`)

**Decisão**: No escopo institucional global `"todos"`, todo membro com `classification == "researcher"` participante ativo de pelo menos um projeto ativo é contabilizado exatamente uma vez, independentemente de ter campus individual atribuído ou não. Se o pesquisador não possuir campus (`pessoa.campus is None`), ele pontua em `"todos"` e gera um aviso de auditoria (`AVISO: pesquisador {id} sem campus de lotação`).

**Rationale**:
Garante que o total institucional do IFES reflita todos os servidores do instituto envolvidos em pesquisa em nível sistêmico, sem duplicidades e sem perdas provocadas por cadastros incompletos de lotação.

---

## 4. Preservação do Indicador de Discentes (NEP)

**Decisão**: A identificação de discentes para o NEP continua utilizando `eh_estudante_em_pesquisa()`, que analisa `pessoa.classification == "student"` e papéis discentes. Ao desqualificar estudantes do QSPP, estudantes bolsistas com rótulo "Student Researcher" deixam de ser subtraídos do NEP e passam a pontuar corretamente no contingente estudantil.

**Rationale**:
Garante que a métrica discente permaneça consistente e que o cruzamento de cotistas (NTECPP) e as razões calculadas (PIES e PICOT) mantenham conformidade total.
