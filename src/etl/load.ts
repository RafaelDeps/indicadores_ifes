/**
 * SOURCE: leitura do pacote `exports_canonical.zip` com os conjuntos
 * canônicos obrigatórios (contrato etl-cli.md). Falha rápida com
 * mensagens pt-BR em caso de entrada ausente, corrompida ou incompleta.
 */
import { extrairZip } from '../lib/zip';
import type {
  Artigo,
  AutorProducao,
  Campus,
  ExportCanonicos,
  Iniciativa,
  Pessoa,
  Producao,
  TipoProducao,
} from './types';

const ARQUIVOS_OBRIGATORIOS = [
  'initiatives_canonical.json',
  'researchers_canonical.json',
  'students_canonical.json',
  'campuses_canonical.json',
  'articles_canonical.json',
  'research_productions_canonical.json',
  'production_authors_canonical.json',
  'production_types_canonical.json',
] as const;

function deduplicarPorId<T extends { id: number }>(
  registros: T[],
  nomeArquivo: string,
  avisos: string[],
): T[] {
  const vistos = new Set<number>();
  const unicos: T[] = [];
  for (const registro of registros) {
    if (vistos.has(registro.id)) {
      avisos.push(`AVISO: registro duplicado ignorado em ${nomeArquivo}: id ${registro.id}`);
      continue;
    }
    vistos.add(registro.id);
    unicos.push(registro);
  }
  return unicos;
}

export function carregarExportCanonicos(caminhoZip: string): ExportCanonicos {
  let mapa: Map<string, string>;
  try {
    mapa = extrairZip(caminhoZip);
  } catch (erro) {
    throw new Error(
      `ERRO: falha ao ler o pacote de entrada "${caminhoZip}": ${(erro as Error).message}`,
    );
  }

  const faltantes = ARQUIVOS_OBRIGATORIOS.filter((nome) => !mapa.has(nome));
  if (faltantes.length > 0) {
    throw new Error(
      `ERRO: conjuntos canônicos ausentes no pacote de entrada: ${faltantes.join(', ')}`,
    );
  }

  const avisos: string[] = [];

  const analisar = <T>(nome: string): T[] => {
    try {
      const dados = JSON.parse(mapa.get(nome)!) as T[];
      if (!Array.isArray(dados)) {
        throw new Error('conteúdo não é um array JSON');
      }
      return dados;
    } catch (erro) {
      throw new Error(`ERRO: falha ao analisar ${nome}: ${(erro as Error).message}`);
    }
  };

  return {
    iniciativas: deduplicarPorId(
      analisar<Iniciativa>('initiatives_canonical.json'),
      'initiatives_canonical.json',
      avisos,
    ),
    pessoas: deduplicarPorId(
      analisar<Pessoa>('researchers_canonical.json'),
      'researchers_canonical.json',
      avisos,
    ),
    estudantes: analisar<Pessoa>('students_canonical.json'),
    campi: analisar<Campus>('campuses_canonical.json'),
    artigos: deduplicarPorId(
      analisar<Artigo>('articles_canonical.json'),
      'articles_canonical.json',
      avisos,
    ),
    producoes: deduplicarPorId(
      analisar<Producao>('research_productions_canonical.json'),
      'research_productions_canonical.json',
      avisos,
    ),
    autoresProducao: analisar<AutorProducao>('production_authors_canonical.json'),
    tiposProducao: analisar<TipoProducao>('production_types_canonical.json'),
    avisos,
  };
}
