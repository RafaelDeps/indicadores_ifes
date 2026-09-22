import ntpp from './ntpp.json';
import qspp from './qspp.json';
import pies from './pies.json';
import picot from './picot.json';

export interface Variavel {
  sigla: string;
  descricao: string;
}

export interface ValorAnual {
  ano: number;
  valor: number | null;
  motivoIndisponivel?: string;
  campus?: string;
}

export interface ValorComponente {
  ano: number;
  quantidade: number | null;
  motivoIndisponivel?: string;
  campus?: string;
}

export interface Componente {
  sigla: string;
  nome: string;
  valores: ValorComponente[];
}

export interface VariavelFormula {
  simbolo: string;
  descricao: string;
  unidade: string;
}

export type TipoDelta = 'percentual' | 'absoluto' | 'sem_base';

export interface VariavelDelta {
  tipo: TipoDelta;
  valorFormatado: string;
  positivo: boolean | null;
}

export type IconeIndicador = 'academic' | 'network' | 'patent' | 'project' | 'chart' | 'default';

export interface Indicador {
  sigla: string;
  slug: string;
  pilarNumero?: number;
  nome: string;
  oQueMede: string;
  finalidade?: string;
  formula: string;
  tipoValor?: 'quantidade' | 'percentual';
  unidade?: string;
  icone?: IconeIndicador;
  variaveis: Variavel[];
  variaveisFormula?: VariavelFormula[];
  polaridade: string;
  fonteDados?: string;
  dataAtualizacao?: string | null;
  motivoIndisponivel?: string;
  valores: ValorAnual[];
  componentes: Componente[];
}

export const SIGLAS_VALIDAS = [
  'NTPP',
  'QSPP',
  'PIES',
  'PICOT',
  'PINV',
  'PIPDI',
  'PIPRO',
  'PIPROT',
  'PIPROTR',
] as const;

export type SiglaIndicador = (typeof SIGLAS_VALIDAS)[number];

export interface PilarInfo {
  numero: 1 | 2 | 3;
  slug: string;
  nome: string;
  descricao: string;
  indicadoresSiglas: SiglaIndicador[];
}

export const PILARES: PilarInfo[] = [
  {
    numero: 1,
    slug: 'pilar-1',
    nome: 'Engajamento Acadêmico e Inclusão',
    descricao:
      'Participação de pesquisadores, servidores e estudantes em iniciativas de pesquisa e inovação.',
    indicadoresSiglas: ['NTPP', 'QSPP', 'PIES', 'PICOT'],
  },
  {
    numero: 2,
    slug: 'pilar-2',
    nome: 'Fomento e Conexão com o Ecossistema',
    descricao:
      'Captação de recursos externos e acordos de cooperação com parceiros para projetos de PDeI.',
    indicadoresSiglas: ['PINV', 'PIPDI'],
  },
  {
    numero: 3,
    slug: 'pilar-3',
    nome: 'Produtividade e Propriedade Intelectual',
    descricao:
      'Produção acadêmica, proteção de ativos intangíveis e transferência de tecnologia institucional.',
    indicadoresSiglas: ['PIPRO', 'PIPROT', 'PIPROTR'],
  },
];

export interface IndicadorMeta {
  sigla: SiglaIndicador;
  slug: string;
  pilarNumero: 1 | 2 | 3;
  nome: string;
  oQueMede: string;
  finalidade: string;
  formula: string;
  tipoValor: 'quantidade' | 'percentual';
  unidade: string;
  icone: IconeIndicador;
  variaveisFormula: VariavelFormula[];
  polaridade: 'maior-e-melhor';
}

