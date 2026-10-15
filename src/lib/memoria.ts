import type { ContextoFiltro, DatasetCompleto, ValorComponente } from './dataset-core';
import { obterAnosDisponiveis, obterIndicadorCompleto } from './dataset-core';
import { INDICADORES_META, type SiglaIndicador } from '../data/indicadores';
import { decomporFormula, type FormulaEstruturada } from './formula';
import { formatValor, TEXTO_INDISPONIVEL } from './formatters';

/**
 * Memória de cálculo (spec 025): projeção auditável de um indicador em um
 * contexto (campus + ano). Todo valor exibido é derivado do dataset canônico —
 * a fórmula substituída é transcrição transparente e o valor final é SEMPRE o
 * publicado (Princípio III); a memória não recalcula nada.
 */

export interface VisaoVariavelMemoria {
  /** Símbolo da variável na fórmula (ex.: NEP, NTE) ou sigla do componente (ex.: PRE). */
  simbolo: string;
  /** Descrição canônica do dicionário; nunca inventada. */
  nome: string;
  /** Unidade declarada (ex.: 'Estudantes', 'R$', 'Projetos'). */
  unidade: string;
  /** Valor bruto apurado no contexto ativo, formatado, ou "Dado indisponível". */
  valorFormatado: string;
  disponivel: boolean;
  motivoIndisponivel?: string;
}

export interface VisaoMemoriaHistorico {
  /** Todos os anos disponíveis para o campus ativo, em ordem crescente. */
  anos: number[];
  /** Ano ativo do contexto (destacado na tabela). */
  anoAtivo: number;
  linhas: Array<{
    simbolo: string;
    /** Valor formatado por ano ou "Dado indisponível" (célula faltante nunca some). */
    valoresPorAno: Record<number, string>;
  }>;
}

export interface VisaoMemoria {
  sigla: string;
  slug: string;
  pilarNumero: 1 | 2 | 3;
  /** Contexto em que os valores foram apurados. */
  contexto: ContextoFiltro;
  variaveis: VisaoVariavelMemoria[];
  /** Fórmula canônica de `INDICADORES_META` (ex.: "PIES = (NEP / NTE) × 100"). */
  formulaDeclarada: string;
  /** Fórmula com os símbolos trocados pelos valores do contexto (transcrição, sem recálculo). */
  formulaSubstituida: string;
  /** Leitura em pt-BR da fórmula substituída, para leitores de tela. */
  formulaSubstituidaAcessivel: string;
  /** Valor final apurado canônico ou "Dado indisponível" — nunca um recálculo. */
  valorFinalFormatado: string;
  unidade?: string;
  /** `true` para percentuais: o "%" já está embutido em `valorFinalFormatado`. */
  unidadeJaNoValor: boolean;
  disponivel: boolean;
  /** Presente quando a avaliação não pôde ser reconstruída a partir das variáveis. */
  nota?: string;
  /** Mini-tabela histórica das variáveis (linhas = variáveis, colunas = anos). */
  historico: VisaoMemoriaHistorico;
}

interface ValorComponentePorAno {
  quantidade: number | null;
  motivoIndisponivel?: string;
}

/** Mapa sigla do componente → valores por ano, mesclado de todos os anos do campus. */
function mapearComponentes(
  componentes: Array<{ sigla: string; valores: ValorComponente[] }>,
): Map<string, Map<number, ValorComponentePorAno>> {
  const mapa = new Map<string, Map<number, ValorComponentePorAno>>();
  for (const componente of componentes) {
    if (!mapa.has(componente.sigla)) {
      mapa.set(componente.sigla, new Map<number, ValorComponentePorAno>());
    }
    const porAno = mapa.get(componente.sigla)!;
    for (const valor of componente.valores) {
      porAno.set(valor.ano, {
        quantidade: valor.quantidade,
        motivoIndisponivel: valor.motivoIndisponivel,
      });
    }
  }
  return mapa;
}

/**
 * Substitui um token da fórmula pelo valor do contexto.
 * Token numérico (multiplicador) permanece; variável conhecida sem apuração
 * vira "Dado indisponível" e marca a avaliação como não reconstrutível — nunca
 * inventar valor; token fora do dicionário (texto descritivo de fórmulas de
 * transcrição direta, ex.: NTPP) permanece como declarado.
 */
