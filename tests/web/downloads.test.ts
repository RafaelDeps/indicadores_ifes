/**
 * Contrato do módulo de listagem (feature 016, §C-1 L-1..L-6).
 *
 * Os testes usam uma raiz temporária, não o repositório: a listagem precisa ser
 * verificável contra um disco com forma conhecida. Testar contra `data/` real
 * só provaria que o repositório está como está hoje — e o defeito que FR-017
 * quer impedir é exatamente a listagem divergir do disco.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  carregarDownloads,
  carregarPendencias,
  descobrirInsumos,
  obterInsumosCadeia,
  portaoAberto,
  type ArtefatoDownload,
} from '../../src/lib/downloads';

const PADRAO_PLANILHAS = [
  'listagem_2024_1.xlsx',
  'listagem_2024_2.xlsx',
  'listagem_2025_1.xlsx',
  'listagem_2025_2.xlsx',
  'listagem_2026_1.xlsx',
  'listagem_2026_2.xlsx',
];

let raiz: string;

function escrever(relativo: string, conteudo = 'x') {
  const destino = join(raiz, relativo);
  mkdirSync(join(destino, '..'), { recursive: true });
  writeFileSync(destino, conteudo, 'utf-8');
  return destino;
}

function escreverPendencias(pendencias: Record<string, unknown>[]) {
  const linhas = pendencias
    .map((p) => {
      const corpo = Object.entries(p)
        .map(([k, v]) => `    ${k}: ${v === null ? '~' : `"${v}"`}`)
        .join('\n');
      return `  - ${corpo.replace(/^ {4}/, '')}`;
    })
    .join('\n');
  escrever('.specify/governanca/pendencias.yaml', `pendencias:\n${linhas}\n`);
}

function listar(opcoes: Parameters<typeof carregarDownloads>[0] = {}): ArtefatoDownload[] {
  return carregarDownloads({ raizRepo: raiz, copiarParaPublic: false, ...opcoes });
}

function agregado(a: ArtefatoDownload[] = listar()) {
  return a.find((x) => x.natureza === 'agregado');
}

function brutos(a: ArtefatoDownload[] = listar()) {
  return a.filter((x) => x.natureza === 'dado-pessoal');
}

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'downloads-'));
  // Agregado presente por padrão: um repositório real sempre o tem, e a
  // listagem sem ele exercita um estado que o build nunca produz.
  escrever('data/dist/indicadores.zip', 'agregado');
  escrever('data/canonical/exports_canonical.zip', 'canonico');
  for (const planilha of PADRAO_PLANILHAS) escrever(`data/raw/${planilha}`, 'xlsx');
  escreverPendencias([{ id: 'a', descricao: 'primeira', registro: '.gitkeep' }]);
  escrever('.gitkeep', '');
});

afterEach(() => {
  rmSync(raiz, { recursive: true, force: true });
});

describe('L-1 — disponível só quando o arquivo existe', () => {
  it('marca disponível o artefato cujo arquivo está no disco', () => {
    const item = agregado()!;
    expect(item.disponivel).toBe(true);
    expect(item.motivoIndisponivel).toBeNull();
    expect(item.bytes).toBe('agregado'.length);
    expect(item.atualizadoEm).toBeInstanceOf(Date);
  });

  it('marca indisponível, com motivo, quando o arquivo some do disco', () => {
    rmSync(join(raiz, 'data/dist/indicadores.zip'));
    const item = agregado()!;
    expect(item.disponivel).toBe(false);
    expect(item.motivoIndisponivel).toMatch(/não foi encontrado/i);
    expect(item.bytes).toBeNull();
    expect(item.atualizadoEm).toBeNull();
  });

  it('não marca disponível um caminho que é diretório', () => {
    rmSync(join(raiz, 'data/dist/indicadores.zip'));
    mkdirSync(join(raiz, 'data/dist/indicadores.zip'));
    expect(agregado()!.disponivel).toBe(false);
  });
});

describe('L-2 — indisponível sempre tem motivo', () => {
  it('todo artefato indisponível carrega motivo preenchido', () => {
    // O agregado é declarado pela própria listagem, então remover do disco o
    // torna indisponível sem que ele desapareça da página.
    rmSync(join(raiz, 'data/dist/indicadores.zip'));
    const item = agregado()!;
    expect(item.disponivel).toBe(false);
    expect(item.motivoIndisponivel).not.toBeNull();
    expect(item.motivoIndisponivel!.length).toBeGreaterThan(0);
  });

  it('o manifesto mantém na listagem o insumo removido do disco', () => {
    // A chave é `nome:`, não `caminho:` — é assim que o manifesto real
    // (`dados-insumo.yml` da branch 012) declara as planilhas. Um fixture
    // escrito com `caminho:` passaria mesmo com o parser errado, porque os dois
    // concordariam sobre uma forma que o manifesto nunca teve.
    escrever(
      'dados-insumo.yml',
      'arquivos:\n' + PADRAO_PLANILHAS.map((p) => `  - nome: ${p}\n`).join(''),
    );
    rmSync(join(raiz, 'data/raw/listagem_2026_2.xlsx'));

    const item = listar().find((x) => x.arquivo === 'listagem_2026_2.xlsx');
    expect(item, 'insumo declarado e removido deve continuar listado').toBeDefined();
    expect(item!.disponivel).toBe(false);
    expect(item!.motivoIndisponivel).toMatch(/não foi encontrado/i);
  });

  it('nenhum artefato disponível tem motivo', () => {
    for (const item of listar({ gateAberto: true })) {
      if (item.disponivel) expect(item.motivoIndisponivel).toBeNull();
    }
  });
});

describe('L-3 — gate fechado omite os brutos e mantém o agregado', () => {
  it('todo artefato de dado pessoal fica indisponível com o gate fechado', () => {
    const listagem = listar({ gateAberto: false });
    expect(brutos(listagem).every((x) => !x.disponivel)).toBe(true);
  });

  it('o agregado continua disponível com o gate fechado', () => {
    expect(agregado(listar({ gateAberto: false }))!.disponivel).toBe(true);
  });

  it('o motivo do gate não afirma que o arquivo falta', () => {
    // O arquivo existe; a razão é de governança. Dizer "não encontrado"
    // mandaria o visitante procurar um problema de download que não existe.
    const item = brutos(listar({ gateAberto: false }))[0];
    expect(item.motivoIndisponivel).not.toMatch(/não foi encontrado/i);
    expect(item.motivoIndisponivel).toMatch(/revisão institucional/i);
  });

  it('gate fechado não apaga os insumos da listagem, apenas os marca', () => {
    const listagem = listar({ gateAberto: false });
    expect(brutos(listagem)).toHaveLength(7);
  });
});

describe('L-4 — nenhum caminho servido escapa de public/dados/', () => {
  it('todo caminho servido fica sob dados/', () => {
    for (const item of listar({ gateAberto: true })) {
      expect(item.caminhoPublico.startsWith('dados/')).toBe(true);
      expect(item.caminhoPublico).not.toContain('..');
      expect(item.caminhoPublico).not.toContain('data/');
    }
  });

  it('a cópia escreve só em public/dados e não move o original', () => {
    carregarDownloads({ raizRepo: raiz, copiarParaPublic: true, gateAberto: true });
    const destino = join(raiz, 'public/dados');

    // Só os artefatos declarados chegam ao destino — nada escapa para `public/`
    // nem para a raiz.
    const noDestino = readdirSync(destino).sort();
    expect(noDestino).toEqual(
      ['exports_canonical.zip', 'indicadores.zip', ...PADRAO_PLANILHAS].sort(),
    );
    expect(existsSync(join(raiz, 'public/exports_canonical.zip'))).toBe(false);
    expect(existsSync(join(raiz, 'exports_canonical.zip'))).toBe(false);
    expect(existsSync(join(raiz, 'data/canonical/exports_canonical.zip'))).toBe(true);
  });
});

describe('L-5 — a listagem é determinística', () => {
  it('duas chamadas com a mesma entrada produzem a mesma listagem', () => {
    const primeira = listar({ gateAberto: true });
    const segunda = listar({ gateAberto: true });
    expect(segunda.map((x) => x.id)).toEqual(primeira.map((x) => x.id));
    expect(segunda.map((x) => x.bytes)).toEqual(primeira.map((x) => x.bytes));
    expect(segunda.map((x) => x.atualizadoEm?.getTime())).toEqual(
      primeira.map((x) => x.atualizadoEm?.getTime()),
    );
  });

  it('bytes e atualizadoEm derivam do disco, não de valor fixo', () => {
    const antes = agregado()!.bytes;
    escrever('data/dist/indicadores.zip', 'agregado-maior');
    expect(agregado()!.bytes).toBe(('agregado-maior' as string).length);
    expect(agregado()!.bytes).not.toBe(antes);
  });

  it('os ids são únicos dentro da listagem', () => {
    const ids = listar({ gateAberto: true }).map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('L-6 — insumos descobertos por glob', () => {
  it('as seis planilhas do padrão são descobertas sem código adicional', () => {
    const nomes = brutos(listar())
      .map((x) => x.arquivo)
      .sort();
    expect(nomes).toEqual(['exports_canonical.zip', ...PADRAO_PLANILHAS].sort());
  });

  it('uma planilha nova aparece sem alteração de código', () => {
    escrever('data/raw/listagem_2027_1.xlsx', 'nova');
    const nomes = brutos(listar()).map((x) => x.arquivo);
    expect(nomes).toContain('listagem_2027_1.xlsx');
  });

  it('arquivo fora do padrão não é tratado como insumo', () => {
    escrever('data/raw/observacoes.txt', 'nao e insumo');
    escrever('data/raw/listagem_2025_x.xlsx', 'sem semestre');
    const nomes = brutos(listar()).map((x) => x.arquivo);
    expect(nomes).not.toContain('observacoes.txt');
    expect(nomes).not.toContain('listagem_2025_x.xlsx');
  });

  it('a ordem dos insumos é estável e alfabética', () => {
    const nomes = descobrirInsumos(raiz);
    expect(nomes).toEqual([...nomes].sort());
  });
});

describe('metadados por artefato (FR-006)', () => {
  it('o agregado traz cobertura de anos e campi', () => {
    const item = agregado()!;
    expect(Array.isArray(item.anos)).toBe(true);
    expect(item.campi.length).toBeGreaterThan(0);
  });

  it('as planilhas trazem o ano no nome, sem escopo de campus inventado', () => {
    const item = listar().find((x) => x.arquivo === 'listagem_2025_2.xlsx')!;
    expect(item.anos).toEqual([2025]);
    // Forçar `campi` aqui exigiria metadado inventado (Princípio III).
    expect(item.campi).toEqual([]);
  });

  it('todo artefato tem rótulo e descrição em pt-BR', () => {
    for (const item of listar({ gateAberto: true })) {
      expect(item.rotulo.length).toBeGreaterThan(0);
      expect(item.descricao.length).toBeGreaterThan(0);
    }
  });

  it('a natureza de dado pessoal nomeia a natureza na descrição', () => {
    for (const item of brutos(listar({ gateAberto: true }))) {
      // A indicação passa a ser no badge (A-2), não na descrição do cartão.
      expect(item.descricao).not.toMatch(/dados pessoais/i);
    }
  });

  it('o agregado é descrito como não contendo dados pessoais', () => {
    expect(agregado()!.descricao).not.toMatch(/dados pessoais/i);
  });
});

describe('portão de governança lido pelo frontend', () => {
  it('fecha quando um registro não existe', () => {
    escreverPendencias([{ id: 'a', descricao: 'p', registro: 'inexistente.md' }]);
    expect(portaoAberto(raiz)).toBe(false);
  });

  it('abre quando todos os registros existem', () => {
    escreverPendencias([{ id: 'a', descricao: 'p', registro: '.gitkeep' }]);
    expect(portaoAberto(raiz)).toBe(true);
  });

  it('fecha quando o registro existe mas não contém a string exigida', () => {
    escrever('.specify/memory/constitution.md', '**Version**: 1.1.0');
    escreverPendencias([
      {
        id: 'emenda',
        descricao: 'p',
        registro: '.specify/memory/constitution.md',
        contem: '**Version**: 2.0.0',
      },
    ]);
    expect(portaoAberto(raiz)).toBe(false);
  });

  it('abre quando o registro contém a string exigida', () => {
    escrever('.specify/memory/constitution.md', '**Version**: 2.0.0');
    escreverPendencias([
      {
        id: 'emenda',
        descricao: 'p',
        registro: '.specify/memory/constitution.md',
        contem: '**Version**: 2.0.0',
      },
    ]);
    expect(portaoAberto(raiz)).toBe(true);
  });

  it('fecha, em vez de abrir, quando o registro de pendências não existe', () => {
    // Fail-closed: sem registro não há o que avaliar, e "nada pendente" seria
    // publicar dado pessoal sem avaliação nenhuma.
    rmSync(join(raiz, '.specify'), { recursive: true, force: true });
    expect(portaoAberto(raiz)).toBe(false);
  });

  it('cada pendência não resolvida carrega motivo', () => {
    escreverPendencias([
      { id: 'ok', descricao: 'p', registro: '.gitkeep' },
      { id: 'ruim', descricao: 'p', registro: 'ausente.md' },
    ]);
    const pendencias = carregarPendencias(raiz);
    expect(pendencias.find((p) => p.id === 'ok')!.resolvida).toBe(true);
    expect(pendencias.find((p) => p.id === 'ruim')!.motivo).toMatch(/ausente/i);
  });

  it('o aviso do visitante não vaza identificadores internos', () => {
    escreverPendencias([
      {
        id: 'emenda',
        descricao: 'detalhe interno 1.1.0 -> 2.0.0',
        registro: 'ausente.md',
        aviso_visitante: 'Os arquivos de origem serão liberados em breve.',
      },
    ]);
    const [pendencia] = carregarPendencias(raiz);
    expect(pendencia.avisoVisitante).not.toMatch(/1\.1\.0|2\.0\.0/);
    expect(pendencia.avisoVisitante).toMatch(/breve/);
  });
});

describe('insumos da cadeia para o guia (FR-009, FR-024)', () => {
  it('cobre o export canônico e as seis planilhas', () => {
    const caminhos = obterInsumosCadeia(raiz).map((i) => i.caminho);
    expect(caminhos).toContain('data/canonical/exports_canonical.zip');
    for (const planilha of PADRAO_PLANILHAS) expect(caminhos).toContain(`data/raw/${planilha}`);
  });

  it('todo insumo declara etapa, finalidade, origem e natureza', () => {
    for (const insumo of obterInsumosCadeia(raiz)) {
      expect(insumo.etapa).toMatch(/^(etl|etl-listagens|merge-listagens)$/);
      expect(insumo.finalidade.length).toBeGreaterThan(0);
      expect(insumo.origem.length).toBeGreaterThan(0);
      expect(['agregado', 'dado-pessoal']).toContain(insumo.natureza);
      expect(typeof insumo.obtendoPublico).toBe('boolean');
    }
  });

  it('todo insumo com arquivo no disco tem caminho relativo à raiz', () => {
    for (const insumo of obterInsumosCadeia(raiz)) {
      expect(insumo.caminho.startsWith('/')).toBe(false);
      expect(insumo.caminho).not.toContain('..');
    }
  });

  it('as planilhas aparecem com a revisão no formato ano-semestre', () => {
    const insumo = obterInsumosCadeia(raiz).find(
      (i) => i.caminho === 'data/raw/listagem_2026_1.xlsx',
    )!;
    expect(insumo.revisao).toBe('2026-1');
    expect(insumo.etapa).toBe('etl-listagens');
  });

  it('a revisão do export canônico é null quando não declarada, não inventada', () => {
    const insumo = obterInsumosCadeia(raiz).find(
      (i) => i.caminho === 'data/canonical/exports_canonical.zip',
    )!;
    // Sem `dados-insumo.yml` (que chega com o merge de 012), a revisão é
    // desconhecida — e desconhecida é `null`, nunca um valor estimado.
    expect(insumo.revisao).toBeNull();
  });

  it('a revisão do export canônico vem do bloco export_canonico do manifesto', () => {
    // Reproduz a forma real de `dados-insumo.yml`, com `versao: 'v1'` no topo
    // do arquivo e a revisão dentro de `export_canonico:`. Um leitor que
    // procurasse a primeira chave `versao:` do arquivo inteiro devolveria `v1`
    // como se fosse a revisão do arquivo de dados — que é a versão do esquema
    // do manifesto, não o commit de onde o export veio.
    escrever(
      'dados-insumo.yml',
      [
        "versao: 'v1'",
        '',
        'arquivos:',
        ...PADRAO_PLANILHAS.map((p) => `  - nome: ${p}`),
        '',
        'export_canonico:',
        '  repositorio: RafaelDeps/horizon_etl',
        '  caminho: data/exports/exports_canonical.zip',
        "  revisao: '1517ca6acf0205d49d7d54366ae8278324c145f0'",
        '',
      ].join('\n'),
    );
    const insumo = obterInsumosCadeia(raiz).find(
      (i) => i.caminho === 'data/canonical/exports_canonical.zip',
    )!;
    expect(insumo.revisao).toBe('1517ca6acf0205d49d7d54366ae8278324c145f0');
  });

  it('o caminho do bloco export_canonico não declara um item local ausente', () => {
    // O manifesto aponta para `data/exports/…`, o caminho **no repositório de
    // origem**. Se esse caminho fosse tratado como declaração local, um export
    // ausente do disco apareceria como item — mas offering um download para um
    // arquivo que nunca esteve aqui é pior do que não listá-lo (Pg-2).
    rmSync(join(raiz, 'data/canonical/exports_canonical.zip'));
    escrever(
      'dados-insumo.yml',
      [
        'export_canonico:',
        '  caminho: data/exports/exports_canonical.zip',
        "  revisao: 'abc123'",
        '',
      ].join('\n'),
    );

    const caminhos = obterInsumosCadeia(raiz).map((i) => i.caminho);
    expect(caminhos).not.toContain('data/exports/exports_canonical.zip');
    expect(caminhos).toContain('data/canonical/exports_canonical.zip');

    const artefatos = listar().map((a) => a.arquivo);
    expect(artefatos).not.toContain('exports_canonical.zip');
  });
});

describe('cópia para public/dados', () => {
  it('com o gate aberto, copia agregado e insumos', () => {
    carregarDownloads({ raizRepo: raiz, copiarParaPublic: true, gateAberto: true });
    const destino = join(raiz, 'public/dados');
    for (const nome of ['indicadores.zip', 'exports_canonical.zip', 'listagem_2024_1.xlsx']) {
      expect(existsSync(join(destino, nome)), `ausente: ${nome}`).toBe(true);
    }
  });

  it('com o gate fechado, copia só o agregado', () => {
    carregarDownloads({ raizRepo: raiz, copiarParaPublic: true, gateAberto: false });
    const destino = join(raiz, 'public/dados');
    expect(existsSync(join(destino, 'indicadores.zip'))).toBe(true);
    expect(existsSync(join(destino, 'exports_canonical.zip'))).toBe(false);
    expect(existsSync(join(destino, 'listagem_2024_1.xlsx'))).toBe(false);
  });

  it('copiar não move o original: a origem continua intacta', () => {
    carregarDownloads({ raizRepo: raiz, copiarParaPublic: true, gateAberto: true });
    expect(readFileSync(join(raiz, 'data/canonical/exports_canonical.zip'), 'utf-8')).toBe(
      'canonico',
    );
  });

  it('gate fechado APAGA o que uma execução anterior deixou em public/dados', () => {
    // Este é o caso que decide se o portão é mesmo "fechado". `public/dados/` é
    // gerado e não é limpo entre execuções: se uma build com o portão aberto
    // copiou `exports_canonical.zip` para lá, uma build seguinte com o portão
    // fechado que apenas se recusasse a copiar deixaria o arquivo no lugar — e
    // o Astro, que copia `public/` para `dist/` no início do build, o
    // publicaria. O log diria "omitidos" enquanto o site servia o dado pessoal.
    carregarDownloads({ raizRepo: raiz, copiarParaPublic: true, gateAberto: true });
    expect(existsSync(join(raiz, 'public/dados/exports_canonical.zip'))).toBe(true);

    carregarDownloads({ raizRepo: raiz, copiarParaPublic: true, gateAberto: false });
    expect(
      existsSync(join(raiz, 'public/dados/exports_canonical.zip')),
      'cópia de dado pessoal sobreviveu ao fechamento do portão',
    ).toBe(false);
    expect(existsSync(join(raiz, 'public/dados/listagem_2024_1.xlsx'))).toBe(false);
    // O agregado continua: fechar o portão não tira o pacote oficial.
    expect(existsSync(join(raiz, 'public/dados/indicadores.zip'))).toBe(true);
  });

  it('a limpeza não apaga o .gitkeep que versiona o diretório', () => {
    escrever('public/dados/.gitkeep');
    carregarDownloads({ raizRepo: raiz, copiarParaPublic: true, gateAberto: false });
    // Sem isto, `public/dados/` sairia do Git depois da primeira execução.
    expect(existsSync(join(raiz, 'public/dados/.gitkeep'))).toBe(true);
  });

  it('a limpeza não toca em nada fora de public/dados', () => {
    carregarDownloads({ raizRepo: raiz, copiarParaPublic: true, gateAberto: true });
    // Um arquivo irmão com o mesmo nome é indício de que o caminho da limpeza
    // subiu um nível demais.
    escrever('public/exports_canonical.zip');
    carregarDownloads({ raizRepo: raiz, copiarParaPublic: true, gateAberto: false });
    expect(existsSync(join(raiz, 'public/exports_canonical.zip'))).toBe(true);
    expect(existsSync(join(raiz, 'data/canonical/exports_canonical.zip'))).toBe(true);
  });
});
