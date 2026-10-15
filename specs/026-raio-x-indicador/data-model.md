# Data Model: Raio-X do Indicador

**Feature**: 026-raio-x-indicador | **Date**: 2026-10-15

Duas camadas: **fixtures** (ETL, Python) e **visão/drawer** (frontend, TypeScript). A
fixture é a única fonte de registros do drawer; o `apurado` é sempre o valor canônico já
publicado no `indicadores.zip`.

---

## Entidade central: `FixtureDeAuditoria` (JSON servido)

```jsonc
// data/dist/auditoria/PIES_serra_2025.json → servido em {base}auditoria/PIES_serra_2025.json
{
  "indicador": "PIES",
  "campus": "serra", // slug; nunca "todos" (D-11)
  "ano": 2025,
  "geradoEm": "2026-10-15", // data de geração (ISO, pt-BR exibido no drawer)
  "fontes": [
    // proveniência (FR-009 da spec 026 / US3)
    { "arquivo": "exports_canonical.zip", "revisao": "sha-curto ou null" },
    { "arquivo": "listagem_2025_1.xlsx", "revisao": "2025-1" },
  ],
  "componentes": [
    {
      "papel": "numerador", // "numerador" | "denominador" | "parcela" | "unica"
      "simbolo": "NEP",
      "rotulo": "Estudantes em Pesquisa",
      "unidade": "Estudantes",
      "tipoContagem": "contagem", // "contagem" | "soma" (TAFPPI) — D-4
      "apurado": 419, // int|float|null — SEMPRE o valor canônico publicado
      "detalhado": true, // false ⇒ a fonte não tem linhas (OCC, PA/RM/DI/C/TC/OGM, CT/CL/CC)
      "campos": ["nome", "projeto", "papel", "matricula", "curso"],
      "registros": [
        {
          "nome": "Nome Completo",
          "projeto": "Título da iniciativa",
          "papel": "Student",
          "matricula": "20241234", // null quando sem match com listagens (D-3)
          "curso": "Análise e Desenvolvimento de Sistemas",
        },
      ],
    },
    {
      "papel": "denominador",
      "simbolo": "NTE",
      "rotulo": "Total de Estudantes Matriculados",
      "unidade": "Estudantes",
      "tipoContagem": "contagem",
      "apurado": 2338,
      "detalhado": true,
      "campos": ["matricula", "nome", "curso", "situacao"],
      "registros": [
        { "matricula": "20240001", "nome": "...", "curso": "...", "situacao": "Matriculado" },
      ],
    },
  ],
}
```

### Exemplos dos casos notáveis

```jsonc
// Componente de soma (TAFPPI — D-4): selo compara soma(valor) com apurado
{
  "papel": "parcela", "simbolo": "TAFPPI", "rotulo": "Total de Aporte em Pesquisa e Pós-Graduação",
  "unidade": "R$", "tipoContagem": "soma", "apurado": 45000, "detalhado": true,
  "campos": ["projeto", "codigo", "valor", "fonte"],
  "registros": [
    { "projeto": "Título do projeto", "codigo": "PJ-001", "valor": 25000, "fonte": "FAPES" },
    { "projeto": "Outro projeto", "codigo": "PJ-002", "valor": 20000, "fonte": "CNPq" }
  ]
}

// Componente sem fonte de linhas (OCC/PA/RM/DI/C/TC/OGM/CT/CL/CC — D-2)
{
  "papel": "denominador", "simbolo": "OCC", "rotulo": "Orçamento Total de Capital e Custeio",
  "unidade": "R$", "tipoContagem": "soma", "apurado": null, "detalhado": false,
  "campos": [], "registros": []
}

// Indicador de transcrição direta (NTPP): uma aba única, sem papel de fração
{
  "papel": "unica", "simbolo": "PRE", "rotulo": "Projetos Registrados em Execução",
  "unidade": "Projetos", "tipoContagem": "contagem", "apurado": 451, "detalhado": true,
  "campos": ["projeto", "status", "inicio", "fim"], "registros": [ ... ]
}
```

## Entidades do frontend (TypeScript, `src/lib/raiox.ts`)

