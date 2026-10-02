import { describe, expect, it } from 'vitest';
import { normalizarDestinoLink } from '../../src/lib/contexto-cliente';

describe('propagacao-links (normalização de links internos com contexto)', () => {
  it('anexa parâmetros de campus e ano a um link interno relativo', () => {
    const link = '/pilar-1/';
    const resultado = normalizarDestinoLink(link, 'serra', 2024, '/indicadores_ifes');
    expect(resultado).toBe('/indicadores_ifes/pilar-1/?campus=serra&ano=2024');
  });

  it('não altera links externos ou especiais (https:, mailto:, #)', () => {
    expect(normalizarDestinoLink('https://ifes.edu.br', 'serra', 2024, '')).toBe(
      'https://ifes.edu.br',
    );
    expect(normalizarDestinoLink('#topo', 'serra', 2024, '')).toBe('#topo');
    expect(normalizarDestinoLink('mailto:contato@ifes.edu.br', 'serra', 2024, '')).toBe(
      'mailto:contato@ifes.edu.br',
    );
  });

  it('substitui parâmetros existentes de campus e ano pelos novos parâmetros ativos', () => {
    const link = '/indicadores_ifes/pilar-2/?campus=vitoria&ano=2025';
    const resultado = normalizarDestinoLink(link, 'serra', 2024, '/indicadores_ifes');
    expect(resultado).toBe('/indicadores_ifes/pilar-2/?campus=serra&ano=2024');
  });
});
