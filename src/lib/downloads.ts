/**
 * Módulo de listagem de downloads (feature 016, FR-006, FR-009, FR-017).
 *
 * Contrato: `specs/016-download-data-files/contracts/pagina-downloads.md` §C-1.
 *
 * Duas responsabilidades, ambas em build time:
 *
 * 1. **Derivar a listagem** do que existe em disco. A listagem nunca é uma lista
 *    fixa no template: um array literal poderia oferecer um arquivo inexistente
 *    sem que nada percebesse (FR-017). Aqui, `disponivel` é consequência de
 *    `fs.stat`, e um artefato ausente vira item indisponível com motivo — nunca
 *    um link quebrado.
 * 2. **Consultar o portão de governança** lendo o mesmo arquivo que
 *    `etl/scripts/check_governanca.py` consulta. As duas pontas leem a mesma
 *    fonte para não poderem divergir: se o gate disser que está fechado, a
 *    página não pode dizer que os insumos estão disponíveis.
 *
 * A leitura do portão replica a regra do Python, incluindo `contem` (Gg-5).
 * Duplicar a regra é ruim em geral, mas as alternativas eram piores: um `.json`
 * derivado introduced um segundo arquivo a versionar, e confiar só no Python
 * deixaria `npm run dev` — que não roda o ETL — publicando a listagem errada.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { carregarDataset } from './dataset';
import { type DatasetCompleto } from './dataset-core';

/** Natureza do conteúdo — decide a marcação e o agrupamento (FR-013, FR-015). */
export type NaturezaArtefato =
  /** Pacote oficial consolidado — desidentificado. */
  | 'agregado'
  /** Insumo bruto — contém a coluna `Nome`, não anonimizado (D-04). */
  | 'dado-pessoal';

/** Etapa da cadeia que consome um insumo. */
export type EtapaCadeia = 'etl' | 'etl-listagens' | 'merge-listagens';

/** Um arquivo oferecido na página. Entidade central da feature. */
export interface ArtefatoDownload {
  /** Identificador estável, usado como chave de lista e âncora. */
  id: string;
  /** Nome do arquivo como servido (ex.: `indicadores.zip`). */
  arquivo: string;
  /** Rótulo legível em pt-BR para o visitante. */
  rotulo: string;
  /** Descrição em pt-BR do que o arquivo é. */
  descricao: string;
  /** Natureza do conteúdo — determina a marcação exibida (FR-015). */
  natureza: NaturezaArtefato;
  /** Caminho relativo dentro de `public/`, para montar a URL de download. */
  caminhoPublico: string;
  /** Tamanho em bytes; `null` quando o arquivo não existe. */
  bytes: number | null;
  /** Última data de modificação; `null` quando o arquivo não existe. */
  atualizadoEm: Date | null;
  /** Anos de apuração cobertos (ex.: `[2024, 2025, 2026]`). */
  anos: number[];
  /** Slugs de campus cobertos; `['todos']` quando o artefato é agregado. */
  campi: string[];
  /**
   * `true` quando o arquivo existe e, para insumos brutos, quando o portão
   * está aberto. `false` faz a página mostrar o motivo em vez de um link
   * quebrado (FR-017).
   */
  disponivel: boolean;
  /** Razão da indisponibilidade, em pt-BR. `null` quando `disponivel`. */
  motivoIndisponivel: string | null;
}

/** Arquivo de entrada exigido pelo pipeline — base do guia de instalação. */
export interface InsumoCadeia {
  /** Caminho canônico relativo à raiz do repositório. */
  caminho: string;
  /** Etapa que consome o insumo. */
  etapa: EtapaCadeia;
  /** Para que serve, em pt-BR. */
  finalidade: string;
  /** Origem do arquivo (emissão institucional, etc.). */
  origem: string;
  /** Revisão/identificador de versão, quando aplicável (FR-024). */
  revisao: string | null;
  /** Natureza do conteúdo do arquivo. */
  natureza: NaturezaArtefato;
  /**
   * `false` quando a origem não é pública. Orienta o guia a não prometer
   * download público; `true` para tudo que a página serve (D-01, D-02).
   */
  obtendoPublico: boolean;
}

