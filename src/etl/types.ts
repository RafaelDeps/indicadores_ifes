/** Tipos canônicos de entrada e de saída do ETL. */

export interface RefCampus {
  id: number;
  name: string;
}

export interface MembroEquipe {
  person_id: number;
  person_name: string;
  roles: string[];
  start_date: string | null;
  end_date: string | null;
}

export interface Iniciativa {
  id: number;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  initiative_type: { id: number; name: string } | null;
  campus: RefCampus | null;
  team: MembroEquipe[] | null;
}

export interface Pessoa {
  id: number;
  name: string;
  classification: string | null;
  campus: RefCampus | null;
  articles: Array<{ id: number; year: number }> | null;
}

export interface Campus {
  id: number;
  name: string;
}

export interface Artigo {
  id: number;
  title: string;
  year: number | null;
  type: string | null;
  campus: RefCampus | null;
}

export interface Producao {
  id: number;
  title: string;
  year: number | null;
  production_type_id: number | null;
  campus: RefCampus | null;
}

export interface AutorProducao {
  production_id: number;
  researcher_id: number;
}

export interface TipoProducao {
  id: number;
  name: string;
}

export interface ExportCanonicos {
  iniciativas: Iniciativa[];
  pessoas: Pessoa[];
  estudantes: Pessoa[];
  campi: Campus[];
  artigos: Artigo[];
  producoes: Producao[];
  autoresProducao: AutorProducao[];
  tiposProducao: TipoProducao[];
  avisos: string[];
}

export interface RegistroPilarJson {
  nome: string;
  conteudo: string;
}

export type ValorMetrica = number | null;
