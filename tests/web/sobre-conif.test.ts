import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CAMINHO_PAGINA = 'src/pages/sobre-conif/index.astro';

describe('Página Sobre o Modelo CONIF (/sobre-conif/)', () => {
  it('o arquivo da página existe na rota canônica', () => {
    expect(existsSync(CAMINHO_PAGINA), `Arquivo ausente: ${CAMINHO_PAGINA}`).toBe(true);
  });

  it('utiliza o BaseLayout com título institucional e sem getStaticPaths dinâmico', () => {
    const conteudo = readFileSync(CAMINHO_PAGINA, 'utf-8');
    expect(conteudo).toContain('BaseLayout');
    expect(conteudo).toContain('CONIF');
    expect(conteudo).not.toContain('getStaticPaths');
  });

  it('possui trilha de navegação (breadcrumb) semântica', () => {
    const conteudo = readFileSync(CAMINHO_PAGINA, 'utf-8');
    expect(conteudo).toContain('nav class="trilha"');
    expect(conteudo).toContain('href="/"');
    expect(conteudo).toContain('aria-current="page"');
  });

  it('apresenta a contextualização institucional do CONIF e propósito da avaliação', () => {
    const conteudo = readFileSync(CAMINHO_PAGINA, 'utf-8');
    // Menciona o Conselho Nacional e a Rede Federal
    expect(conteudo).toMatch(/Conselho Nacional das Instituiç[oõ]es da Rede Federal/i);
    expect(conteudo).toMatch(/Pesquisa.*Inovaç[aã]o/i);
  });

  describe('Estrutura dos 3 Pilares e atalhos para os 9 indicadores', () => {
    it('detalha o Pilar 1 e inclui links para NTPP, QSPP, PIES e PICOT', () => {
      const conteudo = readFileSync(CAMINHO_PAGINA, 'utf-8');
      expect(conteudo).toMatch(/Engajamento Acad[eê]mico e Inclus[aã]o/i);
      expect(conteudo).toContain('/pilar-1/ntpp/');
      expect(conteudo).toContain('/pilar-1/qspp/');
      expect(conteudo).toContain('/pilar-1/pies/');
      expect(conteudo).toContain('/pilar-1/picot/');
    });

    it('detalha o Pilar 2 e inclui links para PINV e PIPDI', () => {
      const conteudo = readFileSync(CAMINHO_PAGINA, 'utf-8');
      expect(conteudo).toMatch(/Fomento e Conex[aã]o com o Ecossistema/i);
      expect(conteudo).toContain('/pilar-2/pinv/');
      expect(conteudo).toContain('/pilar-2/pipdi/');
    });

    it('detalha o Pilar 3 e inclui links para PIPRO, PIPROT e PIPROTR', () => {
      const conteudo = readFileSync(CAMINHO_PAGINA, 'utf-8');
      expect(conteudo).toMatch(/Produtividade e Propriedade Intelectual/i);
      expect(conteudo).toContain('/pilar-3/pipro/');
      expect(conteudo).toContain('/pilar-3/piprot/');
      expect(conteudo).toContain('/pilar-3/piprotr/');
    });
  });

  describe('Foco conciso no Modelo CONIF e seus 3 Pilares', () => {
    it('não exibe cards de foco regional / importância estratégica no modelo CONIF', () => {
      const conteudo = readFileSync(CAMINHO_PAGINA, 'utf-8');
      expect(conteudo).not.toContain('secao-destaque-serra');
      expect(conteudo).not.toContain('Foco Regional');
      expect(conteudo).not.toContain('Importância Estratégica para o Campus Serra');
    });
  });
});
