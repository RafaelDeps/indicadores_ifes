import type { DatasetCompleto } from './dataset-core';
import type { ItemBuscaIndicador } from './visao';

const NOMES_PILARES: Record<number, string> = {
  1: 'Pilar 1 — Engajamento Acadêmico e Inclusão',
  2: 'Pilar 2 — Fomento e Conexão com o Ecossistema',
  3: 'Pilar 3 — Produtividade e Propriedade Intelectual',
};

const METADADOS_INDICADORES: Record<string, { nome: string; slug: string; pilar: 1 | 2 | 3 }> = {
  NTPP: {
    nome: 'Número Total de Projetos de Pesquisa',
    slug: 'ntpp',
    pilar: 1,
  },
  QSPP: {
    nome: 'Quadro de Servidores Participantes de Projetos de Pesquisa',
    slug: 'qspp',
    pilar: 1,
  },
  PIES: {
    nome: 'Participação e Inclusão de Estudantes na Pesquisa',
    slug: 'pies',
    pilar: 1,
  },
  PICOT: {
    nome: 'Participação e Inclusão de Estudantes Cotistas na Pesquisa',
    slug: 'picot',
    pilar: 1,
  },
  PINV: {
    nome: 'Recursos Financeiros de Fomento e Conexão com o Ecossistema',
    slug: 'pinv',
    pilar: 2,
  },
  PIPDI: {
    nome: 'Parcerias Institucionais de Pesquisa, Desenvolvimento e Inovação',
    slug: 'pipdi',
    pilar: 2,
  },
  PIPRO: {
    nome: 'Produção Intelectual e Tecnológica Registrada Oficialmente',
    slug: 'pipro',
    pilar: 3,
  },
  PIPROT: {
    nome: 'Proteção de Ativos de Propriedade Intelectual e Transferência',
    slug: 'piprot',
    pilar: 3,
  },
  PIPROTR: {
    nome: 'Produções Intelectuais e Tecnológicas com Transferência Registrada',
    slug: 'piprotr',
    pilar: 3,
  },
};

function normalizarTexto(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function criarIndiceBusca(_dataset?: DatasetCompleto): ItemBuscaIndicador[] {
  const itens: ItemBuscaIndicador[] = [];

  for (const [sigla, meta] of Object.entries(METADADOS_INDICADORES)) {
    const pilarNumero = meta.pilar;
    const pilarNome = NOMES_PILARES[pilarNumero] ?? `Pilar ${pilarNumero}`;
    const termos = normalizarTexto(`${sigla} ${meta.nome} ${pilarNome}`);

    itens.push({
      sigla,
      nome: meta.nome,
      pilarNumero,
      pilarNome,
      slug: meta.slug,
      termosBusca: termos,
    });
  }

  return itens;
}

export function pesquisarIndicadores(
  indice: ItemBuscaIndicador[],
  termo: string,
): ItemBuscaIndicador[] {
  const termoNorm = normalizarTexto(termo);
  if (!termoNorm) return [];

  const palavras = termoNorm.split(/\s+/).filter(Boolean);

  return indice.filter((item) => {
    return palavras.every(
      (palavra) => item.termosBusca.includes(palavra) || item.sigla.toLowerCase().includes(palavra),
    );
  });
}
