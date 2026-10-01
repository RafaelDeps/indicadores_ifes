import type { DatasetCompleto } from './dataset-core';
import { obterAnosDisponiveis } from './dataset-core';

export interface ContextoResolvido {
  campus: string;
  ano: number;
  ajustado: boolean;
}

const ANO_MINIMO = 2000;
const ANO_MAXIMO = 2100;

export function resolverContextoComAjuste(
  paramCampus: string | null | undefined,
  paramAno: string | null | undefined | number,
  dataset: DatasetCompleto,
): ContextoResolvido {
  let campusFinal = 'todos';
  if (paramCampus && typeof paramCampus === 'string') {
    const slugLimpo = paramCampus.trim().toLowerCase();
    if (dataset.campi.some((c) => c.slug === slugLimpo)) {
      campusFinal = slugLimpo;
    }
  }

  const anosDisponiveis = obterAnosDisponiveis(dataset, campusFinal);
  const anoMaisRecente =
    anosDisponiveis.length > 0 ? anosDisponiveis[anosDisponiveis.length - 1] : 2026;

  let anoFinal = anoMaisRecente;
  let ajustado = false;

  if (paramAno !== null && paramAno !== undefined && paramAno !== '') {
    const anoNum = typeof paramAno === 'number' ? paramAno : parseInt(String(paramAno).trim(), 10);
    if (!isNaN(anoNum)) {
      if (anosDisponiveis.includes(anoNum)) {
        anoFinal = anoNum;
        ajustado = false;
      } else {
        // Ano não pertence aos anos disponíveis do campus (FR-013)
        if (anoNum >= ANO_MINIMO && anoNum <= ANO_MAXIMO && anosDisponiveis.length > 0) {
          // Encontra o ano mais próximo disponível no campus (preferindo o mais recente em empate)
          const maisProximo = [...anosDisponiveis].sort((a, b) => {
            const diffA = Math.abs(a - anoNum);
            const diffB = Math.abs(b - anoNum);
            if (diffA === diffB) return b - a;
            return diffA - diffB;
          })[0];
          anoFinal = maisProximo ?? anoMaisRecente;
        } else {
          anoFinal = anoMaisRecente;
        }
        ajustado = true;
      }
    }
  }

  return {
    campus: campusFinal,
    ano: anoFinal,
    ajustado,
  };
}
