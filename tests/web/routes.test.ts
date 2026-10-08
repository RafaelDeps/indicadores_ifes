import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const PAGINAS = [
  'src/pages/index.astro',
  'src/pages/pilar-1/index.astro',
  'src/pages/pilar-1/[sigla].astro',
  'src/pages/pilar-2/index.astro',
  'src/pages/pilar-2/[sigla].astro',
  'src/pages/pilar-3/index.astro',
  'src/pages/pilar-3/[sigla].astro',
  'src/pages/dados/index.astro',
];

describe('contrato de rotas dos 3 pilares CONIF', () => {
  it('possui as páginas para os 3 pilares e detalhe de indicadores', () => {
    for (const pagina of PAGINAS) {
      expect(existsSync(pagina), `página ausente: ${pagina}`).toBe(true);
    }
  });

  it('remove as rotas antigas /indicadores/', () => {
    expect(existsSync('src/pages/indicadores'), 'rotas antigas ainda presentes').toBe(false);
  });

  it('a home apresenta os três pilares CONIF ativos sem selo "em breve"', () => {
    const home = readFileSync('src/pages/index.astro', 'utf-8');
    expect(home).toContain('CartaoPilar');
    expect(home).toContain('pilar-1');
    expect(home).toContain('pilar-2');
    expect(home).toContain('pilar-3');
    // Não deve conter pilares em breve na home
    expect(home).not.toContain('status="em-breve"');
  });

  it('cada visão de pilar renderiza os cartões com o padrão de rota correto', () => {
    const p1 = readFileSync('src/pages/pilar-1/index.astro', 'utf-8');
    expect(p1).toContain('IndicatorCard');

    const p2 = readFileSync('src/pages/pilar-2/index.astro', 'utf-8');
    expect(p2).toContain('IndicatorCard');

    const p3 = readFileSync('src/pages/pilar-3/index.astro', 'utf-8');
    expect(p3).toContain('IndicatorCard');
  });

  it('as páginas de detalhe geram rotas via getStaticPaths', () => {
    for (const pilarNum of [1, 2, 3]) {
      const detalhe = readFileSync(`src/pages/pilar-${pilarNum}/[sigla].astro`, 'utf-8');
      expect(detalhe).toContain('getStaticPaths');
      expect(detalhe).toContain('sigla');
    }
  });

  it('a página de downloads é acessível pela rota /dados/', () => {
    // A rota precisa ser `/dados/` e não `/dados` — o Astro resolve o
    // diretório para `dados/index.html`, e o link do cabeçalho depende disso.
    expect(existsSync('src/pages/dados/index.astro')).toBe(true);
    expect(existsSync('src/pages/dados.astro')).toBe(false);
  });

  it('a página de downloads não exige getStaticPaths — é estática e única', () => {
    const dados = readFileSync('src/pages/dados/index.astro', 'utf-8');
    // Uma rota sem parâmetro não tem o que parametrizar; `getStaticPaths`
    // aqui sugeriria que a página gera rotas dinâmicas, que ela não gera.
    expect(dados).not.toContain('getStaticPaths');
  });
});