/** Opções de `carregarDownloads`. */
export interface OpcoesCarregamento {
  /** Raiz para resolver caminhos relativos. Padrão: `process.cwd()`. */
  raizRepo?: string;
  /**
   * `false` força os insumos brutos a indisponíveis, com o motivo do portão.
   * `undefined` deriva do registro de pendências.
   */
  gateAberto?: boolean;
  /**
   * Quando `true` (padrão), copia os artefatos disponíveis para `public/dados/`.
   */
  copiarParaPublic?: boolean;
}

/** Uma pendência de governança, como declarada no registro. */
export interface PendenciaGovernanca {
  /** Identificador estável da pendência. */
  id: string;
  /** Descrição em pt-BR do que falta (texto de mantenedor). */
  descricao: string;
  /** `true` quando registrada — a pendência está quitada. */
  resolvida: boolean;
  /** Motivo da não resolução, em pt-BR; `null` quando resolvida. */
  motivo: string | null;
  /** Onde o registro que a quita vive. */
  registro: string | null;
  /** Texto que o visitante lê quando o portão está fechado (Gg-6). */
  avisoVisitante: string | null;
}

const REGISTRO_PENDENCIAS = '.specify/governanca/pendencias.yaml';
const MANIFESTO_INSUMO = 'dados-insumo.yml';
const PACOTE_OFICIAL = 'data/dist/indicadores.zip';
const EXPORT_CANONICO = 'data/canonical/exports_canonical.zip';
const PASTA_RAW = 'data/raw';
const PADRAO_SAIDA_PUBLIC = 'public/dados';

/** Padrão de nomenclatura das planilhas de matrícula que o ETL consome. */
const PADRAO_PLANILHA = /^listagem_(\d{4})_(\d+)\.xlsx$/;

/**
 * Aviso padrão quando nenhuma pendência declara o seu (Gg-6).
 *
 * Redigido sem identificadores internos (FR-011) e sem sugerir que o visitante
 * tem algo a resolver: ele não resolve nada, só precisa saber que os arquivos
 * ainda não estão lá.
 */
export const AVISO_PADRAO_VISITANTE =
  'Os arquivos de origem estão sendo preparados para publicação e serão disponibilizados aqui em breve.';

/** Rótulos de arquivo legíveis, derivados do nome (pt-BR, FR-006). */
const ROTULOS: Record<string, string> = {
  'indicadores.zip': 'Pacote oficial de indicadores',
  'exports_canonical.zip': 'Export canônico da base oficial',
};

function rotuloPara(nomeArquivo: string): string {
  const conhecido = ROTULOS[nomeArquivo];
  if (conhecido) return conhecido;

  const planilha = nomeArquivo.match(PADRAO_PLANILHA);
  if (planilha) {
    const [, ano, semestre] = planilha;
    return `Listagens de matrícula ${ano} — ${semestre}º semestre`;
  }
  return nomeArquivo;
}

function descricaoPara(nomeArquivo: string): string {
  if (nomeArquivo === 'indicadores.zip') {
    return (
      'Reúne os indicadores dos três pilares do modelo CONIF, por campus e por ano, ' +
      'no formato JSON.'
    );
  }
  if (nomeArquivo === 'exports_canonical.zip') {
    return (
      'Arquivo de origem do qual o pacote oficial é gerado. Contém a relação de ' +
      'estudantes e servidores usada no cálculo dos indicadores.'
    );
  }
  return 'Planilha de matrícula que alimenta os indicadores do Pilar 1.';
}

/**
 * Lê as pendências do registro e resolve cada uma contra o disco.
 *
 * Replica a regra do portão Python, campo a campo — inclusive `contem`. Se as
 * duas implementações divergirem, a página pode prometer um download que o
 * pipeline se recusou a servir; o espelho é deliberado.
 */
