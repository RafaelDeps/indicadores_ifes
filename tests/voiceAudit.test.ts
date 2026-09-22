import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  TITULOS_CANONICOS,
  TERMOS_PROIBIDOS,
  extrairViolacoes,
  temEmoji,
} from '../src/lib/voiceAudit';

function arquivosAstroRecursivos(diretorio: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = `${diretorio}/${entrada.name}`;
    if (entrada.isDirectory()) {
      encontrados.push(...arquivosAstroRecursivos(caminho));
    } else if (entrada.name.endsWith('.astro')) {
      encontrados.push(caminho);
    }
  }
  return encontrados;
}

function arquivosDeInterface(): string[] {
  return [...arquivosAstroRecursivos('src/components'), ...arquivosAstroRecursivos('src/pages')];
}

describe('wordlist de voz institucional', () => {
  it('lista exata de termos proibidos', () => {
    expect(TERMOS_PROIBIDOS).toEqual([
      'poderoso',
      'premium',
      'inteligente',
      'eleve',
      'transforme',
      'potencialize',
    ]);
  });

  it('detecta emoji em texto', () => {
    expect(temEmoji('Título com 🚀')).toBe(true);
    expect(temEmoji('Título institucional')).toBe(false);
    expect(temEmoji('Ver detalhes →')).toBe(false);
  });

  it('extrai violações na ordem da wordlist, sem duplicatas', () => {
    const violacoes = extrairViolacoes('Potencialize os resultados com o sistema poderoso');
    expect(violacoes).toEqual(['poderoso', 'potencialize']);
  });
});

describe('strings da interface', () => {
  it('nenhum termo proibido ou emoji nos componentes e páginas', () => {
    for (const arquivo of arquivosDeInterface()) {
      const violacoes = extrairViolacoes(readFileSync(arquivo, 'utf-8'));
      expect(violacoes, `violações em ${arquivo}: ${violacoes.join(', ')}`).toEqual([]);
    }
  });

  it('títulos e rótulos canônicos presentes em sentence case', () => {
    const tudo = arquivosDeInterface()
      .map((arquivo) => readFileSync(arquivo, 'utf-8'))
      .join('\n');
    for (const titulo of TITULOS_CANONICOS) {
      expect(tudo.includes(titulo), `título canônico ausente: ${titulo}`).toBe(true);
    }
  });
});
