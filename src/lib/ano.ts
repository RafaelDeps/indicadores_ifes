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
