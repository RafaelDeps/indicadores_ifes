import { describe, expect, it } from 'vitest';
import { agregarIniciativas } from '../../src/etl/initiatives';
import { criarRegistroPessoas } from '../../src/etl/people';
import type { ExportCanonicos, Iniciativa, Pessoa } from '../../src/etl/types';

const PESSOAS: Pessoa[] = [
  {
    id: 1,
    name: 'Multi Campus Um',
    classification: 'researcher',
    campus: { id: 2, name: 'Serra' },
    articles: null,
  },
  {
    id: 2,
    name: 'Só Vitoria Dois',
    classification: 'researcher',
    campus: { id: 3, name: 'Vitória' },
    articles: null,
  },
  { id: 3, name: 'Sem Campus Tres', classification: 'researcher', campus: null, articles: null },
];

function iniciativa(
  id: number,
  campus: { name: string } | null,
  equipe: Array<[number, string[]]>,
): Iniciativa {
  return {
    id,
    name: `Projeto ${id}`,
    status: 'Active',
    start_date: '2024-01-01T00:00:00',
    end_date: null,
    initiative_type: { id: 1, name: 'Research Project' },
    campus,
    team: equipe.map(([person_id, roles]) => ({
      person_id,
      person_name: `Pessoa ${person_id}`,
      roles,
      start_date: null,
      end_date: null,
    })),
  };
}

function exportacao(iniciativas: Iniciativa[]): ExportCanonicos {
  return {
    iniciativas,
    pessoas: PESSOAS,
    estudantes: [],
    campi: [],
    artigos: [],
    producoes: [],
    autoresProducao: [],
    tiposProducao: [],
    avisos: [],
  };
}

describe('resolução de campus e agregação todos (FR-005, FR-011, clarificação Q4)', () => {
  const iniciativas = [
    iniciativa(1, null, [[1, ['Coordinator']]]), // P1 → Serra (coordenador)
    iniciativa(2, null, [[2, ['Coordinator']]]), // P2 → Vitória
    iniciativa(3, { id: 3, name: 'Vitória' }, [[1, ['Researcher']]]), // campus declarado Vitória vence (P1 atua em 2 campi)
    iniciativa(4, null, [[3, ['Coordinator']]]), // não resolvível → só todos
    iniciativa(5, { id: 2, name: 'Serra' }, [[3, ['Coordinator']]]), // P3 resolvível por campus declarado
  ];
  const resultado = agregarIniciativas(
    exportacao(iniciativas),
    criarRegistroPessoas(PESSOAS),
    [2024],
  );
  const porAno = (campus: string) => resultado.porCampusAno.get(campus)!.get(2024)!;

  it('pessoa atuando em dois campi conta 1× em cada e exatamente 1× no todos', () => {
    expect(porAno('Serra').staffIds).toEqual(new Set([1, 3]));
    expect(porAno('Vitória').staffIds).toEqual(new Set([1, 2]));
    expect(porAno('todos').staffIds).toEqual(new Set([1, 2, 3]));
    // soma por campus (3 + 2 = 5) superestimaria P1 (2 campi) e P3 (2 projetos); todos deduplica
    expect(porAno('todos').staffIds.size).toBe(3);
    expect(porAno('todos').staffIds.size).not.toBe(
      porAno('Serra').staffIds.size + porAno('Vitória').staffIds.size,
    );
  });

  it('iniciativa não resolvível conta apenas no todos (projetos)', () => {
    expect(porAno('Serra').projetos).toBe(2); // I1 + I5
    expect(porAno('Vitória').projetos).toBe(2); // I2 + I3
    expect(porAno('todos').projetos).toBe(5); // ≠ soma por campus (4): inclui I4
    expect(porAno('todos').projetos).not.toBe(2 + 2);
  });

  it('registra aviso para a iniciativa não resolvível', () => {
    expect(resultado.avisos.some((a) => a.includes('iniciativa 4'))).toBe(true);
  });
});
