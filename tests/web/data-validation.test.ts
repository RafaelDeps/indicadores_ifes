import { describe, expect, it } from 'vitest';
import {
  validarIndicador,
  validarColecao,
  SIGLAS_VALIDAS,
  PILARES,
  INDICADORES_META,
} from '../../src/data/indicadores';
import type { Indicador } from '../../src/data/indicadores';

const SIGLAS_TODOS_PILARES = [
  'NTPP',
  'QSPP',
  'PIES',
  'PICOT',
  'PINV',
  'PIPDI',
  'PIPRO',
  'PIPROT',
  'PIPROTR',
];

const indicadorValido: Indicador = {
  sigla: 'NTPP',
  slug: 'ntpp',
  nome: 'Indicador de teste',
  oQueMede: 'Mede algo.',
  formula: 'X / Y * 100',
  variaveis: [{ sigla: 'X', descricao: 'Variável X' }],
  polaridade: 'maior-e-melhor',
  fonteDados: 'Relatório oficial',
  dataAtualizacao: '2026-09-21',
  valores: [{ ano: 2023, valor: 10 }],
  componentes: [],
};

describe('validarColecao', () => {
  it('valida com sucesso uma coleção de indicadores sem conflitos', () => {
    expect(() => validarColecao([indicadorValido])).not.toThrow();
  });

  it('rejeita coleção com slug duplicado', () => {
    expect(() => validarColecao([indicadorValido, { ...indicadorValido }])).toThrow(
      'Slug duplicado: ntpp',
    );
  });
});

describe('estrutura dos 3 pilares CONIF e 9 indicadores', () => {
  it('contém exatamente 3 pilares definidos', () => {
    expect(PILARES.length).toBe(3);
    expect(PILARES.map((p) => p.numero)).toEqual([1, 2, 3]);
  });

  it('contém exatamente as 9 siglas esperadas em SIGLAS_VALIDAS', () => {
    expect(Array.from(SIGLAS_VALIDAS)).toEqual(SIGLAS_TODOS_PILARES);
  });

  it('possui metadados completos para os 9 indicadores', () => {
    for (const sigla of SIGLAS_TODOS_PILARES) {
      const meta = INDICADORES_META[sigla as keyof typeof INDICADORES_META];
      expect(meta).toBeDefined();
      expect(meta.sigla).toBe(sigla);
      expect(meta.slug).toBe(sigla.toLowerCase());
      expect([1, 2, 3]).toContain(meta.pilarNumero);
      expect(meta.polaridade).toBe('maior-e-melhor');
    }
  });
});

describe('validarIndicador', () => {
  it('aceita um indicador válido do Pilar 1', () => {
    expect(() => validarIndicador(indicadorValido)).not.toThrow();
  });

  it('aceita indicadores válidos dos Pilares 2 e 3', () => {
    expect(() =>
      validarIndicador({
        ...indicadorValido,
        sigla: 'PINV',
        slug: 'pinv',
      }),
    ).not.toThrow();

    expect(() =>
      validarIndicador({
        ...indicadorValido,
        sigla: 'PIPROT',
        slug: 'piprot',
      }),
    ).not.toThrow();
  });

  it('rejeita sigla não pertencente a nenhum dos 3 pilares', () => {
    expect(() => validarIndicador({ ...indicadorValido, sigla: 'XXXX' })).toThrow();
  });

  it('rejeita slug diferente da sigla em minúsculas', () => {
    expect(() => validarIndicador({ ...indicadorValido, slug: 'outra-coisa' })).toThrow();
  });

  it('rejeita polaridade diferente de maior-e-melhor', () => {
    expect(() => validarIndicador({ ...indicadorValido, polaridade: 'menor-e-melhor' })).toThrow();
  });

  it('rejeita valor nulo sem motivo', () => {
    expect(() =>
      validarIndicador({ ...indicadorValido, valores: [{ ano: 2023, valor: null }] }),
    ).toThrow();
  });

  it('rejeita valor presente com motivo', () => {
    expect(() =>
      validarIndicador({
        ...indicadorValido,
        valores: [{ ano: 2023, valor: 10, motivoIndisponivel: 'não deveria' }],
      }),
    ).toThrow();
  });

  it('rejeita anos fora de ordem', () => {
    expect(() =>
      validarIndicador({
        ...indicadorValido,
        valores: [
          { ano: 2023, valor: 10 },
          { ano: 2022, valor: 9 },
        ],
      }),
    ).toThrow();
  });

  it('rejeita indicador sem valores e sem motivo', () => {
    expect(() => validarIndicador({ ...indicadorValido, valores: [] })).toThrow();
  });

  it('rejeita dataAtualizacao em formato inválido', () => {
    expect(() => validarIndicador({ ...indicadorValido, dataAtualizacao: '21/09/2026' })).toThrow();
  });
});
