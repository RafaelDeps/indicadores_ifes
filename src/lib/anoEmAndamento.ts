export const ANO_EM_ANDAMENTO = 2026;

export const DATA_SNAPSHOT = '21/09/2026';

export const AVISO_ANO_EM_ANDAMENTO = `${ANO_EM_ANDAMENTO} é um ano em andamento — dados parciais (snapshot de ${DATA_SNAPSHOT})`;

export function avisoAnoEmAndamento(ano: number): string | null {
  return ano === ANO_EM_ANDAMENTO ? AVISO_ANO_EM_ANDAMENTO : null;
}
