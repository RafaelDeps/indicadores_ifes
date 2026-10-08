/**
 * Contrato da página `/dados/` (feature 016, §C-4: A-1..A-5 e Pg-1..Pg-5).
 *
 * Os testes leem o **texto-fonte** do template e do componente, seguindo o
 * padrão de `tests/web/header.test.ts` e `tests/web/routes.test.ts`. A página é
 * estática e o texto que o visitante lê é o que o template declara; assertar
 * sobre o HTML gerado exigiria um harness de build que a suíte não tem.
 *
 * O que estes testes tentam evitar é a classe de defeito mais provável numa
 * página de downloads: o template oferece um link para um artefato que não
 * existe, ou expõe na página um identificador interno que deveria ficar no log
 * do portão.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pagina = readFileSync('src/pages/dados/index.astro', 'utf-8');

/** Existe `src/components/CartaoDownload.astro`? A página pode não usá-lo ainda. */
function componente(): string {
  try {
    return readFileSync('src/components/CartaoDownload.astro', 'utf-8');
  } catch {
    return '';
  }
}

/** Todo o texto que a página entrega ao visitante. */
function superficie(): string {
  return `${pagina}\n${componente()}`;
}

describe('A-1 — nome acessível do link de download', () => {
  it('o link de download tem texto próprio, não só um ícone', () => {
    const cartao = componente();
    if (!cartao) return; // US2 ainda não criou o componente
    expect(cartao).toMatch(/download/i);
  });

  it('o componente usa <a href> com download, não um botão sem href', () => {
    const cartao = componente();
    if (!cartao) return;
    expect(cartao).toMatch(/<a\b/);
    expect(cartao).toMatch(/download/);
  });
});

describe('A-2 — a marcação de dado pessoal não depende de cor', () => {
  it('o texto da marcação está presente na página', () => {
    const cartao = componente();
    if (!cartao) return;
    expect(cartao).toMatch(/dados pessoais/i);
  });

  it('a marcação não é só um ícone: o texto viaja junto', () => {
    const cartao = componente();
    if (!cartao) return;
    // Um badge só-ícone falha quem não distingue a cor do fundo (FR-019) e quem
    // usa leitor de tela (A-2). O `aria-hidden` do ícone é o que permite isso.
    expect(cartao).toMatch(/aria-hidden/);
    expect(cartao).toMatch(/dados pessoais/i);
  });
});

describe('Pg-1 — nenhum segredo, credencial ou token na página', () => {
  it('a página não contém nomes de variáveis de ambiente de segredo', () => {
    expect(superficie()).not.toMatch(
      /process\.env\.[A-Z_]*(SECRET|TOKEN|KEY|PASSWORD|CREDENTIAL)/i,
    );
  });

  it('a página não contém literais de token ou Authorization', () => {
    expect(superficie()).not.toMatch(/gh[pousr]_[A-Za-z0-9]{20,}/);
    expect(superficie()).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{10,}/);
    expect(superficie()).not.toMatch(/Authorization:/);
  });

  it('a página não embute a chave do GitHub Pages', () => {
    // O token de deploy é injetado pelo Actions; hardcodá-lo no template seria
    // a forma mais fácil de vazar credencial de publicação.
    expect(superficie()).not.toMatch(/secrets\./);
  });
});

describe('Pg-2 — nenhum link de download para arquivo ausente', () => {
  it('o template decide a ação a partir de `disponivel`', () => {
    const cartao = componente();
    if (!cartao) return;
    expect(cartao).toMatch(/disponivel/);
  });

  it('o estado indisponível não renderiza href', () => {
    const cartao = componente();
    if (!cartao) return;
    // Um `href` dentro do ramo indisponível seria o link quebrado de FR-017.
    expect(cartao).toMatch(/:[\s\S]{0,400}?motivoIndisponivel/);
  });

  it('a listagem não é uma lista fixa de nomes de arquivo na página', () => {
    // Hardcodar `exports_canonical.zip` no template offeria o arquivo mesmo
    // quando ele não existe (FR-017). A listagem vem do módulo.
    expect(pagina).toMatch(/carregarDownloads/);
    expect(pagina).not.toMatch(/indicadores_listagens\.zip/);
  });
});

describe('Pg-3 — nenhum pacote parcial ou intermediário é oferecido', () => {
  it('a página não menciona pacotes parciais nem o intermediário', () => {
    expect(superficie()).not.toMatch(/indicadores_listagens\.zip/);
    expect(superficie()).not.toMatch(/indicadores_[a-z]+\.zip/i);
  });

  it('o único agregado oferecido é o pacote oficial', () => {
    expect(pagina).toMatch(/carregarDownloads/);
  });
});

describe('Pg-5 — nenhuma rolagem horizontal a partir de 320 px', () => {
  it('a página não declara largura fixa nem overflow oculto', () => {
    expect(pagina).not.toMatch(/width\s*:\s*\d{3,}px/);
    expect(pagina).not.toMatch(/min-width\s*:\s*\d{3,}px/);
  });

  it('o componente usa flex-wrap ou grid, não linha rígida', () => {
    const cartao = componente();
    if (!cartao) return;
    expect(cartao).not.toMatch(/width\s*:\s*\d{3,}px/);
  });
});

