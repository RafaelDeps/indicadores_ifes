/**
 * Legibilidade dos cartões de download (feature 016).
 *
 * A página `/dados/` falhava de um jeito que nenhum teste anterior pegava, porque
 * todos os contratos vigentes mediam *presença* — o link existe, o texto do badge
 * existe, o aviso não depende de cor. Nenhum medía **quanto** texto existe. Um
 * cartão pode cumprir A-2, Pg-2 e FR-015 ao mesmo tempo e ainda assim ser
 * ilegível, e era o que acontecia.
 *
 * Os quatro defeitos, e o que cada um produzia na tela:
 *
 * 1. O aviso de dado pessoal aparecia **três vezes por cartão** (intro da seção,
 *    badge, descrição) e 17 vezes na página. Repetido assim, vira fundo: o
 *    visitante aprende a pulá-lo, e o aviso perde a função de parar a mão antes
 *    do clique — que é o que FR-015 pede.
 * 2. O badge dividia a mesma linha flex do `h3` com `space-between`. Título e
 *    badge são largos demais para conviver, então a linha quebrava quase sempre e
 *    o badge landingava sozinho na borda, longe do botão que ele alerta.
 * 3. `grid-template-columns: repeat(auto-fit, minmax(0, 1fr))` resolve para
 *    **uma coluna em qualquer largura** — `auto-fit` colapsa as pistas extras e a
 *    única `1fr` que sobra ocupa a linha inteira. A 960px isso são cartões de
 *    920px de conteúdo, ~128 caracteres por linha, 1,7× o ideal de 45–75.
 * 4. Metadados em pares `dt`/`dd` inline, quatro deles em sequência: ocupavam
 *    920px em uma linha só e quebravam no meio do par em tela estreita.
 *
 * Os testes leem o texto-fonte dos arquivos, como `pagina-dados.test.ts`.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pagina = readFileSync('src/pages/dados/index.astro', 'utf-8');
const cartao = readFileSync('src/components/CartaoDownload.astro', 'utf-8');
const downloads = readFileSync('src/lib/downloads.ts', 'utf-8');

/** CSS do componente, para as asserções de layout. */
function cssDoCartao(): string {
  return cartao.slice(cartao.indexOf('<style>'));
}

/** CSS da página, para as asserções de layout. */
function cssDaPagina(): string {
  return pagina.slice(pagina.indexOf('<style>'));
}

/** Corpo do frontmatter de `downloads.ts`, sem os testes e os comentários. */
function fonteDeDownloads(): string {
  return downloads;
}

describe('legibilidade — o aviso de dado pessoal aparece uma vez por cartão', () => {
  it('o badge não repete a cláusula "não anonimizado"', () => {
    // O badge é o marcador de antes-do-clique. Carregar a frase inteira ali
    // duplica o que a intro da seção já disse e transforma o aviso em ruído.
    const textoDoBadge = cartao.slice(
      cartao.indexOf('marca-dado-pessoal'),
      cartao.indexOf('</svg>'),
    );
    expect(textoDoBadge).not.toMatch(/anonimizad/i);
  });

  it('o badge identifica dados pessoais mesmo sem a cláusula', () => {
    expect(cartao).toMatch(/Contém dados pessoais/);
  });

  it('a descrição de uma planilha não repete o aviso', () => {
    // `descricaoPara` era a terceira ocorrência. A descrição diz o que o
    // arquivo é; quem diz que ele tem dado pessoal é o badge.
    const ramoPlanilha = downloads.slice(
      downloads.indexOf('function descricaoPara'),
      downloads.indexOf('function descricaoPara') + 2000,
    );
    const textos = ramoPlanilha.match(/'[^']*'/g) ?? [];
    const texto = textos.join(' ').replace(/Contém dados\s*pessoais/, '');
    expect(texto).not.toMatch(/dados pessoais/i);
  });

  it('a descrição do export canônico não repete o aviso', () => {
    expect(descricaoDe('exports_canonical.zip')).not.toMatch(/dados pessoais/i);
  });

  it('a descrição do agregado não repete "não contém dados pessoais"', () => {
    expect(descricaoDe('indicadores.zip')).not.toMatch(/não contém dados pessoais/i);
  });

  it('o aviso sobrevive uma vez, na intro da seção de insumos brutos', () => {
    const inicio = pagina.indexOf('id="titulo-insumos"');
    const sectStart = pagina.lastIndexOf('<section', inicio);
    const end = pagina.indexOf('id="titulo-instalacao"', inicio);
    const intro =
      sectStart !== -1 && end !== -1 ? pagina.slice(sectStart, end) : pagina.slice(inicio, end);
    expect(intro).toMatch(/não está anonimizado/i);
  });
});

