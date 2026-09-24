/**
 * Sync — validação de cada arquivo gerado contra o contrato de ingestão da
 * feature 004 (nomenclatura, cabeçalho, indicadores por pilar e regras
 * semânticas null/0). Falha com erro nomeando arquivo + campo + regra (FR-012).
 */
import type { RegistroPilarJson } from './types';

const PADRAO_NOME = /^pilar([123])_([a-z0-9]+)_(\d{4})\.json$/;

const NOMES_PILARES: Record<number, string> = {
  1: 'Engajamento Academico e Inclusao',
  2: 'Fomento e Conexao com o Ecossistema',
  3: 'Produtividade e Propriedade Intelectual',
};

const SIGLAS_POR_PILAR: Record<number, string[]> = {
  1: ['NTPP', 'QSPP', 'PIES', 'PICOT'],
  2: ['PINV', 'PIPDI'],
  3: ['PIPRO', 'PIPROT', 'PIPROTR'],
};

// Campos sabidamente não calculáveis: devem ser estritamente null
const CAMPOS_QUE_DEVEM_SER_NULOS = new Set([
  'NTE_total_estudantes_matriculados',
  'percentual_calculado_PIES',
  'NTECPP_cotistas_em_pesquisa',
  'percentual_calculado_PICOT',
  'TAFPPI_valor_total_aporte_pesquisa',
  'OCC_valor_orcamento_total_capital_custeio',
  'percentual_calculado_PINV',
  'NAPPCT_acordos_parceria_firmados',
  'total_acumulado_PIPDI',
  'total_transferidos_PIPROTR',
]);

function valorValido(valor: unknown): boolean {
  if (valor === null) return true;
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0;
}

interface IndicadorBruto {
  descricao?: unknown;
  valores_totais_por_tipo?: Record<string, unknown>;
  [campo: string]: unknown;
}

interface ArquivoBruto {
  campus?: unknown;
  ano_referencia?: unknown;
  pilar?: unknown;
  indicadores?: Record<string, IndicadorBruto>;
}

export function validarArquivosPilar(arquivos: RegistroPilarJson[]): void {
  const violacoes: string[] = [];

  for (const arquivo of arquivos) {
    const { nome, conteudo } = arquivo;

    const match = nome.match(PADRAO_NOME);
    if (!match) {
      violacoes.push(`${nome}: violação de nomenclatura — esperado pilar{N}_{campus}_{year}.json`);
      continue;
    }
    const numeroPilar = parseInt(match[1], 10);
    const ano = parseInt(match[3], 10);

    let dados: ArquivoBruto;
    try {
      dados = JSON.parse(conteudo) as ArquivoBruto;
    } catch (erro) {
      violacoes.push(`${nome}: violação de conteúdo — JSON inválido (${(erro as Error).message})`);
      continue;
    }

    for (const campo of ['campus', 'ano_referencia', 'pilar', 'indicadores']) {
      if (dados[campo] === undefined) {
        violacoes.push(`${nome}: violação de cabeçalho — campo ausente "${campo}"`);
      }
    }
    if (violacoes.some((v) => v.startsWith(`${nome}: violação de cabeçalho`))) continue;

    if (dados.ano_referencia !== ano) {
      violacoes.push(
        `${nome}: violação de cabeçalho — ano_referencia (${dados.ano_referencia}) difere do nome do arquivo (${ano})`,
      );
    }
    if (dados.pilar !== NOMES_PILARES[numeroPilar]) {
      violacoes.push(
        `${nome}: violação de cabeçalho — pilar "${dados.pilar}" difere do esperado "${NOMES_PILARES[numeroPilar]}"`,
      );
    }

    const siglas = SIGLAS_POR_PILAR[numeroPilar];
    for (const sigla of siglas) {
      const indicador = dados.indicadores?.[sigla];
      if (!indicador || typeof indicador.descricao !== 'string') {
        violacoes.push(
          `${nome}: violação de indicadores — sigla "${sigla}" ausente ou sem descrição`,
        );
        continue;
      }
      for (const [campo, valor] of Object.entries(indicador)) {
        if (campo === 'descricao') continue;
        if (campo === 'valores_totais_por_tipo') {
          for (const [sub, subValor] of Object.entries(valor as Record<string, unknown>)) {
            if (!valorValido(subValor)) {
              violacoes.push(
                `${nome}: violação semântica — ${sigla}.valores_totais_por_tipo.${sub} deve ser inteiro não negativo ou null, recebido ${String(subValor)}`,
              );
            }
          }
          continue;
        }
        if (CAMPOS_QUE_DEVEM_SER_NULOS.has(campo) && valor !== null) {
          violacoes.push(
            `${nome}: violação semântica — ${sigla}.${campo} não calculável deve ser estritamente null, recebido ${String(valor)}`,
          );
          continue;
        }
        if (!CAMPOS_QUE_DEVEM_SER_NULOS.has(campo) && !valorValido(valor)) {
          violacoes.push(
            `${nome}: violação semântica — ${sigla}.${campo} deve ser inteiro não negativo ou null, recebido ${String(valor)}`,
          );
        }
      }
    }

    const siglasPresentes = Object.keys(dados.indicadores ?? {});
    for (const sigla of siglasPresentes) {
      if (!siglas.includes(sigla)) {
        violacoes.push(
          `${nome}: violação de indicadores — sigla "${sigla}" não pertence ao pilar ${numeroPilar}`,
        );
      }
    }
  }

  if (violacoes.length > 0) {
    throw new Error(
      `ERRO: validação contratual falhou (${violacoes.length} violação(ões)):\n${violacoes.join('\n')}`,
    );
  }
}
