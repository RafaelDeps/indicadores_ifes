import { describe, expect, it } from 'vitest';
import { taxaContraste } from '../src/lib/contrast';
import { lerTokens } from './tokens.test';

const CLAVE = {
  claro: ':root',
  escuro: '[data-theme="escuro"]',
} as const;

type NomeEscopo = keyof typeof CLAVE;

interface Par {
  fg: string;
  bg: string;
  tipo: 'texto' | 'nao-texto';
}

function pares(tokens: Record<string, string>): Par[] {
  const t = (nome: string) => tokens[nome];
  return [
    { fg: t('--color-ink'), bg: t('--color-bg'), tipo: 'texto' },
    { fg: t('--color-ink'), bg: t('--color-surface'), tipo: 'texto' },
    { fg: t('--color-primary-dark'), bg: t('--color-surface'), tipo: 'texto' },
    { fg: t('--color-primary-dark'), bg: t('--color-bg'), tipo: 'texto' },
    { fg: t('--color-muted'), bg: t('--color-surface'), tipo: 'texto' },
    { fg: t('--color-muted'), bg: t('--color-bg'), tipo: 'texto' },
    { fg: t('--color-notice-text'), bg: t('--color-notice-bg'), tipo: 'texto' },
    { fg: t('--color-primary'), bg: t('--color-surface'), tipo: 'nao-texto' },
  ];
}

describe('matriz de contraste claro/escuro (WCAG AA)', () => {
  const css = lerTokens();

  for (const nome of Object.keys(CLAVE) as NomeEscopo[]) {
    it(`escopo ${nome}: todos os pares cumprem WCAG AA`, () => {
      const tokens = css[CLAVE[nome]];
      expect(tokens, `escopo ausente: ${CLAVE[nome]}`).toBeDefined();
      for (const par of pares(tokens)) {
        const razao = taxaContraste(par.fg, par.bg);
        const minimo = par.tipo === 'texto' ? 4.5 : 3;
        expect(
          razao,
          `par ${par.fg} sobre ${par.bg} (${par.tipo}) no escopo ${nome}: ${razao}`,
        ).toBeGreaterThanOrEqual(minimo);
      }
    });
  }
});
