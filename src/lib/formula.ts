export type TipoFormula = 'fracao' | 'soma' | 'direta';

export interface TermoFracao {
  numerador: string;
  denominador: string;
  multiplicador?: string;
  operadorMult?: string;
}

export interface FormulaEstruturada {
  siglaResultado: string;
  tipo: TipoFormula;
  textoAcessivel: string;
  fracao?: TermoFracao;
  termosSoma?: string[];
  expressaoDireta?: string;
}

/**
 * Decompõe a string da fórmula de cálculo em um modelo estruturado com tipos,
 * variáveis identificadas e texto descritivo para leitores de tela.
 */
export function decomporFormula(formula: string, siglaPadrao: string = ''): FormulaEstruturada {
  if (!formula || typeof formula !== 'string') {
    return {
      siglaResultado: siglaPadrao,
      tipo: 'direta',
      textoAcessivel: `Fórmula de cálculo para ${siglaPadrao}`,
      expressaoDireta: '',
    };
  }

  const partes = formula.split('=').map((p) => p.trim());
  const membroEsquerdo = partes[0] || siglaPadrao;
  const membroDireito = partes.length > 1 ? partes.slice(1).join('=').trim() : partes[0];

  // Caso 1: Fração com divisão (ex.: "(NEP / NTE) × 100" ou "NEP / NTE")
  if (membroDireito.includes('/')) {
    // Procura padrão com multiplicador opcional: (NUM / DEN) [×*] MULT ou NUM / DEN
    const regexFracaoMult = /^\(?\s*([^/]+?)\s*\/\s*([^)]+?)\s*\)?(?:\s*[×*]\s*(\d+))?$/;
    const match = membroDireito.match(regexFracaoMult);

    if (match) {
      const numerador = match[1].trim();
      const denominador = match[2].trim();
      const multiplicador = match[3] ? match[3].trim() : undefined;

      const textoAcessivel = multiplicador
        ? `Fórmula de cálculo: ${membroEsquerdo} é igual a ${numerador} dividido por ${denominador}, multiplicado por ${multiplicador}`
        : `Fórmula de cálculo: ${membroEsquerdo} é igual a ${numerador} dividido por ${denominador}`;

      return {
        siglaResultado: membroEsquerdo,
        tipo: 'fracao',
        textoAcessivel,
        fracao: {
          numerador,
          denominador,
          multiplicador,
          operadorMult: multiplicador ? '×' : undefined,
        },
      };
    }
  }

  // Caso 2: Soma com operadores aditivos (ex.: "NPB + NPT" ou "CT + CL + CC")
  if (membroDireito.includes('+')) {
    const termosSoma = membroDireito.split('+').map((t) => t.trim());
    const textoAcessivel = `Fórmula de cálculo: ${membroEsquerdo} é igual a ${termosSoma.join(' mais ')}`;

    return {
      siglaResultado: membroEsquerdo,
      tipo: 'soma',
      textoAcessivel,
      termosSoma,
    };
  }

  // Caso 3: Expressão direta / contagem declarada (ex.: "Projetos registrados em execução" ou "SUPP")
  return {
    siglaResultado: membroEsquerdo,
    tipo: 'direta',
    textoAcessivel: `Fórmula de cálculo: ${membroEsquerdo} é igual a ${membroDireito}`,
    expressaoDireta: membroDireito,
  };
}
