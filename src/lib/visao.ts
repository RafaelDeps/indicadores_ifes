import type { ContextoFiltro, DatasetCompleto } from './dataset-core';
import { obterIndicadoresDoPilar, obterIndicadorCompleto } from './dataset-core';
import { formatValor, TEXTO_INDISPONIVEL } from './formatters';
import { calcularDelta } from './delta';
import { avisoAnoEmAndamento } from './anoEmAndamento';

export interface VisaoMetrica {
  sigla: string;
  rotulo?: string;
  valorFormatado: string;
  unidade?: string;
  disponivel: boolean;
  deltaFormatado?: string;
  deltaPositivo?: boolean | null;
  avisoEmAndamento?: string | null;
  hrefDetalhe?: string;
}

export interface VisaoPaginaGeral {
  contexto: ContextoFiltro;
  kpis: Record<string, VisaoMetrica>;
  pilares: {
    1: VisaoMetrica[];
    2: VisaoMetrica[];
    3: VisaoMetrica[];
  };
}

export interface VisaoComponente {
  sigla: string;
  nome: string;
  quantidadeFormatada: string;
}

export interface VisaoPaginaDetalhe {
  sigla: string;
  contexto: ContextoFiltro;
  metricaPrincipal: VisaoMetrica;
  valorPrincipalFormatado: string;
  unidade?: string;
  componentes: VisaoComponente[];
}

export function computarMetricaIndicador(
  dataset: DatasetCompleto,
  sigla: string,
  contexto: ContextoFiltro,
  rotuloPadrao?: string,
  unidadePadrao?: string,
): VisaoMetrica {
  const indCompleto = obterIndicadorCompleto(dataset, sigla, contexto.campus);
  const indAno = indCompleto?.valores.find((v) => v.ano === contexto.ano);
  const valor = indAno?.valor ?? null;
  const disponivel = valor !== null;

  const delta =
    disponivel && indCompleto
      ? calcularDelta(indCompleto.valores, contexto.ano)
      : {
          tipo: 'sem_base' as const,
          valorFormatado: 'Sem base anterior',
          positivo: null,
        };

  const sufixoTipo = indCompleto?.tipoValor === 'percentual' ? '%' : undefined;
  const unidade =
    unidadePadrao ?? (indCompleto?.unidade ? indCompleto.unidade.toLowerCase() : sufixoTipo);

  let valorFormatado = TEXTO_INDISPONIVEL;
  if (disponivel) {
    valorFormatado = formatValor(valor) + (indCompleto?.tipoValor === 'percentual' ? '%' : '');
  }

  const pilarNum = indCompleto?.pilarNumero ?? 1;
  const hrefDetalhe = `/pilar-${pilarNum}/${indCompleto?.slug ?? sigla.toLowerCase()}/?campus=${contexto.campus}&ano=${contexto.ano}`;

  return {
    sigla,
    rotulo: rotuloPadrao ?? indCompleto?.nome ?? sigla,
    valorFormatado,
    unidade: disponivel ? unidade : undefined,
    disponivel,
    deltaFormatado: delta.valorFormatado,
    deltaPositivo: delta.positivo,
    avisoEmAndamento: avisoAnoEmAndamento(contexto.ano),
    hrefDetalhe,
  };
}

export function computarVisaoGeral(
  dataset: DatasetCompleto,
  contexto: ContextoFiltro,
): VisaoPaginaGeral {
  const pilar1 = obterIndicadoresDoPilar(dataset, 1, contexto.campus, contexto.ano);
  const pies = pilar1.find((i) => i.sigla === 'PIES');
  const nepComp = pies?.componentes.find((c) => c.sigla === 'NEP')?.valores[0]?.quantidade ?? null;

  // KPIs de topo
  const kpis: Record<string, VisaoMetrica> = {
    NTPP: computarMetricaIndicador(
      dataset,
      'NTPP',
      contexto,
      'Projetos de pesquisa (NTPP)',
      'projetos',
    ),
    QSPP: computarMetricaIndicador(
      dataset,
      'QSPP',
      contexto,
      'Servidores em pesquisa (QSPP)',
      'servidores',
    ),
    NEP: {
      sigla: 'NEP',
      rotulo: 'Estudantes em pesquisa (NEP)',
      valorFormatado: nepComp !== null ? formatValor(nepComp) : TEXTO_INDISPONIVEL,
      unidade: nepComp !== null ? 'estudantes' : undefined,
      disponivel: nepComp !== null,
      avisoEmAndamento: avisoAnoEmAndamento(contexto.ano),
    },
    PIPRO: computarMetricaIndicador(
      dataset,
      'PIPRO',
      contexto,
      'Produção intelectual (PIPRO)',
      'produções',
    ),
  };

  // Métricas para cada cartão de pilar
  const metricasP1: VisaoMetrica[] = [
    kpis.NTPP,
    kpis.QSPP,
    {
      sigla: 'NEP',
      rotulo: 'Estudantes envolvidos',
      valorFormatado: nepComp !== null ? formatValor(nepComp) : TEXTO_INDISPONIVEL,
      unidade: nepComp !== null ? 'estudantes' : undefined,
      disponivel: nepComp !== null,
    },
    computarMetricaIndicador(dataset, 'PIES', contexto, 'Percentual discente'),
  ];

  const metricasP2: VisaoMetrica[] = [
    computarMetricaIndicador(dataset, 'PINV', contexto, 'Investimento em P&I'),
    computarMetricaIndicador(dataset, 'PIPDI', contexto, 'Acordos de parceria'),
  ];

  const metricasP3: VisaoMetrica[] = [
    kpis.PIPRO,
    computarMetricaIndicador(dataset, 'PIPROT', contexto, 'Ativos de PI', 'ativos'),
    computarMetricaIndicador(dataset, 'PIPROTR', contexto, 'Ativos transferidos'),
  ];

  return {
    contexto,
    kpis,
    pilares: {
      1: metricasP1,
      2: metricasP2,
      3: metricasP3,
    },
  };
}

export function computarVisaoPilar(
  dataset: DatasetCompleto,
  pilarNumero: 1 | 2 | 3,
  contexto: ContextoFiltro,
): VisaoMetrica[] {
  const pilar = obterIndicadoresDoPilar(dataset, pilarNumero, contexto.campus, contexto.ano);
  return pilar.map((ind) => computarMetricaIndicador(dataset, ind.sigla, contexto));
}

export function computarVisaoDetalhe(
  dataset: DatasetCompleto,
  sigla: string,
  contexto: ContextoFiltro,
): VisaoPaginaDetalhe | undefined {
  const indCompleto = obterIndicadorCompleto(dataset, sigla, contexto.campus);
  if (!indCompleto) return undefined;

  const metricaPrincipal = computarMetricaIndicador(dataset, sigla, contexto);

  // Componentes no ano selecionado
  const componentes: VisaoComponente[] = indCompleto.componentes.map((comp) => {
    const valAno = comp.valores.find((v) => v.ano === contexto.ano)?.quantidade ?? null;
    return {
      sigla: comp.sigla,
      nome: comp.nome,
      quantidadeFormatada: valAno !== null ? formatValor(valAno) : TEXTO_INDISPONIVEL,
    };
  });

  return {
    sigla: indCompleto.sigla,
    contexto,
    metricaPrincipal,
    valorPrincipalFormatado: metricaPrincipal.valorFormatado,
    unidade: metricaPrincipal.unidade,
    componentes,
  };
}
