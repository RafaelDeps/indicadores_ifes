import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Desduplicação de controles (YearLinks e IndicadorDetalhe)', () => {
  it('garante que YearLinks não contém seletores duplicados de campus e ano', () => {
    const yearLinksPath = path.resolve(__dirname, '../../src/components/YearLinks.astro');
    if (fs.existsSync(yearLinksPath)) {
      const content = fs.readFileSync(yearLinksPath, 'utf-8');
      expect(content).not.toContain('data-seletor-campus');
      expect(content).not.toContain('data-seletor-ano');
    }
  });

  it('garante que IndicadorDetalhe existe e não renderiza seletores redundantes de campus/ano', () => {
    const detalhePath = path.resolve(__dirname, '../../src/components/IndicadorDetalhe.astro');
    expect(fs.existsSync(detalhePath)).toBe(true);
    const content = fs.readFileSync(detalhePath, 'utf-8');
    expect(content).not.toContain('<select');
  });
});
