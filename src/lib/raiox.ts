/**
 * Módulo puro de tipos e funções de apoio ao Raio-X do Indicador (feature 026).
 *
 * Contrato: specs/026-raio-x-indicador/contracts/dom-raiox.md
 */

import { formatValor } from './formatters';
import { INDICADORES_META, type SiglaIndicador } from '../data/indicadores';
import { decomporFormula } from './formula';

export type TipoContagemRaiox = 'contagem' | 'soma';

export interface RegistroRaiox {
  [campo: string]: string | number | null;
}

export interface ComponenteRaiox {
  papel: 'numerador' | 'denominador' | 'parcela' | 'unica';
  simbolo: string;
  rotulo: string;
  unidade: string;
  tipoContagem: TipoContagemRaiox;
  apurado: number | null;
  detalhado: boolean;
  campos: string[];
  registros: RegistroRaiox[];
}

export interface FixtureRaiox {
  indicador: string;
  campus: string;
  ano: number;
  geradoEm: string;
  fontes: Array<{ arquivo: string; revisao: string | null }>;
  componentes: ComponenteRaiox[];
}

export interface ResumoRaiox {
  totalRegistros: number;
  apurado: number | null;
  conferido: boolean;
  textoSelo: string;
  divergencia: boolean;
  valorCalculado: number;
}

/**
 * Normaliza termos de busca: lowercase, NFD, remove diacríticos (D-10).
 */
