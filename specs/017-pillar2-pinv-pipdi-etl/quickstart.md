# Quickstart Guide: Validação do Cálculo Completo do Pilar 2 (PINV e PIPDI) no ETL

**Feature**: `017-pillar2-pinv-pipdi-etl` | **Data**: 2026-10-07

Este guia descreve os passos práticos para validar ponta a ponta a ingestão e o cálculo dos indicadores de Pilar 2 (`PINV` e `PIPDI`).

---

## 1. Pré-Requisitos

1. Pacote canônico presente em `data/canonical/exports_canonical.zip` contendo `project_sigpesq_files_json/`.
2. Arquivo de percentual de PINV do campus Serra presente em `data/pinv_serra.json`.
3. Ambiente Python `.venv` ativo.

---

## 2. Cenário 1: Execução e Geração dos Indicadores

Execute o pipeline de ETL:

```bash
make etl
```

**Resultado esperado**:

- Saída no terminal indicando: `Pipeline concluído com sucesso: 18 arquivos gerados em data/dist/indicadores.zip`.

---

## 3. Cenário 2: Verificação do Conteúdo Gerado para Serra

Inspecione os arquivos JSON gerados para o campus Serra nos anos 2024, 2025 e 2026:

```bash
.venv/bin/python -c "
import zipfile, json

with zipfile.ZipFile('data/dist/indicadores.zip') as zf:
    for ano in [2024, 2025, 2026]:
        nome = f'pilar2_serra_{ano}.json'
        dados = json.loads(zf.read(nome).decode('utf-8'))
        print(f'=== Serra {ano} ===')
        print('PINV:', dados['indicadores']['PINV'])
        print('PIPDI:', dados['indicadores']['PIPDI'])
"
```

**Resultado esperado**:

- **PINV**:
  - `percentual_calculado_PINV`:
    - 2024: `496.78`
    - 2025: `1111.35`
    - 2026: `610.63`
  - `TAFPPI_valor_total_aporte_pesquisa`:
    - 2024: `12067095.28`
    - 2025: `28270178.52`
    - 2026: `17842650.00` (ou acrescido de FACTO se integrado)
  - `OCC_valor_orcamento_total_capital_custeio`: `null` (Princípio III mantido).
- **PIPDI**:
  - `NAPPCT_acordos_parceria_firmados`: inteiro `>= 0`.
  - `total_acumulado_PIPDI`: mesmo inteiro `>= 0`.

---

## 4. Cenário 3: Validação do Contrato CONIF e Frescor

Execute a verificação de contrato:

```bash
make check-dados
```

**Resultado esperado**:

```text
Sucesso: 18 arquivo(s) em data/dist/indicadores.zip atendem ao contrato CONIF.
```

---

## 5. Cenário 4: Execução da Suíte de Testes Automatizados

Rode os testes unitários do ETL com pytest:

```bash
make test-etl
```

**Resultado esperado**:

- Todos os testes de parsing de SIGPESQ, cálculo de PINV por campus, TAFPPI e PIPDI passam sem falhas.
