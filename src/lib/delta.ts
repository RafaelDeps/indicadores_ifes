import type { ValorAnual, VariavelDelta } from '../data/indicadores';

/**
 * Calcula a variação (delta) de um indicador em relação ao ano imediatamente anterior.
 *
 * Regras:
 * 1. Se não houver ano anterior na série ou qualquer valor for nulo: 'sem_base'.
 * 2. Se o ano anterior for > 0: variação percentual com 1 casa decimal e indicador de direção.
 * 3. Se o ano anterior for = 0: diferença absoluta com indicador de direção.
 */
export function calcularDelta(serie: ValorAnual[], anoAtual: number): VariavelDelta {
  const ordenados = [...serie].sort((a, b) => a.ano - b.ano);
  const indexAtual = ordenados.findIndex((item) => item.ano === anoAtual);

  if (indexAtual <= 0) {
    return {
      tipo: 'sem_base',
      valorFormatado: 'Sem base anterior',
      positivo: null,
      simbolo: '',
      descricaoAcessivel: 'Sem base de comparação anterior',
      anoAnterior: null,
    };
  }

  const atual = ordenados[indexAtual];
  const anterior = ordenados[indexAtual - 1];

  if (atual.valor === null || anterior.valor === null) {
    return {
      tipo: 'sem_base',
      valorFormatado: 'Sem base anterior',
      positivo: null,
      simbolo: '',
      descricaoAcessivel: 'Sem base de comparação anterior',
      anoAnterior: anterior.ano,
    };
  }

  const vAtual = atual.valor;
  const vAnterior = anterior.valor;

  if (vAnterior > 0) {
    const diff = vAtual - vAnterior;
    const perc = (diff / vAnterior) * 100;

    if (diff === 0) {
      return {
        tipo: 'percentual',
        valorFormatado: '0,0%',
        positivo: null,
        simbolo: '=',
        descricaoAcessivel: `Sem alteração percentual em relação a ${anterior.ano}`,
        anoAnterior: anterior.ano,
      };
    }

    const formatted = Math.abs(perc).toFixed(1).replace('.', ',');

    return {
      tipo: 'percentual',
      valorFormatado: diff > 0 ? `▲ +${formatted}%` : `▼ -${formatted}%`,
      positivo: diff > 0,
      simbolo: diff > 0 ? '▲' : '▼',
      descricaoAcessivel:
        diff > 0
          ? `Aumento de ${formatted}% em relação a ${anterior.ano}`
          : `Redução de ${formatted}% em relação a ${anterior.ano}`,
      anoAnterior: anterior.ano,
    };
  }

  // Caso onde vAnterior === 0
  const diff = vAtual - vAnterior;
  if (diff === 0) {
    return {
      tipo: 'absoluto',
      valorFormatado: '0',
      positivo: null,
      simbolo: '=',
      descricaoAcessivel: `Sem alteração absoluta em relação a ${anterior.ano}`,
      anoAnterior: anterior.ano,
    };
  }

  return {
    tipo: 'absoluto',
    valorFormatado: diff > 0 ? `▲ +${diff}` : `▼ -${Math.abs(diff)}`,
    positivo: diff > 0,
    simbolo: diff > 0 ? '▲' : '▼',
    descricaoAcessivel:
      diff > 0
        ? `Aumento de ${diff} em relação a ${anterior.ano}`
        : `Redução de ${Math.abs(diff)} em relação a ${anterior.ano}`,
    anoAnterior: anterior.ano,
  };
}
