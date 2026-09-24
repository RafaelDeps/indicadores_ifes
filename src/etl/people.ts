/**
 * Registro único de pessoas: `researchers_canonical.json` contém todas as
 * classes (researcher, student, outside_ifes) e é a autoridade de
 * identidade/classificação (research.md D4).
 */
import type { Pessoa, RefCampus } from './types';

export interface PessoaResolvida {
  id: number;
  classification: string | null;
  campus: RefCampus | null;
}

export type RegistroPessoas = Map<number, PessoaResolvida>;

export function criarRegistroPessoas(pessoas: Pessoa[]): RegistroPessoas {
  const registro: RegistroPessoas = new Map();
  for (const pessoa of pessoas) {
    registro.set(pessoa.id, {
      id: pessoa.id,
      classification: pessoa.classification ?? null,
      campus: pessoa.campus ?? null,
    });
  }
  return registro;
}

export function pessoaPorId(registro: RegistroPessoas, id: number): PessoaResolvida | undefined {
  return registro.get(id);
}
