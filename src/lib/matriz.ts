import {
  type Indicador,
  type SiglaIndicador,
  type VariavelDelta,
  PILARES,
} from '../data/indicadores';
import { obterIndicadoresPorPilar } from './selectors';
import { formatValor, TEXTO_INDISPONIVEL } from './formatters';
import { calcularDelta } from './delta';
import { anoPadrao } from './ano';

export interface TagTematica {
  id: string;
  nome: string;
  total: number;
}

export interface IndicadorMatrizItem {
  sigla: string;
  slug: string;
  pilarNumero: 1 | 2 | 3;
  pilarNome: string;
  nome: string;
  tipoValor: 'quantidade' | 'percentual';
  unidade: string;
  polaridade: 'maior_melhor' | 'menor_melhor';
  polaridadeRotulo: string;
  tags: string[];
  ultimoAno: number | null;
  ultimoValor: number | null;
  ultimoValorFormatado: string;
  delta: VariavelDelta | null;
  urlDetalhe: string;
}

export const TAGS_CATALOGO: Record<SiglaIndicador, string[]> = {
  NTPP: ['Pesquisa', 'Docência', 'Projetos'],
  QSPP: ['Pesquisa', 'Servidores', 'Docência'],
  PIES: ['Ensino', 'Estudantes', 'Inclusão'],
  PICOT: ['Extensão', 'Parcerias', 'Projetos'],
  PINV: ['Gestão', 'Fomento', 'Financiamento'],
  PIPDI: ['Inovação', 'Parcerias', 'Cooperação'],
  PIPRO: ['Pesquisa', 'Produção Intelectual'],
  PIPROT: ['Inovação', 'Propriedade Intelectual', 'Patentes'],
  PIPROTR: ['Inovação', 'Transferência Tecnológica', 'Licenciamento'],
};

/**
 * Normaliza uma string para comparação case-insensitive e accent-insensitive.
 */
export function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Retorna os 9 indicadores do Campus Serra enriquecidos para a visualização na matriz geral.
 */
export function obterIndicadoresMatriz(
  anoReferencia?: number,
  campusSlug = 'serra',
): IndicadorMatrizItem[] {
  const pilaresNumeros: (1 | 2 | 3)[] = [1, 2, 3];
  const todosIndicadores: Indicador[] = [];

  for (const num of pilaresNumeros) {
    const lista = obterIndicadoresPorPilar(num, campusSlug);
    todosIndicadores.push(...lista);
  }

  return todosIndicadores.map((ind) => {
    const pilarNumero = (ind.pilarNumero ?? 1) as 1 | 2 | 3;
    const pilarInfo = PILARES.find((p) => p.numero === pilarNumero);
    const pilarNome = pilarInfo?.nome ?? `Pilar ${pilarNumero}`;

    // Determinar ano de referência
    const anoEfetivo = anoReferencia ?? anoPadrao(ind);
    const valorItem = anoEfetivo !== null ? ind.valores.find((v) => v.ano === anoEfetivo) : null;
    const ultimoValor = valorItem?.valor ?? null;

    let ultimoValorFormatado = TEXTO_INDISPONIVEL;
    if (ultimoValor !== null) {
      if (ind.tipoValor === 'percentual') {
        ultimoValorFormatado = `${formatValor(ultimoValor)}%`;
      } else if (ind.unidade && ind.unidade !== '') {
        ultimoValorFormatado = `${formatValor(ultimoValor)} ${ind.unidade}`;
      } else {
        ultimoValorFormatado = formatValor(ultimoValor);
      }
    }

    const delta = anoEfetivo !== null ? calcularDelta(ind.valores, anoEfetivo) : null;
    const tags = TAGS_CATALOGO[ind.sigla as SiglaIndicador] ?? ['Geral'];

    const polaridade =
      ind.polaridade === 'menor_melhor' ? ('menor_melhor' as const) : ('maior_melhor' as const);
    const polaridadeRotulo =
      polaridade === 'menor_melhor' ? 'Menor é melhor' : 'Quanto maior, melhor';

    const urlDetalhe = `/pilar-${pilarNumero}/${ind.slug}/`;

    return {
      sigla: ind.sigla,
      slug: ind.slug,
      pilarNumero,
      pilarNome,
      nome: ind.nome,
      tipoValor: ind.tipoValor ?? 'quantidade',
      unidade: ind.unidade ?? '',
      polaridade,
      polaridadeRotulo,
      tags,
      ultimoAno: anoEfetivo,
      ultimoValor,
      ultimoValorFormatado,
      delta,
      urlDetalhe,
    };
  });
}

/**
 * Agrupa e contabiliza as tags temáticas disponíveis a partir dos indicadores informados.
 */
export function obterTagsDisponiveis(itens: IndicadorMatrizItem[]): TagTematica[] {
  const mapaTags = new Map<string, { nome: string; total: number }>();

  for (const item of itens) {
    for (const tag of item.tags) {
      const id = normalizarTexto(tag);
      const atual = mapaTags.get(id);
      if (atual) {
        atual.total += 1;
      } else {
        mapaTags.set(id, { nome: tag, total: 1 });
      }
    }
  }

  return Array.from(mapaTags.entries())
    .map(([id, dados]) => ({
      id,
      nome: dados.nome,
      total: dados.total,
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'));
}

/**
 * Filtra a lista de indicadores aplicando interseção cumulativa de tag temática e termo de busca.
 */
export function filtrarIndicadores(
  itens: IndicadorMatrizItem[],
  tagId: string,
  termoBusca: string,
): IndicadorMatrizItem[] {
  const tagNormalizada = normalizarTexto(tagId);
  const buscaNormalizada = normalizarTexto(termoBusca);

  return itens.filter((item) => {
    // 1. Filtro por tag
    if (tagNormalizada && tagNormalizada !== 'todas') {
      const temTag = item.tags.some((t) => normalizarTexto(t) === tagNormalizada);
      if (!temTag) return false;
    }

    // 2. Filtro por busca
    if (buscaNormalizada) {
      const siglaNorm = normalizarTexto(item.sigla);
      const nomeNorm = normalizarTexto(item.nome);
      const pilarNorm = normalizarTexto(item.pilarNome);
      const tagsNorm = item.tags.map(normalizarTexto).join(' ');

      const match =
        siglaNorm.includes(buscaNormalizada) ||
        nomeNorm.includes(buscaNormalizada) ||
        pilarNorm.includes(buscaNormalizada) ||
        tagsNorm.includes(buscaNormalizada);

      if (!match) return false;
    }

    return true;
  });
}

/**
 * Ordena os indicadores conforme a coluna selecionada e a direção (asc ou desc).
 */
export function ordenarIndicadores(
  itens: IndicadorMatrizItem[],
  coluna: 'pilar' | 'sigla' | 'nome',
  direcao: 'asc' | 'desc',
): IndicadorMatrizItem[] {
  const copia = [...itens];
  const fator = direcao === 'asc' ? 1 : -1;

  return copia.sort((a, b) => {
    if (coluna === 'pilar') {
      if (a.pilarNumero !== b.pilarNumero) {
        return (a.pilarNumero - b.pilarNumero) * fator;
      }
      return a.sigla.localeCompare(b.sigla, 'pt-BR') * fator;
    }

    if (coluna === 'sigla') {
      return a.sigla.localeCompare(b.sigla, 'pt-BR') * fator;
    }

    if (coluna === 'nome') {
      return a.nome.localeCompare(b.nome, 'pt-BR') * fator;
    }

    return 0;
  });
}
