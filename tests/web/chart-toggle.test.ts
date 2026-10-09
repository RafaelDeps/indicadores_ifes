import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CAMINHO_COMPONENTE = 'src/components/SeriesChart.astro';

describe('Componente SeriesChart: Alternância entre Linha e Barras (Feature 021)', () => {
  it('o arquivo SeriesChart.astro existe', () => {
    expect(existsSync(CAMINHO_COMPONENTE), `Arquivo ausente: ${CAMINHO_COMPONENTE}`).toBe(true);
  });

  it('o componente importa mapearBarras da biblioteca chart', () => {
    const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
    expect(conteudo).toContain('mapearBarras');
  });

  describe('User Story 1: Estrutura dos Controles e Camada SVG de Barras (MVP)', () => {
    it('possui botões de alternância para linha e barras', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('data-btn-modo="linha"');
      expect(conteudo).toContain('data-btn-modo="barras"');
    });

    it('possui camadas SVG separadas para linha e barras', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('data-camada-linha');
      expect(conteudo).toContain('data-camada-barras');
    });

    it('renderiza elementos de barra rect e identifica o ano ativo', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toMatch(/<rect[^>]*class:list/);
      expect(conteudo).toContain('barra-ativa');
    });
  });

  describe('User Story 2: Acessibilidade Semântica e Atributos ARIA', () => {
    it('o container de botões possui role="group" e rótulo acessível', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('role="group"');
      expect(conteudo).toMatch(/aria-label=["'][^"']*visualização[^"']*["']/i);
    });

    it('os botões de alternância utilizam aria-pressed', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('aria-pressed');
    });

    it('script cliente gerencia comutação de estado e aria-pressed', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain("setAttribute('aria-pressed'");
    });
  });

  describe('User Story 3: Dados Indisponíveis, Modo Escuro e Persistência de Sessão', () => {
    it('trata visualmente anos indisponíveis com classe barra-indisponivel', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('barra-indisponivel');
    });

    it('grava e recupera a preferência no sessionStorage', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('sessionStorage.getItem');
      expect(conteudo).toContain('sessionStorage.setItem');
      expect(conteudo).toContain('ifes_grafico_modo');
    });

    it('utiliza design tokens para garantir alto contraste nos temas', () => {
      const conteudo = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(conteudo).toContain('var(--color-primary');
      expect(conteudo).toContain('var(--color-border');
      expect(conteudo).toContain('var(--color-surface');
    });
  });
});
