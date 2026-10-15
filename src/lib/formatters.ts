export const TEXTO_INDISPONIVEL = 'Dado indisponível';

const FORMATADOR_NUMERO = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 20 });

const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatValor(valor: number | null): string {
  if (valor === null) {
    return TEXTO_INDISPONIVEL;
  }
  return FORMATADOR_NUMERO.format(valor);
}

export function formatAno(ano: number): string {
  return String(ano);
}

export function formatDate(data: string | null): string {
  if (data === null) {
    return TEXTO_INDISPONIVEL;
  }
  const [ano, mes, dia] = data.split('-').map(Number);
  return FORMATADOR_DATA.format(new Date(Date.UTC(ano, mes - 1, dia)));
}

/**
 * Data de atualização de um artefato de origem (mtime do arquivo), para a
 * rastreabilidade da memória de cálculo (spec 025, FR-009).
 */
export function formatDataArquivo(data: Date | null): string {
  if (data === null) {
    return TEXTO_INDISPONIVEL;
  }
  return FORMATADOR_DATA.format(data);
}

const FORMATADOR_DECIMAL_UMA_CASA = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const UNIDADES_TAMANHO = ['KB', 'MB', 'GB', 'TB'] as const;

/**
 * Tamanho de arquivo em unidades legíveis (pt-BR), para a rastreabilidade da
 * memória de cálculo (spec 025, FR-009).
 */
export function formatBytesLegivel(bytes: number | null): string {
  if (bytes === null) {
    return TEXTO_INDISPONIVEL;
  }
  if (bytes < 1024) {
    return bytes === 1 ? '1 byte' : `${bytes} bytes`;
  }
  let valor = bytes / 1024;
  let indice = 0;
  while (valor >= 1024 && indice < UNIDADES_TAMANHO.length - 1) {
    valor /= 1024;
    indice += 1;
  }
  return `${FORMATADOR_DECIMAL_UMA_CASA.format(valor)} ${UNIDADES_TAMANHO[indice]}`;
}