export const INDICADORES_META: Record<SiglaIndicador, IndicadorMeta> = {
  NTPP: {
    sigla: 'NTPP',
    slug: 'ntpp',
    pilarNumero: 1,
    nome: 'Número Total de Projetos de Pesquisa',
    oQueMede: 'Mede a quantidade total de projetos de pesquisa registrados em execução.',
    finalidade:
      'Avaliar a dinâmica, capacidade instalada e o volume da atividade científica executada no âmbito da instituição.',
    formula: 'NTPP = Projetos registrados em execução',
    tipoValor: 'quantidade',
    unidade: 'Projetos',
    icone: 'project',
    polaridade: 'maior-e-melhor',
    variaveisFormula: [
      {
        simbolo: 'NTPP',
        descricao: 'Número total de projetos de pesquisa registrados em execução',
        unidade: 'Projetos',
      },
    ],
  },
  QSPP: {
    sigla: 'QSPP',
    slug: 'qspp',
    pilarNumero: 1,
    nome: 'Quantitativo de Servidores Desenvolvendo Projetos',
    oQueMede: 'Mede o número de servidores únicos participando de projetos de pesquisa.',
    finalidade:
      'Mensurar a mobilização e engajamento do corpo docente e técnico-administrativo em atividades de P&I.',
    formula: 'QSPP = SUPP',
    tipoValor: 'quantidade',
    unidade: 'Servidores',
    icone: 'academic',
    polaridade: 'maior-e-melhor',
    variaveisFormula: [
      {
        simbolo: 'SUPP',
        descricao: 'Servidores únicos participantes de projetos de pesquisa',
        unidade: 'Servidores',
      },
    ],
  },
  PIES: {
    sigla: 'PIES',
    slug: 'pies',
    pilarNumero: 1,
    nome: 'Percentual de Estudantes Envolvidos em Pesquisa',
    oQueMede: 'Mede a proporção de estudantes do IFES que participam de pesquisa.',
    finalidade:
      'Monitorar a inserção discente na iniciação científica e tecnológica e a formação de novos talentos.',
    formula: 'PIES = (NEP / NTE) × 100',
    tipoValor: 'percentual',
    unidade: '%',
    icone: 'chart',
    polaridade: 'maior-e-melhor',
    variaveisFormula: [
      {
        simbolo: 'NEP',
        descricao: 'Número de estudantes envolvidos em projetos de pesquisa',
        unidade: 'Estudantes',
      },
      {
        simbolo: 'NTE',
        descricao: 'Número total de estudantes matriculados',
        unidade: 'Estudantes',
      },
    ],
  },
  PICOT: {
    sigla: 'PICOT',
    slug: 'picot',
    pilarNumero: 1,
    nome: 'Percentual de Estudantes Cotistas Envolvidos em Pesquisa',
    oQueMede: 'Mede a proporção de estudantes cotistas entre os envolvidos em pesquisa.',
    finalidade:
      'Avaliar a equidade, diversidade e democratização do acesso discente às oportunidades de iniciação científica.',
    formula: 'PICOT = (NTECPP / NEP) × 100',
    tipoValor: 'percentual',
    unidade: '%',
    icone: 'chart',
    polaridade: 'maior-e-melhor',
    variaveisFormula: [
      {
        simbolo: 'NTECPP',
        descricao: 'Número de estudantes cotistas envolvidos em pesquisa',
        unidade: 'Estudantes',
      },
      {
        simbolo: 'NEP',
        descricao: 'Número total de estudantes envolvidos em pesquisa',
        unidade: 'Estudantes',
      },
    ],
  },
  PINV: {
    sigla: 'PINV',
    slug: 'pinv',
    pilarNumero: 2,
    nome: 'Percentual de Investimento em Pesquisa, Pós e Inovação',
    oQueMede:
      'Mede a participação dos investimentos em pesquisa e inovação no orçamento institucional.',
    finalidade:
      'Verificar o comprometimento e priorização orçamentária institucional para fomento de PDeI.',
    formula: 'PINV = (TAFPPI / OCC) × 100',
    tipoValor: 'percentual',
    unidade: '%',
    icone: 'chart',
    polaridade: 'maior-e-melhor',
    variaveisFormula: [
      {
        simbolo: 'TAFPPI',
        descricao: 'Total apurado de fomento para pesquisa, pós-graduação e inovação',
        unidade: 'R$',
      },
      {
        simbolo: 'OCC',
        descricao: 'Orçamento corrente de custeio executado',
        unidade: 'R$',
      },
    ],
  },
  PIPDI: {
    sigla: 'PIPDI',
    slug: 'pipdi',
    pilarNumero: 2,
    nome: 'Quantidade de Acordos de Parceria para PDeI',
    oQueMede: 'Mede o volume acumulado de parcerias formalizadas com o ecossistema.',
    finalidade:
      'Acompanhar a articulação institucional e a cooperação com o setor produtivo e governamental.',
    formula: 'PIPDI = NAPPCT',
    tipoValor: 'quantidade',
    unidade: 'Acordos',
    icone: 'network',
    polaridade: 'maior-e-melhor',
    variaveisFormula: [
      {
        simbolo: 'NAPPCT',
        descricao: 'Número de acordos de parceria para pesquisa e inovação firmados',
        unidade: 'Acordos',
      },
    ],
  },
  PIPRO: {
    sigla: 'PIPRO',
    slug: 'pipro',
    pilarNumero: 3,
    nome: 'Produção Intelectual',
    oQueMede: 'Mede a produção bibliográfica e técnica gerada pelos pesquisadores.',
    finalidade:
      'Avaliar a produtividade, difusão do conhecimento acadêmico e impacto técnico dos pesquisadores.',
    formula: 'PIPRO = NPB + NPT',
    tipoValor: 'quantidade',
    unidade: 'Produções',
    icone: 'academic',
    polaridade: 'maior-e-melhor',
    variaveisFormula: [
      {
        simbolo: 'NPB',
        descricao: 'Número de produções acadêmicas bibliográficas publicadas',
        unidade: 'Publicações',
      },
      {
        simbolo: 'NPT',
        descricao: 'Número de produções técnicas e tecnológicas geradas',
        unidade: 'Produções',
      },
    ],
  },
  PIPROT: {
    sigla: 'PIPROT',
    slug: 'piprot',
    pilarNumero: 3,
    nome: 'Quantidade Total de Ativos de Propriedade Intelectual',
    oQueMede: 'Mede o total acumulado de ativos protegidos nas diferentes modalidades de PI.',
    finalidade:
      'Mensurar a proteção jurídica dos ativos intangíveis e criações tecnológicas concebidas no IFES.',
    formula: 'PIPROT = PA + RM + DI + C + TC + PC + OGM',
    tipoValor: 'quantidade',
    unidade: 'Ativos',
    icone: 'patent',
    polaridade: 'maior-e-melhor',
    variaveisFormula: [
      {
        simbolo: 'PA',
        descricao: 'Patentes de invenção e modelos de utilidade depositados',
        unidade: 'Ativos',
      },
      { simbolo: 'RM', descricao: 'Registros de marcas requeridos', unidade: 'Ativos' },
      { simbolo: 'DI', descricao: 'Desenhos industriais registrados', unidade: 'Ativos' },
      { simbolo: 'C', descricao: 'Cultivares e variedades protegidas', unidade: 'Ativos' },
      {
        simbolo: 'TC',
        descricao: 'Topografias de circuitos integrados registradas',
        unidade: 'Ativos',
      },
      { simbolo: 'PC', descricao: 'Programas de computador registrados', unidade: 'Ativos' },
      {
        simbolo: 'OGM',
        descricao: 'Organismos geneticamente modificados ou biotecnológicos',
        unidade: 'Ativos',
      },
    ],
  },
  PIPROTR: {
    sigla: 'PIPROTR',
    slug: 'piprotr',
    pilarNumero: 3,
    nome: 'Quantidade Total de Ativos Transferidos',
    oQueMede: 'Mede os contratos de transferência de tecnologia e licenciamento efetivados.',
    finalidade:
      'Medir a capacidade de inserção econômica e transferência prática das tecnologias geradas para a sociedade.',
    formula: 'PIPROTR = CT + CL + CC',
    tipoValor: 'quantidade',
    unidade: 'Contratos',
    icone: 'network',
    polaridade: 'maior-e-melhor',
    variaveisFormula: [
      {
        simbolo: 'CT',
        descricao: 'Contratos de cessão de direitos de propriedade intelectual',
        unidade: 'Contratos',
      },
      {
        simbolo: 'CL',
        descricao: 'Contratos de licenciamento de patentes ou software',
        unidade: 'Contratos',
      },
      {
        simbolo: 'CC',
        descricao: 'Contratos de comercialização e exploração econômica',
        unidade: 'Contratos',
      },
    ],
  },
};

