import type { Indicador } from '../data/indicadores';
import { ANO_EM_ANDAMENTO } from './anoEmAndamento';

const ANO_MINIMO = 2000;
const ANO_MAXIMO = 2100;

export function anoPadrao(indicador: Indicador): number | null {
  const anosComValor = indicador.valores
    .filter((valor) => valor.valor !== null)
    .map((valor) => valor.ano);
  const anosFechados = anosComValor.filter((ano) => ano !== ANO_EM_ANDAMENTO);
  if (anosFechados.length > 0) {
    return Math.max(...anosFechados);
  }
  if (anosComValor.length > 0) {
    return Math.max(...anosComValor);
  }
  return null;
}

export function anoSolicitado(valorConsulta: string | null, indicador: Indicador): number | null {
  if (valorConsulta !== null && valorConsulta !== '') {
    const numero = Number(valorConsulta);
    if (Number.isInteger(numero) && numero >= ANO_MINIMO && numero <= ANO_MAXIMO) {
      return numero;
    }
  }
  return anoPadrao(indicador);
}

export function campusPadrao(campiDisponiveis: string[] = ['todos', 'serra']): string {
  if (campiDisponiveis.includes('todos')) {
    return 'todos';
  }
  return campiDisponiveis[0] || 'serra';
}

export function campusSolicitado(
  valorConsulta: string | null,
  campiDisponiveis: string[] = ['todos', 'serra'],
): string {
  if (valorConsulta && typeof valorConsulta === 'string') {
    const limpo = valorConsulta.trim().toLowerCase();
    if (campiDisponiveis.includes(limpo)) {
      return limpo;
    }
  }
  return campusPadrao(campiDisponiveis);
}

export function construirQueryString(campus?: string, ano?: number | null): string {
  const params = new URLSearchParams();
  if (campus) {
    params.set('campus', campus);
  }
  if (ano !== undefined && ano !== null) {
    params.set('ano', String(ano));
  }
  const str = params.toString();
  return str ? `?${str}` : '';
}

export interface OpcaoCampusMinima {
  slug: string;
  nome?: string;
}

export function resolverContextoFiltro(
  paramCampus: string | null | undefined,
  paramAno: string | null | undefined,
  campiValidos: OpcaoCampusMinima[],
  anosValidos: number[],
): { campus: string; ano: number } {
  const anoMaisRecente = anosValidos[0] || 2026;

  let campusFinal = 'todos';
  if (paramCampus) {
    const slugLimpo = paramCampus.trim().toLowerCase();
    if (campiValidos.some((c) => c.slug === slugLimpo)) {
      campusFinal = slugLimpo;
    }
  }

  let anoFinal = anoMaisRecente;
  if (paramAno) {
    const anoNum = parseInt(paramAno, 10);
    if (!isNaN(anoNum) && anosValidos.includes(anoNum)) {
      anoFinal = anoNum;
    }
  }

  return {
    campus: campusFinal,
    ano: anoFinal,
  };
}