export function normalizarBuscaRaiox(termo: string): string {
  return termo
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Constrói o resumo e selo de conferência de um componente da fixture (D-4).
 */
export function construirResumo(componente: ComponenteRaiox): ResumoRaiox {
  const totalRegistros = componente.registros.length;
  const apurado = componente.apurado;

  if (!componente.detalhado) {
    return {
      totalRegistros: 0,
      apurado,
      conferido: false,
      textoSelo: 'Sem detalhamento de linhas',
      divergencia: false,
      valorCalculado: 0,
    };
  }

  if (apurado === null) {
    return {
      totalRegistros,
      apurado: null,
      conferido: false,
      textoSelo: 'Dado indisponível',
      divergencia: false,
      valorCalculado: 0,
    };
  }

  if (componente.tipoContagem === 'soma') {
    const soma = componente.registros.reduce((acc, r) => {
      const v = typeof r.valor === 'number' ? r.valor : 0;
      return acc + v;
    }, 0);

    const conferido = Math.round(soma) === Math.round(apurado);
    const textoSelo = conferido
      ? `Exibindo ${totalRegistros} registros | Total apurado: R$ ${formatValor(apurado)} ✓ (Conferido)`
      : `Exibindo ${totalRegistros} registros | Soma calculada (R$ ${formatValor(soma)}) difere do apurado (R$ ${formatValor(apurado)}) (Divergência)`;

    return {
      totalRegistros,
      apurado,
      conferido,
      textoSelo,
      divergencia: !conferido,
      valorCalculado: soma,
    };
  }

  const conferido = totalRegistros === apurado;
  const textoSelo = conferido
    ? `Exibindo ${totalRegistros} registros listados | Total apurado: ${apurado} ✓ (Conferido)`
    : `Exibindo ${totalRegistros} registros listados | Total apurado: ${apurado} (Divergência)`;

  return {
    totalRegistros,
    apurado,
    conferido,
    textoSelo,
    divergencia: !conferido,
    valorCalculado: totalRegistros,
  };
}

/**
 * Filtra registros por termo textual em qualquer campo configurado.
 */
export function filtrarRegistros(
  registros: RegistroRaiox[],
  campos: string[],
  termo: string,
): RegistroRaiox[] {
  const termoNorm = normalizarBuscaRaiox(termo);
  if (!termoNorm) {
    return registros;
  }

  return registros.filter((reg) => {
    return campos.some((campo) => {
      const val = reg[campo];
      if (val === null || val === undefined) return false;
      return normalizarBuscaRaiox(String(val)).includes(termoNorm);
    });
  });
}

/**
 * Ordena registros por campo de forma estável, posicionando nulls por último.
 */
export function ordenarRegistros(
  registros: RegistroRaiox[],
  campo: string,
  direcao: 'asc' | 'desc',
): RegistroRaiox[] {
  const multiplicador = direcao === 'asc' ? 1 : -1;

  return [...registros].sort((a, b) => {
    const valA = a[campo];
    const valB = b[campo];

    if (valA === null || valA === undefined) return 1;
    if (valB === null || valB === undefined) return -1;

    if (typeof valA === 'number' && typeof valB === 'number') {
      return (valA - valB) * multiplicador;
    }

    return String(valA).localeCompare(String(valB), 'pt-BR') * multiplicador;
  });
}

/**
 * Pagina registros conforme limites 25, 50 ou 100 por página.
 */
export function paginarRegistros(
  registros: RegistroRaiox[],
  pagina: number,
  porPagina: 25 | 50 | 100,
): { fatia: RegistroRaiox[]; totalPaginas: number } {
  const totalPaginas = Math.max(1, Math.ceil(registros.length / porPagina));
  if (pagina < 1 || pagina > totalPaginas) {
    return { fatia: [], totalPaginas };
  }

  const inicio = (pagina - 1) * porPagina;
  const fatia = registros.slice(inicio, inicio + porPagina);
  return { fatia, totalPaginas };
}

/**
 * Busca fixture JSON de auditoria sob demanda (lazy fetch).
 */
export async function buscarFixture(
  base: string,
  indicador: string,
  campus: string,
  ano: number,
): Promise<FixtureRaiox> {
  const prefixo = base.endsWith('/') ? base : `${base}/`;
  const url = `${prefixo}auditoria/${indicador}_${campus}_${ano}.json`;

  const resp = await fetch(url);
  if (resp.status === 404) {
    throw new Error(
      `Sem fixture de auditoria publicada para o indicador ${indicador} em ${campus}/${ano}.`,
    );
  }
  if (!resp.ok) {
    throw new Error(`Falha na requisição da fixture de auditoria: status HTTP ${resp.status}.`);
  }

  return (await resp.json()) as FixtureRaiox;
}

export function formatarCabecalhoCampo(campo: string): string {
  const mapa: Record<string, string> = {
    nome: 'Nome',
    matricula: 'Matrícula',
    curso: 'Curso',
    projeto: 'Projeto',
    papel: 'Vínculo / Papel',
    situacao: 'Situação',
    status: 'Status',
    inicio: 'Início',
    fim: 'Fim',
    campus: 'Campus',
    titulo: 'Título',
    ano: 'Ano',
    tipo: 'Tipo',
    codigo: 'Código',
    valor: 'Valor (R$)',
    fonte: 'Fonte de Recursos',
  };
  return mapa[campo] || campo.charAt(0).toUpperCase() + campo.slice(1);
}

function escaparCampoCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return '""';
  const str = String(valor);
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Gera string CSV com BOM UTF-8 (\uFEFF) para visualização compatível no Excel.
 */
export function gerarCsvRaiox(registros: RegistroRaiox[], campos: string[]): string {
  const cabecalhos = campos.map(formatarCabecalhoCampo).join(',');
  const linhas = registros.map((reg) => campos.map((c) => escaparCampoCsv(reg[c])).join(','));
  return '\uFEFF' + [cabecalhos, ...linhas].join('\r\n');
}

export interface RodapeRaiox {
  formulaDeclarada: string;
  formulaSubstituida: string;
  valorPublicado: number | null;
  valorAritmetico: number | null;
  notaGovernanca?: string;
}

/**
 * Constrói os dados do rodapé do Raio-X com fórmula substituída e valor publicado (FR-007).
 */
export function construirRodapeRaiox(
  sigla: string,
  componentes: ComponenteRaiox[],
  valorPublicado?: number | null,
): RodapeRaiox {
  const siglaUpper = sigla.toUpperCase() as SiglaIndicador;
  const meta = INDICADORES_META[siglaUpper];
  const formulaDeclarada = meta?.formula || `${siglaUpper} = (Fórmula não encontrada)`;

  const decomposta = decomporFormula(formulaDeclarada, siglaUpper);
  const mapaApurados: Record<string, number | null> = {};
  for (const comp of componentes) {
    mapaApurados[comp.simbolo] = comp.apurado;
  }

  let formulaSubstituida = formulaDeclarada;
  let valorAritmetico: number | null = null;

  if (decomposta.tipo === 'fracao' && decomposta.fracao) {
    const numSimbolo = decomposta.fracao.numerador;
    const denSimbolo = decomposta.fracao.denominador;
    const mult = decomposta.fracao.multiplicador;

    const numVal = mapaApurados[numSimbolo] ?? null;
    const denVal = mapaApurados[denSimbolo] ?? null;

    const numStr = numVal !== null ? String(numVal) : numSimbolo;
    const denStr = denVal !== null ? String(denVal) : denSimbolo;

    formulaSubstituida = mult ? `(${numStr} / ${denStr}) × ${mult}` : `${numStr} / ${denStr}`;

    if (numVal !== null && denVal !== null && denVal !== 0) {
      const multNum = mult ? parseFloat(mult) : 1;
      valorAritmetico = (numVal / denVal) * multNum;
    }
  } else if (decomposta.tipo === 'soma' && decomposta.termosSoma) {
    const termosSub = decomposta.termosSoma.map((t) => {
      const v = mapaApurados[t];
      return v !== null && v !== undefined ? String(v) : t;
    });
    formulaSubstituida = termosSub.join(' + ');
    const todosNumericos = decomposta.termosSoma.every(
      (t) => mapaApurados[t] !== null && mapaApurados[t] !== undefined,
    );
    if (todosNumericos) {
      valorAritmetico = decomposta.termosSoma.reduce((acc, t) => acc + (mapaApurados[t] || 0), 0);
    }
  } else {
    for (const [simb, ap] of Object.entries(mapaApurados)) {
      if (ap !== null) {
        formulaSubstituida = formulaSubstituida.replace(simb, String(ap));
      }
    }
    const unicoVal = componentes[0]?.apurado;
    if (unicoVal !== undefined) {
      valorAritmetico = unicoVal;
    }
  }

  let notaGovernanca: string | undefined;
  const pub = valorPublicado !== undefined ? valorPublicado : null;

  if (pub !== null && valorAritmetico !== null) {
    const diff = Math.abs(valorAritmetico - pub);
    if (diff > 0.05) {
      notaGovernanca =
        'A apuração oficial do indicador governa a publicação institucional (avaliação aritmética apenas ilustrativa).';
    }
  }

  return {
    formulaDeclarada,
    formulaSubstituida,
    valorPublicado: pub,
    valorAritmetico,
    notaGovernanca,
  };
}
