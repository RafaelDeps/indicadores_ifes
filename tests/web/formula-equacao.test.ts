import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CAMINHO_COMPONENTE = 'src/components/FormulaEquacao.astro';
const CAMINHO_DETALHE = 'src/components/IndicadorDetalhe.astro';

describe('Componente FormulaEquacao e Integração em IndicadorDetalhe', () => {
  it('o arquivo do componente FormulaEquacao.astro existe', () => {
    expect(existsSync(CAMINHO_COMPONENTE), `Arquivo ausente: ${CAMINHO_COMPONENTE}`).toBe(true);
  });

  it('IndicadorDetalhe importa e utiliza FormulaEquacao', () => {
    const detalhe = readFileSync(CAMINHO_DETALHE, 'utf-8');
    expect(detalhe).toContain('FormulaEquacao');
    expect(detalhe).toMatch(/<FormulaEquacao[^>]*formula=/);
  });

  describe('Estrutura de Fração e Operadores (US1)', () => {
    it('o componente FormulaEquacao possui elementos de fração vertical e traço fracionário', () => {
      const componente = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(componente).toContain('termo-fracao');
      expect(componente).toContain('traco-fracao');
      expect(componente).toContain('numerador');
      expect(componente).toContain('denominador');
    });

    it('o componente substitui asterisco por operador de multiplicação × e suporta constante', () => {
      const componente = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(componente).toContain('operador-mult');
      expect(componente).toContain('×');
    });
  });

  describe('Correlação com a Tabela de Variáveis (US2)', () => {
    it('as variáveis na fórmula recebem data-variavel-simbolo e tabindex="0"', () => {
      const componente = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(componente).toContain('data-variavel-simbolo');
      expect(componente).toContain('tabindex="0"');
    });

    it('a tabela em IndicadorDetalhe possui data-linha-variavel nas linhas tr', () => {
      const detalhe = readFileSync(CAMINHO_DETALHE, 'utf-8');
      expect(detalhe).toContain('data-linha-variavel');
    });

    it('existe script de correlação com classe destaque-ativo para sincronizar hover e foco', () => {
      const detalhe = readFileSync(CAMINHO_DETALHE, 'utf-8');
      expect(detalhe).toContain('destaque-ativo');
    });
  });

  describe('Acessibilidade para Leitores de Tela e Contraste (US3)', () => {
    it('o componente inclui texto acessível com classe sr-only e aria-hidden na equação visual', () => {
      const componente = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(componente).toContain('sr-only');
      expect(componente).toContain('aria-hidden="true"');
      expect(componente).toContain('role="region"');
    });

    it('os estilos utilizam tokens institucionais garantindo conformidade com modo escuro', () => {
      const componente = readFileSync(CAMINHO_COMPONENTE, 'utf-8');
      expect(componente).toContain('var(--color-primary');
      expect(componente).toContain('var(--color-border');
      expect(componente).toContain('var(--color-ink');
    });
  });
});
