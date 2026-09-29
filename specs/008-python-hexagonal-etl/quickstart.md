# Guia de Início Rápido e Validação: Pipeline ETL Python (Hexagonal / Ports & Adapters)

**Feature Branch**: `008-python-hexagonal-etl`  
**Date**: 2026-09-25  
**Spec Reference**: [spec.md](./spec.md) | **Plan Reference**: [plan.md](./plan.md)

Este guia documenta cenários de validação executáveis que demonstram o pipeline ETL Python operando de ponta a ponta, validando a fidelidade dos dados conforme as regras CONIF e a compatibilidade com os contratos do dashboard web Astro.

> **Nota de vigência**: layout histórico (arquivos na raiz do repositório). A
> partir da spec 009 as entradas/saídas vivem em `data/canonical/` e
> `data/dist/` (ex.: `make etl` → `data/dist/indicadores.zip`). Os exemplos
> abaixo usam os caminhos raiz originais desta spec; para o layout atual ver
> [009/quickstart.md](../009-reorganize-horizon-architecture/quickstart.md).

---

## 1. Pré-requisitos

- **Python**: versão >= 3.11 (testado no Python 3.14).
- **Node.js**: versão >= 20.x (para o dashboard Astro e o Vitest).
- **Dados de Origem**: `exports_canonical.zip` localizado na raiz do repositório.

---

## 2. Configuração do Ambiente

Instalar as ferramentas de desenvolvimento Python (testes, formatação, lint):

```bash
# Criar o virtualenv local (recomendado) e instalar os requisitos
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-etl.txt
```

Verificar se os binários de desenvolvimento estão operacionais:

```bash
python3 -m pytest --version
python3 -m flake8 --version
python3 -m black --version
```

---

## 3. Cenários de Validação

### Cenário 1: Execução Completa do Pipeline (Pacote Global)

Gera o dataset completo para todos os campi do export canônico mais o `todos` consolidado nos anos 2024, 2025 e 2026. O número de arquivos no pacote é **variável**, derivado do export (nº de campi + `todos`, × 3 pilares × 3 anos).

```bash
# Executar usando o alvo do Make
make etl

# Ou executar diretamente via CLI Python
python3 -m etl.main --entrada exports_canonical.zip --saida indicadores.zip
```

**Resultado Esperado**:

- O processo termina com código de saída `0`.
- O arquivo de saída `indicadores.zip` é criado ou substituído na raiz do repositório.
- O comando de verificação passa (valida o padrão de nomes e reporta a
  quantidade, que depende do export):
  ```bash
  python3 -c "import zipfile, re; names=zipfile.ZipFile('indicadores.zip').namelist(); assert all(re.fullmatch(r'pilar[123]_[a-z0-9]+_\d{4}\.json', n) for n in names); print(f'Sucesso: {len(names)} arquivos pilar validados (quantidade varia com o export).')"
  ```

---

### Cenário 2: Execução Filtrada por Campus Único

Executa o pipeline direcionado exclusivamente a um único campus, sem modificar `indicadores.zip`.

```bash
# Executar para o campus Serra
make etl-campus CAMPUS=Serra

# Ou executar diretamente via CLI Python
python3 -m etl.main --campus Serra --saida indicadores_serra.zip
```

**Resultado Esperado**:

- O processo termina com código de saída `0`.
- O arquivo `indicadores_serra.zip` contém exatamente 9 arquivos (3 pilares × 3 anos):
  ```bash
  python3 -c "import zipfile; z = zipfile.ZipFile('indicadores_serra.zip'); assert len(z.namelist()) == 9; print('Success: 9 campus files verified.')"
  ```
- O arquivo `indicadores.zip` permanece intacto.

---

### Cenário 3: Execução dos Testes do ETL Python

Executa todos os testes unitários e de integração escritos em `pytest`.

```bash
make test-etl
```

**Resultado Esperado**:

- Todos os testes em `tests/etl/` são executados e passam com 0 falhas:
  - Resolução da hierarquia de campus (declarado -> coordenador -> membros da equipe).
  - Registro unificado de pessoas e precedência em caso de colisão entre pesquisadores.
  - Lógica da janela de atividade (`activity_filter.py`).
  - Fidelidade estrita de nulos (Princípio III) nos Pilares 1, 2 e 3.
  - Geração determinística de ZIP e reprodutibilidade dos checksums.
  - Argumentos da CLI e cenários de erro.

---

### Cenário 4: Qualidade de Código e Lint

Verifica as regras de estilo e de sintaxe espelhando o `horizon_etl`.

```bash
# Verificar a formatação
make format-check

# Executar o linter
make lint
```

**Resultado Esperado**:

- `flake8`, `black --check` e `isort --check` passam com 0 erros em `etl/` e `tests/etl/`.
- `eslint` e `prettier --check` passam nos arquivos do frontend Astro.

---

### Cenário 5: Verificação de Integração Completa do Sistema

Executa a checagem de integração ponta a ponta abrangendo tanto a engenharia de dados em Python quanto a apresentação no frontend Astro.

```bash
# 1. Executar o alvo completo de CI
make check

# 2. Verificar o build estático do Astro
npm run build
```

**Resultado Esperado**:

- Os testes e o linter do Python passam.
- A suíte de testes Vitest do Astro passa em todos os 267 testes contra o `indicadores.zip` recém-gerado.
- O Astro constrói a distribuição estática de produção em `dist/` com 0 erros.
