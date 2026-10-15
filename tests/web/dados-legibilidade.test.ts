/**
 * Legibilidade dos cartões de download (feature 016; marcações removidas em
 * 2026-10-14 — os artefatos são dados públicos divulgados pela instituição).
 *
 * A página `/dados/` falhava de um jeito que nenhum teste anterior pegava, porque
 * todos os contratos vigentes mediam *presença* — o link existe, o texto do badge
 * existe, o aviso não depende de cor. Nenhum medía **quanto** texto existe. Um
 * cartão pode cumprir A-2, Pg-2 e FR-015 ao mesmo tempo e ainda assim ser
 * ilegível, e era o que acontecia.
 *
 * A partir de 2026-10-14 a premissa mudou: os avisos de "dado pessoal /
 * não anonimizado" e o badge foram retirados porque sugeriam uma restrição
 * que não existe. Os testes abaixo invertem a direção — o que hoje precisa
 * passar é a **ausência** dessas mensagens, junto com a legibilidade que
 * já estava garantida (grade 2 colunas, metadados empilhados, medida da
 * descrição).
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

describe('legibilidade — a página não carrega avisos de restrição de dados', () => {
  it('o cartão não tem badge de dado pessoal', () => {
    // 2026-10-14: os artefatos são dados públicos divulgados pela própria
    // instituição; o badge "Contém dados pessoais" sugeria uma restrição que
    // não existe e um visitante podia entender errado.
    expect(cartao).not.toMatch(/Contém dados pessoais/);
    expect(cartao).not.toMatch(/marca-dado-pessoal/);
  });

  it('a página não anuncia dado pessoal nem anonimização', () => {
    expect(pagina).not.toMatch(/dados pessoais/i);
    expect(pagina).not.toMatch(/anonimizad/i);
    expect(pagina).not.toMatch(/assume essa responsabilidade/i);
  });

  it('a página não adverte sobre versionar os arquivos', () => {
    expect(pagina).not.toMatch(/mantenha o repositório privado/i);
    expect(pagina).not.toMatch(/expõe a terceiros/i);
  });

  it('a descrição de uma planilha não menciona dado pessoal', () => {
    const ramoPlanilha = downloads.slice(
      downloads.indexOf('function descricaoPara'),
      downloads.indexOf('function descricaoPara') + 2000,
    );
    const textos = ramoPlanilha.match(/'[^']*'/g) ?? [];
    expect(textos.join(' ')).not.toMatch(/dados pessoais/i);
  });

  it('a descrição do export canônico não menciona dado pessoal', () => {
    expect(descricaoDe('exports_canonical.zip')).not.toMatch(/dados pessoais/i);
  });

  it('o motivo do gate fechado não menciona dado pessoal', () => {
    // O texto aparece quando o portão está fechado; a razão é de governança,
    // sem qualificar o conteúdo do arquivo.
    expect(fonteDeDownloads()).not.toMatch(/revisão institucional dos dados pessoais/i);
    expect(fonteDeDownloads()).toMatch(/decisão de governança/i);
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

describe('legibilidade — a descrição tem medida e o cabeçalho do cartão é limpo', () => {
  it('o cabeçalho do cartão não é uma linha flex título+badge', () => {
    // `justify-content: space-between` numa linha com dois textos largos só
    // produz quebra — e a quebra joga o badge para o canto oposto ao botão.
    const topo = cartao.slice(cartao.indexOf('.cartao-topo'), cartao.indexOf('.cartao-titulo'));
    expect(topo).not.toMatch(/space-between/);
  });

  it('a descrição tem limite de medida, como rede de segurança do 1-coluna', () => {
    // Entre 320px e o breakpoint a grade tem uma coluna só; sem o limite a
    // descrição corre livre e chega a ~100ch em tablet.
    expect(cssDoCartao()).toMatch(/max-width:\s*\d+ch/);
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
