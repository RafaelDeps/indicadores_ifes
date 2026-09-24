import { describe, expect, it } from 'vitest';
import { agregarProducoes } from '../../src/etl/productions';
import { criarRegistroPessoas } from '../../src/etl/people';
import type { ExportCanonicos } from '../../src/etl/types';
import {
  ANOS_ALVO,
  ARTIGOS_FIXTURE,
  AUTORES_PRODUCAO_FIXTURE,
  PESSOAS_FIXTURE,
  PRODUCOES_FIXTURE,
  TIPOS_PRODUCAO_FIXTURE,
} from './fixtures';

function exportacaoFixture(): ExportCanonicos {
  return {
    iniciativas: [],
    pessoas: PESSOAS_FIXTURE,
    estudantes: [],
    campi: [],
    artigos: ARTIGOS_FIXTURE,
    producoes: PRODUCOES_FIXTURE,
    autoresProducao: AUTORES_PRODUCAO_FIXTURE,
    tiposProducao: TIPOS_PRODUCAO_FIXTURE,
    avisos: [],
  };
}

describe('agregarProducoes', () => {
  it('NPB: artigos por ano com campus do registro, fallback pelo autor', () => {
    const resultado = agregarProducoes(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    const porAno = (campus: string) => resultado.porCampusAno.get(campus)!;

    expect(porAno('Serra').get(2024)!.npb).toBe(1); // A1 (campus próprio)
    expect(porAno('Vitória').get(2025)!.npb).toBe(1); // A2 (fallback autor P2)
    expect(porAno('Vila Velha').get(2026)!.npb).toBe(1); // A5
    expect(porAno('todos').get(2024)!.npb).toBe(2); // A1 + A3 (sem atribuição → só todos)
  });

  it('NPT: todos os 6 tipos contam; atribuição via autores de produção', () => {
    const resultado = agregarProducoes(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    const porAno = (campus: string) => resultado.porCampusAno.get(campus)!;

    expect(porAno('Serra').get(2024)!.npt).toBe(1); // PR1 (tipo 1)
    expect(porAno('Vitória').get(2024)!.npt).toBe(1); // PR2 (tipo 3)
    expect(porAno('Serra').get(2025)!.npt).toBe(1); // PR3 (tipo 4)
    expect(porAno('todos').get(2024)!.npt).toBe(2);
    expect(porAno('todos').get(2026)!.npt).toBe(1); // PR5 via autor externo
  });

  it('PC: apenas softwares_sem_patente', () => {
    const resultado = agregarProducoes(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    const porAno = (campus: string) => resultado.porCampusAno.get(campus)!;

    expect(porAno('Vitória').get(2024)!.pc).toBe(1);
    expect(porAno('todos').get(2024)!.pc).toBe(1);
    expect(porAno('Serra').get(2024)!.pc).toBe(0);
    expect(porAno('todos').get(2025)!.pc).toBe(0);
  });

  it('anos inválidos (0/null) são excluídos com aviso', () => {
    const resultado = agregarProducoes(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    expect(resultado.avisos.some((a) => a.includes('artigo 4'))).toBe(true);
    expect(resultado.avisos.some((a) => a.includes('produção 4'))).toBe(true);
    expect(resultado.porCampusAno.get('todos')!.get(2024)!.npb).toBe(2); // A4 fora
    expect(resultado.porCampusAno.get('todos')!.get(2024)!.npt).toBe(2); // PR4 fora
  });

  it('artigo sem campus e sem autor conta apenas no todos com aviso', () => {
    const resultado = agregarProducoes(
      exportacaoFixture(),
      criarRegistroPessoas(PESSOAS_FIXTURE),
      ANOS_ALVO,
    );
    expect(resultado.avisos.some((a) => a.includes('artigo 3'))).toBe(true);
    expect(resultado.porCampusAno.get('Serra')!.get(2024)!.npb).toBe(1);
    expect(resultado.porCampusAno.get('todos')!.get(2024)!.npb).toBe(2);
  });
});
