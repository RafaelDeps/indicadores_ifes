import { describe, expect, it } from 'vitest';
import {
  anoPadrao,
  anoSolicitado,
  campusPadrao,
  campusSolicitado,
  construirQueryString,
  resolverContextoFiltro,
} from '../src/lib/ano';
import type { Indicador } from '../src/data/indicadores';

function criarIndicador(sobrescrever: Partial<Indicador> = {}): Indicador {
  return {
    sigla: 'NTPP',
    slug: 'ntpp',
    nome: 'Indicador de teste',
    oQueMede: 'Mede algo.',
    formula: 'X',
    variaveis: [],
    polaridade: 'maior-e-melhor',
    dataAtualizacao: null,
    valores: [
      { ano: 2024, valor: 514 },
      { ano: 2025, valor: 644 },
      { ano: 2026, valor: 534 },
    ],
    componentes: [],
    ...sobrescrever,
  };
}

describe('anoPadrao (último ano fechado)', () => {
  it('exclui o ano em andamento (2026) quando há anos fechados', () => {
    expect(anoPadrao(criarIndicador())).toBe(2025);
  });

  it('recai no ano em andamento quando é o único com valores', () => {
    const indicador = criarIndicador({ valores: [{ ano: 2026, valor: 10 }] });
    expect(anoPadrao(indicador)).toBe(2026);
  });

  it('retorna null para indicador sem valores (PIES/PICOT)', () => {
    expect(anoPadrao(criarIndicador({ valores: [] }))).toBeNull();
  });
});

describe('anoSolicitado (consulta ?ano=)', () => {
  it('usa o ano padrão quando não há ?ano=', () => {
    expect(anoSolicitado(null, criarIndicador())).toBe(2025);
    expect(anoSolicitado('', criarIndicador())).toBe(2025);
  });

  it('aceita anos bem-formados, mesmo sem dados no indicador', () => {
    expect(anoSolicitado('2024', criarIndicador())).toBe(2024);
    expect(anoSolicitado('2019', criarIndicador())).toBe(2019);
    expect(anoSolicitado('2026', criarIndicador())).toBe(2026);
    expect(anoSolicitado('2000', criarIndicador())).toBe(2000);
  });

  it('recai no padrão para valores inválidos ou fora da janela', () => {
    expect(anoSolicitado('abc', criarIndicador())).toBe(2025);
    expect(anoSolicitado('1999', criarIndicador())).toBe(2025);
    expect(anoSolicitado('2101', criarIndicador())).toBe(2025);
    expect(anoSolicitado('20.25', criarIndicador())).toBe(2025);
  });

  it('indicador sem valores: ?ano= bem-formado é mantido para exibir indisponibilidade', () => {
    const pies = criarIndicador({ sigla: 'PIES', slug: 'pies', valores: [] });
    expect(anoSolicitado('2024', pies)).toBe(2024);
    expect(anoSolicitado(null, pies)).toBeNull();
  });
});

describe('campusPadrao e campusSolicitado (consulta ?campus=)', () => {
  const campiValidos = ['todos', 'serra', 'vitoria'];

  it('campusPadrao retorna "todos" se disponível ou o primeiro campus', () => {
    expect(campusPadrao(campiValidos)).toBe('todos');
    expect(campusPadrao(['serra', 'vitoria'])).toBe('serra');
  });

  it('campusSolicitado retorna o campus solicitado caso válido', () => {
    expect(campusSolicitado('serra', campiValidos)).toBe('serra');
    expect(campusSolicitado('todos', campiValidos)).toBe('todos');
  });

  it('campusSolicitado degrada graciosamente para o padrão se ausente ou inválido', () => {
    expect(campusSolicitado(null, campiValidos)).toBe('todos');
    expect(campusSolicitado('', campiValidos)).toBe('todos');
    expect(campusSolicitado('invalido-123', campiValidos)).toBe('todos');
  });
});

describe('construirQueryString', () => {
  it('gera query string com campus e ano', () => {
    expect(construirQueryString('serra', 2026)).toBe('?campus=serra&ano=2026');
  });

  it('gera query string apenas com campus', () => {
    expect(construirQueryString('serra')).toBe('?campus=serra');
  });

  it('retorna string vazia quando nenhum parâmetro é fornecido', () => {
    expect(construirQueryString()).toBe('');
  });
});

describe('resolverContextoFiltro', () => {
  const campiValidos = [
    { slug: 'todos', nome: '(Todos)' },
    { slug: 'serra', nome: 'Serra' },
    { slug: 'vitoria', nome: 'Vitória' },
  ];
  const anosValidos = [2026, 2025, 2024];

  it('retorna os padrões (todos e ano mais recente) quando os parâmetros são nulos ou vazios', () => {
    expect(resolverContextoFiltro(null, null, campiValidos, anosValidos)).toEqual({
      campus: 'todos',
      ano: 2026,
    });
    expect(resolverContextoFiltro('', '', campiValidos, anosValidos)).toEqual({
      campus: 'todos',
      ano: 2026,
    });
  });

  it('retorna os valores requisitados quando válidos', () => {
    expect(resolverContextoFiltro('serra', '2025', campiValidos, anosValidos)).toEqual({
      campus: 'serra',
      ano: 2025,
    });
    expect(resolverContextoFiltro('vitoria', '2024', campiValidos, anosValidos)).toEqual({
      campus: 'vitoria',
      ano: 2024,
    });
  });

  it('degrada graciosamente para os padrões quando os parâmetros são desconhecidos ou inválidos', () => {
    expect(resolverContextoFiltro('desconhecido', '9999', campiValidos, anosValidos)).toEqual({
      campus: 'todos',
      ano: 2026,
    });
    expect(resolverContextoFiltro('serra', 'invalido', campiValidos, anosValidos)).toEqual({
      campus: 'serra',
      ano: 2026,
    });
  });
});