```ts
export type TipoContagemRaiox = 'contagem' | 'soma';

export interface RegistroRaiox {
  [campo: string]: string | number | null; // ex.: nome, matricula, curso, valor
}

export interface ComponenteRaiox {
  papel: 'numerador' | 'denominador' | 'parcela' | 'unica';
  simbolo: string;
  rotulo: string;
  unidade: string;
  tipoContagem: TipoContagemRaiox;
  apurado: number | null;
  detalhado: boolean;
  campos: string[];
  registros: RegistroRaiox[];
}

export interface FixtureRaiox {
  indicador: string;
  campus: string;
  ano: number;
  geradoEm: string;
  fontes: Array<{ arquivo: string; revisao: string | null }>;
  componentes: ComponenteRaiox[];
}

// Estado de UI derivado (puro, testável):
export interface ResumoRaiox {
  totalRegistros: number; // N (registros do componente)
  apuradoFormatado: string; // formatValor + sufixo de unidade
  conferido: boolean | null; // true/false (divergência) | null (sem apurado/detalhado)
  tipoContagem: TipoContagemRaiox;
  totalComparacao: string; // contagem (N) ou soma formatada (R$) — D-4
}
```

## Regras de validação e invariantes

1. **Fidelidade do apurado (Princípio III)**: `componente.apurado` é transcrito do
   `indicadores.zip` no mesmo passe em que os registros são coletados (D-5) — a fixture
   nunca recalcula, arredonda ou "corrige" valores. Verificação: para cada fixture,
   `apurado === valor canônico` do componente no mesmo contexto.
2. **Coincidência estrutural (FR-006/SC-002)**: registros são coletados pelos MESMOS filtros
   que produzem a contagem (mesmo passe no agregador). `contagem` ⇒ `registros.length ===
apurado`; `soma` ⇒ `sum(registros.valor) === apurado` (tolerância de centavo para
   arredondamento Decimal→float documentada na fixture? **não** — soma em inteiro de
   centavos quando R$). Divergência é sempre um bug de coleta, nunca mascarada no drawer
   (estado transparente).
3. **Nada inventado (Princípio III)**: campo ausente → `null` → "Dado indisponível" na
   célula; componente sem fonte → `detalhado: false` + `registros: []`; nunca linha vazia
   fingida nem zero substituto de ausência.
4. **Portão fail-closed (Princípio IV)**: portão fechado ⇒ `public/auditoria/` limpo e
   nenhuma fixture servida; gatilho não renderizado (build lê `portaoAberto()`); verificação
   automatizada nos dois lados (Python e TS).
5. **Sem micrado fora do drawer**: nenhuma fixture é embutida/pré-carregada nas páginas
   (FR-009); busca apenas ao abrir.
6. **Nenhum nome no agregado**: `indicadores.zip` continua sem nenhum campo/nome individual
   (re-escopo de `test_privacy.py` — D-9); nomes só existem nas fixtures de auditoria.
7. **Determinismo**: fixture gravada com serialização estável (ordenada, datas fixas no zip
   quando aplicável, `ensure_ascii=False`) — mesmos insumos ⇒ mesmos bytes, mesmos diffs.
8. **Contexto**: `campus` nunca é `"todos"` (D-11); `ano` ∈ anos disponíveis do campus.
9. **Proveniência**: `fontes[]` cita os insumos reais consumidos (mesmos nomes/rótulos do
   registro de insumos de `/dados`) e `geradoEm` é a data de geração da fixture.
10. **pt-BR e formatação**: unidades e valores formatados no cliente com `formatValor`
    (padrão do site); a fixture guarda números crus (sem formatação embutida).

## Estados e transições (drawer)

| Estado                         | Gatilho                                  | Saída                                                          |
| ------------------------------ | ---------------------------------------- | -------------------------------------------------------------- |
| Fechado                        | inicial / ESC / botão Fechar / navegação | foco devolvido ao disparador                                   |
| Carregando                     | abrir (fetch lazy)                       | spinner legível; sem tabela vazia                              |
| Pronto                         | fetch 200                                | abas + tabela do componente ativo                              |
| Sem detalhamento               | componente `detalhado: false`            | mensagem transparente + apurado mantido                        |
| Sem fixture para o contexto    | fetch 404                                | "sem registros publicados para este contexto" + nova tentativa |
| Erro de rede                   | fetch falha                              | mensagem + botão "Tentar novamente"                            |
| Contexto mudou (drawer aberto) | seletores globais                        | re-busca da fixture do novo contexto; nunca conteúdo misto     |
| Selo de conferência            | comparação (D-4)                         | "✓ (Conferido)" ou divergência com os dois números             |
