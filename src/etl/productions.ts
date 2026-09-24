/**
 * Transform — produções e artigos: NPB/NPT por ano de publicação
 * (`year = Y`, clarificação Q3), NPT com todos os 6 tipos (Q2), PC de
 * `softwares_sem_patente` (Q1) e atribuição de campus registro → autores
 * (Q4, research.md D7).
 */
import type { RegistroPessoas } from './people';
import type { ExportCanonicos } from './types';

export interface ContagensProducaoAno {
  npb: number;
  npt: number;
  pc: number;
}

export interface ResultadoProducoes {
  porCampusAno: Map<string, Map<number, ContagensProducaoAno>>;
  avisos: string[];
}

const NOME_TIPO_PC = 'softwares_sem_patente';
const ANO_MINIMO_VALIDO = 1900;

function contagensVazias(): ContagensProducaoAno {
  return { npb: 0, npt: 0, pc: 0 };
}

function anoValido(ano: number | null): boolean {
  return ano !== null && Number.isInteger(ano) && ano >= ANO_MINIMO_VALIDO;
}

export function agregarProducoes(
  exportacao: ExportCanonicos,
  registro: RegistroPessoas,
  _anos: number[],
): ResultadoProducoes {
  const porCampusAno = new Map<string, Map<number, ContagensProducaoAno>>();
  const avisos: string[] = [];

  const obter = (escopo: string, ano: number): ContagensProducaoAno => {
    let porAno = porCampusAno.get(escopo);
    if (!porAno) {
      porAno = new Map();
      porCampusAno.set(escopo, porAno);
    }
    let contagens = porAno.get(ano);
    if (!contagens) {
      contagens = contagensVazias();
      porAno.set(ano, contagens);
    }
    return contagens;
  };

  // mapa de autores de produção, ordenado por id de pesquisador (determinismo)
  const autoresPorProducao = new Map<number, number[]>();
  for (const autor of [...exportacao.autoresProducao].sort(
    (a, b) => a.researcher_id - b.researcher_id,
  )) {
    const autores = autoresPorProducao.get(autor.production_id) ?? [];
    if (!autores.includes(autor.researcher_id)) autores.push(autor.researcher_id);
    autoresPorProducao.set(autor.production_id, autores);
  }

  // autores de artigos via arrays embutidos no registro de pessoas
  const autoresPorArtigo = new Map<number, number[]>();
  for (const pessoa of [...exportacao.pessoas].sort((a, b) => a.id - b.id)) {
    for (const artigo of pessoa.articles ?? []) {
      const autores = autoresPorArtigo.get(artigo.id) ?? [];
      if (!autores.includes(pessoa.id)) autores.push(pessoa.id);
      autoresPorArtigo.set(artigo.id, autores);
    }
  }

  const nomesTipo = new Map(exportacao.tiposProducao.map((t) => [t.id, t.name]));

  function campiDoRegistro(
    campusProprio: { name: string } | null,
    autores: number[] | undefined,
    rotulo: string,
  ): string[] {
    if (campusProprio) return [campusProprio.name];
    const campi: string[] = [];
    for (const autorId of autores ?? []) {
      const campus = registro.get(autorId)?.campus;
      if (campus && !campi.includes(campus.name)) campi.push(campus.name);
    }
    if (campi.length === 0) {
      avisos.push(
        `AVISO: ${rotulo} sem campus e sem autor vinculável — contabilizado apenas no escopo "todos"`,
      );
    }
    return campi;
  }

  function registrar(campi: string[], ano: number, campo: 'npb' | 'npt' | 'pc'): void {
    for (const escopo of campi.length === 0 ? ['todos'] : [...campi, 'todos']) {
      obter(escopo, ano)[campo] += 1;
    }
  }

  for (const artigo of exportacao.artigos) {
    if (!anoValido(artigo.year)) {
      avisos.push(
        `AVISO: artigo ${artigo.id} com ano inválido (${artigo.year}) — excluído das contagens`,
      );
      continue;
    }
    registrar(
      campiDoRegistro(artigo.campus, autoresPorArtigo.get(artigo.id), `artigo ${artigo.id}`),
      artigo.year!,
      'npb',
    );
  }

  for (const producao of exportacao.producoes) {
    if (!anoValido(producao.year)) {
      avisos.push(
        `AVISO: produção ${producao.id} com ano inválido (${producao.year}) — excluída das contagens`,
      );
      continue;
    }
    const nomeTipo = nomesTipo.get(producao.production_type_id ?? -1) ?? '';
    const campi = campiDoRegistro(
      producao.campus,
      autoresPorProducao.get(producao.id),
      `produção ${producao.id}`,
    );
    registrar(campi, producao.year!, 'npt');
    if (nomeTipo === NOME_TIPO_PC) {
      registrar(campi, producao.year!, 'pc');
    }
  }

  return { porCampusAno, avisos };
}
