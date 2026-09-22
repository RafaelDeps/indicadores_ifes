import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import CartaoPilar from '../src/components/CartaoPilar.astro';

const BASE = {
  numero: 1,
  titulo: 'Pesquisa e Inovação',
  descricao: 'Indicadores de pesquisa e inovação aplicada.',
};

function estiloDoComponente(): string {
  const fonte = readFileSync('src/components/CartaoPilar.astro', 'utf-8');
  return fonte.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
}

function regra(css: string, seletor: string): string {
  const escapado = seletor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escapado}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

async function renderizar(props: Record<string, unknown>): Promise<string> {
  const container = await AstroContainer.create();
  return container.renderToString(CartaoPilar, { props });
}

describe('CartaoPilar', () => {
  it('o pilar disponível renderiza como um link para a página do pilar', async () => {
    const html = await renderizar({ ...BASE, status: 'ativo', href: '/pilar-1/' });

    const link = html.match(/<a\b[^>]*class="cartao"[^>]*>/);
    expect(link, 'cartão disponível deve ser um <a class="cartao">').not.toBeNull();
    expect(link?.[0]).toContain('href="/pilar-1/"');
    expect(html, 'não pode sobrar elemento <conteudo>').not.toContain('<conteudo');
  });

  it('o link envolve o cartão inteiro, com a chamada "Ver indicadores"', async () => {
    const html = await renderizar({ ...BASE, status: 'ativo', href: '/pilar-1/' });

    const link = html.match(/<a\b[^>]*class="cartao"[^>]*>([\s\S]*?)<\/a>/);
    expect(link, 'cartão deve fechar como </a>').not.toBeNull();
    const conteudo = link?.[1] ?? '';
    expect(conteudo).toContain('Pilar 1');
    expect(conteudo).toContain('Ver indicadores');
  });

  it('os pilares "em breve" não renderizam como link', async () => {
    for (const numero of [2, 3]) {
      const html = await renderizar({
        numero,
        titulo: `Pilar ${numero}`,
        descricao: 'Conjunto de indicadores, em breve neste painel.',
        status: 'em-breve',
      });

      expect(html.match(/<a\b/), `pilar ${numero} virou link`).toBeNull();
      expect(html, `pilar ${numero} deve ser um <div class="cartao">`).toMatch(
        /<div\b[^>]*class="cartao"/,
      );
    }
  });

  it('o link do cartão disponível tem hover e foco visíveis no cartão inteiro', async () => {
    const html = await renderizar({ ...BASE, status: 'ativo', href: '/pilar-1/' });
    const css = estiloDoComponente();

    expect(html, 'cartão disponível deve ser um link').toMatch(/<a\b[^>]*class="cartao"/);

    const hover = regra(css, 'a.cartao:hover');
    expect(hover, 'estado :hover do cartão ausente').toContain('border-color');

    const foco = regra(css, 'a.cartao:focus-visible');
    expect(foco, 'contorno de foco :focus-visible ausente').toContain('outline');
  });

  it('os pilares "em breve" têm estilo visivelmente desabilitado', async () => {
    const html = await renderizar({
      numero: 2,
      titulo: 'Pilar 2',
      descricao: 'Conjunto de indicadores, em breve neste painel.',
      status: 'em-breve',
    });
    const css = estiloDoComponente();

    expect(html, 'cartão "em breve" deve ser um <div>').toMatch(/<div\b[^>]*class="cartao"/);
    const desabilitado = regra(css, 'div.cartao');
    expect(desabilitado, 'regra de opacidade do cartão desabilitado ausente').toContain('opacity');
  });
});
