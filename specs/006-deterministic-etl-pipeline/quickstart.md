# Quickstart: Pipeline ETL Determinístico de Indicadores

**Feature**: `006-deterministic-etl-pipeline`

Guia de validação ponta a ponta: gera o `indicadores.zip` a partir do `exports_canonical.zip` e comprova determinismo, conformidade contratual e integridade dos testes.

## Pré-requisitos

- Node.js >= 20 e npm.
- `exports_canonical.zip` na raiz do repositório (entrada; ~23 MB).
- Dependências instaladas.

```bash
npm ci
```

## 1. Executar o pipeline

```bash
npm run etl
```

**Esperado**:

- exit code `0`.
- stdout com resumo em pt-BR (`ETL concluído: N arquivos gerados (...)`).
- `indicadores.zip` reescrito na raiz, contendo `pilar{N}_{campus}_{year}.json` para os 3 pilares, cada campus de `campuses_canonical.json` + `todos`, nos anos 2024–2026.
- Avisos (se houver) apenas no stderr com prefixo `AVISO:`.

## 2. Verificar conformidade com o contrato

```bash
unzip -l indicadores.zip
```

- Nomes casam com `pilar[123]_[a-z0-9]+_\d{4}\.json` (incl. `pilar{N}_todos_{year}.json`).
- Nenhum arquivo fora do padrão dentro do zip.

```bash
unzip -p indicadores.zip pilar1_todos_2024.json | python3 -m json.tool | head -30
```

- Header completo: `campus: "Todos os Campi"`... (nome oficial do escopo), `ano_referencia`, `pilar`, `indicadores`.
- Campos não coletados estritamente `null`; `0` apenas em contagens verificadas.
- Referência completa dos campos: [data-model.md §3](./data-model.md) e [contracts/output-package.md](./contracts/output-package.md).

## 3. Provar o determinismo

```bash
npm run etl && sha256sum indicadores.zip > /tmp/opencode/h1.txt
npm run etl && sha256sum indicadores.zip > /tmp/opencode/h2.txt
diff /tmp/opencode/h1.txt /tmp/opencode/h2.txt && echo "DETERMINÍSTICO"
```

**Esperado**: hashes idênticos (`DETERMINÍSTICO` impresso). Tempo total das duas execuções < 10 minutos (SC-005).

## 4. Rodar a suíte de testes

```bash
npm test          # Vitest: inclui tests/etl/ (unit + integração)
npm run lint      # ESLint zero erros
npm run format:check
```

**Esperado**: suíte verde, incluindo:

- testes unitários das regras (atividade por ano, resolução de campus, classificação de pessoas, NPB/NPT/PC, fidelidade `null`/`0`);
- teste de integração `exports_canonical.zip` → `indicadores.zip` executando de ponta a ponta;
- teste de determinismo (mesma entrada → mesmo hash);
- teste de privacidade (nenhum nome/identificador de pessoa nos JSONs de saída).

## 5. Consumo pelo site (sanity)

```bash
npm run build
```

**Esperado**: build do Astro conclui ingerindo o novo `indicadores.zip` sem alterações no site (`src/lib/dataset.ts` consome o pacote como está — ver [contracts/output-package.md §5](./contracts/output-package.md)).

## Solução de Problemas

| Sintoma                                      | Causa provável            | Ação                                                                      |
| -------------------------------------------- | ------------------------- | ------------------------------------------------------------------------- |
| `ERRO: exports_canonical.zip não encontrado` | Entrada ausente na raiz   | Restaurar o arquivo e reexecutar                                          |
| `ERRO: conjunto ... ausente no pacote`       | Zip de entrada incompleto | Regenerar o export upstream                                               |
| `ERRO: violação de contrato ...`             | Bug de transformação      | Mensagem indica arquivo + campo + regra; corrigir e reexecutar            |
| Hashes diferentes entre execuções            | Regressão de determinismo | Verificar ordenação/serialização (`src/etl/serialize.ts`, `zipwriter.ts`) |
