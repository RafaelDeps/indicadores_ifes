import { describe, expect, it } from 'vitest';
import { jsonCompacto, ordenarPorId } from '../../src/etl/serialize';

describe('ordenarPorId', () => {
  it('ordena em ordem crescente de id', () => {
    const registros = [{ id: 3 }, { id: 1 }, { id: 2 }];
    expect(ordenarPorId(registros).map((r) => r.id)).toEqual([1, 2, 3]);
  });

  it('não muta o array original', () => {
    const origem = [{ id: 2 }, { id: 1 }];
    ordenarPorId(origem);
    expect(origem.map((r) => r.id)).toEqual([2, 1]);
  });

  it('é estável para ids iguais (preserva ordem de entrada)', () => {
    const registros = [
      { id: 1, ordem: 'a' },
      { id: 1, ordem: 'b' },
      { id: 1, ordem: 'c' },
    ];
    expect(ordenarPorId(registros).map((r) => r.ordem)).toEqual(['a', 'b', 'c']);
  });
});

describe('jsonCompacto', () => {
  it('serializa sem espaços', () => {
    expect(jsonCompacto({ a: 1, b: null })).toBe('{"a":1,"b":null}');
  });

  it('preserva a ordem de inserção das chaves (base do determinismo)', () => {
    const primeiro = jsonCompacto({ campus: 'Serra', ano_referencia: 2024 });
    const segundo = jsonCompacto({ ano_referencia: 2024, campus: 'Serra' });
    expect(primeiro).not.toBe(segundo);
    expect(primeiro).toBe('{"campus":"Serra","ano_referencia":2024}');
  });

  it('serializa null estritamente (nunca omitido)', () => {
    expect(jsonCompacto({ x: null })).toBe('{"x":null}');
  });
});
