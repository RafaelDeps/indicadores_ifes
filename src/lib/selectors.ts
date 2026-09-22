import type { Indicador, ValorAnual } from '../data/indicadores';
import {
  datasetPadrao,
  obterIndicadoresDoPilar as datasetObterIndicadoresDoPilar,
  obterIndicadorCompleto as datasetObterIndicadorCompleto,
} from './dataset';

export function latestValue(indicador: Indicador): ValorAnual | null {
  const disponiveis = indicador.valores.filter((valor) => valor.valor !== null);
  if (disponiveis.length === 0) {
    return null;
  }
  return disponiveis.reduce((maisRecente, atual) =>
    atual.ano > maisRecente.ano ? atual : maisRecente,
  );
}

export function seriesFor(indicador: Indicador): ValorAnual[] {
  return [...indicador.valores].sort((a, b) => a.ano - b.ano);
}

export function valuesForYear(indicador: Indicador, ano: number): ValorAnual | null {
  return indicador.valores.find((valor) => valor.ano === ano) ?? null;
}

export function valuesForCampusAndYear(
  indicador: Indicador,
  campusSlug: string,
  ano: number,
): ValorAnual | null {
  return (
    indicador.valores.find(
      (valor) => valor.ano === ano && (valor.campus === undefined || valor.campus === campusSlug),
    ) ?? null
  );
}

export function obterIndicadoresPorPilar(
  pilarNumero: 1 | 2 | 3,
  campusSlug = 'serra',
  ano?: number,
): Indicador[] {
  return datasetObterIndicadoresDoPilar(datasetPadrao, pilarNumero, campusSlug, ano);
}

export function obterIndicadorPorSigla(sigla: string, campusSlug = 'serra'): Indicador | undefined {
  return datasetObterIndicadorCompleto(datasetPadrao, sigla, campusSlug);
}