/** Extrai a cadeia de concatenação que `descricaoPara` devolve para um arquivo. */
function descricaoDe(nomeArquivo: string): string {
  const inicio = downloads.indexOf('function descricaoPara');
  const _fim = downloads.indexOf('function ler_pendencias', inicio) || downloads.length;
  const corpo = downloads.slice(inicio, inicio + 2400);
  const trecho = corpo.slice(corpo.indexOf(nomeArquivo));
  const textos = trecho.match(/'[^']*'/g) ?? [];
  return textos.join(' ').replace(/\s+/g, ' ').trim();
}

describe('legibilidade — o badge tem a linha dele', () => {
  it('o cabeçalho do cartão não é uma linha flex título+badge', () => {
    // `justify-content: space-between` numa linha com dois textos largos só
    // produz quebra — e a quebra joga o badge para o canto oposto ao botão.
    const topo = cartao.slice(cartao.indexOf('.cartao-topo'), cartao.indexOf('.cartao-titulo'));
    expect(topo).not.toMatch(/space-between/);
  });

  it('o badge ocupa a largura disponível, não o inlineNatural', () => {
    const marca = cssDoCartao().slice(
      cssDoCartao().indexOf('.marca-dado-pessoal'),
      cssDoCartao().indexOf('.marca-icone'),
    );
    expect(marca).toMatch(/align-self:\s*start/);
  });

  it('o badge não é uma pílula que quebra em várias linhas', () => {
    // `border-radius: 999px` com texto que quebra em 320px desenha uma cápsula
    // de três linhas. O raio curto sobrevive à quebra legível.
    const marca = cssDoCartao().slice(
      cssDoCartao().indexOf('.marca-dado-pessoal'),
      cssDoCartao().indexOf('.marca-icone'),
    );
    expect(marca).not.toMatch(/999px/);
  });
});

describe('legibilidade — o nome do arquivo não aparece duas vezes', () => {
  it('o cartão não repete o nome em uma linha "Arquivo" separada', () => {
    // O botão já diz "Baixar listagem_2024_1.xlsx". A linha de arquivo era a
    // segunda ocorrência e o que forçava `overflow-wrap: anywhere` no botão —
    // que quebrava o nome no meio ("listagem_20 / 24_1.xlsx").
    expect(cartao).not.toMatch(/rotulo-arquivo/);
    expect(cartao).not.toMatch(/cartao-arquivo/);
  });

  it('o botão não precisa de quebra forçada dentro do nome', () => {
    const botao = cssDoCartao().slice(
      cssDoCartao().indexOf('.btn-download'),
      cssDoCartao().indexOf('.btn-download:focus-visible'),
    );
    expect(botao).not.toMatch(/overflow-wrap:\s*anywhere/);
  });
});

