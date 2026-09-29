# Pesquisa e Decisões Arquiteturais: Pipeline ETL Python (Hexagonal / Ports & Adapters)

**Feature Branch**: `008-python-hexagonal-etl`  
**Date**: 2026-09-25  
**Spec Reference**: [spec.md](./spec.md)

## Resumo das Investigações Técnicas

Este documento consolida a pesquisa e as decisões arquiteturais tomadas para implementar o pipeline ETL Python em `indicadores_ifes`, espelhando a arquitetura Ports & Adapters (Hexagonal) de `horizon_etl/src/`.

---

### Decisão 1: Modelo de Dependências de Runtime — Zero Dependências Externas

- **Decisão**: O runtime do pipeline ETL (`etl/`) utilize exclusivamente a biblioteca padrão do Python (`zipfile`, `json`, `dataclasses`, `pathlib`, `argparse`, `abc`, `typing`).
- **Justificativa**:
  - O dataset processado a partir de `exports_canonical.zip` compreende milhares de registros, cabendo com folga em memória.
  - A agregação e a serialização completas são executadas em menos de 2 segundos usando apenas dataclasses do Python e dicionários padrão.
  - O uso de zero dependências de terceiros elimina riscos de empacotamento, requisitos de virtualenv para execução, incompatibilidades de wheels binários (como o PEP 668 em sistemas Linux) e garante alta portabilidade.
- **Alternativas Consideradas**:
  - _Pandas / Polars_: Avaliados para transformações tabulares, mas rejeitados porque introduzem árvores massivas de dependências (wheels de ~50-100MB), desaceleram a inicialização, complicam a instalação em ambientes diversos e não oferecem benefício para dados JSON hierárquicos em forma de árvore (iniciativas com equipes aninhadas).
  - _Pydantic_: Avaliado para validação de schema, mas rejeitado em runtime, pois `@dataclass` + anotações de tipo padrão fornecem as garantias de tipagem necessárias sem dependências de terceiros.

---

### Decisão 2: Geração Determinística de ZIP & Compatibilidade

- **Decisão**: Utilizar o `zipfile.ZipFile` padrão do Python com compressão `zipfile.ZIP_DEFLATED`, timestamps fixos de `ZipInfo` (`1980-01-01 00:00:00`), permissões POSIX (`0o644`) e caminhos de entrada ordenados. Persistir via escrita atômica (`.tmp-*` renomeado para o destino).
- **Justificativa**:
  - O frontend Astro extrai os arquivos usando `src/lib/zip.ts`, que suporta nativamente os métodos de compressão STORE (0) e DEFLATE (8) via `zlib.inflateRawSync` do Node.
  - Ferramentas ZIP normais gravam o timestamp atual, o que causa checksums não determinísticos e diffs ruidosos entre execuções. O timestamp DOS constante (1980-01-01) garante uma saída reproduzível.
  - A renomeação atômica (`os.replace`) garante que, mesmo que o processo seja encerrado no meio da geração, o `indicadores.zip` existente nunca seja corrompido.
- **Alternativas Consideradas**:
  - _Construção de Buffer cru (como no `zipwriter.ts` do TypeScript)_: Desnecessária em Python, pois `zipfile.ZipInfo` expõe controle exato sobre os metadados do cabeçalho, o nível de compressão e os timestamps.
  - _Utilitário `zip` do sistema externo_: Rejeitado devido a discrepâncias entre plataformas Linux, macOS e ambientes de container.

---

### Decisão 3: Formatação JSON e Serialização com Fidelidade

- **Decisão**: O serializador formata os arquivos JSON com `indent=2`, `sort_keys=True` e `ensure_ascii=False` usando `json.dumps`. Adesão estrita à fidelidade do Princípio III (`null` vs `0`).
- **Justificativa**:
  - Preserva a ordem exata das chaves em todos os arquivos `pilar{N}_{campus}_{year}.json` (quantidade variável, derivada do export) para hashing determinístico e diffs legíveis.
  - Preserva caracteres portugueses (ex.: `Vitória`, `Engajamento Acadêmico`) sem escapes ASCII (`\u...`).
  - Imposição estrita de nulos: métricas ausentes na fonte canônica (ex.: `NTE_total_estudantes_matriculados`, `TAFPPI_valor_total_aporte_pesquisa`) devem gerar `null`, enquanto contagens verdadeiras com zero instâncias verificadas (ex.: patentes `PA`) devem gerar `0`.
