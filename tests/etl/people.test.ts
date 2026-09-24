import { describe, expect, it } from 'vitest';
import { criarRegistroPessoas, pessoaPorId } from '../../src/etl/people';
import { PESSOAS_FIXTURE } from './fixtures';

describe('criarRegistroPessoas', () => {
  it('mapeia id → classificação e campus', () => {
    const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
    const p1 = pessoaPorId(registro, 1);
    expect(p1).toBeDefined();
    expect(p1!.classification).toBe('researcher');
    expect(p1!.campus?.name).toBe('Serra');
  });

  it('preserva pessoa com campus nulo', () => {
    const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
    expect(pessoaPorId(registro, 4)!.campus).toBeNull();
  });

  it('preserva classificação outside_ifes (exclusão de QSPP em outra camada)', () => {
    const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
    expect(pessoaPorId(registro, 5)!.classification).toBe('outside_ifes');
  });

  it('preserva classificação nula (não verificada)', () => {
    const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
    expect(pessoaPorId(registro, 7)!.classification).toBeNull();
  });

  it('inclui estudantes presentes no arquivo de pesquisadores (registro único de pessoas)', () => {
    const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
    expect(pessoaPorId(registro, 3)!.classification).toBe('student');
  });

  it('retorna undefined para id inexistente', () => {
    const registro = criarRegistroPessoas(PESSOAS_FIXTURE);
    expect(pessoaPorId(registro, 999)).toBeUndefined();
  });
});