describe('legibilidade — metadados com rótulo acima do valor', () => {
  it('a lista de metadados é uma grade, não um fluxo de pares inline', () => {
    const meta = cssDoCartao().slice(
      cssDoCartao().indexOf('.cartao-meta'),
      cssDoCartao().indexOf('.meta-item dt'),
    );
    expect(meta).toMatch(/display:\s*grid/);
  });

  it('rótulo e valor ficam empilhados dentro do item', () => {
    // `dt`/`dd` lado a lado numa célula de 430px quebravam no meio do par.
    const item = cssDoCartao().slice(
      cssDoCartao().indexOf('.meta-item {'),
      cssDoCartao().indexOf('.meta-item dt'),
    );
    expect(item).toMatch(/grid-template|flex-direction:\s*column/);
  });
});

describe('legibilidade — a grade é mobile-first e tem 2 colunas, não 3', () => {
  it('a base é uma coluna', () => {
    // Mobile-first: o padrão é o caso de 320px, e o refinamento é para telas maiores.
    const lista = cssDaPagina().slice(
      cssDaPagina().indexOf('.dados-lista'),
      cssDaPagina().indexOf('.tabela-rolagem'),
    );
    const base = lista.split('@media')[0];
    expect(base).toMatch(/grid-template-columns:\s*1fr/);
  });

  it('as colunas entram por media query de largura mínima', () => {
    const lista = cssDaPagina().slice(
      cssDaPagina().indexOf('.dados-lista'),
      cssDaPagina().indexOf('.tabela-rolagem'),
    );
    expect(lista).toMatch(/@media\s*\(min-width:/);
  });

  it('são 2 colunas, porque 3 dariam ~36 caracteres por linha', () => {
    // 60rem de página, content-box, gap 1rem, padding 1.25rem por lado:
    //   3 col -> 309px de célula, 269px de conteúdo, ~37ch  (illegível)
    //   2 col -> 472px de célula, 432px de conteúdo, ~60ch  (dentro de 45-75)
    const lista = cssDaPagina().slice(
      cssDaPagina().indexOf('.dados-lista'),
      cssDaPagina().indexOf('.tabela-rolagem'),
    );
    expect(lista).toMatch(/repeat\(2,/);
    expect(lista).not.toMatch(/repeat\(3,/);
    expect(lista).not.toMatch(/auto-fit/);
  });

  it('a descrição tem limite de medida, como rede de segurança do 1-coluna', () => {
    // Entre 320px e o breakpoint a grade tem uma coluna só; sem o limite a
    // descrição corre livre e chega a ~100ch em tablet.
    expect(cssDoCartao()).toMatch(/max-width:\s*\d+ch/);
  });
});

describe('legibilidade — hierarquia entre os artefatos', () => {
  it('o export canônico ocupa a largura toda, por ser o insumo principal', () => {
    // 17,3 MB e a fonte de todo o resto: merece a linha inteira, enquanto as
    // seis planilhas de ~145 KB são homogêneas e formam a grade.
    expect(pagina).toMatch(/destaque|principal|full/);
  });

  it('as planilhas são renderizadas a partir do mesmo conjunto', () => {
    expect(pagina).toMatch(/\.xlsx|planilha/i);
  });

  it('o botão tem alvo de toque de 44px e estado ativo', () => {
    const botao = cssDoCartao().slice(
      cssDoCartao().indexOf('.btn-download'),
      cssDoCartao().indexOf('.btn-download:focus-visible'),
    );
    expect(botao).toMatch(/min-height:\s*2\.75rem/);
    expect(cartao).toMatch(/\.btn-download:active/);
  });
});

describe('legibilidade — o texto continua em pt-BR', () => {
  it('nenhum texto novo em inglês no cartão', () => {
    const tela = cartao.replace(/<style>[\s\S]*$/, '');
    const proibidos = ['Download file', 'Personal data', 'Not anonymized', 'File size'];
    for (const termo of proibidos) {
      expect(tela).not.toContain(termo);
    }
  });

  it('`descricaoPara` só devolve português', () => {
    expect(fonteDeDownloads()).toMatch(/Planilha de matrícula/);
  });
});
