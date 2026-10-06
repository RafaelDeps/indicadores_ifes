/**
 * Garantias H-1..H-7 do cabeçalho (feature 016, §C-3).
 *
 * Os testes leem o texto de `BaseLayout.astro` em vez de renderizá-lo, seguindo
 * o padrão de `tests/web/header.test.ts`. A razão é a mesma do resto da suíte:
 * o que estes testes precisam garantir é que o **código-fonte do layout** tenha
 * a marcação certa em todos os breakpoints — uma asserção sobre HTML
 * renderizado não distinguiria um item dentro de `.cabecalho-acoes` de um item
 * dentro de um bloco que a folha de estilo esconde em telas estreitas.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const caminhoLayout = 'src/layouts/BaseLayout.astro';
const layout = readFileSync(caminhoLayout, 'utf-8');

/** Extrai o conteúdo de uma classe de estilo delimitada por chaves. */
function blocoClasse(classe: string): string {
  const abre = layout.indexOf(`.${classe}`);
  if (abre === -1) return '';
  const chavesAbre = layout.indexOf('{', abre);
  if (chavesAbre === -1) return '';
  const chavesFecha = layout.indexOf('}', chavesAbre);
  return layout.slice(chavesAbre, chavesFecha);
}

/** Links que apontam para `/dados/`, com o trecho de marcação ao redor. */
function occurrences(): number[] {
  const posicoes: number[] = [];
  let de = 0;
  for (;;) {
    const achado = layout.indexOf('href="/dados/"', de);
    if (achado === -1) break;
    posicoes.push(achado);
    de = achado + 1;
  }
  return posicoes;
}

/** Janela de `n` caracteres antes do `href`, para achar o elemento pai. */
function contextoAntes(indice: number, n = 400): string {
  return layout.slice(Math.max(0, indice - n), indice);
}

describe('H-1 — o link existe em todas as páginas, por viver no layout', () => {
  it('o link para /dados/ está no layout compartilhado, não em uma página', () => {
    expect(occurrences().length).toBeGreaterThan(0);
    // Se o link estivesse numa página isolada, `BaseLayout` não o teria.
    expect(layout).toContain('href="/dados/"');
  });
});