function substituirToken(
  token: string,
  componentesPorAno: Map<number, ValorComponentePorAno> | undefined,
  ano: number,
  ehVariavelConhecida: boolean,
): { texto: string; faltou: boolean } {
  const limpo = token.trim();
  if (/^\d+([.,]\d+)?$/.test(limpo)) {
    return { texto: limpo, faltou: false };
  }
  const valor = componentesPorAno?.get(ano)?.quantidade ?? null;
  if (valor !== null) {
    return { texto: formatValor(valor), faltou: false };
  }
  if (ehVariavelConhecida) {
    return { texto: TEXTO_INDISPONIVEL, faltou: true };
  }
  return { texto: limpo, faltou: false };
}

function substituirFormula(
  formula: FormulaEstruturada,
  componentes: Map<string, Map<number, ValorComponentePorAno>>,
  dicionario: Set<string>,
  contexto: ContextoFiltro,
): { formulaSubstituida: string; acessivel: string; faltou: boolean } {
  const valorDe = (token: string) => {
    const limpo = token.trim();
    return substituirToken(
      limpo,
      componentes.get(limpo),
      contexto.ano,
      componentes.has(limpo) || dicionario.has(limpo),
    );
  };

  if (formula.tipo === 'fracao' && formula.fracao) {
    const numerador = valorDe(formula.fracao.numerador);
    const denominador = valorDe(formula.fracao.denominador);
    const multiplicador = formula.fracao.multiplicador ?? null;
    const faltou = numerador.faltou || denominador.faltou;
    const formulaSubstituida = `(${numerador.texto} / ${denominador.texto})${
      multiplicador ? ` × ${multiplicador}` : ''
    }`;
    const acessivel = faltou
      ? `${formula.siglaResultado}: a avaliação não pôde ser reconstruída neste contexto.`
      : `${formula.siglaResultado} é igual a ${numerador.texto} dividido por ${denominador.texto}${
          multiplicador ? `, multiplicado por ${multiplicador}` : ''
        }`;
    return { formulaSubstituida, acessivel, faltou };
  }

  if (formula.tipo === 'soma' && formula.termosSoma) {
    const termos = formula.termosSoma.map(valorDe);
    const faltou = termos.some((t) => t.faltou);
    const formulaSubstituida = termos.map((t) => t.texto).join(' + ');
    const acessivel = faltou
      ? `${formula.siglaResultado}: a avaliação não pôde ser reconstruída neste contexto.`
      : `${formula.siglaResultado} é igual a ${termos.map((t) => t.texto).join(' mais ')}`;
    return { formulaSubstituida, acessivel, faltou };
  }

  const expressao = formula.expressaoDireta ?? '';
  const substituicao = valorDe(expressao);
  // Fórmula direta cujo membro é a sigla de um componente (ex.: "QSPP = SUPP")
  // vira o valor; texto descritivo (ex.: NTPP) permanece como declarado.
  const ehSiglaDeComponente = componentes.has(expressao.trim()) || dicionario.has(expressao.trim());
  if (ehSiglaDeComponente) {
    const acessivel = substituicao.faltou
      ? `${formula.siglaResultado}: a avaliação não pôde ser reconstruída neste contexto.`
      : `${formula.siglaResultado} é igual a ${substituicao.texto}`;
    return { formulaSubstituida: substituicao.texto, acessivel, faltou: substituicao.faltou };
  }
  return { formulaSubstituida: expressao, acessivel: expressao, faltou: false };
}

