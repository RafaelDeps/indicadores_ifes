# Contract: Fixture de Auditoria (ETL → frontend)

**Feature**: 026-raio-x-indicador | **Date**: 2026-10-15

Contrato do arquivo JSON que o ETL produz e o drawer consome. Schema canônico em
[data-model.md](../data-model.md); este documento fixa semântica, nomenclatura e regras de
geração/publicação.

---

## A. Nomenclatura e localização

- Caminho canônico versionado: `data/dist/auditoria/{INDICADOR}_{campus}_{ano}.json`
  (ex.: `PIES_serra_2025.json`; INDICADOR em maiúsculas — 9 siglas válidas).
- Servido em: `{base}auditoria/{INDICADOR}_{campus}_{ano}.json` — populado pelo
  `check_governanca.py` (portão aberto) e **limpo** pelo mesmo quando fechado.
- `campus` é slug específico (ex.: `serra`); **nunca** `todos` (research D-11).
- Conjunto gerado: um arquivo por indicador × campus específico × ano presente no pacote
  canônico (hoje: 9 × 1 × 3 = 27 arquivos).

## B. Semântica dos campos

| Campo                        | Contrato                                                                                                                                                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `componentes[].papel`        | `numerador`/`denominador` para frações; `parcela` para termos de soma; `unica` para fórmulas de transcrição direta (NTPP, QSPP, PIPDI)                                                                                                                               |
| `componentes[].apurado`      | Transcrição do valor canônico do `indicadores.zip` no mesmo contexto — int/float ≥ 0 ou `null` (null ⇒ "Dado indisponível" no selo)                                                                                                                                  |
| `componentes[].tipoContagem` | `contagem` (selo compara `registros.length`) \| `soma` (selo compara `Σ registros.valor`)                                                                                                                                                                            |
| `componentes[].detalhado`    | `false` ⇒ fonte sem linhas (OCC, PA, RM, DI, C, TC, OGM, CT, CL, CC); `registros: []` e mensagem de indisponibilidade no drawer                                                                                                                                      |
| `componentes[].campos`       | Chaves presentes em cada objeto de `registros[]`, na ordem de exibição                                                                                                                                                                                               |
| `registros[]`                | Apenas as linhas contadas pelo MESMO filtro que gerou `apurado` (D-5). Pessoas: `nome`, `projeto`, `papel` + `matricula`/`curso` quando houver match com listagens (D-3). NTE: `matricula`, `nome`, `curso`, `situacao`. Produções/projetos: campos naturais do tipo |
| `fontes[]`                   | Insumos realmente consumidos pela fixture, com `revisao` quando o registro de insumos a declara                                                                                                                                                                      |
| `geradoEm`                   | Data ISO da geração (build)                                                                                                                                                                                                                                          |

## C. Regras de geração (ETL)

1. **Coleta no mesmo passe (D-5)**: os registros são coletados pelos mesmos filtros das
   contagens (`aggregator.py`, `pillar2.py`, `pillar3.py`, calculators de listagens/ntecpp) —
   nenhum filtro re-implementado. Invariante: `contagem ⇒ len(registros) == apurado`;
   `soma ⇒ Σ valor == apurado` (R$ comparado em centavos inteiros).
2. **Valores do pacote canônico intactos**: a geração das fixtures NÃO altera o
   `indicadores.zip` nem qualquer agregado (FR-010 da spec).
3. **Listagens com retenção de nome/curso**: apenas o novo flow de auditoria retém Nome/Curso
   (`ListagensXlsxSource` recebe modo de retenção); o flow de listagens existente continua
   descartando (nenhuma mudança no pacote agregado — D-3).
4. **Determinismo**: saída estável (chaves ordenadas, `ensure_ascii=False`, newline final);
   mesmos insumos ⇒ mesmos bytes (mesma disciplina do `ZipIndicadoresSink`).
5. **Testes obrigatórios (Princípio II)**: pytest cobrindo — coincidência
   contagem↔registros por componente (fixture sintética do canônico + listagem factory
   existentes); campos de pessoas (Nome/Matrícula/Curso/Projeto/Papel ou "Dado
   indisponível"); determinismo; portão fechado (nada publicado); ausência de CPF/ padrões
   não contratados; re-escopo do `test_privacy.py` para o agregado (D-9).
6. **Cadeia**: novo alvo `make auditoria` executado APÓS `make dados` (usa o zip final com
   NTE/NTECPP mesclados); integração em `make dados` como etapa final opcional-fail-closed
   (portão fechado ⇒ etapa avisa e não publica, exit 0 — coerente com `check_governanca`).

## D. Publicação (check_governanca)

- Portão aberto: copiar `data/dist/auditoria/*.json` → `public/auditoria/` (criar se
  necessário), após limpar o diretório (paridade `limparSaidaPublica` — build fechada não
  herda fixture de build aberta).
- Portão fechado: `public/auditoria/` limpo; log com contagem de arquivos omitidos; exit 0
  (AVISO) — mesma postura atual dos insumos brutos.
- O diretório `public/auditoria/` é gerado (gitignored como `public/dados/`).

## E. Consumo (frontend)

- URL de busca: `{base}auditoria/{INDICADOR}_{campus}_{ano}.json` (base de `import.meta.env.BASE_URL`).
- Fetch apenas ao abrir o drawer ou ao trocar de contexto com o drawer aberto (FR-009);
  404 ⇒ estado "sem registros publicados para este contexto"; erro de rede ⇒ "Tentar
  novamente".
- `campus === 'todos'` ⇒ nem busca: estado explicativo com link para `/dados` (D-11).
