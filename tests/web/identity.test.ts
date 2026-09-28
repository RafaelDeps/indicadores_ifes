import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FONTES = [
  'public/fonts/source-sans-3-400.woff2',
  'public/fonts/source-sans-3-600.woff2',
  'public/fonts/source-sans-3-700.woff2',
];

function arquivosAstro(diretorio: string): string[] {
  return readdirSync(diretorio)
    .filter((arquivo) => arquivo.endsWith('.astro'))
    .map((arquivo) => `${diretorio}/${arquivo}`);
}

describe('identidade própria do site', () => {
  it('hospeda exatamente as três fontes Source Sans 3 e nenhuma Ubuntu', () => {
    for (const fonte of FONTES) {
      expect(existsSync(fonte), `fonte ausente: ${fonte}`).toBe(true);
    }
    const fontesNoDiretorio = readdirSync('public/fonts');
    const ubuntu = fontesNoDiretorio.filter((fonte) => fonte.toLowerCase().includes('ubuntu'));
    expect(ubuntu, `fontes Ubuntu remanescentes: ${ubuntu.join(', ')}`).toEqual([]);
  });

  it('declara @font-face com BASE_URL e font-display swap no BaseLayout', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf-8');
    expect(layout).toContain('@font-face');
    expect(layout).toContain('import.meta.env.BASE_URL');
    expect(layout).toContain('font-display: swap');
    expect(layout).toContain('Source Sans 3');
  });

  it('renderiza o monograma IF e a marca textual Indicadores IFES', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf-8');
    expect(layout).toContain('HeaderMarca');
    expect(layout).toContain('Indicadores IFES');
  });

  it('não deixa elemento nenhum da marca Horizon', () => {
    for (const arquivo of [
      ...arquivosAstro('src/components'),
      ...arquivosAstro('src/layouts'),
      'src/styles/tokens.css',
    ]) {
      const conteudo = readFileSync(arquivo, 'utf-8');
      expect(conteudo.includes('InstitutionalStripe'), `faixa Horizon em ${arquivo}`).toBe(false);
      expect(conteudo.includes('Ubuntu'), `Ubuntu em ${arquivo}`).toBe(false);
      expect(conteudo.includes('faixa-amarelo'), `faixa em ${arquivo}`).toBe(false);
    }
    expect(existsSync('src/components/InstitutionalStripe.astro')).toBe(false);
  });

  it('não tem painel de acessibilidade nem state module', () => {
    expect(existsSync('src/components/AccessibilityBar.astro')).toBe(false);
    expect(existsSync('src/lib/uiState.ts')).toBe(false);
    expect(existsSync('tests/uiState.test.ts')).toBe(false);
    for (const arquivo of [...arquivosAstro('src/components'), ...arquivosAstro('src/layouts')]) {
      const conteudo = readFileSync(arquivo, 'utf-8');
      expect(conteudo.includes('AccessibilityBar'), `painel em ${arquivo}`).toBe(false);
      expect(conteudo.includes('uiState'), `uiState em ${arquivo}`).toBe(false);
      expect(conteudo.includes('data-contrast'), `data-contrast em ${arquivo}`).toBe(false);
      expect(conteudo.includes('data-fontsize'), `data-fontsize em ${arquivo}`).toBe(false);
    }
  });

  it('mantém o controle automático de tema escuro (data-theme)', () => {
    const layout = readFileSync('src/layouts/BaseLayout.astro', 'utf-8');
    expect(layout).toMatch(/data-theme="auto"/);
    expect(layout).toContain('prefers-color-scheme');
  });

  it('não usa hex fora do arquivo de tokens', () => {
    const arquivos = [...arquivosAstro('src/components'), ...arquivosAstro('src/layouts')];
    for (const arquivo of arquivos) {
      const conteudo = readFileSync(arquivo, 'utf-8');
      const hexes = conteudo.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
      expect(hexes, `hex direto encontrado em ${arquivo}: ${hexes.join(', ')}`).toEqual([]);
    }
  });

  it('não referencia fontes por CDN externo', () => {
    for (const arquivo of arquivosAstro('src/layouts')) {
      const urls = readFileSync(arquivo, 'utf-8').match(/https?:\/\/[^"'\s)]+/g) ?? [];
      expect(urls, `URL externa em ${arquivo}`).toEqual([]);
    }
  });
});
