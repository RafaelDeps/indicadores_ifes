import { describe, expect, it } from 'vitest';
import { avisoAnoEmAndamento } from '../src/lib/anoEmAndamento';

describe('avisoAnoEmAndamento', () => {
  it('retorna o aviso apenas para 2026', () => {
    expect(avisoAnoEmAndamento(2026)).toBe(
      '2026 é um ano em andamento — dados parciais (snapshot de 21/09/2026)',
    );
  });

  it('não retorna aviso para 2024', () => {
    expect(avisoAnoEmAndamento(2024)).toBeNull();
  });

  it('não retorna aviso para 2025', () => {
    expect(avisoAnoEmAndamento(2025)).toBeNull();
  });

  it('não retorna aviso para anos futuros', () => {
    expect(avisoAnoEmAndamento(2027)).toBeNull();
  });
});