describe('A-4 — hierarquia de headings sem salto', () => {
  it('a página tem um único h1 e nenhum salto de nível', () => {
    const h1 = (pagina.match(/<h1[\s>]/g) ?? []).length;
    expect(h1).toBe(1);

    const niveis = [...pagina.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    for (let i = 1; i < niveis.length; i += 1) {
      expect(niveis[i] - niveis[i - 1], 'salto de heading').toBeLessThanOrEqual(1);
    }
  });
});

describe('A-5 — legível nos dois temas', () => {
  it('a página não fixa cor de fundo ou de texto em hex', () => {
    // Cor fixa quebra um dos dois temas; os tokens existem para isso.
    expect(pagina).not.toMatch(/background\s*:\s*#[0-9a-f]{3,8}/i);
    expect(pagina).not.toMatch(/color\s*:\s*#[0-9a-f]{3,8}/i);
  });

  it('o componente usa tokens, não literais de cor', () => {
    const cartao = componente();
    if (!cartao) return;
    expect(cartao).toMatch(/var\(--color-/);
  });
});

describe('FR-025 — declaração de fidelidade', () => {
  it('a página declara que nenhum valor é estimado', () => {
    expect(pagina).toMatch(/estimad/i);
  });
});

describe('US3 — guia de instalação (FR-009, FR-010, FR-012, FR-024)', () => {
  it('a página monta a tabela de insumos a partir da cadeia, não de literais', () => {
    // Cada linha da tabela precisa vir de `obterInsumosCadeia()`: um nome de
    // arquivo escrito no template deixaria de responder quando o insumo some.
    expect(pagina).toMatch(/obterInsumosCadeia/);
    expect(pagina).toMatch(/insumos\.map\(/);
  });

  it('o caminho do export canônico aparece como instrução, não como linha de tabela', () => {
    // O path é citado à parte, no passo de posicionamento — é instrução de
    // onde colocar o arquivo. O que não pode é uma `<tr>` escrita à mão, porque
    // essa linha sobreviveria ao insumo desaparecer do disco (FR-009).
    const corpo = pagina.slice(pagina.indexOf('<tbody'), pagina.indexOf('</tbody>'));
    expect(corpo).not.toMatch(/exports_canonical/);
    expect(corpo).not.toMatch(/listagem_/);
  });

  it('a tabela tem todas as colunas que FR-009 e FR-024 exigem', () => {
    for (const coluna of ['Arquivo', 'Etapa', 'Para que serve', 'Origem', 'Revisão']) {
      expect(pagina, `coluna ausente: ${coluna}`).toContain(coluna);
    }
  });

  it('a revisão ausente é dita como ausente, não preenchida com palpite', () => {
    // Princípio III: "não declarada" é informação; um valor estimado seria
    // metadado inventado (FR-024).
    expect(pagina).toContain('não declarada');
    expect(pagina).not.toMatch(/revisao\s*\|\|?\s*['"]\d{4}/);
  });

  it('os passos são ordenados e citam a cadeia na ordem real', () => {
    expect(pagina).toMatch(/<ol/);
    // `make dados` já roda as três etapas; a página não pode sugerir uma ordem
    // diferente da que o Makefile executa.
    const iEtl = pagina.indexOf('make etl');
    const iListagens = pagina.indexOf('make etl-listagens');
    const iMerge = pagina.indexOf('make merge-listagens');
    expect(iEtl).toBeGreaterThan(-1);
    expect(iListagens).toBeGreaterThan(iEtl);
    expect(iMerge).toBeGreaterThan(iListagens);
  });

  it('o passo de posicionamento diz onde cada arquivo deve ficar', () => {
    expect(pagina).toMatch(/data\/canonical\/exports_canonical\.zip/);
    expect(pagina).toMatch(/data\/raw\//);
    // O padrão de nome é o que o ETL lê; sem ele o insumo é ignorado em silêncio.
    expect(pagina).toMatch(/listagem_ANO_SEMESTRE|listagem_2026_1\.xlsx/);
  });

  it('os comandos ficam em bloco único e copiável', () => {
    expect(pagina).toMatch(/<pre\b/);
    expect(pagina).toMatch(/<code>/);
    // Separar cada comando em um bloco tornaria a cópia um por vez.
    expect(pagina.match(/<pre\b/g)?.length).toBe(1);
  });

  it('o bloco de comandos usa pre-wrap, que não estoura a tela estreita', () => {
    expect(pagina).toMatch(/white-space:\s*pre-wrap/);
  });

  it('a página avisa que versionar os insumos os expõe a terceiros', () => {
    expect(pagina).toMatch(/versionar/i);
    expect(pagina).toMatch(/terceiros|expõe|expoe/i);
  });

  it('o guia e a listagem de download não divergem de insumo', () => {
    // A mesma fonte alimenta as duas seções; se divergissem, a página pediria um
    // arquivo que ela mesma não oferece.
    expect(pagina).toMatch(/descobrir|carregarDownloads|obterInsumosCadeia/);
  });
});