export function computarVisaoMemoria(
  dataset: DatasetCompleto,
  sigla: string,
  contexto: ContextoFiltro,
): VisaoMemoria | undefined {
  const siglaUpper = sigla.toUpperCase() as SiglaIndicador;
  const meta = INDICADORES_META[siglaUpper];
  if (!meta) {
    return undefined;
  }

  const indicador = obterIndicadorCompleto(dataset, siglaUpper, contexto.campus);
  if (!indicador) {
    return undefined;
  }

  const componentesPorAno = mapearComponentes(indicador.componentes);
  const valorAno = indicador.valores.find((v) => v.ano === contexto.ano);
  const valorFinal = valorAno?.valor ?? null;
  const ehPercentual = meta.tipoValor === 'percentual';
  const disponivel = valorFinal !== null;
  const valorFinalFormatado = disponivel
    ? formatValor(valorFinal) + (ehPercentual ? '%' : '')
    : TEXTO_INDISPONIVEL;

  // Variáveis: componentes com valores reais, enriquecidos pelo dicionário
  // `variaveisFormula`. Entradas do dicionário cujo símbolo é a própria sigla
  // do indicador (fórmulas de transcrição direta, ex.: NTPP) descrevem o
  // indicador, não uma variável — são omitidas.
  const dicionario = new Map(
    meta.variaveisFormula.filter((vf) => vf.simbolo !== meta.sigla).map((vf) => [vf.simbolo, vf]),
  );
  const variaveis: VisaoVariavelMemoria[] = [];
  const usados = new Set<string>();

  for (const [simbolo, vf] of dicionario) {
    if (!componentesPorAno.has(simbolo)) continue;
    usados.add(simbolo);
    const valor = componentesPorAno.get(simbolo)?.get(contexto.ano);
    const quantidade = valor?.quantidade ?? null;
    variaveis.push({
      simbolo,
      nome: vf.descricao,
      unidade: vf.unidade,
      valorFormatado: quantidade !== null ? formatValor(quantidade) : TEXTO_INDISPONIVEL,
      disponivel: quantidade !== null,
      motivoIndisponivel: valor?.motivoIndisponivel,
    });
  }

  for (const [simbolo, porAno] of componentesPorAno) {
    if (usados.has(simbolo)) continue;
    usados.add(simbolo);
    const valor = porAno.get(contexto.ano);
    const quantidade = valor?.quantidade ?? null;
    variaveis.push({
      simbolo,
      nome: indicador.variaveis.find((v) => v.sigla === simbolo)?.descricao ?? simbolo,
      unidade: meta.unidade ?? '',
      valorFormatado: quantidade !== null ? formatValor(quantidade) : TEXTO_INDISPONIVEL,
      disponivel: quantidade !== null,
      motivoIndisponivel: valor?.motivoIndisponivel,
    });
  }

  // Contexto sem nenhuma entrada (ex.: consolidado "todos"): as variáveis do
  // dicionário entram como "Dado indisponível" para que a tabela não fique
  // vazia e o visitante veja quais variáveis comporiam a fórmula.
  if (variaveis.length === 0) {
    for (const vf of dicionario.values()) {
      variaveis.push({
        simbolo: vf.simbolo,
        nome: vf.descricao,
        unidade: vf.unidade,
        valorFormatado: TEXTO_INDISPONIVEL,
        disponivel: false,
      });
    }
  }

  const formula = decomporFormula(meta.formula, meta.sigla);
  const substituicao = substituirFormula(
    formula,
    componentesPorAno,
    new Set(dicionario.keys()),
    contexto,
  );

  // Histórico multi-anual (US2): todas as variáveis da memória × todos os anos
  // disponíveis do campus; célula sem apuração vira "Dado indisponível" — o
  // ano nunca desaparece da tabela (invariante 4 do data-model).
  const anos = [...obterAnosDisponiveis(dataset, contexto.campus)].sort((a, b) => a - b);
  const simbolos = variaveis.map((v) => v.simbolo);
  const historicoLinhas = simbolos.map((simbolo) => {
    const porAno = componentesPorAno.get(simbolo);
    const valoresPorAno: Record<number, string> = {};
    for (const ano of anos) {
      const quantidade = porAno?.get(ano)?.quantidade ?? null;
      valoresPorAno[ano] = quantidade !== null ? formatValor(quantidade) : TEXTO_INDISPONIVEL;
    }
    return { simbolo, valoresPorAno };
  });

  const memoria: VisaoMemoria = {
    sigla: meta.sigla,
    slug: meta.slug,
    pilarNumero: meta.pilarNumero,
    contexto,
    variaveis,
    formulaDeclarada: meta.formula,
    formulaSubstituida: substituicao.formulaSubstituida,
    formulaSubstituidaAcessivel: substituicao.acessivel,
    valorFinalFormatado,
    unidade: meta.unidade,
    unidadeJaNoValor: ehPercentual,
    disponivel,
    historico: {
      anos,
      anoAtivo: contexto.ano,
      linhas: historicoLinhas,
    },
  };

  if (substituicao.faltou) {
    memoria.nota =
      'A avaliação com os valores deste contexto não pôde ser reconstruída: há variável sem ' +
      'apuração. O valor final exibido é o publicado no relatório oficial.';
  }

  return memoria;
}
