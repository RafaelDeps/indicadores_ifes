/**
 * Dados canônicos sintéticos compartilhados pelos testes do ETL.
 * Nomes de pessoas são fictícios (dados de teste, não dados reais).
 */

export interface PessoaFixture {
  id: number;
  name: string;
  classification: string | null;
  campus: { id: number; name: string } | null;
  articles: Array<{ id: number; year: number }>;
  [chave: string]: unknown;
}

export interface IniciativaFixture {
  id: number;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  initiative_type: { id: number; name: string };
  campus: { id: number; name: string } | null;
  team: Array<{
    person_id: number;
    person_name: string;
    roles: string[];
    start_date: string | null;
    end_date: string | null;
  }>;
  [chave: string]: unknown;
}

export interface ArtigoFixture {
  id: number;
  title: string;
  year: number;
  type: string;
  campus: { id: number; name: string } | null;
  [chave: string]: unknown;
}

export interface ProducaoFixture {
  id: number;
  title: string;
  year: number;
  production_type_id: number;
  campus: { id: number; name: string } | null;
  [chave: string]: unknown;
}

export const PESSOAS_FIXTURE: PessoaFixture[] = [
  {
    id: 1,
    name: 'Coord Um',
    classification: 'researcher',
    campus: { id: 2, name: 'Serra' },
    articles: [],
  },
  {
    id: 2,
    name: 'Coord Dois',
    classification: 'researcher',
    campus: { id: 3, name: 'Vitória' },
    articles: [{ id: 2, year: 2025 }],
  },
  {
    id: 3,
    name: 'Estudante Tres',
    classification: 'student',
    campus: { id: 2, name: 'Serra' },
    articles: [],
  },
  { id: 4, name: 'Sem Campus Quatro', classification: 'researcher', campus: null, articles: [] },
  {
    id: 5,
    name: 'Externo Cinco',
    classification: 'outside_ifes',
    campus: { id: 2, name: 'Serra' },
    articles: [],
  },
  { id: 6, name: 'Estudante Seis', classification: 'student', campus: null, articles: [] },
  {
    id: 7,
    name: 'Sem Classe Sete',
    classification: null,
    campus: { id: 2, name: 'Serra' },
    articles: [],
  },
];

export const ESTUDANTES_FIXTURE = [PESSOAS_FIXTURE[2], PESSOAS_FIXTURE[5]];

export const CAMPI_FIXTURE = [
  { id: 1, name: 'Vila Velha', campus: { id: 1, name: 'Vila Velha' } },
  { id: 2, name: 'Serra', campus: { id: 2, name: 'Serra' } },
  { id: 3, name: 'Vitória', campus: { id: 3, name: 'Vitória' } },
];

function membro(personId: number, roles: string[]) {
  return {
    person_id: personId,
    person_name: PESSOAS_FIXTURE.find((p) => p.id === personId)!.name,
    roles,
    start_date: null,
    end_date: null,
  };
}

export const INICIATIVAS_FIXTURE: IniciativaFixture[] = [
  {
    id: 1,
    name: 'Projeto Serra declarado',
    status: 'Active',
    start_date: '2023-01-01T00:00:00',
    end_date: '2025-06-30T00:00:00',
    initiative_type: { id: 1, name: 'Research Project' },
    campus: { id: 2, name: 'Serra' },
    team: [membro(1, ['Coordinator', 'Researcher']), membro(3, ['Student'])],
  },
  {
    id: 2,
    name: 'Projeto coordenador Vitoria',
    status: 'In Progress',
    start_date: '2024-01-01T00:00:00',
    end_date: null,
    initiative_type: { id: 1, name: 'Research Project' },
    campus: null,
    team: [membro(2, ['Coordinator', 'Researcher']), membro(6, ['Student'])],
  },
  {
    id: 3,
    name: 'Projeto membro Serra',
    status: 'Concluded',
    start_date: '2024-06-01T00:00:00',
    end_date: '2024-12-31T00:00:00',
    initiative_type: { id: 1, name: 'Research Project' },
    campus: null,
    team: [membro(4, ['Coordinator']), membro(1, ['Researcher'])],
  },
  {
    id: 4,
    name: 'Projeto nao resolvivel',
    status: 'Active',
    start_date: '2024-01-01T00:00:00',
    end_date: null,
    initiative_type: { id: 1, name: 'Research Project' },
    campus: null,
    team: [membro(4, ['Coordinator'])],
  },
  {
    id: 5,
    name: 'Advisorship fora do escopo',
    status: 'Active',
    start_date: '2024-01-01T00:00:00',
    end_date: null,
    initiative_type: { id: 2, name: 'Advisorship' },
    campus: { id: 2, name: 'Serra' },
    team: [membro(1, ['Coordinator'])],
  },
  {
    id: 6,
    name: 'Projeto fronteira inicio',
    status: 'Active',
    start_date: '2025-12-31T00:00:00',
    end_date: null,
    initiative_type: { id: 1, name: 'Research Project' },
    campus: null,
    team: [membro(2, ['Coordinator', 'Researcher'])],
  },
  {
    id: 7,
    name: 'Projeto fronteira fim',
    status: 'Concluded',
    start_date: '2023-01-01T00:00:00',
    end_date: '2024-01-01T00:00:00',
    initiative_type: { id: 1, name: 'Research Project' },
    campus: null,
    team: [membro(2, ['Coordinator', 'Researcher'])],
  },
  {
    id: 8,
    name: 'Projeto sem inicio',
    status: 'Active',
    start_date: null,
    end_date: null,
    initiative_type: { id: 1, name: 'Research Project' },
    campus: { id: 2, name: 'Serra' },
    team: [membro(1, ['Coordinator'])],
  },
  {
    id: 9,
    name: 'Projeto coordenador sem classe',
    status: 'Active',
    start_date: '2026-01-01T00:00:00',
    end_date: null,
    initiative_type: { id: 1, name: 'Research Project' },
    campus: null,
    team: [membro(7, ['Coordinator', 'Researcher'])],
  },
];

