import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const caminhoLayout = 'src/layouts/BaseLayout.astro';
const caminhoHome = 'src/pages/index.astro';

describe('Integração de navegação para /sobre-conif/ (US3)', () => {
  const layout = readFileSync(caminhoLayout, 'utf-8');
  const home = readFileSync(caminhoHome, 'utf-8');

  it('o layout calcula isSobreConif usando rotaDentroDe', () => {
    expect(layout).toMatch(/isSobreConif\s*=\s*rotaDentroDe\([^)]*'sobre-conif'\)/);
  });

  it('o cabeçalho principal não polui com /sobre-conif/ em nav-pilares', () => {
    const navPilaresAbre = layout.indexOf('class="nav-pilares"');
    const navPilaresFecha = layout.indexOf('</nav>', navPilaresAbre);
    const trechoNav = layout.slice(navPilaresAbre, navPilaresFecha);

    expect(trechoNav).not.toContain('href="/sobre-conif/"');
  });

  it('o menu drawer móvel possui link para /sobre-conif/', () => {
    const drawerNavAbre = layout.indexOf('class="drawer-nav"');
    const drawerNavFecha = layout.indexOf('</nav>', drawerNavAbre);
    const trechoDrawer = layout.slice(drawerNavAbre, drawerNavFecha);

    expect(trechoDrawer).toContain('href="/sobre-conif/"');
    expect(trechoDrawer).toContain('Sobre o Modelo');
    expect(trechoDrawer).toContain('isSobreConif');
  });

  it('a página inicial (Home) possui card/banner de chamada para /sobre-conif/', () => {
    expect(home).toContain('href="/sobre-conif/"');
    expect(home).toMatch(/modelo CONIF|pilares CONIF/i);
  });
});