describe('H-2 — fica em .cabecalho-acoes, nunca em bloco ocultado', () => {
  it('há um link para /dados/ dentro de .cabecalho-acoes', () => {
    expect(blocoClasse('cabecalho-acoes')).not.toBe('');
    // O container em marcação — não a regra de estilo — é o que diz onde o link
    // está. `class="cabecalho-acoes"` e não `.cabecalho-acoes`, que só existe
    // dentro do `<style>`.
    const abre = layout.indexOf('class="cabecalho-acoes"');
    expect(abre, 'bloco de ações ausente da marcação').toBeGreaterThan(-1);

    const dentroDoBloco = occurrences().filter((i) => {
      const antes = layout.lastIndexOf('class="cabecalho-acoes"', i);
      // O link precisa estar depois da abertura do bloco e antes do próximo
      // bloco de nível equivalente.
      const proximo = layout.indexOf('class="drawer-nav"', i);
      return antes !== -1 && (proximo === -1 || antes < proximo);
    });
    expect(dentroDoBloco.length).toBeGreaterThan(0);
  });

  it('.cabecalho-acoes não é ocultado em nenhum media query', () => {
    // H-2 e R-006 juntos: o botão tem de existir no viewport largo *e* no
    // estreito. Se o bloco_recvesse `display: none` em um breakpoint, o link
    // desapareceria justamente do viewport onde não há gaveta para recuperar.
    const queries = layout.match(/@media[^{]*\{/g) ?? [];
    expect(queries.length).toBeGreaterThan(0);
    for (const query of queries) {
      const inicio = layout.indexOf(query);
      const corpo = layout.slice(inicio, inicio + 1500);
      expect(corpo).not.toMatch(/\.cabecalho-acoes\s*\{[^}]*display\s*:\s*none/);
      expect(corpo).not.toMatch(/\.cabecalho-acoes\s*\{[^}]*visibility\s*:\s*hidden/);
    }
  });
});

describe('H-3 — existe item correspondente na gaveta móvel', () => {
  it('.drawer-nav tem um link para /dados/', () => {
    const gaveta = layout.slice(layout.indexOf('drawer-nav'));
    expect(gaveta).toContain('href="/dados/"');
    expect(gaveta).toContain('drawer-link');
  });

  it('há exatamente dois links para /dados/: cabeçalho e gaveta', () => {
    // Um terceiro link duplicaria o destino e criaria dois pontos de entrada
    // para manter em sincronia; nenhum, e o desktop perde o acesso.
    expect(occurrences()).toHaveLength(2);
  });
});

describe('H-4 — o rótulo é exatamente "Dados"', () => {
  it('os dois links têm o texto Dados', () => {
    const comRotulo = occurrences().filter((i) => {
      const trecho = layout.slice(i, i + 200);
      return />\s*Dados\s*</.test(trecho);
    });
    expect(comRotulo).toHaveLength(2);
  });

  it('o rótulo não carrega texto adicional', () => {
    for (const i of occurrences()) {
      const trecho = layout.slice(i, i + 200);
      const conteudo = trecho.match(/>([^<]*)</)?.[1]?.trim();
      expect(conteudo).toBe('Dados');
    }
  });
});

describe('H-5 — aria-current apenas na rota /dados/', () => {
  it('aria-current é condicional a isDados', () => {
    expect(layout).toContain("aria-current={isDados ? 'page' : undefined}");
  });

  it('isDados é derivado do segmento /dados', () => {
    // A comparação passa por `rotaDentroDe`, e não por `startsWith` cru: no
    // build estático `Astro.url.pathname` vem com o base
    // (`/indicadores_ifes/dados/`), então `startsWith('/dados')` era sempre
    // falso — ver `tests/web/rota.test.ts`.
    expect(layout).toContain("const isDados = rotaDentroDe(pathname, rawBaseUrl, 'dados');");
  });

  it('a comparação normaliza o base antes de comparar', () => {
    expect(layout).toContain('import { rotaDentroDe } from');
    expect(layout).toContain("const rawBaseUrl = import.meta.env.BASE_URL ?? '/'");
    // Nenhum `startsWith('/…')` sobre `pathname` sobreviveu: todos os cinco
    // estados de rota passam pela comparação por segmento.
    expect(layout).not.toMatch(/pathname\.startsWith\('\//);
  });

  it('não há aria-current fixo no link de dados', () => {
    // Um `aria-current="page"` literal marcaria /dados/ como a página atual em
    // todas as rotas — o oposto do que o link anuncia.
    for (const i of occurrences()) {
      expect(layout.slice(i, i + 300)).not.toMatch(/aria-current="page"/);
    }
  });
});

describe('H-6 — o href respeita o base do site', () => {
  it('o href é /dados/ relativo, não caminho absoluto de arquivo', () => {
    for (const i of occurrences()) {
      const trecho = layout.slice(i - 60, i + 20);
      expect(trecho).toContain('href="/dados/"');
      expect(trecho).not.toMatch(/href="\/dados\/index\.astro"/);
      expect(trecho).not.toMatch(/href="file:/);
      expect(trecho).not.toMatch(/href="https?:/);
    }
  });
});

describe('H-7 — sem nesting de link, alvo operável por teclado', () => {
  it('os dois alvos são <a href>, não <div> ou <span> com onclick', () => {
    for (const i of occurrences()) {
      const antes = contextoAntes(i, 300);
      expect(antes).not.toMatch(/<div[^>]*$/);
      expect(antes).not.toMatch(/<span[^>]*$/);
      expect(antes).not.toMatch(/onclick/);
    }
  });

  it('o link não contém outro link dentro dele', () => {
    // Nested <a> é erro de HTML e quebra a navegação por teclado.
    expect(layout).not.toMatch(/<a[^>]*>[^<]*<a[^>]*href="\/dados\/"/);
  });
});