export const ARTIGOS_FIXTURE: ArtigoFixture[] = [
  { id: 1, title: 'Artigo Serra', year: 2024, type: 'Journal', campus: { id: 2, name: 'Serra' } },
  { id: 2, title: 'Artigo via autor Vitoria', year: 2025, type: 'Journal', campus: null },
  { id: 3, title: 'Artigo sem atribuicao', year: 2024, type: 'Journal', campus: null },
  {
    id: 4,
    title: 'Artigo ano invalido',
    year: 0,
    type: 'Journal',
    campus: { id: 2, name: 'Serra' },
  },
  {
    id: 5,
    title: 'Artigo Vila Velha',
    year: 2026,
    type: 'Journal',
    campus: { id: 1, name: 'Vila Velha' },
  },
];

export const TIPOS_PRODUCAO_FIXTURE = [
  { id: 1, name: 'trabalhos_tecnicos', campus: null },
  { id: 2, name: 'outras_producoes_tecnicas', campus: null },
  { id: 3, name: 'softwares_sem_patente', campus: null },
  { id: 4, name: 'entrevistas', campus: null },
  { id: 5, name: 'produtos_tecnologicos', campus: null },
  { id: 6, name: 'processos_tecnicas', campus: null },
];

export const PRODUCOES_FIXTURE: ProducaoFixture[] = [
  { id: 1, title: 'Producao Serra', year: 2024, production_type_id: 1, campus: null },
  { id: 2, title: 'Software Vitoria', year: 2024, production_type_id: 3, campus: null },
  { id: 3, title: 'Entrevista Serra', year: 2025, production_type_id: 4, campus: null },
  { id: 4, title: 'Producao ano invalido', year: 0, production_type_id: 1, campus: null },
  { id: 5, title: 'Produto via externo', year: 2026, production_type_id: 5, campus: null },
];

export const AUTORES_PRODUCAO_FIXTURE = [
  { production_id: 1, researcher_id: 1 },
  { production_id: 2, researcher_id: 2 },
  { production_id: 3, researcher_id: 1 },
  { production_id: 5, researcher_id: 5 },
];

export function pacoteCanonicosFixture(
  sobrescritas?: Record<string, unknown>,
): Record<string, unknown> {
  return {
    'initiatives_canonical.json': INICIATIVAS_FIXTURE,
    'researchers_canonical.json': PESSOAS_FIXTURE,
    'students_canonical.json': ESTUDANTES_FIXTURE,
    'campuses_canonical.json': CAMPI_FIXTURE,
    'articles_canonical.json': ARTIGOS_FIXTURE,
    'research_productions_canonical.json': PRODUCOES_FIXTURE,
    'production_authors_canonical.json': AUTORES_PRODUCAO_FIXTURE,
    'production_types_canonical.json': TIPOS_PRODUCAO_FIXTURE,
    ...sobrescritas,
  };
}

export const ANOS_ALVO = [2024, 2025, 2026];
export const SLUGS_ESPERADOS = ['serra', 'vitoria', 'vilavelha', 'todos'];
