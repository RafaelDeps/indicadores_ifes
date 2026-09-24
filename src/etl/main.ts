/**
 * Entrypoint do ETL (`npm run etl`): orquestra Source → Transform → Sync
 * e grava `indicadores.zip` na raiz informada (contracts/etl-cli.md).
 */
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarExportCanonicos } from './load';
import { criarRegistroPessoas } from './people';
import { agregarIniciativas } from './initiatives';
import { agregarProducoes } from './productions';
import { agregar, montarArquivosPilar } from './pillars';
import { validarArquivosPilar } from './validate';
import { gravarZipAtomico } from './zipwriter';

export const ANOS_ALVO_PADRAO = [2024, 2025, 2026];

export interface Logger {
  log: (mensagem: string) => void;
  warn: (mensagem: string) => void;
  error: (mensagem: string) => void;
}

export interface OpcoesEtl {
  dirBase?: string;
  entrada?: string;
  saida?: string;
  anos?: number[];
  logger?: Logger;
}

export interface ResultadoEtl {
  codigoSaida: number;
  resumo: string | null;
  avisos: string[];
  erros: string[];
}

export function executarEtl(opcoes: OpcoesEtl = {}): ResultadoEtl {
  const logger = opcoes.logger ?? console;
  const dirBase = opcoes.dirBase ?? process.cwd();
  const entrada = opcoes.entrada ?? 'exports_canonical.zip';
  const saida = opcoes.saida ?? 'indicadores.zip';
  const anos = opcoes.anos ?? ANOS_ALVO_PADRAO;
  const avisos: string[] = [];
  const erros: string[] = [];

  try {
    const exportacao = carregarExportCanonicos(path.join(dirBase, entrada));
    avisos.push(...exportacao.avisos);

    const registro = criarRegistroPessoas(exportacao.pessoas);
    const iniciativas = agregarIniciativas(exportacao, registro, anos);
    const producoes = agregarProducoes(exportacao, registro, anos);
    avisos.push(...iniciativas.avisos, ...producoes.avisos);

    const agregados = agregar(iniciativas, producoes, anos);
    const arquivos = montarArquivosPilar(agregados, exportacao.campi, anos);

    validarArquivosPilar(arquivos);

    gravarZipAtomico(path.join(dirBase, saida), arquivos);

    const resumo = `ETL concluído: ${arquivos.length} arquivos gerados (${exportacao.campi.length} campi + todos), anos ${anos[0]}–${anos[anos.length - 1]}.`;
    logger.log(resumo);
    for (const aviso of avisos) logger.warn(aviso);
    return { codigoSaida: 0, resumo, avisos, erros };
  } catch (erro) {
    const mensagem = (erro as Error).message;
    erros.push(mensagem);
    logger.error(mensagem);
    return { codigoSaida: 1, resumo: null, avisos, erros };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(executarEtl().codigoSaida);
}
