import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CAMINHO_COMPONENTE = 'src/components/MatrizIndicadores.astro';
const CAMINHO_PAGINA = 'src/pages/matriz/index.astro';

describe('Componente MatrizIndicadores e Página /matriz/', () => {
  describe('User Story 1: Visão Tabular Consolidada (MVP)', () => {
    it('o componente MatrizIndicadores existe e contém tabela HTML semântica com aria-label', () => {
      expect(existsSync(CAMINHO_COMPONENTE)).toBe(true);
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('<table');
      expect(conteudo).toMatch(/<table[^>]*aria-label=/);
      expect(conteudo).toContain('<thead');
      expect(conteudo).toContain('<tbody');
      expect(conteudo).toContain('<th scope="col"');
    });

    it('possui cabeçalhos de coluna ordenáveis com botões e atributo aria-sort', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('data-coluna="pilar"');
      expect(conteudo).toContain('data-coluna="sigla"');
      expect(conteudo).toContain('data-coluna="nome"');
      expect(conteudo).toContain('aria-sort');
      expect(conteudo).toContain('class="btn-ordenar"');
    });

    it('a página estática src/pages/matriz/index.astro existe e utiliza BaseLayout', () => {
      expect(existsSync(CAMINHO_PAGINA)).toBe(true);
      const conteudo = readFileSync(CAMINHO_PAGINA, 'utf-8');
      expect(conteudo).toContain('BaseLayout');
      expect(conteudo).toContain('MatrizIndicadores');
      expect(conteudo).toMatch(/title=["'][^"']*Matriz[^"']*["']/i);
    });
  });

  describe('User Story 2: Filtragem Rápida por Tags Temáticas', () => {
    it('possui contêiner de chips de tags com role="group" e botões acessíveis aria-pressed', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('role="group"');
      expect(conteudo).toContain('aria-pressed');
      expect(conteudo).toContain('data-chip-tag');
      expect(conteudo).toContain('chip-tag');
    });

    it('inclui a opção de tag "Todas" como filtro padrão inicial', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('data-chip-tag="todas"');
    });
  });

  describe('User Story 3: Busca Textual Instantânea Integrada', () => {
    it('possui campo de busca textual acessível e botão de limpar busca', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('type="search"');
      expect(conteudo).toContain('data-busca-matriz');
      expect(conteudo).toContain('data-btn-limpar-busca');
    });

    it('possui elemento de aviso de estado vazio para zero resultados com botão de reset', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('data-estado-vazio');
      expect(conteudo).toContain('data-btn-reset-filtros');
    });

    it('possui script cliente embutido implementando a filtragem e ordenação reativas', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('<script>');
      expect(conteudo).toContain('filtrarLinhas');
      expect(conteudo).toContain('ordenarLinhas');
    });
  });
});