export function carregarPendencias(raizRepo: string): PendenciaGovernanca[] {
  const caminho = path.join(raizRepo, REGISTRO_PENDENCIAS);

  if (!fs.existsSync(caminho)) {
    // Fail-closed: sem registro não há o que avaliar, e "nada pendente" seria
    // publicar dado pessoal sem avaliação nenhuma.
    return [
      {
        id: 'registro-inexistente',
        descricao: `Registro de pendências não encontrado: ${REGISTRO_PENDENCIAS}`,
        resolvida: false,
        motivo: 'registro de pendências ausente',
        registro: REGISTRO_PENDENCIAS,
        avisoVisitante: AVISO_PADRAO_VISITANTE,
      },
    ];
  }

  const linhas = fs.readFileSync(caminho, 'utf-8').split(/\r?\n/);
  const pendencias: PendenciaGovernanca[] = [];
  let atual: Partial<PendenciaGovernanca> & { registro?: string | null } = {};

  const fechar = () => {
    if (!atual.id) return;
    pendencias.push(resolverPendencia(atual, raizRepo));
    atual = {};
  };

  for (const linha of linhas) {
    // Comentários e linhas em branco não carregam pendência.
    const semComentario = linha.replace(/(^|\s)#.*$/, '');
    if (!semComentario.trim()) continue;

    const item = semComentario.match(/^\s*-\s+id:\s*(.+)$/);
    if (item) {
      fechar();
      atual.id = item[1].trim().replace(/^["']|["']$/g, '');
      continue;
    }

    const chave = semComentario.match(
      /^\s*(id|descricao|registro|contem|aviso_visitante):\s*(.*)$/,
    );
    if (!chave || !atual.id) continue;

    const [, nome, valorBruto] = chave;
    const valor = valorBruto.trim();

    if (nome === 'descricao') {
      atual.descricao = valor.replace(/^>-\s*/, '').replace(/^["']|["']$/g, '');
    } else if (nome === 'registro') {
      atual.registro = valor === '~' ? null : valor.replace(/^["']|["']$/g, '') || null;
    } else if (nome === 'contem') {
      atual.contem = valor.replace(/^["']|["']$/g, '');
    } else if (nome === 'aviso_visitante') {
      atual.avisoVisitante = valor.replace(/^>-\s*/, '').replace(/^["']|["']$/g, '');
    }
  }
  fechar();

  if (pendencias.length === 0) {
    return [
      {
        id: 'registro-sem-pendencias',
        descricao: `Nenhuma pendência declarada em ${REGISTRO_PENDENCIAS}`,
        resolvida: false,
        motivo: 'registro sem a chave `pendencias`',
        registro: REGISTRO_PENDENCIAS,
        avisoVisitante: AVISO_PADRAO_VISITANTE,
      },
    ];
  }

  return pendencias;
}

interface PendenciaCrua extends Partial<PendenciaGovernanca> {
  id: string;
  registro?: string | null;
  contem?: string;
  aviso_visitante?: string;
}

/** Resolve uma pendência contra o disco, sem lançar. */
function resolverPendencia(crua: PendenciaCrua, raizRepo: string): PendenciaGovernanca {
  const registro = crua.registro ?? null;
  const descricao = crua.descricao ?? '';

  if (!registro) {
    return {
      id: crua.id,
      descricao,
      resolvida: false,
      motivo: 'sem `registro` declarado no registro de pendências',
      registro: null,
      avisoVisitante: crua.aviso_visitante ?? AVISO_PADRAO_VISITANTE,
    };
  }

  const absoluto = path.resolve(raizRepo, registro);
  // `registro` que escapa da raiz não pode registrar nada: um arquivo fora do
  // repositório não é versionado aqui, e apagar o pendente reabriria a
  // pendência sem que ninguém visse por quê.
  if (!absoluto.startsWith(path.resolve(raizRepo) + path.sep)) {
    return {
      id: crua.id,
      descricao,
      resolvida: false,
      motivo: `registro fora da raiz do repositório: ${registro}`,
      registro,
      avisoVisitante: crua.aviso_visitante ?? AVISO_PADRAO_VISITANTE,
    };
  }

  if (!fs.existsSync(absoluto)) {
    return {
      id: crua.id,
      descricao,
      resolvida: false,
      motivo: `registro ausente: ${registro}`,
      registro,
      avisoVisitante: crua.aviso_visitante ?? AVISO_PADRAO_VISITANTE,
    };
  }

  if (crua.contem !== undefined) {
    let conteudo = '';
    try {
      conteudo = fs.readFileSync(absoluto, 'utf-8');
    } catch {
      return {
        id: crua.id,
        descricao,
        resolvida: false,
        motivo: `registro ilegível: ${registro}`,
        registro,
        avisoVisitante: crua.aviso_visitante ?? AVISO_PADRAO_VISITANTE,
      };
    }
    if (!conteudo.includes(crua.contem)) {
      return {
        id: crua.id,
        descricao,
        resolvida: false,
        motivo: `registro existe mas não contém '${crua.contem}': ${registro}`,
        registro,
        avisoVisitante: crua.aviso_visitante ?? AVISO_PADRAO_VISITANTE,
      };
    }
  }

  return {
    id: crua.id,
    descricao,
    resolvida: true,
    motivo: null,
    registro,
    avisoVisitante: crua.aviso_visitante ?? AVISO_PADRAO_VISITANTE,
  };
}

/** `gateAberto = toda pendência resolvida`. Sem flag manual (data-model.md). */
export function portaoAberto(raizRepo: string): boolean {
  return carregarPendencias(raizRepo).every((p) => p.resolvida);
}

/**
 * Texto que o visitante lê quando o portão está fechado.
 *
 * O primeiro aviso vence em vez de concatenar: três avisos somados soam como
 * três problemas e sugerem que o visitante precisa resolver algo.
 */
export function avisoVisitante(raizRepo: string): string {
  const bloqueantes = carregarPendencias(raizRepo).filter((p) => !p.resolvida);
  for (const pendencia of bloqueantes) {
    if (pendencia.avisoVisitante) return pendencia.avisoVisitante;
  }
  return AVISO_PADRAO_VISITANTE;
}

/** Cobertura derivada de `indicadores.zip`, reusando `carregarDataset` (L-5). */
function coberturaDoPacote(caminhoZip: string): { anos: number[]; campi: string[] } {
  const anteriorWarn = console.warn;
  const anteriorError = console.error;
  // `carregarDataset` avisa quando o pacote não existe e erro quando ele é
  // ilegível. Os dois casos são estados legítimos aqui — viram
  // `motivoIndisponivel` no artefato, e repetir a mensagem no log do build só
  // confundiria com falha de build.
  console.warn = () => {};
  console.error = () => {};
  try {
    const dataset: DatasetCompleto = carregarDataset(caminhoZip);
    return {
      anos: [...dataset.anos].sort((a, b) => a - b),
      campi: dataset.campi.map((c) => c.slug).sort(),
    };
  } catch {
    // Um pacote ilegível — inclusive um diretório no lugar do arquivo — não pode
    // derrubar o build: a listagem segue e o item aparece indisponível (L-1).
    return { anos: [], campi: ['todos'] };
  } finally {
    console.warn = anteriorWarn;
    console.error = anteriorError;
  }
}

/** Anos de apuração declarados no nome da planilha. */
function anosDaPlanilha(nomeArquivo: string): number[] {
  const planilha = nomeArquivo.match(PADRAO_PLANILHA);
  return planilha ? [Number(planilha[1])] : [];
}

/**
 * Declara os insumos que a cadeia exige, lidos de `dados-insumo.yml`.
 *
 * O glob abaixo só enxerga o que **existe**. Um insumo apagado do disco
 * desapareceria da listagem, e FR-017 exige o contrário: o item aparece
 * indisponível, com explicação. O manifesto é o que permite distinguir "este
 * insumo não é exigido" de "este insumo foi removido".
 *
 * Só a lista `arquivos:` é lida, e só a chave `nome:` dentro dela. O bloco
 * `export_canonico:` do manifesto aponta para o caminho **no repositório de
 * origem** (`data/exports/…`), não no repositório local — tratá-lo como caminho
 * local inventaria um arquivo que nunca esteve aqui. O export canônico é
 * declarado por sua presença em `data/canonical/`.
 *
 * Sem manifesto — como nesta branch, antes do merge de 012 — a lista fica só
 * com o que o disco mostra, e um insumo removido some da página. Isso é
 * coerente com a ausência de fonte declarada, e é melhor do que inventar um
 * nome de arquivo para listar.
 */
function declaradosNoManifesto(raizRepo: string): string[] {
  const caminho = path.join(raizRepo, MANIFESTO_INSUMO);
  if (!fs.existsSync(caminho)) return [];

  const declarados: string[] = [];
  const linhas = fs.readFileSync(caminho, 'utf-8').split(/\r?\n/);

  let dentroDeArquivos = false;
  for (const linha of linhas) {
    if (/^arquivos\s*:/.test(linha)) {
      dentroDeArquivos = true;
      continue;
    }
    // Chave no primeiro nível (sem indentação) encerra a lista `arquivos:`.
    if (dentroDeArquivos && /^[^#\s]/.test(linha)) break;
    if (!dentroDeArquivos) continue;

    const nome = linha.match(/^\s*-\s*nome\s*:\s*(.+)$/);
    if (!nome) continue;
    const arquivo = nome[1].trim().replace(/^["']|["']$/g, '');
    if (PADRAO_PLANILHA.test(arquivo)) {
      declarados.push(`${PASTA_RAW}/${arquivo}`);
    }
  }
  return declarados;
}

/**
 * Descobre as planilhas de matrícula por glob (L-6).
 *
 * Descoberta, não lista fixa: um insumo novo que siga o padrão entra sem
 * alteração de código, que é o mesmo motivo pelo qual o ETL tira o ano do nome
 * em vez de consultar um catálogo.
 *
 * O resultado é a **união** do que o glob acha com o que o manifesto declara.
 * O glob garante que insumo novo aparece sozinho (L-6); o manifesto garante que
 * insumo removido continua listado como indisponível (FR-017). Nenhum dos dois
 * sozinho cumpre os dois requisitos.
 */
export function descobrirInsumos(raizRepo: string): string[] {
  const encontrados = new Set<string>();

  const canonico = path.join(raizRepo, EXPORT_CANONICO);
  if (fs.existsSync(canonico)) {
    encontrados.add(EXPORT_CANONICO);
  }

  const pastaRaw = path.join(raizRepo, PASTA_RAW);
  if (fs.existsSync(pastaRaw)) {
    for (const entrada of fs.readdirSync(pastaRaw).sort()) {
      if (PADRAO_PLANILHA.test(entrada)) {
        encontrados.add(`${PASTA_RAW}/${entrada}`);
      }
    }
  }

  for (const declarado of declaradosNoManifesto(raizRepo)) {
    encontrados.add(declarado);
  }

  return Array.from(encontrados).sort();
}

/**
 * Constrói um artefato a partir do que existe em disco.
 *
 * `disponivel` e `motivoIndisponivel` saem daqui, nunca do chamador: um
 * artefato disponível tem o arquivo por construção, e um indisponível sempre
 * tem motivo (L-1, L-2).
 */
function construirArtefato(params: {
  id: string;
  origem: string;
  raizRepo: string;
  natureza: NaturezaArtefato;
  gateAberto: boolean;
  saidaPublic: string;
  copiar: boolean;
  anos?: number[];
  campi?: string[];
}): ArtefatoDownload {
  const { id, origem, raizRepo, natureza, gateAberto, saidaPublic, copiar } = params;
  const nomeArquivo = path.basename(origem);
  const absoluto = path.join(raizRepo, origem);
  const existe = fs.existsSync(absoluto) && fs.statSync(absoluto).isFile();

  let stats: fs.Stats | null = null;
  if (existe) {
    try {
      stats = fs.statSync(absoluto);
    } catch {
      stats = null;
    }
  }

  let motivo: string | null = null;
  if (natureza === 'dado-pessoal' && !gateAberto) {
    motivo = 'Indisponível enquanto a revisão institucional dos dados pessoais não é concluída.';
  } else if (!existe) {
    motivo = 'Indisponível: o arquivo não foi encontrado no repositório.';
  }

  const disponivel = motivo === null;

  // `caminhoPublico` é sempre preenchido: ele descreve onde o arquivo será
  // servido, não se pode ser baixado agora. A disponibilidade é `disponivel` +
  // `motivoIndisponivel`, e o template decide não renderizar `<a href>` quando
  // indisponível (Pg-2) — o que impede o link quebrado sem tornar o caminho
  // ausente do modelo.
  const caminhoPublico = `dados/${nomeArquivo}`;

  if (disponivel && copiar) {
    const destino = path.join(raizRepo, saidaPublic);
    const alvo = path.join(destino, nomeArquivo);
    // L-4: nada servido escapa de `public/dados/`.
    if (path.resolve(alvo).startsWith(path.resolve(destino) + path.sep)) {
      fs.mkdirSync(destino, { recursive: true });
      if (path.resolve(absoluto) !== path.resolve(alvo)) {
        fs.copyFileSync(absoluto, alvo);
      }
    }
  }

  const anos =
    params.anos ?? (nomeArquivo === 'indicadores.zip' ? [] : anosDaPlanilha(nomeArquivo));

  return {
    id,
    arquivo: nomeArquivo,
    rotulo: rotuloPara(nomeArquivo),
    descricao: descricaoPara(nomeArquivo),
    natureza,
    caminhoPublico,
    bytes: stats ? stats.size : null,
    atualizadoEm: stats ? stats.mtime : null,
    anos,
    campi: params.campi ?? (natureza === 'agregado' ? ['todos'] : []),
    disponivel,
    motivoIndisponivel: motivo,
  };
}

/**
 * Deriva a listagem de artefatos a partir do que existe em disco.
 *
 * Só o agregado `indicadores.zip` é offered (D-05): pacotes parciais por campus e
 * o pacote intermediário de listagens existem como artefatos de desenvolvimento,
 * e oferecê-los criaria a impressão de que são parte da publicação oficial.
 */
export function carregarDownloads(opcoes: OpcoesCarregamento = {}): ArtefatoDownload[] {
  const raizRepo = opcoes.raizRepo ?? process.cwd();
  const copiar = opcoes.copiarParaPublic ?? true;
  const gateAberto = opcoes.gateAberto ?? portaoAberto(raizRepo);
  const saidaPublic = PADRAO_SAIDA_PUBLIC;

  // Limpar **antes** de repovoar, e não depois: os artefatos são copiados durante
  // a construção da listagem, e uma limpeza ao fim apagaria o que acabou de ser
  // copiado.
  if (copiar) limparSaidaPublica(raizRepo, saidaPublic);

  const artefatos: ArtefatoDownload[] = [];

  const caminhoZip = path.join(raizRepo, PACOTE_OFICIAL);
  const cobertura = coberturaDoPacote(caminhoZip);
  artefatos.push(
    construirArtefato({
      id: 'pacote-oficial',
      origem: PACOTE_OFICIAL,
      raizRepo,
      natureza: 'agregado',
      gateAberto,
      saidaPublic,
      copiar,
      anos: cobertura.anos,
      campi: cobertura.campi,
    }),
  );

  for (const origem of descobrirInsumos(raizRepo)) {
    artefatos.push(
      construirArtefato({
        id: `insumo-${path.basename(origem)}`,
        origem,
        raizRepo,
        natureza: 'dado-pessoal',
        gateAberto,
        saidaPublic,
        copiar,
      }),
    );
  }

  return artefatos;
}

/**
 * Esvazia `public/dados/` antes de a execução repovoar o diretório.
 *
 * Sem isto o portão não é "fechado", é apenas *silencioso*. `public/dados/` é
 * gerado e não é limpo entre execuções: uma build com o portão aberto deixa
 * `exports_canonical.zip` lá, e uma build seguinte com o portão fechado que
 * apenas se recusasse a copiar manteria o arquivo no lugar — o Astro copia
 * `public/` para `dist/` no início do build, e o site passaria a servir o dado
 * pessoal enquanto o log anunciava "omitidos".
 *
 * Limpar antes de copiar (e não só apagar os arquivos recusados) tem um
 * segundo efeito desejado: um artefato que saiu do disco entre duas execuções
 * desaparece de `public/dados/`, em vez de ficar lá como órfão sem lastro na
 * listagem.
 *
 * O `.gitkeep` é preservado — sem ele `public/dados/` sairia do Git depois da
 * primeira execução, e o diretório não voltaria sem `git checkout`.
 */
function limparSaidaPublica(raizRepo: string, saidaPublic: string): void {
  const destino = path.join(raizRepo, saidaPublic);
  if (!fs.existsSync(destino)) return;

  for (const entrada of fs.readdirSync(destino, { withFileTypes: true })) {
    // Arquivos soltos e subdiretórios: um diretório colocado onde o artefato
    // deveria estar também precisa sair, senão a cópia seguinte falha.
    if (entrada.name === '.gitkeep') continue;
    fs.rmSync(path.join(destino, entrada.name), { force: true, recursive: true });
  }
}

/**
 * Lista de insumos que a cadeia exige — base da seção de instalação.
 *
 * Os seis `.xlsx` são descobertos por glob; o export canônico é declarado
 * incondicionalmente. FR-009 exige que nenhum insumo exigido fique sem
 * instrução — e um guia que some da página justamente quando o arquivo falta é
 * o guia que não ajuda ninguém a resolver o problema. A lista de downloads é
 * que marca o item como indisponível (FR-017); aqui a linha continua, porque
 * ela diz **onde colocar** o arquivo, e essa instrução é justamente o que falta
 * quando o arquivo não está lá.
 */
export function obterInsumosCadeia(raizRepo: string = process.cwd()): InsumoCadeia[] {
  const insumos: InsumoCadeia[] = [];

  insumos.push({
    caminho: EXPORT_CANONICO,
    etapa: 'etl',
    finalidade:
      'Fonte da relação de estudantes e servidores. É o insumo que produz o pacote oficial.',
    origem: 'Emissão institucional da base oficial (provedor interno do IFES).',
    revisao: lerRevisaoCanonica(raizRepo),
    natureza: 'dado-pessoal',
    obtendoPublico: true,
  });

  for (const origem of descobrirInsumos(raizRepo)) {
    const nome = path.basename(origem);
    if (nome === 'exports_canonical.zip') continue;
    const planilha = nome.match(PADRAO_PLANILHA);
    if (!planilha) continue;
    const [, ano, semestre] = planilha;
    insumos.push({
      caminho: origem,
      etapa: 'etl-listagens',
      finalidade:
        `Matrícula do ${semestre}º semestre de ${ano}. Alimenta os indicadores ` +
        'NTE, NTECPP e PIES do Pilar 1.',
      origem: 'Emissão institucional da base oficial (provedor interno do IFES).',
      revisao: `${ano}-${semestre}`,
      natureza: 'dado-pessoal',
      obtendoPublico: true,
    });
  }

  return insumos;
}

/**
 * Lê a revisão declarada do export canônico, se houver.
 *
 * `dados-insumo.yml` é o manifesto versionado do intake (spec 012). Quando não
 * existe — como nesta branch, antes do merge de 012 — a revisão é `null` e a
 * página diz "não declarada", em vez de inventar uma (Princípio III).
 *
 * A leitura é **escopada ao bloco `export_canonico:`**, e não uma busca da
 * primeira chave `versao:`/`revisao:` do arquivo. O motivo é concreto: o
 * manifesto tem `versao: 'v1'` no topo, que é a versão do **esquema**, não do
 * arquivo de dados. Uma busca global devolveria `v1` como revisão do export —
 * e a página publicaria, com ar de metadado verificado, o número do formato do
 * manifesto no lugar do commit de onde o export veio.
 */
function lerRevisaoCanonica(raizRepo: string): string | null {
  const caminho = path.join(raizRepo, 'dados-insumo.yml');
  if (!fs.existsSync(caminho)) return null;

  const linhas = fs.readFileSync(caminho, 'utf-8').split(/\r?\n/);
  let dentroDoBloco = false;

  for (const linha of linhas) {
    // Chave de primeiro nível abre ou fecha o bloco. `export_canonico:` abre;
    // qualquer outra fecha, porque é o fim do bloco que nos interessa.
    if (/^export_canonico\s*:/.test(linha)) {
      dentroDoBloco = true;
      continue;
    }
    if (/^[^#\s]/.test(linha)) dentroDoBloco = false;
    if (!dentroDoBloco) continue;

    const revisao = linha.match(/^\s+revisao\s*:\s*(.+)$/);
    if (!revisao) continue;
    return revisao[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}
