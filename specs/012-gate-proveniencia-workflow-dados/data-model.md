# Modelo de Dados — Gate de Proveniência e Automação do `make dados`

**Feature**: `012-gate-proveniencia-workflow-dados` | **Data**: 2026-09-30

Duas estruturas novas. Ambas são **derivadas em tempo de execução**, nunca
persistidas no pacote publicado — a última seção registra por que o formato do
pacote não muda.

## 1. Chave de cobertura

```python
ChaveCobertura = tuple[str, str]     # (campus, ano_referencia)
```

Identifica a granularidade mínima de um indicador derivado de matrícula. O campus
é o slug do nome do arquivo (`serra`), e o ano é um inteiro de 4 dígitos
serializado como texto, para que a chave seja ordenável e hasheável.

Extraída de nomes no formato `pilar1_{campus}_{ano}.json`. O padrão pertence a
`merge_listagens_indicadores.PADRAO_PILAR1` — o módulo de cobertura **importa**,
não redefine (research D2).

### Constantes medidas no repositório

| entidade | valor observado | onde |
|---|---|---|
| escopo com derivado | `serra` | 3 arquivos de `pilar1` no pacote |
| escopo agregado (sem derivado) | `todos` | 3 arquivos de `pilar1` no pacote |
| anos com derivado | 2024, 2025, 2026 | igual nos dois pacotes |
| chaves exigidas pela regra | **3** | `(serra, 2024)`, `(serra, 2025)`, `(serra, 2026)` |

Nenhum destes valores é escrito na regra. A tabela existe para que o **dado real**
seja confrontável com o **comportamento esperado** — e para que um campus novo
seja um dado novo, não uma alteração de código.

## 2. Conjunto de cobertura

```python
CoberturaDerivado = frozenset[tuple[ChaveCobertura, str]]
                   # ((campus, ano), "NTE_total_estudantes_matriculados")
```

O segundo elemento é o **nome do campo derivado**, não o caminho completo. Motivo:
o relatório precisa citar o campo legível, e o grupo (`PIES`, `PICOT`) é interno
à passagem de integração. Os campos vêm de `CAMPOS_DERIVAVEIS_LISTAGENS`, que já
existe e é a única fonte de verdade.

Uma chave entra no conjunto **se e somente se** o arquivo existe **e** o campo
tem valor não nulo. Um arquivo presente com o campo nulo é indistinguível, para
esta regra, de um arquivo ausente — e ambos são o que o relatório precisa
reprovar.

## 3. Regra de perda

```python
def cobertura_perdida(*, origem: CoberturaDerivado,
                       pacote: CoberturaDerivado) -> CoberturaDerivado:
    return origem - pacote
```

Simétrica por construção, sem direção especial a codificar. Perdas:

| situação | resultado |
|---|---|
| origem tem, pacote não tem | violação — é a regra |
| origem não tem, pacote tem | não verificado (estado normal: listagens cobrem menos que o canônico) |
| ambos não têm | nada |
| ambos têm, valores diferentes | **não verificado** — o portão mede cobertura, não identidade do valor |

A última linha é uma **limitação declarada**, não um esquecimento. O portão
responde "a integração aconteceu?", e não "a integração usou a planilha certa?".
A segunda pergunta exigiria comparar o insumo por identidade — um carimbo de
proveniência dentro do pacote — que foi **rejeitado** por mudar o contrato do
dado publicado (spec FR-009, research D1). Fica registrado aqui para que ninguém
leia o portão como verificação de valor.

## 4. Relatório de violação

```python
@dataclass(frozen=True)
class ViolacaoCobertura:
    campus: str
    ano: str
    campo: str
    forma: Literal["arquivo ausente", "campo nulo"]
```

`forma` distingue os dois casos porque a **ação corretiva** difere: arquivo
ausente sugere integração que não rodou; campo nulo sugere integração que rodou
e não escreveu. O relatório ordena por `(campus, ano, campo)` para ser estável
entre execuções — a saída de um verificador que muda de ordem a cada execução
não é comparável em log.

