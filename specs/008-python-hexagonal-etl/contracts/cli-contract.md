# Contrato de Interface: Entry Point da CLI (`etl/main.py`)

**Feature Branch**: `008-python-hexagonal-etl`  
**Date**: 2026-09-25

> **Nota de vigência**: layout histórico (caminhos na raiz). A partir da spec
> 009 o pipeline opera com `data/canonical/exports_canonical.zip` (entrada) e
> `data/dist/indicadores.zip` (saída), e as flags incorporam os mesmos
> defaults. Ver [009/contracts/cli-contract.md](../../009-reorganize-horizon-architecture/contracts/cli-contract.md).

## Interface de Linha de Comando

O ETL Python é executado como módulo: `python3 -m etl.main [OPTIONS]`.

### Argumentos e Opções

| Opção       | Flag | Tipo      | Padrão                                                         | Descrição                                                                                                                                             |
| :---------- | :--- | :-------- | :------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--entrada` | `-i` | Caminho   | `exports_canonical.zip`                                       | Caminho do pacote ZIP canônico de entrada.                                                                                                            |
| `--saida`   | `-o` | Caminho   | `indicadores.zip` (ou `indicadores_<campus>.zip` se filtrado) | Caminho do pacote ZIP de saída gerado.                                                                                                                 |
| `--campus`  | `-c` | String    | `None` (processa todos os campi do export + `todos`)          | Campus específico a processar. Aceita o nome oficial (ex.: `Serra`, `Vitória`) ou o slug (ex.: `serra`, `vitoria`). Insensível a maiúsculas/minúsculas e a acentos. |
| `--anos`    | `-a` | List[int] | `[2024, 2025, 2026]`                                          | Lista de anos civis-alvo separados por vírgula.                                                                                                       |
| `--help`    | `-h` | Booleano  | -                                                             | Exibe a ajuda de uso e sai com status 0.                                                                                                              |

### Variáveis de Ambiente

- `CAMPUS`: Se definida e `--campus` não for fornecido via CLI, `--campus` assume por padrão o valor de `$CAMPUS`.
- `ENTRADA`: Se definida e `--entrada` não for fornecida, assume por padrão o valor de `$ENTRADA`.
- `SAIDA`: Se definida e `--saida` não for fornecida, assume por padrão o valor de `$SAIDA`.

### Códigos de Saída

- `0`: Sucesso. Pipeline executado por completo, contratos validados e ZIP gerado atomicamente.
- `1`: Erro de Validação ou Execução:
  - Arquivo ZIP de entrada ausente ou corrompido.
  - Arquivo canônico obrigatório ausente no ZIP.
  - Campus não reconhecido solicitado via `--campus`.
  - Violação do contrato do sink detectada durante a validação.

### Saída Padrão e Log de Erros

- **stdout**:
  - Logs de resumo (ex.: `Carregando dados canônicos de exports_canonical.zip...`).
  - Métricas de progresso (quantidade de iniciativas, pessoas e produções processadas).
  - Confirmação de sucesso (ex.: `Pipeline concluído com sucesso: N arquivos gerados em indicadores.zip`, onde `N` varia com o export).
- **stderr**:
  - Mensagens de aviso prefixadas com `AVISO: ` para anomalias não fatais (ex.: iniciativas sem data de início, campus não resolvível).
  - Erros fatais prefixados com `ERRO: ` antes de sair com status 1.
