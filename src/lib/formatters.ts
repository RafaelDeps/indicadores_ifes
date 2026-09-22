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