- **Alternativas Consideradas**:
  - _JSON compacto de linha única_: Rejeitado porque o JSON indentado melhora a depuração e a revisão via git, além de corresponder ao contrato atualmente verificado pelos testes de dataset do Vitest.

---

### Decisão 4: Arquitetura Hexagonal / Ports & Adapters Espelhando `horizon_etl/src/`

- **Decisão**: Estruturar `etl/` em quatro camadas distintas:
  1. `core/ports/`: Interfaces `ISource(ABC)` e `ISink(ABC)`.
  2. `core/logic/`: Lógica de domínio pura (`models.py`, `resolvers/`, `temporal/`, `calculators/`) com zero I/O e zero dependências externas.
  3. `adapters/`: Implementações de I/O (`sources/zip_canonical_source.py`, `sinks/json_pilar_sink.py`, `sinks/zip_indicadores_sink.py`).
  4. `flows/`: Orquestração do pipeline (`indicadores_flow.py`).
  5. `main.py`: Entry point da CLI com `argparse`.
- **Justificativa**:
  - Desacopla as fórmulas de cálculo do formato da fonte (pode ler de diretório, ZIP ou banco de dados).
  - Permite 100% de testes unitários puros dos calculators de domínio sem fixtures do sistema de arquivos.
  - Corresponde diretamente ao modelo mental e à arquitetura estabelecidos em `horizon_etl/src/`.
- **Alternativas Consideradas**:
  - _Script monolítico_: Rejeitado devido à baixa testabilidade, ao forte acoplamento e à violação das especificações arquiteturais.

---

### Decisão 5: Ferramentas de Desenvolvimento Python & Gerenciamento de Ambiente

- **Decisão**:
  - Ferramentas de desenvolvimento (`pytest`, `pytest-cov`, `black`, `isort`, `flake8`) gerenciadas em `requirements-etl.txt`.
  - O `Makefile` detecta inteligentemente ambientes virtuais: `PYTHON_BIN ?= $(shell if [ -f .venv/bin/python ]; then echo .venv/bin/python; else echo python3; fi)`.
  - Fornecer `make setup-etl` ou `make setup` para opcionalmente criar o `.venv` e instalar o `requirements-etl.txt`.
- **Justificativa**:
  - Máquinas de desenvolvimento podem ter ambientes gerenciados (Ubuntu PEP 668) nos quais o `pip install` global falha. Suportar `.venv` de forma integrada, com fallback para `python3`, garante tanto o desenvolvimento isolado quanto a compatibilidade com containers/CI.
  - Corresponde à convenção do `horizon_etl/Makefile` (`PYTHON_BIN ?= .venv/bin/python`).
- **Alternativas Consideradas**:
  - _Poetry / UV / Pipenv_: Avaliados, mas um `requirements-etl.txt` padrão mantém o projeto mais simples e alinhado ao princípio de simplicidade da constituição do projeto.

---

### Decisão 6: Estratégia de Migração e Eliminação do Legado

- **Decisão**: Excluir o código ETL legado em TypeScript em `src/etl/` e os testes TypeScript em `tests/etl/*.test.ts`. Substituir `tests/etl/` por arquivos de teste Python (`test_*.py`). Atualizar o comando `"etl"` do `package.json` para `"python3 -m etl.main"`.
- **Justificativa**:
  - Confirmado via pergunta de esclarecimento Q2 do usuário.
  - Mantém `src/` 100% limpo e dedicado ao frontend Astro.
  - Mantém `npm test` (Vitest) executando somente testes de frontend (`tests/*.test.ts`), enquanto o `pytest` executa `tests/etl/`.
- **Alternativas Consideradas**:
  - _Manter implementações duplas_: Rejeitado devido ao custo de manutenção, ao risco de divergência e à confusão.
