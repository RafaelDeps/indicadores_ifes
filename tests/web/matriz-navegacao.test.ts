import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CAMINHO_BASE_LAYOUT = 'src/layouts/BaseLayout.astro';
const CAMINHO_INDEX = 'src/pages/index.astro';

describe('User Story 4: Integração de Navegação Global e Gaveta de Navegação', () => {
  it('o cabeçalho desktop mantém navegação limpa sem o link para a Matriz em nav-pilares', () => {
    const conteudo = readFileSync(CAMINHO_BASE_LAYOUT, 'utf-8');
    const navPilaresAbre = conteudo.indexOf('class="nav-pilares"');
    const navPilaresFecha = conteudo.indexOf('</nav>', navPilaresAbre);
    const trechoNav = conteudo.slice(navPilaresAbre, navPilaresFecha);

    expect(trechoNav).not.toContain('href="/matriz/"');
  });

  it('o menu drawer de navegação contém o link para a Matriz com aria-current', () => {
    const conteudo = readFileSync(CAMINHO_BASE_LAYOUT, 'utf-8');
    const drawerNavAbre = conteudo.indexOf('class="drawer-nav"');
    const drawerNavFecha = conteudo.indexOf('</nav>', drawerNavAbre);
    const trechoDrawer = conteudo.slice(drawerNavAbre, drawerNavFecha);

    expect(trechoDrawer).toContain('href="/matriz/"');
    expect(trechoDrawer).toContain('drawer-link');
    expect(trechoDrawer).toMatch(/aria-current=\{isMatriz \? ['"]page['"] : undefined\}/);
  });

  it('a página inicial (index.astro) contém atalho ou banner direcionando para /matriz/', () => {
    const conteudo = readFileSync(CAMINHO_INDEX, 'utf-8');
    expect(conteudo).toContain('/matriz/');
  });
});
