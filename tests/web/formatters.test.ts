import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatAno,
  formatValor,
  formatDataArquivo,
  formatBytesLegivel,
} from '../../src/lib/formatters';

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

describe('formatDataArquivo (feature 025)', () => {
  it('renderiza data nula como "Dado indisponível"', () => {
    expect(formatDataArquivo(null)).toBe('Dado indisponível');
  });

  it('formata Date como dd/mm/aaaa (pt-BR, UTC)', () => {
    expect(formatDataArquivo(new Date(Date.UTC(2026, 8, 21, 14, 30)))).toBe('21/09/2026');
  });

  it('não desloca o dia em fusos à oeste do UTC', () => {
    expect(formatDataArquivo(new Date(Date.UTC(2026, 0, 1, 23, 59)))).toBe('01/01/2026');
  });
});

describe('formatBytesLegivel (feature 025)', () => {
  it('renderiza tamanho nulo como "Dado indisponível"', () => {
    expect(formatBytesLegivel(null)).toBe('Dado indisponível');
  });

  it('formata zero como "0 bytes"', () => {
    expect(formatBytesLegivel(0)).toBe('0 bytes');
  });

  it('formata bytes abaixo de 1 KB sem casas decimais', () => {
    expect(formatBytesLegivel(512)).toBe('512 bytes');
  });

  it('formata KB com uma casa decimal (pt-BR)', () => {
    expect(formatBytesLegivel(2048)).toBe('2,0 KB');
  });

  it('formata MB com uma casa decimal (pt-BR)', () => {
    expect(formatBytesLegivel(5 * 1024 * 1024)).toBe('5,0 MB');
  });

  it('formata GB com uma casa decimal (pt-BR)', () => {
    expect(formatBytesLegivel(1.5 * 1024 * 1024 * 1024)).toBe('1,5 GB');
  });

  it('divide em múltiplos enquanto a unidade cresce', () => {
    expect(formatBytesLegivel(3 * 1024 * 1024 * 1024 * 1024)).toBe('3,0 TB');
  });
});