## 5. Estado do portão

O portão é uma função, não uma máquina de estados. Ainda assim, os três
vereditos precisam ser distinguíveis porque chamadores distintos reagem de
maneiras distintas:

| veredito | condição | `check_dados` | guarda da cadeia |
|---|---|---|---|
| **cobrir** | perda vazia | passa | libera |
| **reprovar** | perda não vazia | `ERRO:` + saída ≠ 0 | `ERRO:`/`AVISO:` + saída 3 |
| **não afirma** | origem ausente | `INFO:`, saída 0 | **libera** (a Etapa 1.5 fecha o caso) |

O terceiro veredito é o que impede falso positivo em CI limpo: clone sem
`data/raw/` não tem entrada bruta, e a ausência de insumo **não é** violação de
cobertura. É a diferença entre "não há cobertura" e "não há como afirmar
cobertura".

## 6. Manifesto de insumo (workflow)

Arquivo versionado no repositório público, lido pelo workflow. **Não é
segredo**: contém identificadores, não credenciais.

As chaves abaixo são **sem acento de propósito** — são identificadores
consumidos pelo workflow, e um identificador com acento é risco de codificação
sem contrapartida. A prosa em volta delas é acentuada normalmente; a
convenção vale só para as chaves.

```yaml
# dados-insumo.yml
versao: "v1"              # tag da versão publicada no repositório privado
dono: <conta>             # conta dona do repositório privado, para montar a URL
repositorio: dados-listagens
arquivos:
  - nome: listagem_2024_1.xlsx
    asset_id: 12345601
  - nome: listagem_2024_2.xlsx
    asset_id: 12345602
  # ... uma entrada por planilha
export_canonico:
  repositorio: horizon_etl
  caminho: data/exports/exports_canonical.zip
  revisao: "<sha de 40 caracteres>"    # obrigatória, nunca referencia movel
```

### Invariantes do manifesto

- `asset_id` é **identificador de recurso**, não segredo. Obter a lista de ids é
  uma chamada autenticada de leitura; obter o conteúdo é outra. Publicar o id no
  repositório público não amplia o que o PAT já concede.
- `revisao` é obrigatória. Um workflow que aceita ausência desse campo
  reintroduziria a referência móvel — que research D4 documenta como não
  reprodutível e invisível ao portão.
- `dono` é obrigatório, pelo mesmo motivo de `revisao`: ele participa da URL da
  API. Ausente, o download devolve 404 de recurso, e a mensagem não diz qual dos
  dois faltou.
- Entradas ausentes no arquivo **fazem o workflow falhar**, não pular. Ver
  FR-018: a pasta de entrada parcial é o estado que produz o pacote degradado.
- **Contagem final de arquivos** é conferida depois do download, e diverge de 6
  é falha, não aviso. `curl -fsSL` grava o corpo de erro dentro do `.xlsx` sem
  `-f`; a contagem é a rede de proteção.

### Por que identificador e não URL

A URL de download de asset autenticado é temporária e assinada. Versioná-la
introduziria uma referência que expira sozinha e que, em log, é uma
**credencial**. O par estável `(repositorio, versao, asset_id)` reconstrói a
chamada e não expira.

## 7. O que NÃO é uma entidade desta feature

| recusado | por que |
|---|---|
| manifesto de proveniência **dentro do pacote** | muda o contrato do dado publicado; mudanca de formato para resolver problema de verificacao |
| hash do insumo gravado no pacote | o mesmo, com o custo adicional de um carimbo que pode divergir da entrada real |
| tabela de cobertura no site | o site consome agregado publicado; a cobertura é invariante de **produção**, não de **apresentacao** |
| registro de auditoria persistente | exigiria armazenamento novo, e o log da execução já é o registro |

Nenhuma dessas ausências é um esquecimento. Cada uma foi pesada e rejeitada em
research D1; esta seção existe para que a próxima pessoa não as reintroduza como
"pendências".