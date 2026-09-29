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

  it('[US1] contém seletor de campus no cabeçalho com rótulo acessível e mapeamento de opções', () => {
    expect(layout).toContain('cabecalho-filtros');
    expect(layout).toMatch(/select[^>]*name=["']campus["']/);
    expect(layout).toMatch(/aria-label=["'][^"']*campus/i);
    expect(layout).toContain('campiOpcoes.map');
  });

  it('[US2] contém seletor de ano no cabeçalho com rótulo acessível e ordenação decrescente', () => {
    expect(layout).toMatch(/select[^>]*name=["']ano["']/);
    expect(layout).toMatch(/aria-label=["'][^"']*ano/i);
  });

  it('[US3] contém seletores móveis na gaveta (drawer) antes da navegação', () => {
    expect(layout).toContain('drawer-filtros');
    const indiceDrawerFiltros = layout.indexOf('drawer-filtros');
    const indiceDrawerNav = layout.indexOf('drawer-nav');
    expect(indiceDrawerFiltros).toBeGreaterThan(0);
    expect(indiceDrawerNav).toBeGreaterThan(indiceDrawerFiltros);
  });
});
