import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CAMINHO_TOKENS = 'src/styles/tokens.css';

interface Escopo {
  [token: string]: string;
}

export function lerTokens(): Record<string, Escopo> {
  const css = readFileSync(CAMINHO_TOKENS, 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@media[^{]+\{/g, '');
  const escopos: Record<string, Escopo> = {};
  const bloco = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = bloco.exec(css)) !== null) {
    const seletor = m[1].replace(/\s+/g, ' ').replace(/'/g, '"').trim();
    const corpo = m[2];
    const tokens: Escopo = {};
    const declaracao = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let d: RegExpExecArray | null;
    while ((d = declaracao.exec(corpo)) !== null) {
      tokens[d[1]] = d[2].replace(/\s+/g, '').trim();
    }
    escopos[seletor] = { ...(escopos[seletor] ?? {}), ...tokens };
  }
  return escopos;
}

const PALETA_CLARA: Record<string, string> = {
  '--color-primary': '#178447',
  '--color-primary-dark': '#0c3929',
  '--color-red-primary': '#e6323e',
  '--color-emerald-50': '#ecfdf5',
  '--color-emerald-700': '#047857',
  '--color-ink': '#0f172a',
  '--color-bg': '#f7f9f8',
  '--color-surface': '#ffffff',
  '--color-border': '#e2e8f0',
  '--color-muted': '#475569',
  '--color-notice-text': '#7a4d00',
  '--color-notice-bg': '#fcf4e4',
  '--color-notice-border': '#b45309',
};

const PALETA_ESCURA: Record<string, string> = {
  '--color-primary': '#22a35b',
  '--color-primary-dark': '#34d399',
  '--color-accent-amber': '#fbbf24',
  '--color-ink': '#f8fafc',
  '--color-bg': '#091711',
  '--color-surface': '#0f291e',
  '--color-border': 'rgba(255,255,255,0.12)',
  '--color-muted': '#94a3b8',
  '--color-notice-text': '#fbbf24',
  '--color-notice-bg': '#2b2411',
  '--color-notice-border': '#fbbf24',
};

describe('contrato de tokens (identidade institucional IFES)', () => {
  it('define a paleta institucional em :root', () => {
    const claro = lerTokens()[':root'];
    for (const [nome, valor] of Object.entries(PALETA_CLARA)) {
      expect(claro[nome], `${nome} ausente ou incorreto no escopo claro`).toBe(valor);
    }
  });

  it('define a paleta escura em [data-theme="escuro"]', () => {
    const escuro = lerTokens()['[data-theme="escuro"]'];
    expect(escuro, 'escopo escuro ausente').toBeDefined();
    for (const [nome, valor] of Object.entries(PALETA_ESCURA)) {
      expect(escuro[nome], `${nome} ausente ou incorreto no escopo escuro`).toBe(valor);
    }
  });

  it('declara a tipografia moderna com Manrope ou fonte limpa', () => {
    const claro = lerTokens()[':root'];
    expect(claro['--font-sans']).toContain('Manrope');
  });
});