function assertarValorAnual(
  ano: number,
  valor: number | null,
  motivo: string | undefined,
  campo: string,
): void {
  if (ano < 2000 || ano > 2100) {
    throw new Error(`${campo}: ano ${ano} fora do intervalo 2000–2100.`);
  }
  if (valor === null) {
    if (!motivo || motivo.trim() === '') {
      throw new Error(`${campo}: valor nulo exige motivoIndisponivel.`);
    }
  } else if (motivo !== undefined) {
    throw new Error(`${campo}: motivoIndisponivel só é permitido quando o valor é nulo.`);
  }
}

export function validarIndicador(indicador: Indicador): void {
  const { sigla } = indicador;
  if (!SIGLAS_VALIDAS.includes(sigla as SiglaIndicador)) {
    throw new Error(`Sigla inválida: ${sigla}. Esperadas: ${SIGLAS_VALIDAS.join(', ')}.`);
  }
  if (indicador.slug !== sigla.toLowerCase()) {
    throw new Error(`${sigla}: slug deve ser a sigla em minúsculas.`);
  }
  if (indicador.polaridade !== 'maior-e-melhor') {
    throw new Error(`${sigla}: polaridade deve ser "maior-e-melhor".`);
  }
  if (
    indicador.dataAtualizacao !== null &&
    indicador.dataAtualizacao !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(indicador.dataAtualizacao)
  ) {
    throw new Error(`${sigla}: dataAtualizacao deve ser nula ou YYYY-MM-DD.`);
  }
  if (indicador.valores.length === 0 && !indicador.motivoIndisponivel?.trim()) {
    throw new Error(`${sigla}: indicador sem valores exige motivoIndisponivel.`);
  }
  let anoAnterior = 0;
  for (const valor of indicador.valores) {
    if (valor.ano <= anoAnterior) {
      throw new Error(`${sigla}: anos devem ser estritamente crescentes e únicos.`);
    }
    assertarValorAnual(valor.ano, valor.valor, valor.motivoIndisponivel, `${sigla} ${valor.ano}`);
    anoAnterior = valor.ano;
  }
  for (const componente of indicador.componentes) {
    let anoAnteriorComponente = 0;
    for (const valor of componente.valores) {
      if (valor.ano <= anoAnteriorComponente) {
        throw new Error(`${sigla}/${componente.sigla}: anos devem ser estritamente crescentes.`);
      }
      assertarValorAnual(
        valor.ano,
        valor.quantidade,
        valor.motivoIndisponivel,
        `${sigla}/${componente.sigla} ${valor.ano}`,
      );
      anoAnteriorComponente = valor.ano;
    }
  }
}

function validarColecao(lista: Indicador[]): void {
  const slugs = new Set<string>();
  for (const indicador of lista) {
    validarIndicador(indicador);
    if (slugs.has(indicador.slug)) {
      throw new Error(`Slug duplicado: ${indicador.slug}`);
    }
    slugs.add(indicador.slug);
  }
}

export const indicadores: Indicador[] = [ntpp, qspp, pies, picot].map(
  (arquivo) =>
    ({
      ...arquivo,
      pilarNumero: 1,
      tipoValor: (arquivo.sigla === 'PIES' || arquivo.sigla === 'PICOT'
        ? 'percentual'
        : 'quantidade') as 'quantidade' | 'percentual',
    }) as Indicador,
);

validarColecao(indicadores);

export function obterIndicadorPorSlug(slug: string): Indicador | undefined {
  return indicadores.find((indicador) => indicador.slug === slug);
}

export function obterPilarPorNumero(numero: 1 | 2 | 3): PilarInfo | undefined {
  return PILARES.find((p) => p.numero === numero);
}

export function obterPilarPorSlug(slug: string): PilarInfo | undefined {
  return PILARES.find((p) => p.slug === slug);
}
