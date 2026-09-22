import { describe, expect, it } from 'vitest';
import { formatDate, formatAno, formatValor } from '../src/lib/formatters';

describe('formatValor', () => {
  it('renderiza valor nulo como "Dado indisponível"', () => {
    expect(formatValor(null)).toBe('Dado indisponível');
  });

  it('renderiza zero como "0" (zero legítimo do relatório)', () => {
    expect(formatValor(0)).toBe('0');
  });

  it('formata decimais com vírgula (pt-BR)', () => {
    expect(formatValor(42.5)).toBe('42,5');
  });

  it('formata milhares no padrão pt-BR', () => {
    expect(formatValor(1234.56)).toBe('1.234,56');
  });

  it('preserva a precisão do valor transcrito do relatório', () => {
    expect(formatValor(7.125)).toBe('7,125');
  });
});

describe('formatAno', () => {
  it('renderiza o ano sem separadores', () => {
    expect(formatAno(2024)).toBe('2024');
  });
});

describe('formatDate', () => {
  it('renderiza data nula como "Dado indisponível"', () => {
    expect(formatDate(null)).toBe('Dado indisponível');
  });

  it('formata ISO YYYY-MM-DD como dd/mm/aaaa (pt-BR)', () => {
    expect(formatDate('2026-09-21')).toBe('21/09/2026');
  });
});
