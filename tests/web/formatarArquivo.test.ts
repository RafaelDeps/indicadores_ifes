/**
 * Metadados exibidos por artefato (feature 016, FR-006, T024, T036, T044).
 *
 * A formatação fica em `src/lib/formatarArquivo.ts` para ser testável sem
 * renderizar Astro. Os casos de borda abaixo — byte zero, locale do host,
 * ano único — são os que quebram em produção: um `toLocaleString()` sem locale
 * explícito escreve "17.2 KB" num build de CI e "17,2 KB" na máquina de quem
 * leu a página.
 */

import { describe, expect, it } from 'vitest';

import {
  formatarAnos,
  formatarBytes,
  formatarCampi,
  formatarDataArquivo,
  formatarFormato,
} from '../../src/lib/formatarArquivo';

describe('formatarBytes', () => {
  it('usa bytes inteiros abaixo de 1 KB', () => {
    expect(formatarBytes(0)).toBe('0 B');
    expect(formatarBytes(512)).toBe('512 B');
    expect(formatarBytes(1023)).toBe('1.023 B');
  });

  it('promove para KB, MB e GB na escala certa', () => {
    expect(formatarBytes(1024)).toBe('1,0 KB');
    expect(formatarBytes(1024 * 1024)).toBe('1,0 MB');
    expect(formatarBytes(1024 * 1024 * 1024)).toBe('1,0 GB');
    expect(formatarBytes(17_578)).toBe('17,2 KB');
  });

  it('usa vírgula decimal, em pt-BR, não ponto', () => {
    // `en-US` fixo é o que garante isto; sem locale o host decide.
    expect(formatarBytes(17_578)).toContain(',');
    expect(formatarBytes(17_578)).not.toContain('17.2');
  });

  it('não usa casa decimal em bytes', () => {
    // "1,0 B" sugeriria uma medição fracionária que não houve.
    expect(formatarBytes(1024 * 1024)).toBe('1,0 MB');
    expect(formatarBytes(999)).toBe('999 B');
  });

  it('devolve travessão para valor ausente ou inválido', () => {
    expect(formatarBytes(null)).toBe('—');
    expect(formatarBytes(-1)).toBe('—');
    expect(formatarBytes(Number.NaN)).toBe('—');
  });
});

describe('formatarDataArquivo', () => {
  it('formata em dd/mm/aaaa', () => {
    expect(formatarDataArquivo(new Date('2026-10-05T00:00:00Z'))).toBe('05/10/2026');
  });

  it('devolve travessão quando não há data', () => {
    expect(formatarDataArquivo(null)).toBe('—');
  });

  it('usa UTC, então a data não muda com o fuso da máquina', () => {
    // 23:30 UTC já é o dia seguinte em Brasília; sem `timeZone` a mesma data
    // sairia "06/10" num build e "05/10" noutro.
    expect(formatarDataArquivo(new Date('2026-10-05T23:30:00Z'))).toBe('05/10/2026');
  });
});

describe('formatarAnos', () => {
  it('abrevia um intervalo', () => {
    expect(formatarAnos([2024, 2025, 2026])).toBe('2024 a 2026');
  });

  it('mostra um único ano sem intervalo', () => {
    expect(formatarAnos([2025])).toBe('2025');
    expect(formatarAnos([2025, 2025])).toBe('2025');
  });

  it('ordena antes de formatar', () => {
    expect(formatarAnos([2026, 2024, 2025])).toBe('2024 a 2026');
  });

  it('devolve travessão quando não há cobertura', () => {
    expect(formatarAnos([])).toBe('—');
  });
});

describe('formatarCampi', () => {
  it('resume o escopo agregado como "todos"', () => {
    expect(formatarCampi(['todos'])).toBe('todos');
  });

  it('lista os campus quando não é o escopo agregado', () => {
    expect(formatarCampi(['serra'])).toBe('serra');
    expect(formatarCampi(['serra', 'aleixo'])).toBe('serra, aleixo');
  });

  it('devolve travessão para lista vazia', () => {
    expect(formatarCampi([])).toBe('—');
  });
});

describe('formatarFormato', () => {
  it('extrai a extensão em maiúsculas', () => {
    expect(formatarFormato('indicadores.zip')).toBe('ZIP');
    expect(formatarFormato('listagem_2026_1.xlsx')).toBe('XLSX');
  });

  it('devolve travessão quando não há extensão', () => {
    expect(formatarFormato('sem-extensao')).toBe('—');
  });
});
