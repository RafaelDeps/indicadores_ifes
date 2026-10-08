import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extrairParametrosDeUrl, construirUrlComParametros } from '../../src/lib/contexto-cliente';

describe('User Story 1 - Interface Web Exclusiva para o Campus Serra', () => {
  const caminhoLayout = 'src/layouts/BaseLayout.astro';
  const layout = readFileSync(caminhoLayout, 'utf-8');

  it('declara a opção (Todos) como desativada (disabled) no seletor de topo', () => {
    // Verifica que o seletor de cabeçalho desativa o slug 'todos'
    expect(layout).toMatch(/id=["']filtro-campus-topo["']/);
    expect(layout).toContain("disabled={c.slug === 'todos'}");
    expect(layout).toContain("{c.slug === 'todos' ? ' (Desativado)' : ''}");
  });

  it('declara a opção (Todos) como desativada (disabled) no seletor da gaveta móvel (drawer)', () => {
    // Verifica que o seletor da gaveta móvel desativa o slug 'todos'
    expect(layout).toMatch(/id=["']filtro-campus-drawer["']/);
    const trechoDrawer = layout.slice(layout.indexOf('filtro-campus-drawer'));
    expect(trechoDrawer).toContain("disabled={c.slug === 'todos'}");
  });

  it('configura o Campus Serra como valor padrão inicial no frontmatter do BaseLayout', () => {
    // Quando campus for nulo ou 'todos', deve adotar 'serra'
    expect(layout).toContain(
      "urlCampusParam && urlCampusParam !== 'todos' ? urlCampusParam : 'serra'",
    );
  });

  it('normaliza parâmetros de busca: extrai campus e ano corretamente', () => {
    const paramsSerra = extrairParametrosDeUrl('?campus=serra&ano=2025');
    expect(paramsSerra.campus).toBe('serra');
    expect(paramsSerra.ano).toBe('2025');

    const paramsVazio = extrairParametrosDeUrl('');
    expect(paramsVazio.campus).toBeNull();
  });

  it('constrói URL com parâmetro campus preservando serra e omitindo todos', () => {
    const urlSerra = construirUrlComParametros('https://indicadores.ifes.br/', 'serra', 2025);
    expect(urlSerra).toContain('campus=serra');
    expect(urlSerra).toContain('ano=2025');

    const urlTodos = construirUrlComParametros('https://indicadores.ifes.br/', 'todos', 2025);
    expect(urlTodos).not.toContain('campus=todos');
  });
});
