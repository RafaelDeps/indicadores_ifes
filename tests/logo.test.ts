import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lerTokens } from './tokens.test';

describe('Logotipo Oficial IFES (Grade de 9 Blocos)', () => {
  const caminho = 'src/components/HeaderMarca.astro';
  const conteudo = readFileSync(caminho, 'utf-8');
  const tokens = lerTokens()[':root'];

  it('possui link acessível apontando para a página inicial', () => {
    expect(conteudo).toContain('href="/"');
    expect(conteudo).toMatch(/aria-label=["'][^"']*Instituto Federal/i);
  });

  it('possui o círculo vermelho oficial (#e6323e) no quadrante superior esquerdo via tokens', () => {
    expect(conteudo).toMatch(/<circle[^>]*class=["'][^"']*circulo-vermelho[^"']*["']/i);
    expect(tokens['--color-red-primary']).toBe('#e6323e');
  });

  it('possui exatamente 8 quadrados verdes (#178447) completando a grade 3x3 via tokens', () => {
    const matchesVerdes = conteudo.match(/<rect[^>]*class=["'][^"']*bloco-verde[^"']*["']/gi) ?? [];
    expect(matchesVerdes.length).toBe(8);
    expect(tokens['--color-primary']).toBe('#178447');
  });

  it('exibe a tipografia institucional oficial com INSTITUTO FEDERAL e Espírito Santo', () => {
    expect(conteudo).toContain('INSTITUTO FEDERAL');
    expect(conteudo).toContain('Espírito Santo');
  });
});
