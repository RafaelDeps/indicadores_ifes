export const TERMOS_PROIBIDOS = [
  'poderoso',
  'premium',
  'inteligente',
  'eleve',
  'transforme',
  'potencialize',
] as const;

export const TITULOS_CANONICOS = [
  'Indicadores de Pesquisa e Inovação',
  'Visão geral dos pilares',
  'Indicadores do Pilar 1',
  'Valor por ano',
  'Série histórica',
  'Metodologia',
  'Dado indisponível',
  'Quanto maior, melhor',
  'Ver detalhes',
] as const;

const PADRAO_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

export function temEmoji(texto: string): boolean {
  return PADRAO_EMOJI.test(texto);
}

export function extrairViolacoes(texto: string): string[] {
  const violacoes: string[] = [];
  const minusculo = texto.toLowerCase();
  for (const termo of TERMOS_PROIBIDOS) {
    if (minusculo.includes(termo)) {
      violacoes.push(termo);
    }
  }
  if (temEmoji(texto)) {
    violacoes.push('emoji');
  }
  return violacoes;
}
