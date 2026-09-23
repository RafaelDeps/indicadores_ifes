import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Logotipo Oficial IFES (Imagem Horizontal Colorida)', () => {
  const caminho = 'src/components/HeaderMarca.astro';
  const conteudo = readFileSync(caminho, 'utf-8');
  const imagem = 'public/ifes-horizontal-cor.png';

  it('possui link acessível apontando para a página inicial', () => {
    expect(conteudo).toContain('href="/"');
    expect(conteudo).toMatch(/aria-label=["'][^"']*Instituto Federal/i);
  });

  it('usa a imagem oficial horizontal hospedada em public/', () => {
    expect(existsSync(imagem), `imagem oficial ausente: ${imagem}`).toBe(true);
    expect(conteudo).toContain('ifes-horizontal-cor.png');
  });

  it('gera o src respeitando a BASE_URL do site', () => {
    expect(conteudo).toContain('import.meta.env.BASE_URL');
    expect(conteudo).toContain('${base}ifes-horizontal-cor.png');
  });

  it('fornece texto alternativo acessível e dimensões explícitas', () => {
    expect(conteudo).toMatch(/<img[^>]*alt=["'][^"']*Instituto Federal[^"']*["']/i);
    expect(conteudo).toMatch(/<img[^>]*width=["']\d+["']/);
    expect(conteudo).toMatch(/<img[^>]*height=["']\d+["']/);
  });

  it('não renderiza mais a grade SVG antiga nem o texto duplicado', () => {
    expect(conteudo.includes('ifes-grid-logo')).toBe(false);
    expect(conteudo.includes('circulo-vermelho')).toBe(false);
    expect(conteudo.includes('bloco-verde')).toBe(false);
    expect(conteudo.includes('INSTITUTO FEDERAL')).toBe(false);
    expect(conteudo.includes('marca-texto')).toBe(false);
  });
});