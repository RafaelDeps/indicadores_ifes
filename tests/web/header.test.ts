import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Cabeçalho Fixo, Abas de Pilares e Gaveta Móvel', () => {
  const caminhoLayout = 'src/layouts/BaseLayout.astro';
  const layout = readFileSync(caminhoLayout, 'utf-8');

  it('declara cabeçalho fixo com position sticky', () => {
    expect(layout).toMatch(/header|\.topo/);
    expect(layout).toContain('position: sticky');
  });

  it('contém abas de navegação direta para os 3 pilares e visão geral', () => {
    expect(layout).toContain('href="/"');
    expect(layout).toContain('href="/pilar-1/"');
    expect(layout).toContain('href="/pilar-2/"');
    expect(layout).toContain('href="/pilar-3/"');
    expect(layout).toContain('Visão geral');
    expect(layout).toContain('Pilar 1');
    expect(layout).toContain('Pilar 2');
    expect(layout).toContain('Pilar 3');
  });

  it('possui botão de acionamento do menu móvel com atributos ARIA', () => {
    expect(layout).toMatch(/aria-controls=["']mobile-drawer["']/);
    expect(layout).toMatch(/aria-expanded/);
    expect(layout).toMatch(/aria-label=["'][^"']*menu/i);
  });

  it('contém a estrutura da gaveta móvel (slide-over drawer) com backdrop', () => {
    expect(layout).toContain('id="mobile-drawer"');
    expect(layout).toMatch(/role=["']dialog["']/);
    expect(layout).toMatch(/aria-modal=["']true["']/);
    expect(layout).toMatch(/drawer-backdrop/);
  });
});
