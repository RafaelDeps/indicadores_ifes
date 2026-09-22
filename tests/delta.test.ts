import { describe, it, expect } from 'vitest';
import { calcularDelta } from '../src/lib/delta';
import type { ValorAnual } from '../src/data/indicadores';

describe('Cálculo de Variação (Delta)', () => {
  it('retorna sem_base quando não há exercício anterior na série', () => {
    const serie: ValorAnual[] = [{ ano: 2026, valor: 10 }];
    const delta = calcularDelta(serie, 2026);
    expect(delta.tipo).toBe('sem_base');
    expect(delta.valorFormatado).toBe('Sem base anterior');
    expect(delta.positivo).toBeNull();
  });

  it('retorna sem_base quando o exercício atual é nulo', () => {
    const serie: ValorAnual[] = [
      { ano: 2025, valor: 10 },
      { ano: 2026, valor: null },
    ];
    const delta = calcularDelta(serie, 2026);
    expect(delta.tipo).toBe('sem_base');
    expect(delta.valorFormatado).toBe('Sem base anterior');
  });

  it('retorna sem_base quando o exercício anterior é nulo', () => {
    const serie: ValorAnual[] = [
      { ano: 2025, valor: null },
      { ano: 2026, valor: 15 },
    ];
    const delta = calcularDelta(serie, 2026);
    expect(delta.tipo).toBe('sem_base');
    expect(delta.valorFormatado).toBe('Sem base anterior');
  });

  it('calcula variação percentual positiva quando anterior > 0 e atual > anterior', () => {
    const serie: ValorAnual[] = [
      { ano: 2025, valor: 100 },
      { ano: 2026, valor: 125 },
    ];
    const delta = calcularDelta(serie, 2026);
    expect(delta.tipo).toBe('percentual');
    expect(delta.valorFormatado).toBe('▲ +25,0%');
    expect(delta.positivo).toBe(true);
  });

  it('calcula variação percentual negativa quando anterior > 0 e atual < anterior', () => {
    const serie: ValorAnual[] = [
      { ano: 2025, valor: 200 },
      { ano: 2026, valor: 150 },
    ];
    const delta = calcularDelta(serie, 2026);
    expect(delta.tipo).toBe('percentual');
    expect(delta.valorFormatado).toBe('▼ -25,0%');
    expect(delta.positivo).toBe(false);
  });

  it('calcula variação percentual neutra (0%) quando atual == anterior', () => {
    const serie: ValorAnual[] = [
      { ano: 2025, valor: 50 },
      { ano: 2026, valor: 50 },
    ];
    const delta = calcularDelta(serie, 2026);
    expect(delta.tipo).toBe('percentual');
    expect(delta.valorFormatado).toBe('0,0%');
    expect(delta.positivo).toBeNull();
  });

  it('calcula diferença absoluta quando o valor anterior é 0 e o atual é positivo', () => {
    const serie: ValorAnual[] = [
      { ano: 2025, valor: 0 },
      { ano: 2026, valor: 5 },
    ];
    const delta = calcularDelta(serie, 2026);
    expect(delta.tipo).toBe('absoluto');
    expect(delta.valorFormatado).toBe('▲ +5');
    expect(delta.positivo).toBe(true);
  });

  it('calcula diferença absoluta quando o valor anterior é 0 e o atual é 0', () => {
    const serie: ValorAnual[] = [
      { ano: 2025, valor: 0 },
      { ano: 2026, valor: 0 },
    ];
    const delta = calcularDelta(serie, 2026);
    expect(delta.tipo).toBe('absoluto');
    expect(delta.valorFormatado).toBe('0');
    expect(delta.positivo).toBeNull();
  });
});
