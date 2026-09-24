import { describe, expect, it } from 'vitest';
import { agregarIniciativas, ativaEmAno, resolverCampus } from '../../src/etl/initiatives';
import { criarRegistroPessoas } from '../../src/etl/people';
import type { ExportCanonicos } from '../../src/etl/types';
import { ANOS_ALVO, INICIATIVAS_FIXTURE, PESSOAS_FIXTURE } from './fixtures';

function exportacaoFixture(): ExportCanonicos {
  return {
    iniciativas: INICIATIVAS_FIXTURE,
    pessoas: PESSOAS_FIXTURE,
    estudantes: [],
    campi: [],
    artigos: [],
    producoes: [],
    autoresProducao: [],
    tiposProducao: [],
    avisos: [],
  };
}

describe('ativaEmAno', () => {
  const porId = new Map(INICIATIVAS_FIXTURE.map((i) => [i.id, i]));

  it('considera ativa quando o intervalo intersecta o ano civil', () => {
    expect(ativaEmAno(porId.get(1)!, 2024)).toBe(true);
    expect(ativaEmAno(porId.get(1)!, 2023)).toBe(true);
    expect(ativaEmAno(porId.get(1)!, 2026)).toBe(false);
  });

  it('fronteira: start_date em 31/12 torna a iniciativa ativa no ano', () => {
    expect(ativaEmAno(porId.get(6)!, 2025)).toBe(true);
  });

  it('fronteira: end_date em 01/01 mantém a iniciativa ativa no ano', () => {
    expect(ativaEmAno(porId.get(7)!, 2024)).toBe(true);
    expect(ativaEmAno(porId.get(7)!, 2022)).toBe(false);
  });

  it('end_date nula = em andamento (ativa para sempre)', () => {
    expect(ativaEmAno(porId.get(2)!, 2026)).toBe(true);
  });

  it('start_date nula = nunca ativa', () => {
    expect(ativaEmAno(porId.get(8)!, 2024)).toBe(false);
  });
});

describe('resolverCampus', () => {
  const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
  const porId = new Map(INICIATIVAS_FIXTURE.map((i) => [i.id, i]));

  it('campus declarado vence', () => {
    expect(resolverCampus(porId.get(1)!, registro)).toBe('Serra');
  });

  it('fallback: campus do coordenador', () => {
    expect(resolverCampus(porId.get(2)!, registro)).toBe('Vitória');
  });

  it('fallback: campus do primeiro membro com campus, na ordem da equipe', () => {
    expect(resolverCampus(porId.get(3)!, registro)).toBe('Serra');
  });

  it('sem resolução → null', () => {
    expect(resolverCampus(porId.get(4)!, registro)).toBeNull();
  });
});

describe('agregarIniciativas', () => {
  it('conta NTPP por campus e no escopo todos (somente Research Project ativos)', () => {
    const resultado = agregarIniciativas(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    const porAno = (campus: string) => resultado.porCampusAno.get(campus)!;

    expect(porAno('Serra').get(2024)!.projetos).toBe(2); // I1 + I3
    expect(porAno('Vitória').get(2024)!.projetos).toBe(2); // I2 + I7
    expect(porAno('Vila Velha')?.get(2024)?.projetos ?? 0).toBe(0); // sem dados (zeros vêm de pillars.agregar)
    expect(porAno('todos').get(2024)!.projetos).toBe(5); // inclui I4 não resolvível
    expect(porAno('todos').get(2024)!.projetos).toBe(2 + 2 + 1);
    expect(porAno('Serra').get(2026)!.projetos).toBe(1); // I9
    expect(porAno('todos').get(2026)!.projetos).toBe(4);
  });

  it('não conta Advisorship (I5) em nenhum ano', () => {
    const resultado = agregarIniciativas(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    const somaSerra2026 = resultado.porCampusAno.get('Serra')!.get(2026)!.projetos;
    expect(somaSerra2026).toBe(1); // apenas I9
  });

  it('QSPP: servidores únicos = roles Coordinator/Researcher com classification researcher; outside_ifes e sem classe excluídos', () => {
    const resultado = agregarIniciativas(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    const porAno = (campus: string) => resultado.porCampusAno.get(campus)!;

    expect(porAno('Serra').get(2024)!.staffIds).toEqual(new Set([1, 4])); // P1 (I1) + P4 (I3 resolvida p/ Serra via membro)
    expect(porAno('Vitória').get(2024)!.staffIds).toEqual(new Set([2])); // P2
    expect(porAno('todos').get(2024)!.staffIds).toEqual(new Set([1, 2, 4])); // P4 só no todos
    expect(porAno('todos').get(2026)!.staffIds).toEqual(new Set([2, 4])); // P7 sem classe excluído
    expect(porAno('Serra').get(2026)!.staffIds).toEqual(new Set()); // P7 não conta
  });

  it('NEP: estudantes únicos por role Student', () => {
    const resultado = agregarIniciativas(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    const porAno = (campus: string) => resultado.porCampusAno.get(campus)!;

    expect(porAno('Serra').get(2024)!.studentIds).toEqual(new Set([3]));
    expect(porAno('Vitória').get(2024)!.studentIds).toEqual(new Set([6]));
    expect(porAno('todos').get(2024)!.studentIds).toEqual(new Set([3, 6]));
    expect(porAno('todos').get(2026)!.studentIds).toEqual(new Set([6]));
  });

  it('registra avisos: start_date nula e campus não resolvível', () => {
    const resultado = agregarIniciativas(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    expect(resultado.avisos.some((a) => a.includes('iniciativa 8'))).toBe(true);
    expect(resultado.avisos.some((a) => a.includes('iniciativa 4'))).toBe(true);
  });
});
